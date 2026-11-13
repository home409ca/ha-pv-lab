import {randomUUID} from 'node:crypto';
import {DAY} from './time.mjs';
import {compactOptimizer,deviceCurve} from './optimizer.mjs';
import {powerHistory,signedPowerHistory,reconstructHouseHistory} from './optimizer-load.mjs';
import {pricesAt} from './optimizer-tariff.mjs';
const STEP=300000;
export function optimizerRecord(result,s,library,c,now=Date.now()){
 if(!result||result.calculatedAt>now||now-result.calculatedAt>900000||result.validUntil<=now||!result.schedule.devices||result.devices.some(d=>d.scheduled&&d.scheduled.start<now))throw new Error('Najpierw przelicz aktualny harmonogram.');
 const cycles=result.devices.filter(d=>d.scheduled).map(d=>{const input=s.devices.find(x=>x.id===d.id),profile=library.profiles.find(p=>p.id===input.profileId),powerEntity=d.powerEntity||input.powerEntity||profile?.source?.powerEntity||c.appliances.find(a=>a.id===profile?.deviceId)?.powerEntity||null;return {id:d.id,name:d.name,powerEntity,start:d.scheduled.start,end:d.scheduled.end,curve:structuredClone(d.curve||deviceCurve(input,library))};});
 if(cycles.some((a,i)=>cycles.some((b,j)=>j>i&&a.powerEntity&&a.powerEntity===b.powerEntity&&a.start<b.end&&a.end>b.start)))throw new Error('Dwa cykle wskazują ten sam pomiar urządzenia. Rozdziel ich definicje.');
 return {id:randomUUID(),at:now,timezone:c.timezone,settings:structuredClone(s),prices:structuredClone(result.prices),pvPowerEntity:c.entities.power,housePowerEntity:s.load.powerEntity,result:compactOptimizer(result),cycles,confirmedExecuted:false,verification:null};
}
function find(rows,t){let lo=0,hi=rows.length;while(lo<hi){const m=(lo+hi)>>>1;if(rows[m].at<=t)lo=m+1;else hi=m;}return rows[lo-1]?.value??null;}
export async function verifyOptimizerRecord(record,ha,now=Date.now()){
 if(!record.confirmedExecuted)throw new Error('Najpierw potwierdź, że urządzenia wykonały zapisany harmonogram.');
 if(record.cycles.some(c=>c.end>now))throw new Error('Poczekaj na zakończenie wszystkich cykli.');
 if(record.cycles.some(c=>!c.powerEntity))throw new Error('Brak encji mocy co najmniej jednego urządzenia. Nie odtwarzamy rzeczywistego cyklu z planu.');
 const size=record.settings.balanceMode==='hourly'?3600000:record.settings.balanceMode==='quarterly'?900000:STEP,from=Math.floor(Math.min(...record.cycles.map(c=>c.start))/size)*size,to=Math.ceil(Math.max(...record.cycles.map(c=>c.end))/size)*size;
 if(to>now)throw new Error('Poczekaj na zamknięcie ostatniego okresu rozliczeniowego.');
 const ids=[...new Set([record.pvPowerEntity,record.housePowerEntity,...(record.settings.measurements?.netPower?[record.settings.measurements.netPower]:[]),...record.cycles.map(c=>c.powerEntity)])],series=Object.fromEntries(ids.map(id=>[id,[]]));
 for(let t=from;t<to;t+=DAY){const end=Math.min(t+DAY,to),data=await ha.request(`/history/period/${new Date(t).toISOString()}?end_time=${encodeURIComponent(new Date(end).toISOString())}&filter_entity_id=${encodeURIComponent(ids.join(','))}&significant_changes_only=0`);if(!Array.isArray(data))throw new Error('Brak rzeczywistej historii mocy.');for(const rows of data)if(rows?.length&&series[rows[0].entity_id]){if(rows.length>250000)throw new Error('Zbyt duża historia do weryfikacji.');series[rows[0].entity_id].push(...(rows[0].entity_id===record.settings.measurements?.netPower?signedPowerHistory(rows):powerHistory(rows)));}}
 for(const id of ids)series[id]=[...new Map(series[id].map(r=>[r.at,r])).values()].sort((a,b)=>a.at-b.at);
 if(record.settings.measurements?.netPower)series[record.housePowerEntity]=reconstructHouseHistory(series,record.housePowerEntity,record.pvPowerEntity,record.settings.measurements.netPower,record.settings.measurements.netPositiveExport);
 const groups=new Map(),energies=Object.fromEntries(record.cycles.map(c=>[c.id,0]));let gaps=0;
 for(let t=from;t<to;t+=30000){const active=record.cycles.filter(c=>t>=c.start&&t<c.end),touch=record.cycles.some(c=>groupTouches(c,t,size));if(!touch)continue;const house=find(series[record.housePowerEntity],t),pv=find(series[record.pvPowerEntity],t),powers=active.map(c=>find(series[c.powerEntity],t)),price=pricesAt(t,record.settings,{timezone:record.timezone},record.prices),key=Math.floor(t/size)*size+'|'+JSON.stringify([price.buy,price.sell]),g=groups.get(key)||{before:0,after:0,price,valid:true};groups.set(key,g);
  if(house===null||pv===null||powers.some(v=>v===null)||price.errors.length){g.valid=false;gaps++;continue;}const device=powers.reduce((a,b)=>a+b,0);if(device>house+Math.max(20,house*.05)){g.valid=false;gaps++;continue;}active.forEach((c,i)=>energies[c.id]+=powers[i]/120000);g.after+=(house-pv)/120000;g.before+=(house-pv-device)/120000;
 }
 if(gaps||[...groups.values()].some(g=>!g.valid))throw new Error('Niepełne lub niespójne pomiary domu, PV i urządzeń. Nie zapisano pozornego kosztu rzeczywistego.');
 if(record.cycles.some(c=>energies[c.id]<Math.max(.005,c.curve.kWh*.1)))throw new Error('Co najmniej jedno urządzenie nie wykazuje oczekiwanego cyklu. Sprawdź potwierdzenie wykonania i encje.');
 const bill=(n,p)=>Math.max(0,n)*p.buy-Math.max(0,-n)*p.sell;let cost=0,additionalImportKWh=0,lostExportKWh=0;
 for(const g of groups.values()){cost+=bill(g.after,g.price)-bill(g.before,g.price);additionalImportKWh+=Math.max(0,g.after)-Math.max(0,g.before);lostExportKWh+=Math.max(0,-g.before)-Math.max(0,-g.after);}
 return {at:now,from,to,predictedCost:record.result.schedule.cost,predictedImportKWh:record.result.schedule.additionalImportKWh,predictedLostExportKWh:record.result.schedule.lostExportKWh,measuredCost:cost,error:cost-record.result.schedule.cost,additionalImportKWh,lostExportKWh,deviceKWh:energies,note:'Weryfikacja pomiarami mocy przy stawkach zapisanych w planie; nie jest rozliczeniem faktury. Rzeczywiste przepływy odtworzono z historii stanów mocy. Nie zastępują liczników rozliczeniowych OSD; nie uwzględniamy późniejszej zmiany RCEm.'};
}
function groupTouches(c,t,size){return Math.floor(t/size)>=Math.floor(c.start/size)&&Math.floor(t/size)<=Math.floor((c.end-1)/size);}
