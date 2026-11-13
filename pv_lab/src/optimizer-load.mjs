import {SLOT,DAY,localParts} from './time.mjs';
import {loadKey} from './optimizer-settings.mjs';
export const emptyLoad=()=>({version:1,key:null,at:null,rows:[],days:{}});
const quantile=(a,q)=>{const v=[...a].sort((a,b)=>a-b);return v.length?v[Math.floor((v.length-1)*q)]:null;};
export function powerValue(state){if(!state||state.state===null||String(state.state).trim()==='')return null;const n=Number(state.state),u=state.attributes?.unit_of_measurement;const w=n*(u==='kW'?1000:1);return Number.isFinite(n)&&n>=0&&w<=100000&&['W','kW'].includes(u)?w:null;}
export function currentLoad(states,s,now=Date.now(),pvPower=null){
 const ids=[s.load.powerEntity,...s.load.excludeEntities],powers=ids.map(id=>powerValue(states.get(id))),valid=powers.every(v=>v!==null),base=valid?powers[0]-powers.slice(1).reduce((a,b)=>a+b,0):null;
 const clean=base!==null&&base>=-Math.max(20,powers[0]*.05)&&(s.load.excludeEntities.length>0||s.load.alreadyExcludesDevices);
 const m=s.measurements||{},netState=states.get(m.netPower),raw=netState&&netState.state!==null&&String(netState.state).trim()!==''?Number(netState.state):NaN,unit=netState?.attributes?.unit_of_measurement,net=Number.isFinite(raw)&&['W','kW'].includes(unit)?raw*(unit==='kW'?1000:1)*(m.netPositiveExport?1:-1):null,imp=powerValue(states.get(m.importPower)),exp=powerValue(states.get(m.exportPower));
 let grid={importW:imp,exportW:exp,source:'encje mocy sieci'};if(m.netPower)grid={importW:net===null?null:Math.max(0,-net),exportW:net===null?null:Math.max(0,net),source:'encja mocy netto'};else if(!m.importPower&&!m.exportPower&&powers[0]!==null&&pvPower!==null)grid={importW:Math.max(0,powers[0]-pvPower),exportW:Math.max(0,pvPower-powers[0]),source:'oszacowanie z mocy domu i PV'};
 return {grid,at:now,houseW:powers[0],excludedW:valid?powers.slice(1).reduce((a,b)=>a+b,0):null,baseW:clean?Math.max(0,base):null,clean,missing:ids.filter((id,i)=>powers[i]===null),note:clean?'Pomiar domu po odjęciu monitorowanych urządzeń':'Brak pełnego pomiaru bazy; plan używa profilu lub stałej rezerwy'};
}
export function powerHistory(rows){let unit=null;return rows.map(r=>{unit=r.attributes?.unit_of_measurement||unit;return {at:Date.parse(r.last_updated||r.last_changed),value:powerValue({...r,attributes:{unit_of_measurement:unit}})};}).filter(r=>Number.isFinite(r.at)).sort((a,b)=>a.at-b.at);}
export function cleanLoadDay(series,s,start,end,{sampled=false}={}){
 const ids=[s.load.powerEntity,...s.load.excludeEntities],get=new Map(ids.map(id=>[id,{rows:series[id]||[],i:0}])),rows=[];
 if(!s.load.excludeEntities.length&&!s.load.alreadyExcludesDevices)return rows;
 for(let t=Math.ceil(start/SLOT)*SLOT;t+SLOT<=end;t+=SLOT){let wh=0,covered=0;for(let x=t;x<t+SLOT;x+=30000){const powers=ids.map(id=>{const p=get.get(id);while(p.i+1<p.rows.length&&p.rows[p.i+1].at<=x)p.i++;const r=p.rows[p.i];return r&&r.at<=x&&(!sampled||x-r.at<=s.load.maxGapSeconds*1000)?r.value:null;});if(powers.some(v=>v===null||!Number.isFinite(v)||v<0))continue;const base=powers[0]-powers.slice(1).reduce((a,b)=>a+b,0);if(base< -Math.max(20,powers[0]*.05))continue;covered+=30000;wh+=Math.max(0,base)/120;}
  if(covered>=SLOT*.95)rows.push([t,wh/1000*SLOT/covered]);
 }return rows;
}
export function mergeLoadDay(state,rows,s,c,day,source,now=Date.now()){
 const key=loadKey(s,c);if(state.key&&state.key!==key)throw new Error('Konfiguracja bazy zmieniła się. Rozpocznij nowy import profilu.');state.key=key;const dayStart=Date.parse(day+'T00:00:00Z');const existing=new Map(state.rows.map(row=>[row[0],row])),preferExisting=state.days[day]?.source==='ha'&&source==='influx';for(const row of rows)if(!preferExisting||!existing.has(row[0]))existing.set(row[0],row);state.rows=[...existing.values()].sort((a,b)=>a[0]-b[0]);state.days[day]={rows:state.rows.filter(([at])=>at>=dayStart&&at<dayStart+DAY).length,source:preferExisting?'ha':source,at:now};state.at=now;return state;
}
export function createLoadModel(state,s,c,now=Date.now()){
 const compatible=state.key===loadKey(s,c),bins=new Map(),all=new Map();for(const [at,kWh] of compatible?state.rows:[]){if(at>=now||!Number.isFinite(kWh)||kWh<0)continue;const p=localParts(at,c.timezone),weekday=new Date(p.date+'T12:00:00Z').getUTCDay(),season=Math.floor((Number(p.month)-1)/3),quarter=Number(p.hour)*4+Math.floor(Number(p.minute)/15);for(const key of [`${season}|${weekday}|${quarter}`,`*|${weekday}|${quarter}`,`*|*|${quarter}`]){const b=bins.get(key)||[];b.push({at,date:p.date,w:kWh*4000});bins.set(key,b);}all.set(p.date,true);}
 const prepared=new Map([...bins].map(([key,rows])=>{const dates=new Set(rows.map(r=>r.date));return [key,{days:dates.size,at:Math.max(...rows.map(r=>r.at)),medianW:quantile(rows.map(r=>r.w),.5),lowW:quantile(rows.map(r=>r.w),.2),highW:quantile(rows.map(r=>r.w),.8)}];}));
 return {summary:{at:state.at,compatible,quarters:compatible?state.rows.length:0,days:all.size,latest:compatible?state.rows.at(-1)?.[0]??null:null,cleanedEntities:s.load.excludeEntities,alreadyExcludesDevices:s.load.alreadyExcludesDevices},at(at,live=null){const p=localParts(at,c.timezone),weekday=new Date(p.date+'T12:00:00Z').getUTCDay(),season=Math.floor((Number(p.month)-1)/3),q=Number(p.hour)*4+Math.floor(Number(p.minute)/15);let b=null,key=null;if(s.load.mode==='history')for(const k of [`${season}|${weekday}|${q}`,`*|${weekday}|${q}`,`*|*|${q}`]){const found=prepared.get(k);if(found?.days>=s.load.minDays){b=found;key=k;break;}}
  let w=b?.medianW??s.load.baseW,source=b?'historia '+(key.startsWith('*|*')?'według kwadransa':key.startsWith('*')?'według dnia tygodnia':'według sezonu i dnia tygodnia'):'stała rezerwa';
  const age=b?Math.max(0,(now-b.at)/DAY):null,uncertainty=Math.max(s.load.uncertainty,b&&b.medianW>0?(b.highW-b.lowW)/b.medianW:0,age>90?.5:0);
  if(live?.clean&&now-live.at<=s.load.maxGapSeconds*1000&&at>=now&&at<now+2*3600000){const blend=.5*(1-(at-now)/(2*3600000));w=w*(1-blend)+live.baseW*blend;source+=' + bieżący pomiar';}
  return {w,lowW:Math.max(0,w*(1-uncertainty)),highW:w*(1+uncertainty),days:b?.days||0,source,stale:age>90};
 }};
}
export async function importLoadDayHA(ha,s,start,end){const ids=[s.load.powerEntity,...s.load.excludeEntities],data=await ha.request(`/history/period/${new Date(start).toISOString()}?end_time=${encodeURIComponent(new Date(end).toISOString())}&filter_entity_id=${encodeURIComponent(ids.join(','))}&significant_changes_only=0`);if(!Array.isArray(data))throw new Error('HA nie zwrócił historii mocy domu.');const series={};let count=0;for(const rows of data){if(!Array.isArray(rows)||!rows.length)continue;count+=rows.length;if(count>250000)throw new Error('Za dużo zmian historii w jednej dobie.');series[rows[0].entity_id]=powerHistory(rows);}return cleanLoadDay(series,s,start,end);}
