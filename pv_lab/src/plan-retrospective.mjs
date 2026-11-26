import {localParts} from './time.mjs';
// Shift the *same measured combination*; do not invent a different appliance program.
export function retrospective(record,series,from,to,size,priceAt){
 const STEP=30000,Q=900000,lookup=(rows,t)=>{let lo=0,hi=rows.length;while(lo<hi){const m=(lo+hi)>>>1;if(rows[m].at<=t)lo=m+1;else hi=m;}return rows[lo-1]?.value??null;},bill=(n,p)=>Math.max(0,n)*p.buy-Math.max(0,-n)*p.sell;
 const first=Math.min(...record.cycles.map(c=>c.start)),last=Math.max(...record.cycles.map(c=>c.end)),earliest=Math.max(from,record.analysisRange?.earliest??first),latest=Math.min(to,record.analysisRange?.latest??last),plans=[];
 for(let start=Math.ceil(earliest/Q)*Q;start+last-first<=latest;start+=Q){
  const delta=start-first,cycles=record.cycles.map(c=>({...c,start:c.start+delta,end:c.end+delta})),groups=new Map();let valid=true;
  for(const c of cycles){const d=record.settings.devices.find(d=>d.id===c.id);if(d?.earliest!=null&&c.start<d.earliest||d?.deadline!=null&&c.end>d.deadline){valid=false;break;}}
  if(!valid)continue;
  for(let t=from;t<to;t+=STEP){
   if(!cycles.some(c=>Math.floor(t/size)>=Math.floor(c.start/size)&&Math.floor(t/size)<=Math.floor((c.end-1)/size)))continue;
   const house=lookup(series[record.housePowerEntity]||[],t),pv=lookup(series[record.pvPowerEntity]||[],t),real=record.cycles.filter(c=>t>=c.start&&t<c.end),realP=real.map(c=>lookup(series[c.powerEntity]||[],t)),active=cycles.filter(c=>t>=c.start&&t<c.end),powers=active.map(c=>lookup(series[c.powerEntity]||[],t-delta)),p=priceAt(t);
   if(house===null||pv===null||[...realP,...powers].some(v=>v===null)||p.errors.length){valid=false;break;}
   const base=house-realP.reduce((n,w)=>n+w,0),device=powers.reduce((n,w)=>n+w,0);if(base< -Math.max(20,house*.05)||record.settings.maxImportW!=null&&Math.max(0,base+device-pv)>record.settings.maxImportW){valid=false;break;}
   const local=localParts(t,record.timezone),minute=Number(local.hour)*60+Number(local.minute),weekday=new Date(local.date+'T12:00:00Z').getUTCDay();
   if(active.some(c=>{const d=record.settings.devices.find(d=>d.id===c.id);return d&&(d.skipWeekends&&[0,6].includes(weekday)||!d.allowedHours.some(([a,b])=>minute>=a&&minute<b));})){valid=false;break;}
   const key=Math.floor(t/size)+'|'+p.buy+'|'+p.sell,g=groups.get(key)||{before:0,after:0,p};g.before+=(Math.max(0,base)-pv)/120000;g.after+=(Math.max(0,base)+device-pv)/120000;groups.set(key,g);
  }
  if(valid&&groups.size)plans.push({start,end:start+last-first,cost:[...groups.values()].reduce((n,g)=>n+bill(g.after,g.p)-bill(g.before,g.p),0)});
 }
 plans.sort((a,b)=>a.cost-b.cost||a.start-b.start);
 return {best:plans[0]||null,evaluated:plans.length,from,to,note:'Ocena po fakcie: przesunięcie tego samego zmierzonego planu co 15 min w zakończonych okresach z dostępnymi danymi. To nie dowód, że wcześniej można było przewidzieć lepszą pogodę. Zakłada niezmienione pozostałe zużycie i produkcję; nie modeluje wpływu odbiorników na napięcie ani zmian programu.'};
}
