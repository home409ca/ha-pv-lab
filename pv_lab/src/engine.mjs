import {SLOT, DAY, floorSlot, localParts, calibrationKey, horizon, sunPosition} from './time.mjs';
export const emptyModel = () => ({version:1, watermark:0, bins:{}, scores:{}, shading:{}, excluded:{}, evaluated:0});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function add(stats,actual,predicted,corrected){stats.n++;stats.actual+=actual;stats.predicted+=predicted;stats.absError+=Math.abs(actual-predicted);stats.correctedError+=Math.abs(actual-corrected);}
const blank=()=>({n:0,actual:0,predicted:0,absError:0,correctedError:0});
export function factor(stats,minSamples){if(!stats||!stats.n)return 1;const strength=Math.min(1,stats.n/minSamples);return 1+strength*(clamp((stats.actual+200)/(stats.predicted+200),.25,1.75)-1);}
export function correction(model,p,start,issued,c){const key=calibrationKey(p,start,issued,c),global=model.scores[`${p}|${horizon((start-issued)/3600000)}`];const bin=model.bins[key];return bin?.n>=c.quality.minSamples?factor(bin,c.quality.minSamples):factor(global,c.quality.minSamples*3);}
export function sampleReasons(s,c){const reasons=[];
  if(s.historyUnverified)reasons.push('historia bez potwierdzenia świeżości');
  if(s.power===null||s.power<0)reasons.push('brak mocy');
  if(s.voltages.some(v=>v===null))reasons.push('brak napięcia');
  if(s.voltages.some(v=>v!==null&&v>=c.quality.voltageWarning))reasons.push('wysokie napięcie');
  if(!c.quality.normalStatuses.includes(s.status))reasons.push('status falownika');
  if(s.power!==null&&s.power>=c.inverter.limitW*.98)reasons.push('limit falownika');
  return reasons;
}
export function actualInterval(samples,start,c) {
  const end=start+SLOT, rows=samples.filter(s=>s.at>=start-c.quality.maxGapSeconds*1000&&s.at<=end+c.quality.maxGapSeconds*1000).sort((a,b)=>a.at-b.at);
  let wh=0,coverage=0;const reasons=new Set();
  for(let i=1;i<rows.length;i++){const a=rows[i-1],b=rows[i];const lo=Math.max(start,a.at),hi=Math.min(end,b.at);if(hi<=lo)continue;
    if(b.at-a.at>c.quality.maxGapSeconds*1000){reasons.add('przerwa w danych');continue;}
    for(const s of [a,b])for(const r of sampleReasons(s,c))reasons.add(r);
    if(a.power===null||b.power===null)continue;
    const x=a.power+(b.power-a.power)*(lo-a.at)/(b.at-a.at), y=a.power+(b.power-a.power)*(hi-a.at)/(b.at-a.at);
    wh+=(x+y)/2*(hi-lo)/3600000;coverage+=hi-lo;
  }
  if(coverage<SLOT*.95)reasons.add('niepełny przedział');
  return {wh,coverage:coverage/SLOT,reasons:[...reasons]};
}
export function train(model,samples,snapshots,c,now=Date.now()) {
  const end=floorSlot(now)-SLOT;
  if(!samples.length)return;
  const first=Math.max(floorSlot(samples[0].at),model.watermark?model.watermark+SLOT:0);
  for(let t=first;t<=end;t+=SLOT){const actual=actualInterval(samples,t,c);model.watermark=t;
    if(actual.reasons.length){for(const r of actual.reasons)model.excluded[r]=(model.excluded[r]||0)+1;continue;}
    const candidates=new Map();
    for(const snap of snapshots){if(snap.at>t||snap.at<t-8*DAY)continue;
      const row=snap.rows.find(r=>r.start===t);if(!row)continue;
      const key=`${snap.provider}|${horizon((t-snap.at)/3600000)}`;
      if(!candidates.has(key)||candidates.get(key).snap.at<snap.at)candidates.set(key,{snap,row});}
    for(const [scoreKey,{snap,row}] of candidates){const predicted=Math.min(row.wh,c.inverter.limitW/4);if(predicted<20)continue;
      const k=calibrationKey(snap.provider,t,snap.at,c),corrected=Math.min(predicted*correction(model,snap.provider,t,snap.at,c),c.inverter.limitW/4);
      add(model.bins[k]??=blank(),actual.wh,predicted,corrected);add(model.scores[scoreKey]??=blank(),actual.wh,predicted,corrected);model.evaluated++;}
    // Relative panel underperformance is a diagnostic indication, not proof of physical shade.
    const sun=sunPosition(t+SLOT/2,c.location),p=localParts(t,c.timezone);
    if(sun&&sun.elevation<5)continue;
    const pos=sun?`${Math.floor(sun.azimuth/20)}:${Math.floor(sun.elevation/10)}`:`h${p.hour}`;
    for(const str of c.strings){const opts=c.optimizers.filter(o=>o.string===str.id),values=[];
      for(const o of opts){const v=samples.filter(s=>s.at>=t&&s.at<t+SLOT&&s.optimizers[o.id]?.power!==null&&s.optimizers[o.id]?.power!==undefined).map(s=>s.optimizers[o.id].power);
        if(v.length>=Math.max(3,SLOT/1000/c.pollSeconds*.7))values.push({id:o.id,value:v.reduce((a,b)=>a+b,0)/v.length});}
      if(values.length<3)continue;const sorted=values.map(v=>v.value).sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length/2)];if(median<30)continue;
      for(const v of values){const key=`${v.id}|${Math.floor((Number(p.month)-1)/3)}|${pos}`,b=model.shading[key]??={n:0,ratio:0,id:v.id,position:pos,season:Math.floor((Number(p.month)-1)/3)};b.n++;b.ratio+=clamp(v.value/median,0,2);}
    }
  }
}
export function forecast(model,snapshots,samples,c,now=Date.now()) {
  const latest=new Map();for(const s of snapshots)if(s.at>=(c.calibrationFrom||0)&&s.at<=now&&now-s.at<36*3600000&&c.providers.some(p=>p.id===s.provider&&p.enabled))if(!latest.has(s.provider)||latest.get(s.provider).at<s.at)latest.set(s.provider,s);
  const points=new Map(), details=[];
  for(const [provider,snap] of latest){let covered=0;for(const r of snap.rows){if(r.start+SLOT<=now)continue;const h=horizon(Math.max(0,(r.start-snap.at)/3600000)),score=model.scores[`${provider}|${h}`];
    const error=score?.predicted>0?score.absError/score.predicted:null,weight=score?.n>=c.quality.minSamples?clamp(1/((error+.15)**2),.1,10):1;
    const raw=Math.min(r.wh,c.inverter.limitW/4), corrected=Math.min(c.inverter.limitW/4,raw*correction(model,provider,r.start,snap.at,c));
    const x=points.get(r.start)||{start:r.start,sources:[]};x.sources.push({provider,rawWh:raw,correctedWh:corrected,weight,n:score?.n||0});points.set(r.start,x);covered++;}
    details.push({provider,receivedAt:snap.at,periods:covered});}
  const rows=[...points.values()].sort((a,b)=>a.start-b.start).map(p=>({...p,rawWh:p.sources.reduce((s,x)=>s+x.rawWh*x.weight,0)/p.sources.reduce((s,x)=>s+x.weight,0),wh:p.sources.reduce((s,x)=>s+x.correctedWh*x.weight,0)/p.sources.reduce((s,x)=>s+x.weight,0)}));
  const current=rows.find(r=>r.start<=now&&r.start+SLOT>now), recent=samples.filter(s=>s.at>=now-15*60000&&s.at<=now&&sampleReasons(s,c).length===0);
  let nowFactor=1;
  if(current&&current.wh>20&&recent.length>=3&&recent.at(-1).at>=now-c.quality.maxGapSeconds*1000)nowFactor=clamp((recent.reduce((s,r)=>s+r.power,0)/recent.length)/(current.wh*4),.3,1.5);
  for(const r of rows){const decay=Math.exp(-Math.max(0,r.start-now)/3600000);r.wh=Math.min(c.inverter.limitW/4,r.wh*(1+(nowFactor-1)*decay));}
  const today=localParts(now,c.timezone).date, hour=localParts(now,c.timezone).hour,days={};
  for(const r of rows){const p=localParts(r.start,c.timezone),fraction=Math.max(0,Math.min(1,(r.start+SLOT-now)/SLOT));const d=days[p.date]??={date:p.date,remainingWh:0,periods:0};d.remainingWh+=r.wh*fraction;d.periods++;}
  const available=new Set(rows.map(r=>r.start));
  for(const d of Object.values(days)){let missing=0;const midnight=Date.parse(d.date+'T00:00:00Z');
    for(let t=midnight-18*3600000;t<midnight+42*3600000;t+=SLOT){if(t+SLOT<=now||localParts(t,c.timezone).date!==d.date)continue;const sun=sunPosition(t+SLOT/2,c.location);if((!sun||sun.elevation>0)&&!available.has(t))missing++;}
    d.missingPeriods=missing;d.complete=missing===0;}
  const last=samples.filter(s=>!s.imported).at(-1),actualToday=last&&localParts(last.at,c.timezone).date===today&&now-last.at<=c.quality.maxGapSeconds*1000?last.dailyEnergy:null;
  const remaining=days[today]?.remainingWh??null;
  // Absolute end avoids counting the repeated 02:00 hour twice at the autumn DST transition.
  const endHour=Math.floor(now/3600000)*3600000+3600000;
  const hourRows=rows.filter(r=>r.start<endHour&&r.start+SLOT>now);
  let missingHour=false;for(let t=floorSlot(now);t<endHour;t+=SLOT){const sun=sunPosition(t+SLOT/2,c.location);if((!sun||sun.elevation>0)&&!available.has(t))missingHour=true;}
  const remainingHour=hourRows.length&&!missingHour?hourRows.reduce((s,r)=>s+r.wh*Math.max(0,Math.min(1,(r.start+SLOT-now)/SLOT)),0):null;
  return {rows,details,nowFactor,days:Object.values(days),actualTodayKWh:actualToday,remainingTodayKWh:remaining===null?null:remaining/1000,
    todayKWh:remaining===null||actualToday===null||!days[today]?.complete?null:actualToday+remaining/1000,remainingHourKWh:remainingHour===null?null:remainingHour/1000,
    note:'Przedziały 15 min; energia pozostałej części bieżącego przedziału jest przybliżona proporcjonalnie do czasu. Brakujący horyzont nie jest uzupełniany zerami.'};
}
