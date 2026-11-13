import {isProductionHour,rowProductionHour} from '../public/production-hours.js';
import {SLOT,DAY,localParts,sunPosition} from './time.mjs';
import {actualInterval} from './engine.mjs';
import {dayBounds} from '../public/presentation.js';
const HOUR=3600000,freezeCache=new Map();
const dateShift=(day,n)=>new Date(Date.parse(day+'T12:00:00Z')+n*DAY).toISOString().slice(0,10);
export const emptyReports=()=>({version:3,hours:{},pending:{},days:{},months:{},years:{},lastAt:0});
function hourPrediction(pub,start,c){
  const map=pub.rowMap||new Map(pub.rows.map(r=>[r.start,r])),date=localParts(start,c.timezone).date,ids=['pv_lab','without_history',...(pub.providers||c.providers.filter(p=>p.enabled).map(p=>p.id))],predictions={},issued={};
  for(const id of ids){let sum=0,ok=true;
    const dayAvailable=pub.daySources?.[date]?.has(id);
    if(!dayAvailable){predictions[id]=null;continue;}
    for(let t=start;t<start+HOUR;t+=SLOT){const row=map.get(t),value=id==='pv_lab'?row?.wh:id==='without_history'?row?.beforeHistoryWh:row?.sources?.find(s=>s.provider===id)?.rawWh;
      if(Number.isFinite(value))sum+=Math.min(c.inverter.limitW/4,Math.max(0,value));else {const sun=sunPosition(t+SLOT/2,c.location);if(!sun||sun.elevation>0){ok=false;break;}}}
    const at=['pv_lab','without_history'].includes(id)?pub.at:pub.sourceTimes?.[id]??pub.at;predictions[id]=ok&&pub.at-at<=6*HOUR?sum/1000:null;issued[id]=at;
  }return {predictions,issued};
}
export function captureReportForecasts(state,pub,c){
  if(!pub.rows?.length)return;pub={...pub,rowMap:new Map(pub.rows.map(r=>[r.start,r])),daySources:{}};for(const row of pub.rows){const d=localParts(row.start,c.timezone).date;const set=pub.daySources[d]??=new Set(['pv_lab']);if(Number.isFinite(row.beforeHistoryWh))set.add('without_history');for(const src of row.sources||[])set.add(src.provider);}
  const dates=[...new Set(pub.rows.map(r=>localParts(r.start,c.timezone).date))];
  for(const date of dates){const [begin,end]=dayBounds(date,c.timezone),[previous]=dayBounds(dateShift(date,-1),c.timezone),[hh,mm]=(c.reports?.freezeTime||'20:00').split(':').map(Number),cutoff=previous+(hh*60+mm)*60000;
    // Freeze at a local clock time even on DST transition dates.
    const freezeKey=date+'|'+c.timezone+'|'+hh+':'+mm;let freeze=freezeCache.get(freezeKey)??cutoff;if(!freezeCache.has(freezeKey))for(let t=previous;t<begin;t+=60000){const p=localParts(t,c.timezone);if(Number(p.hour)===hh&&Number(p.minute)===mm){freeze=t;break;}}if(freezeCache.size>1024)freezeCache.clear();freezeCache.set(freezeKey,freeze);
    for(let start=begin;start<end;start+=HOUR){if(pub.at>start)continue;const candidate=hourPrediction(pub,start,c);if(!rowProductionHour({start,...candidate},c))continue;
      for(const mode of ['rolling','day_ahead']){if(mode==='day_ahead'&&(pub.at>freeze||freeze-pub.at>6*HOUR))continue;
        const key=mode+'|'+start,old=state.pending[key];if(old&&old.at>=pub.at)continue;
        state.pending[key]={mode,start,date,at:pub.at,cutoff:mode==='day_ahead'?freeze:start,...candidate,providers:(pub.providers||c.providers.filter(p=>p.enabled).map(p=>p.id)),policy:mode==='day_ahead'?(c.reports?.freezeTime||'20:00'):'przed godziną'};
      }
    }
  }
}
function actualHour(samples,start,c,statistics,sources={}){
  const periods=Array.from({length:4},(_,i)=>actualInterval(samples,start+i*SLOT,c)),reasons=[...new Set(periods.flatMap(p=>[...p.reasons,...(p.warnings||[])]))];
  const stat=statistics?.[start];if(Number.isFinite(stat)&&stat>=0&&stat<=c.inverter.limitW/1000*1.25)return {actualKWh:stat,actualSource:sources[start]||'statystyki HA',quality:reasons};
  return {actualKWh:periods.every(p=>p.coverage>=.95)?periods.reduce((s,p)=>s+p.wh,0)/1000:null,actualSource:'całkowanie pomiarów AC',quality:reasons};
}
const blank=()=>({n:0,actualKWh:0,forecastKWh:0,absErrorKWh:0,squaredError:0,biasKWh:0,dailyAbsErrorKWh:0,dailyN:0});
function metric(actual,predicted){return {n:1,actualKWh:actual,forecastKWh:predicted,absErrorKWh:Math.abs(actual-predicted),squaredError:(actual-predicted)**2,biasKWh:predicted-actual,dailyAbsErrorKWh:0,dailyN:0};}
function addMetric(a,b){for(const k of Object.keys(blank()))a[k]=(a[k]||0)+(b[k]||0);return a;}
function merge(a,b){if(!a)return structuredClone(b);a.actualSum+=b.actualSum;a.actualHours+=b.actualHours;a.expectedHours+=b.expectedHours;a.observedHours+=b.observedHours;
  for(const [id,s] of Object.entries(b.forecasts)){const x=a.forecasts[id]??={sum:0,hours:0};x.sum+=s.sum;x.hours+=s.hours;}
  for(const [id,s] of Object.entries(b.paired))addMetric(a.paired[id]??=blank(),s);
  // Common scores only combine identical participant cohorts; retain cohort identity in the key.
  for(const [cohort,scores] of Object.entries(b.cohorts))for(const [id,s] of Object.entries(scores))addMetric((a.cohorts[cohort]??={})[id]??=blank(),s);
  if(b.historyEffect){a.historyEffect??={n:0,changedHours:0,withErrorKWh:0,withoutErrorKWh:0};for(const key of Object.keys(a.historyEffect))a.historyEffect[key]+=b.historyEffect[key];}a.quality=[...new Set([...a.quality,...b.quality])];return a;
}
function aggregateDay(rows,c){const first=rows[0],[a,b]=dayBounds(first.date,c.timezone),result={date:first.date,mode:first.mode,actualSum:0,actualHours:0,expectedHours:Array.from({length:(b-a)/HOUR},(_,i)=>a+i*HOUR).filter(start=>isProductionHour(start,c)||rows.some(row=>row.start===start&&rowProductionHour(row,c))).length,observedHours:rows.length,forecasts:{},paired:{},cohorts:{},quality:[]};
  for(const r of rows){const actual=r.actualKWh;if(actual!==null){result.actualSum+=actual;result.actualHours++;}
    for(const [id,p] of Object.entries(r.predictions)){if(p!==null){const f=result.forecasts[id]??={sum:0,hours:0};f.sum+=p;f.hours++;if(actual!==null)addMetric(result.paired[id]??=blank(),metric(actual,p));}}
    const ids=['pv_lab',...r.providers],cohort=[...ids].sort().join('|');if(actual!==null&&ids.every(id=>Number.isFinite(r.predictions[id]))){for(const id of ids)addMetric((result.cohorts[cohort]??={})[id]??=blank(),metric(actual,r.predictions[id]));}
    if(actual!==null&&Number.isFinite(r.predictions.pv_lab)&&Number.isFinite(r.predictions.without_history)){const effect=result.historyEffect??={n:0,changedHours:0,withErrorKWh:0,withoutErrorKWh:0};effect.n++;if(Math.abs(r.predictions.pv_lab-r.predictions.without_history)>1e-6)effect.changedHours++;effect.withErrorKWh+=Math.abs(actual-r.predictions.pv_lab);effect.withoutErrorKWh+=Math.abs(actual-r.predictions.without_history);}
    result.quality.push(...r.quality);
  }
  result.quality=[...new Set(result.quality)];for(const s of Object.values(result.paired))if(s.n===result.expectedHours){s.dailyN=1;s.dailyAbsErrorKWh=Math.abs(s.forecastKWh-s.actualKWh);}
  for(const scores of Object.values(result.cohorts))for(const s of Object.values(scores))if(s.n===result.expectedHours){s.dailyN=1;s.dailyAbsErrorKWh=Math.abs(s.forecastKWh-s.actualKWh);}
  return result;
}
function promote(store,key,item){const old=store[key];store[key]=merge(old,item);}
export function updateReports(state,samples,c,now=Date.now(),statistics={},sources={}){
  const today=localParts(now,c.timezone).date,hourKeep=dateShift(today,-6),monthKeep=dateShift(today,-30),yearKeep=new Date(Date.UTC(Number(today.slice(0,4)),Number(today.slice(5,7))-1-11,1)).toISOString().slice(0,7);
  const observed=[...(samples.length?[samples[0].at]:[]),...Object.keys(statistics).map(Number)],first=Math.max(dayBounds(hourKeep,c.timezone)[0],observed.length?Math.floor(Math.min(...observed)/HOUR)*HOUR:Math.floor(now/HOUR)*HOUR);
  for(let start=first;start+HOUR<=now;start+=HOUR)for(const mode of ['rolling','day_ahead']){const key=mode+'|'+start;if(!isProductionHour(start,c,{actualKWh:statistics[start]||0}))continue;if(!state.hours[key]&&!state.pending[key])state.pending[key]={mode,start,date:localParts(start,c.timezone).date,at:null,cutoff:null,predictions:Object.fromEntries(['pv_lab',...c.providers.filter(p=>p.enabled).map(p=>p.id)].map(id=>[id,null])),issued:{},providers:c.providers.filter(p=>p.enabled).map(p=>p.id),policy:'brak wcześniejszej prognozy'};}
  for(const [key,p] of Object.entries(state.pending)){if(!rowProductionHour({...p,actualKWh:statistics[p.start]||0},c)){delete state.pending[key];continue;}if(p.start+HOUR>now)continue;
    const old=state.hours[key];if(!old||old.actualKWh===null){const actual=actualHour(samples,p.start,c,statistics,sources);state.hours[key]={...p,...actual};}
    if(p.date<hourKeep||state.hours[key].actualKWh!==null)delete state.pending[key];
  }
  for(const r of Object.values(state.hours))if(Number.isFinite(statistics[r.start])&&(r.actualSource!=='statystyki HA'||!sources[r.start]))Object.assign(r,actualHour(samples,r.start,c,statistics,sources));
  const groups={};for(const r of Object.values(state.hours).filter(r=>rowProductionHour(r,c)))(groups[r.mode+'|'+r.date]??=[]).push(r);
  for(const [key,rows] of Object.entries(groups))state.days[key]=aggregateDay(rows,c);
  // A contribution moves exactly once: aggregate and remove it in the same atomic state file.
  for(const [key,d] of Object.entries(state.days))if(d.date<monthKeep){const month=d.date.slice(0,7);promote(state.months,d.mode+'|'+month,{...d,date:month});delete state.days[key];}
  for(const [key,m] of Object.entries(state.months))if(m.date<yearKeep){const year=m.date.slice(0,4);promote(state.years,m.mode+'|'+year,{...m,date:year});delete state.months[key];}
  for(const [key,h] of Object.entries(state.hours))if(h.date<hourKeep)delete state.hours[key];
  state.lastAt=now;return state;
}
export function reportView(state,c=null){
  const months=structuredClone(state.months),years=structuredClone(state.years);for(const d of Object.values(state.days))promote(months,d.mode+'|'+d.date.slice(0,7),{...d,date:d.date.slice(0,7)});
  for(const m of Object.values(months))promote(years,m.mode+'|'+m.date.slice(0,4),{...m,date:m.date.slice(0,4)});
  return {method:'limited',legacy:state.legacy||null,at:state.lastAt,hours:Object.values(state.hours).filter(row=>!c||rowProductionHour(row,c)).sort((a,b)=>b.start-a.start),days:Object.values(state.days).sort((a,b)=>b.date.localeCompare(a.date)),months:Object.values(months).sort((a,b)=>b.date.localeCompare(a.date)),years:Object.values(years).sort((a,b)=>b.date.localeCompare(a.date))};
}

