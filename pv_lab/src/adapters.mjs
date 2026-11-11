import {SLOT, floorSlot} from './time.mjs';
export function numeric(v) {if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;}
export function seriesFromMap(map, minutes) {
  if(!map||typeof map!=='object'||Array.isArray(map))return [];
  const rows=Object.entries(map).map(([time,v])=>({start:Date.parse(time),wh:numeric(v),duration:minutes*60000}));
  return rows.filter(r=>Number.isFinite(r.start)&&r.wh!==null&&r.wh>=0);
}
export function normalizeSolcast(rows,minutes=30) {
  if(!Array.isArray(rows))return [];
  return rows.map(r=>({start:Date.parse(r.period_start),duration:minutes*60000,wh:numeric(r.pv_estimate)===null?null:Number(r.pv_estimate)*1000*minutes/60})).filter(r=>Number.isFinite(r.start)&&r.wh!==null&&r.wh>=0);
}
export function quarterHours(rows) {
  const out=new Map();
  for(const r of rows){if(!Number.isFinite(r.start)||!Number.isFinite(r.wh)||r.wh<0||!Number.isFinite(r.duration)||r.duration<=0||r.duration>86400000)continue;
    for(let t=floorSlot(r.start);t<r.start+r.duration;t+=SLOT){const overlap=Math.max(0,Math.min(t+SLOT,r.start+r.duration)-Math.max(t,r.start));out.set(t,(out.get(t)||0)+r.wh*overlap/r.duration);}}
  return [...out].sort((a,b)=>a[0]-b[0]).map(([start,wh])=>({start,wh}));
}
export function groupSeries(provider,group,states) {
  const dedup=new Map();
  for(const id of group.entities){const a=states.get(id)?.attributes||{};let rows=[];
    if(provider.kind==='solcast')rows=Array.isArray(a.detailedForecast)&&a.detailedForecast.length?normalizeSolcast(a.detailedForecast):normalizeSolcast(a.detailedHourly,60);
    else if(a.wh_period_15m)rows=seriesFromMap(a.wh_period_15m,15);
    else if(a.wh_period)rows=seriesFromMap(a.wh_period,provider.kind==='open_meteo'?60:60);
    for(const r of rows)dedup.set(r.start,r);
  }
  return quarterHours([...dedup.values()]);
}
export function combineGroups(groups) {
  if(!groups.length||groups.some(g=>!g.length))return [];
  const maps=groups.map(g=>new Map(g.map(r=>[r.start,r.wh])));
  // Intersection prevents a missing string from silently reducing the forecast.
  return groups[0].filter(r=>maps.every(m=>m.has(r.start))).map(r=>({start:r.start,wh:maps.reduce((s,m)=>s+m.get(r.start),0)}));
}
export function readValue(states,id,at,c,expectedUnit){
  const s=states.get(id);if(!s)return null;
  const reported=Date.parse(s.last_reported||s.last_updated);
  if(!Number.isFinite(reported)||at-reported>c.quality.staleSeconds*1000)return null;
  const n=numeric(s.state);if(n===null)return null;
  const unit=s.attributes?.unit_of_measurement;
  if(expectedUnit==='W')return unit==='W'?n:unit==='kW'?n*1000:null;
  if(expectedUnit==='kWh')return unit==='kWh'?n:unit==='Wh'?n/1000:null;
  return !expectedUnit||unit===expectedUnit?n:null;
}
export function makeSample(states,c,at=Date.now()) {
  const val=(id,unit)=>readValue(states,id,at,c,unit);
  const statusEntity=states.get(c.entities.status), statusAt=Date.parse(statusEntity?.last_reported||statusEntity?.last_updated);
  const status=Number.isFinite(statusAt)&&at-statusAt<=c.quality.staleSeconds*1000?statusEntity.state:null;
  const voltages=c.entities.voltages.map(id=>val(id,'V'));
  return {at,power:val(c.entities.power,'W'),inputPower:val(c.entities.inputPower,'W'),totalEnergy:val(c.entities.totalEnergy,'kWh'),dailyEnergy:val(c.entities.dailyEnergy,'kWh'),
    status,alarms:states.get(c.entities.alarms)?.state??null,voltages,voltageFlag:voltages.some(v=>v===null)?'missing':voltages.some(v=>v>=c.quality.voltageWarning)?'high':'normal',voltageThreshold:c.quality.voltageWarning,
    strings:Object.fromEntries(c.strings.map(s=>{const v=val(s.voltage,'V'),i=val(s.current,'A'),a=Date.parse(states.get(s.voltage)?.last_reported||states.get(s.voltage)?.last_updated),b=Date.parse(states.get(s.current)?.last_reported||states.get(s.current)?.last_updated);return [s.id,v===null||i===null||!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a-b)>c.quality.maxGapSeconds*1000?null:v*i];})),
    optimizers:Object.fromEntries(c.optimizers.map(o=>[o.id,{power:val(o.power,'W'),energy:val(o.energy,'kWh')}]))};
}
