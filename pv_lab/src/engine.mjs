import {SLOT, DAY, floorSlot, localParts, calibrationKey, horizon, sunPosition} from './time.mjs';
export const emptyModel = () => ({version:2, watermark:0, bins:{}, scores:{}, commonScores:{}, shading:{}, excluded:{}, evaluated:0});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function add(stats,actual,predicted,corrected,baseline=predicted){stats.n++;stats.actual+=actual;stats.predicted+=predicted;stats.absError+=Math.abs(actual-baseline);stats.correctedError+=Math.abs(actual-corrected);stats.squaredError=(stats.squaredError||0)+(actual-baseline)**2;stats.correctedSquaredError=(stats.correctedSquaredError||0)+(actual-corrected)**2;}
const blank=()=>({n:0,actual:0,predicted:0,absError:0,correctedError:0,squaredError:0,correctedSquaredError:0});
export function factor(stats,minSamples){if(!stats||!stats.n)return 1;const strength=Math.min(1,stats.n/minSamples);return 1+strength*(clamp((stats.actual+200)/(stats.predicted+200),.25,1.75)-1);}
export function correction(model,p,start,issued,c){const key=calibrationKey(p,start,issued,c),global=model.scores[`${p}|${horizon((start-issued)/3600000)}`];const bin=model.bins[key];return bin?.n>=c.quality.minSamples?factor(bin,c.quality.minSamples):factor(global,c.quality.minSamples*3);}
export function correctionInfo(model,p,start,issued,c){const key=calibrationKey(p,start,issued,c),h=horizon(Math.max(0,(start-issued)/3600000)),bin=model.bins[key],global=model.scores[`${p}|${h}`],local=bin?.n>=c.quality.minSamples;return {factor:correction(model,p,start,issued,c),simpleFactor:factor(global,c.quality.minSamples*3),profile:local?'pozycja Słońca i sezon':global?.n?'ogólny dostawcy i horyzontu':'brak kalibracji',key,n:(local?bin:global)?.n||0};}
export function sampleReasons(s,c){const reasons=[];
  if(s.historyUnverified)reasons.push('historia bez potwierdzenia świeżości');
  if(!Number.isFinite(s.power)||s.power<0)reasons.push('brak mocy');
  const flag=s.voltageFlag||(s.voltages?.some(v=>v===null)?'missing':s.voltages?.some(v=>v!==null&&v>=c.quality.voltageWarning)?'high':s.voltages?'normal':'missing');
  if(flag==='missing')reasons.push('brak napięcia');
  if(!c.quality.normalStatuses.includes(s.status))reasons.push('status falownika');
  if(s.power!==null&&s.power>=c.inverter.limitW*.98)reasons.push('limit falownika');
  return reasons;
}
export function actualInterval(samples,start,c) {
  const end=start+SLOT, rows=sampleRange(samples,start-c.quality.maxGapSeconds*1000,end+c.quality.maxGapSeconds*1000);
  let wh=0,coverage=0;const reasons=new Set(),warnings=new Set();
  for(let i=1;i<rows.length;i++){const a=rows[i-1],b=rows[i];const lo=Math.max(start,a.at),hi=Math.min(end,b.at);if(hi<=lo)continue;
    if(b.at-a.at>c.quality.maxGapSeconds*1000){reasons.add('przerwa w danych');continue;}
    for(const s of [a,b]){for(const r of sampleReasons(s,c))reasons.add(r);if(s.voltageFlag==='high'||s.voltages?.some(v=>v!==null&&v>=c.quality.voltageWarning))warnings.add('wysokie napięcie');}
    if(!Number.isFinite(a.power)||!Number.isFinite(b.power))continue;
    const x=a.power+(b.power-a.power)*(lo-a.at)/(b.at-a.at), y=a.power+(b.power-a.power)*(hi-a.at)/(b.at-a.at);
    wh+=(x+y)/2*(hi-lo)/3600000;coverage+=hi-lo;
  }
  if(coverage<SLOT*.95)reasons.add('niepełny przedział');
  return {wh,coverage:coverage/SLOT,reasons:[...reasons],warnings:[...warnings]};
}
function sampleRange(samples,start,end){let lo=0,hi=samples.length;while(lo<hi){const mid=(lo+hi)>>>1;if(samples[mid].at<start)lo=mid+1;else hi=mid;}const rows=[];for(let i=lo;i<samples.length&&samples[i].at<=end;i++)rows.push(samples[i]);return rows;}
export function train(model,samples,snapshots,c,now=Date.now()) {
  const end=floorSlot(now)-SLOT;
  if(!samples.length)return;
  const first=Math.max(floorSlot(samples[0].at),model.watermark?model.watermark+SLOT:0,c.calibrationFrom?Math.ceil(c.calibrationFrom/SLOT)*SLOT:0);
  const byTime=new Map();if(first>end)return;
  for(const snap of snapshots){if(snap.at<(c.calibrationFrom||0))continue;for(const row of snap.rows){const t=row.start;if(t<first||t>end||snap.at>t||snap.at<t-8*DAY)continue;const key=`${snap.provider}|${horizon((t-snap.at)/3600000)}`,candidates=byTime.get(t)||new Map();if(!candidates.has(key)||candidates.get(key).snap.at<snap.at)candidates.set(key,{snap,row});byTime.set(t,candidates);}}
  for(let t=first;t<=end;t+=SLOT){const actual=actualInterval(samples,t,c);model.watermark=t;
    if(actual.reasons.length){for(const r of actual.reasons)model.excluded[r]=(model.excluded[r]||0)+1;continue;}
    const candidates=byTime.get(t)||new Map();
    if(!candidates.size)model.excluded['brak prognozy zapisanej przed kwadransem']=(model.excluded['brak prognozy zapisanej przed kwadransem']||0)+1;
    else if(![...candidates.values()].some(({row})=>row.wh>=20))model.excluded['prognoza poniżej 20 Wh']=(model.excluded['prognoza poniżej 20 Wh']||0)+1;
    const evaluations=[];for(const [scoreKey,{snap,row}] of candidates){const predicted=row.wh;if(predicted<20)continue;
      const k=calibrationKey(snap.provider,t,snap.at,c),corrected=Math.min(predicted*correction(model,snap.provider,t,snap.at,c),c.inverter.limitW/4),baseline=Math.min(predicted,c.inverter.limitW/4);
      evaluations.push({scoreKey,provider:snap.provider,h:horizon((t-snap.at)/3600000),predicted,corrected,baseline});
      add(model.bins[k]??=blank(),actual.wh,predicted,corrected,baseline);add(model.scores[scoreKey]??=blank(),actual.wh,predicted,corrected,baseline);model.evaluated++;}
    model.commonScores??={};for(const h of new Set(evaluations.map(e=>e.h))){const cohort=evaluations.filter(e=>e.h===h),enabled=c.providers.filter(p=>p.enabled);if(enabled.length<2||!enabled.every(p=>cohort.some(e=>e.provider===p.id)))continue;for(const e of cohort)add(model.commonScores[e.scoreKey]??=blank(),actual.wh,e.predicted,e.corrected,e.baseline);}
    // Relative panel underperformance is a diagnostic indication, not proof of physical shade.
    const sun=sunPosition(t+SLOT/2,c.location),p=localParts(t,c.timezone);
    if(sun&&sun.elevation<5)continue;
    const pos=sun?`${Math.floor(sun.azimuth/20)}:${Math.floor(sun.elevation/10)}`:`h${p.hour}`;
    const intervalRows=sampleRange(samples,t,t+SLOT-1);
    for(const str of c.strings){const opts=c.optimizers.filter(o=>o.string===str.id),values=[];
      for(const o of opts){const v=intervalRows.filter(s=>s.optimizers[o.id]?.power!==null&&s.optimizers[o.id]?.power!==undefined).map(s=>s.optimizers[o.id].power);
        if(v.length>=Math.max(3,SLOT/1000/c.pollSeconds*.7))values.push({id:o.id,value:v.reduce((a,b)=>a+b,0)/v.length});}
      if(values.length<3)continue;const sorted=values.map(v=>v.value).sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length/2)];if(median<30)continue;
      for(const v of values){const key=`${v.id}|${Math.floor((Number(p.month)-1)/3)}|${pos}`,b=model.shading[key]??={n:0,ratio:0,id:v.id,position:pos,season:Math.floor((Number(p.month)-1)/3)};b.n++;b.ratio+=clamp(v.value/median,0,2);}
    }
  }
}
export {forecast} from './forecast.mjs';
