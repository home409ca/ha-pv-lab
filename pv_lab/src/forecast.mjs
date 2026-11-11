import {SLOT,DAY,floorSlot,localParts,horizon,sunPosition} from './time.mjs';
import {correctionInfo,sampleReasons} from './engine.mjs';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function coverage(rows,date,c,now=-Infinity){const available=new Set(rows.map(r=>r.start)),midnight=Date.parse(date+'T00:00:00Z');let missing=0,expected=0;
  for(let t=midnight-18*3600000;t<midnight+42*3600000;t+=SLOT){if(t+SLOT<=now||localParts(t,c.timezone).date!==date)continue;const sun=sunPosition(t+SLOT/2,c.location);if(!sun||sun.elevation>0){expected++;if(!available.has(t))missing++;}}
  return {complete:missing===0,missingPeriods:missing,expectedPeriods:expected};}
export function bestWindow(rows,date,hours,zone,now){const count=hours*4,map=new Map(rows.map(r=>[r.start,r]));let best=null;
  for(const r of rows){if(r.start<now||localParts(r.start,zone).date!==date)continue;let wh=0,valid=true,peakW=0;
    for(let i=0;i<count;i++){const x=map.get(r.start+i*SLOT);if(!x||localParts(x.start,zone).date!==date){valid=false;break;}wh+=x.wh;peakW=Math.max(peakW,x.wh*4);}
    if(valid&&wh>0&&(!best||wh>best.kWh*1000+1e-6))best={start:r.start,end:r.start+hours*3600000,hours,kWh:wh/1000,averageW:wh/hours,peakW};}
  return best;}
