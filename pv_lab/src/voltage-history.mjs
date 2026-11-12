import {dayBounds} from '../public/presentation.js';
import {numeric} from './adapters.mjs';
export async function voltageHistory(ha,c,day,now=Date.now()){
  const [start,end]=dayBounds(day,c.timezone),until=Math.min(end,now);
  if(start>=now||start<now-8*86400000)throw new Error('Wybierz dzisiaj lub jeden z ostatnich 7 dni.');
  const ids=c.entities.voltages;
  const response=await ha.request(`/history/period/${new Date(start).toISOString()}?end_time=${encodeURIComponent(new Date(until).toISOString())}&filter_entity_id=${encodeURIComponent(ids.join(','))}&significant_changes_only=0`);
  if(!Array.isArray(response))throw new Error('HA zwrócił niepoprawną historię napięć.');
  return {day,start,end,readAt:now,source:'Home Assistant Recorder — bez zapisu w PV Lab',series:ids.map(id=>{
    const rows=response.find(rows=>rows[0]?.entity_id===id)||[];
    const points=rows.map(row=>({x:Date.parse(row.last_updated||row.last_changed),y:row.attributes?.unit_of_measurement==='V'?numeric(row.state):null})).filter(p=>Number.isFinite(p.x)&&p.x<=until).map(p=>({...p,x:Math.max(start,p.x)})).sort((a,b)=>a.x-b.x);
    // Recorder returns state changes: an unchanged last state remains valid until the query end.
    if(points.length&&points.at(-1).x<until)points.push({x:until,y:points.at(-1).y});
    return {entityId:id,points};
  })};
}
