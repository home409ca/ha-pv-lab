import {allProposals} from './plan-selection.mjs';
import {publicExecution} from './execution-plan.mjs';
import {devicePriority} from '../public/device-order.js';
import {randomUUID} from 'node:crypto';
import {parseLocalInput} from '../public/presentation.js';
const IDS=['zmywarka','pralka'];
export const emptyDashboardPlan=()=>({version:1,id:null,createdAt:null,expiresAt:null,request:null,proposals:[],approvedId:null,approvedAt:null,cancelledAt:null,cancelReason:null});
export function dashboardInput(raw,settings,c,now=Date.now()){
 if(!raw||!IDS.every(id=>Number.isInteger(raw.counts?.[id])&&raw.counts[id]>=0&&raw.counts[id]<=8)||Object.values(raw.counts).reduce((a,b)=>a+b,0)<1||Object.values(raw.counts).reduce((a,b)=>a+b,0)>8||Object.keys(raw.counts).some(k=>!IDS.includes(k))||!['pv','cost'].includes(raw.goal)||!['today','tomorrow','both','custom'].includes(raw.range))throw new Error('Wybierz 1–8 cykli, zakres dat i cel analizy.');
 const input=structuredClone(settings);input.preset=raw.range;
 if(raw.range==='custom'){input.earliest=parseLocalInput(raw.earliest,c.timezone);input.latest=parseLocalInput(raw.latest,c.timezone);}
 else{input.earliest=null;input.latest=null;}
 input.entries.forEach(e=>e.count=0);
 for(const id of IDS){if(!raw.counts[id])continue;const appliance=c.appliances.find(a=>a.id===id);const entry=input.entries.find(e=>e.deviceId===id)||input.entries.find(e=>appliance?.powerEntity&&e.powerEntity===appliance.powerEntity);if(!entry)throw new Error('Najpierw skonfiguruj profil '+id+' w Planowaniu zużycia.');entry.count=raw.counts[id];}
 return input;
}
export function dashboardProposals(result,request,c,now=Date.now()){
 const rows=result.dashboardAnalyses?.[request.goal]||result.analyses[request.goal];
 const pack=(r,i)=>({id:'p'+i,sourcePlanId:r.id,complete:r.schedule.devices===r.schedule.requested&&r.schedule.requested>0,status:r.status,start:r.schedule.startsAt,end:r.schedule.finishesAt,importKWh:r.schedule.additionalImportKWh,cost:r.schedule.cost,surplusKWh:r.schedule.surplusKWh,optimisticCost:r.schedule.optimisticCost,pessimisticCost:r.schedule.pessimisticCost,cycles:r.devices.filter(d=>d.scheduled).sort((a,b)=>a.scheduled.start-b.scheduled.start||devicePriority(a)-devicePriority(b)).map(d=>({id:d.id,deviceId:c.appliances.find(a=>a.powerEntity===d.powerEntity)?.id||d.id.slice(0,d.id.lastIndexOf('_')),name:d.name,powerEntity:d.powerEntity,start:d.scheduled.start,end:d.scheduled.end,energyKWh:d.energyKWh,profileSource:d.curve?.source||null})),missing:r.devices.filter(d=>!d.scheduled).map(d=>({name:d.name,reason:d.status}))});
 const proposals=rows.slice(0,3).map(pack),references=(result.comparisons||[]).map((row,i)=>({...pack(row.result,'ref'+i),label:row.label,day:row.day,kind:row.kind,status:row.status}));
 return {...emptyDashboardPlan(),selection:result.dashboardSelection?.[request.goal]||null,id:randomUUID(),createdAt:now,expiresAt:Math.min(now+300000,...rows.map(r=>r.validUntil),...proposals.map(p=>p.start||now+300000)),timezone:c.timezone,request:structuredClone(request),proposals,references};
}
export function dashboardPublic(state,now=Date.now()){
 const selected=allProposals(state).find(p=>p.id===state.approvedId)||null,ended=!!selected&&selected.end<=now;
 const approved=!!selected&&!!state.approvedAt&&!state.cancelledAt&&!ended;
 return {...state,execution:publicExecution(state.execution),lastExecution:publicExecution(state.lastExecution),readAt:now,approved,phase:state.cancelledAt?'anulowany':ended?'zakończony':approved?'zatwierdzony':state.id?(state.expiresAt<=now?'propozycje nieaktualne':'propozycje'):'brak planu',selected:approved?selected:null};
}
export function approveDashboard(state,id,previewId,activity,now=Date.now(),knownOff=new Set()){
 const proposal=allProposals(state).find(p=>p.id===id);
 if(state.id!==previewId||!proposal?.complete||state.expiresAt<=now||proposal.cycles.some(c=>c.start<now+60000))throw new Error('Propozycja jest niepełna lub nieaktualna. Przelicz harmonogram.');
 for(const cycle of proposal.cycles){const device=activity.devices.find(d=>d.powerEntity===cycle.powerEntity);if(!knownOff.has(cycle.deviceId)&&(!device||device.status==='unknown'||device.status==='observing'||device.blockedUntil>cycle.start))throw new Error('Stan lub czas zakończenia urządzenia zmienił się. Odczytaj dane i przelicz plan.');}
 return {...state,approvedId:id,approvedAt:now,cancelledAt:null,cancelReason:null};
}
export function dashboardConflict(state,activity,now=Date.now()){
 if(state.execution?.enabled)return null;
 const selected=dashboardPublic(state,now).selected;if(!selected)return null;
 for(const cycle of selected.cycles){if(cycle.end<=now)continue;const d=activity.devices.find(d=>d.powerEntity===cycle.powerEntity);if(!d||d.status==='unknown'||d.status==='observing')return 'Brak potwierdzonego stanu '+cycle.name;
  // While a confirmed planned cycle is already in its own window, being on is expected.
  if(cycle.start>now&&d.status!=='idle'&&d.blockedUntil>cycle.start)return 'Urządzenie pozostaje zajęte: '+cycle.name;
 }
 return null;
}