export function forecast(model,snapshots,samples,c,now=Date.now()){
  const today=localParts(now,c.timezone).date,latest=new Map();
  for(const s of snapshots)if(s.at>=(c.calibrationFrom||0)&&s.at<=now&&now-s.at<36*3600000&&c.providers.some(p=>p.id===s.provider&&p.enabled))if(!latest.has(s.provider)||latest.get(s.provider).at<s.at)latest.set(s.provider,s);
  const points=new Map(),details=[];
  for(const [provider,snap] of latest){for(const r of snap.rows){if(localParts(r.start,c.timezone).date<today)continue;
    const h=horizon(Math.max(0,(r.start-snap.at)/3600000)),score=model.commonScores?.[`${provider}|${h}`],error=score?.actual>0?score.correctedError/score.actual:null;
    const weight=score?.n>=c.quality.minSamples?clamp(1/(error+.15)**2,.1,10):1,info=correctionInfo(model,provider,r.start,snap.at,c),originalWh=r.wh;
    const source={provider,originalWh,rawWh:Math.min(originalWh,c.inverter.limitW/4),simpleWh:Math.min(originalWh*info.simpleFactor,c.inverter.limitW/4),adjustedWh:originalWh*info.factor,correctedWh:Math.min(originalWh*info.factor,c.inverter.limitW/4),weight,...info,horizon:h};
    const point=points.get(r.start)||{start:r.start,sources:[]};point.sources.push(source);points.set(r.start,point);}
    details.push({provider,receivedAt:snap.at,periods:snap.rows.filter(r=>r.start+SLOT>now).length,sourceUpdatedAt:snap.sourceUpdatedAt??null});}
  const fullRows=[...points.values()].sort((a,b)=>a.start-b.start).map(p=>{const weight=p.sources.reduce((s,x)=>s+x.weight,0);for(const s of p.sources)s.weightPercent=s.weight/weight*100;return {...p,originalWh:p.sources.reduce((s,x)=>s+x.originalWh*x.weight,0)/weight,rawWh:p.sources.reduce((s,x)=>s+x.rawWh*x.weight,0)/weight,simpleWh:p.sources.reduce((s,x)=>s+x.simpleWh*x.weight,0)/weight,staticWh:p.sources.reduce((s,x)=>s+x.correctedWh*x.weight,0)/weight,wh:0};});
  const current=fullRows.find(r=>r.start<=now&&r.start+SLOT>now),recent=samples.filter(s=>s.at>=now-15*60000&&s.at<=now&&sampleReasons(s,c).length===0);let nowFactor=1;
  if(current&&current.staticWh>20&&recent.length>=3&&recent.at(-1).at>=now-c.quality.maxGapSeconds*1000)nowFactor=clamp((recent.reduce((s,r)=>s+r.power,0)/recent.length)/(current.staticWh*4),.3,1.5);
  for(const r of fullRows){r.nowFactor=r.start+SLOT>now?1+(nowFactor-1)*Math.exp(-Math.max(0,r.start-now)/3600000):1;r.wh=Math.min(c.inverter.limitW/4,r.staticWh*r.nowFactor);}
  const rows=fullRows.filter(r=>r.start+SLOT>now),days={},providerDays=[];
  for(const r of fullRows){const d=localParts(r.start,c.timezone).date,obj=days[d]??={date:d,remainingWh:0,curveWh:0,periods:0};obj.curveWh+=r.wh;if(r.start+SLOT>now){obj.remainingWh+=r.wh*Math.max(0,Math.min(1,(r.start+SLOT-now)/SLOT));obj.periods++;}}
  const last=samples.filter(s=>!s.imported).at(-1),actualToday=last&&localParts(last.at,c.timezone).date===today&&now-last.at<=c.quality.maxGapSeconds*1000?last.dailyEnergy:null;
  for(const d of Object.values(days)){Object.assign(d,coverage(rows,d.date,c,now));d.totalKWh=d.complete?(d.date===today?actualToday===null?null:actualToday+d.remainingWh/1000:d.remainingWh/1000):null;
    d.windows={twoHours:bestWindow(rows,d.date,2,c.timezone,now),threeHours:bestWindow(rows,d.date,3,c.timezone,now)};
    for(const [provider] of latest){const sourceRows=fullRows.filter(r=>localParts(r.start,c.timezone).date===d.date&&r.sources.some(s=>s.provider===provider));if(!sourceRows.length)continue;
      const vals=sourceRows.map(r=>({r,s:r.sources.find(s=>s.provider===provider)})),sum=key=>vals.reduce((v,{s})=>v+s[key],0),originalWh=sum('originalWh'),staticWh=sum('correctedWh'),rawWh=sum('rawWh');
      providerDays.push({provider,date:d.date,originalKWh:originalWh/1000,limitedKWh:rawWh/1000,correctedKWh:staticWh/1000,correctionPercent:rawWh>0?(staticWh/rawWh-1)*100:null,averageWeightPercent:vals.reduce((n,{s})=>n+s.weightPercent,0)/vals.length,remainingOriginalKWh:vals.reduce((n,{r,s})=>n+s.rawWh*Math.max(0,Math.min(1,(r.start+SLOT-now)/SLOT)),0)/1000,remainingCorrectedKWh:vals.reduce((n,{r,s})=>n+s.correctedWh*Math.max(0,Math.min(1,(r.start+SLOT-now)/SLOT)),0)/1000,...coverage(sourceRows,d.date,c)});}}
  const todayData=days[today],remaining=todayData?.remainingWh??null,endHour=Math.floor(now/3600000)*3600000+3600000,available=new Set(rows.map(r=>r.start));let missingHour=false;
  for(let t=floorSlot(now);t<endHour;t+=SLOT){const sun=sunPosition(t+SLOT/2,c.location);if((!sun||sun.elevation>0)&&!available.has(t))missingHour=true;}
  const hourRows=rows.filter(r=>r.start<endHour&&r.start+SLOT>now),remainingHour=hourRows.length&&!missingHour?hourRows.reduce((s,r)=>s+r.wh*Math.max(0,Math.min(1,(r.start+SLOT-now)/SLOT)),0)/1000:null;
  return {calculatedAt:now,rows,fullRows,details,providerDays,nowFactor,days:Object.values(days).sort((a,b)=>a.date.localeCompare(b.date)),actualTodayKWh:actualToday,remainingTodayKWh:remaining===null?null:remaining/1000,todayKWh:todayData?.totalKWh??null,remainingHourKWh:remainingHour,note:'Dzisiaj: pomiar od północy + oszacowanie od teraz. Krzywe dostawców: ich pełne doby, a nie pomiar. Okna 2/3 h maksymalizują energię produkcji, nie nadwyżkę po zużyciu domu.'};
}