export function migrateReports(state,c){
  if(state.version===3)return state;
  if(state.version===1)return {...state,version:3};
  const out=structuredClone(state),legacy=out.legacy;out.version=3;delete out.legacy;
  if(!legacy)return out;
  // The legacy view contains derived months/years. Remove their child contributions
  // before returning them to storage, so later aggregation cannot count them twice.
  function subtract(parent,child){const value=structuredClone(parent);for(const key of ['actualSum','actualHours','expectedHours','observedHours'])value[key]-=child[key];
    for(const [id,f] of Object.entries(child.forecasts||{})){const target=value.forecasts[id];if(target){target.sum-=f.sum;target.hours-=f.hours;if(target.hours<=0)delete value.forecasts[id];}}
    for(const [id,s] of Object.entries(child.paired||{})){const target=value.paired[id];if(target){for(const key of Object.keys(s))target[key]=(target[key]||0)-s[key];if(target.n<=0)delete value.paired[id];}}
    for(const [cohort,scores] of Object.entries(child.cohorts||{})){const targets=value.cohorts[cohort];if(!targets)continue;for(const [id,s] of Object.entries(scores)){const target=targets[id];if(target){for(const key of Object.keys(s))target[key]=(target[key]||0)-s[key];if(target.n<=0)delete targets[id];}}if(!Object.keys(targets).length)delete value.cohorts[cohort];}return value;}
  const months=Object.fromEntries((legacy.months||[]).map(row=>[row.mode+'|'+row.date,structuredClone(row)]));
  const years=Object.fromEntries((legacy.years||[]).map(row=>[row.mode+'|'+row.date,structuredClone(row)]));
  for(const month of legacy.months||[]){const key=month.mode+'|'+month.date.slice(0,4);if(years[key])years[key]=subtract(years[key],month);}
  for(const day of legacy.days||[]){const key=day.mode+'|'+day.date.slice(0,7);if(months[key])months[key]=subtract(months[key],day);}
  for(const [key,row] of Object.entries(months))if(row.expectedHours>0)promote(out.months,key,row);
  for(const [key,row] of Object.entries(years))if(row.expectedHours>0)promote(out.years,key,row);
  for(const row of legacy.hours||[]){const key=row.mode+'|'+row.start,current=out.hours[key];if(!current)out.hours[key]=row;else{
      current.predictions={...row.predictions,...Object.fromEntries(Object.entries(current.predictions||{}).filter(([,v])=>v!==null))};current.issued={...row.issued,...current.issued};
      if(current.actualKWh===null&&row.actualKWh!==null){current.actualKWh=row.actualKWh;current.actualSource=row.actualSource;}
    }}
  for(const row of legacy.days||[]){const key=row.mode+'|'+row.date;if(!out.days[key]||out.days[key].observedHours<row.observedHours)out.days[key]=row;}
  if(c){const groups={};for(const row of Object.values(out.hours))(groups[row.mode+'|'+row.date]??=[]).push(row);for(const [key,rows] of Object.entries(groups))out.days[key]=aggregateDay(rows,c);}
  return out;
}

export function backfillHistoryComparison(state,published){const byAt=new Map(published.map(pub=>[pub.at,pub]));for(const row of Object.values(state.hours)){if(Number.isFinite(row.predictions.without_history)||!row.at)continue;const pub=byAt.get(row.at);if(!pub||pub.at>row.start)continue;const periods=pub.rows.filter(r=>r.start>=row.start&&r.start<row.start+HOUR);if(periods.length!==4||periods.some(r=>!Number.isFinite(r.beforeHistoryWh)))continue;row.predictions.without_history=periods.reduce((s,r)=>s+r.beforeHistoryWh,0)/1000;(row.issued??={}).without_history=pub.at;}}
