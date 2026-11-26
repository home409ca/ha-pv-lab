import {allProposals,sourcePlan,planTimeline,previewTimeline} from './plan-selection.mjs';
import {randomUUID} from 'node:crypto';
export const EXECUTION_MODES=['fixed','finish','flexible'];
const MINUTE=60000,FREEZE=15*MINUTE;
export function armExecution(state,result,c,mode='fixed',auto=false,library={profiles:[]},now=Date.now()){
 if(!EXECUTION_MODES.includes(mode))throw new Error('Nieprawidłowy tryb wykonania.');
 const selected=allProposals(state).find(p=>p.id===state.approvedId);if(!selected?.complete||!selected.cycles.length)throw new Error('Zatwierdź pełny plan.');
 const source=sourcePlan(result,selected.sourcePlanId,state.request?.goal||'cost');
 const cycles=selected.cycles.map(cycle=>{const cost=source?.devices.find(d=>d.id===cycle.id)?.accounting;const appliance=c.appliances.find(a=>a.id===cycle.deviceId),switchEntity=appliance?.switchEntity;if(!/^switch\.[a-z0-9_]+$/.test(switchEntity||''))throw new Error('Ustaw switch dla urządzenia '+cycle.name+' w Ustawieniach.');return {...cycle,key:cycle.id,switchEntity,status:'pending',commandAt:null,estimate:cost?{cost:cost.cost,importKWh:cost.additionalImportKWh,optimisticCost:cost.optimisticCost,pessimisticCost:cost.pessimisticCost}:null};});
 const finishBy=Object.fromEntries(cycles.map(c=>[c.deviceId,Math.max(...cycles.filter(x=>x.deviceId===c.deviceId).map(x=>x.end))]));
 const ids=new Set(result.settings.entries.map(e=>e.profileId).filter(Boolean));
 return {...state,execution:{schema:1,planId:randomUUID(),revision:1,createdAt:now,enabled:true,mode,auto,cycles,finishBy,horizon:structuredClone(result.range),plannerInput:structuredClone(result.settings),library:{profiles:structuredClone(library.profiles.filter(p=>ids.has(p.id)))},timeline:previewTimeline(result,source),chartStart:now,forecastAt:result.calculatedAt??now,lastCheck:null,lastReviewAt:now,reviewMessage:'Plan oczekuje na wykonanie w Home Assistant.',changes:[]}};
}
export function publicExecution(execution){if(!execution)return null;const {plannerInput,library,...view}=execution;return {...view,monitoring:!execution.finishedAt&&execution.cycles.some(c=>['sent','uncertain'].includes(c.status)&&!['completed','not_started'].includes(c.observedStatus))};}
export function applyExecutionReceipt(state,event,now=Date.now()){
 const e=state.execution;if(!e||event.plan_id!==e.planId)throw new Error('Potwierdzenie dotyczy innego planu.');const cycle=e.cycles.find(c=>c.key===event.cycle_key);if(!cycle||!['dispatching','sent','failed','missed','uncertain'].includes(event.status))throw new Error('Nieprawidłowe potwierdzenie wykonania.');
 if(['sent','failed','missed','uncertain'].includes(cycle.status))return state;
 cycle.status=event.status;cycle.commandAt=Number.isFinite(event.at)?event.at:now;cycle.message={dispatching:'Rozpoczęto wysyłanie polecenia.',sent:'Wysłano polecenie włączenia.',failed:'Nie udało się wysłać polecenia.',missed:'Termin minął — polecenia nie wysłano.',uncertain:'Wysyłanie przerwał restart; nie ponawiamy automatycznie.'}[event.status];
 if(e.cycles.every(c=>!['pending','dispatching'].includes(c.status))){e.enabled=false;e.reviewMessage='Polecenia obsłużone — oczekiwanie na potwierdzenie pracy i zakończenia.';}return state;
}
export function reviewInputs(execution,now){
 const remaining=execution.cycles.filter(c=>c.status==='pending');if(!remaining.length)return null;
 const build=exact=>{const input=structuredClone(execution.plannerInput);input.preset='custom';input.earliest=Math.max(now,execution.horizon.earliest);input.latest=execution.horizon.latest;input.entries=[];
  for(const cycle of remaining){const original=execution.plannerInput.entries.find(e=>e.id===cycle.key.slice(0,cycle.key.lastIndexOf('_')));if(!original)throw new Error('Brak pierwotnego profilu cyklu.');const committedEnd=Math.max(0,...execution.cycles.filter(c=>c.key!==cycle.key&&c.powerEntity===cycle.powerEntity&&['sent','dispatching','uncertain'].includes(c.status)).map(c=>c.end)),frozen=cycle.start<=now+FREEZE,entry={...structuredClone(original),id:cycle.key,count:1};const bound=execution.mode==='finish'?execution.finishBy[cycle.deviceId]:execution.horizon.latest;
   entry.finishDate='';entry.finishBy='';entry.template={...entry.template,earliest:exact||frozen?cycle.start:Math.max(now+FREEZE,committedEnd,execution.horizon.earliest,entry.template?.earliest??0),deadline:exact||frozen?cycle.end:Math.min(bound,execution.horizon.latest,entry.template?.deadline??Infinity)};
   if(original.finishBy){entry.finishBy=original.finishBy;entry.finishDate=original.finishDate;}input.entries.push(entry);
  }return input;};return {baseline:build(true),candidate:build(false),remaining};
}
export function acceptReview(state,before,result,now=Date.now()){
 const e=state.execution;if(!e?.enabled||e.mode==='fixed'||state.cancelledAt)return false;
 const plans=result.analyses.cost.filter(p=>p.schedule.devices===p.schedule.requested&&p.schedule.requested>0),base=before.analyses.cost.find(p=>p.schedule.devices===p.schedule.requested&&p.schedule.requested>0);if(!base){e.reviewMessage='Nie można porównać pierwotnego terminu na aktualnych danych — godziny zachowane.';return false;}
 e.lastCheck={at:now,previousCost:base.schedule.cost,bestCost:plans[0]?.schedule.cost??null,changed:false};e.timeline=previewTimeline(result,base);e.chartStart=now;e.forecastAt=now;
 const chosen=plans.find(p=>base.schedule.cost-p.schedule.cost>=.05-1e-8||p.schedule.cost<=base.schedule.cost+1e-8&&Math.round(p.schedule.cost*100)===Math.round(base.schedule.cost*100)&&p.schedule.surplusKWh-base.schedule.surplusKWh>=.2-1e-8);
 if(chosen&&chosen.devices.length!==e.cycles.filter(c=>c.status==='pending').length)return false;
 if(!chosen){e.reviewMessage='Sprawdzono: brak poprawy o 5 gr lub większego zapasu PV bez wzrostu kosztu.';return false;}
 const updates=[];for(const d of chosen.devices){const cycle=e.cycles.find(c=>d.id===c.key+'_1');if(!cycle||cycle.status!=='pending'||!d.scheduled)return false;if(cycle.start<=now+FREEZE&&d.scheduled.start!==cycle.start)return false;if(d.scheduled.start<Math.max(now+FREEZE,e.horizon.earliest)&&d.scheduled.start!==cycle.start||d.scheduled.end>e.horizon.latest||e.mode==='finish'&&d.scheduled.end>e.finishBy[cycle.deviceId])return false;updates.push({cycle,start:d.scheduled.start,end:d.scheduled.end,estimate:d.accounting?{cost:d.accounting.cost,importKWh:d.accounting.additionalImportKWh,optimisticCost:d.accounting.optimisticCost,pessimisticCost:d.accounting.pessimisticCost}:cycle.estimate});}
 if(!updates.some(u=>u.cycle.start!==u.start))return false;
 const changes=updates.filter(u=>u.cycle.start!==u.start).map(u=>({name:u.cycle.name,from:u.cycle.start,to:u.start}));for(const u of updates){u.cycle.start=u.start;u.cycle.end=u.end;u.cycle.estimate=u.estimate;}
 const selected=allProposals(state).find(p=>p.id===state.approvedId);for(const c of selected.cycles){const updated=e.cycles.find(x=>x.key===c.id);if(updated){c.start=updated.start;c.end=updated.end;}}selected.start=Math.min(...selected.cycles.map(c=>c.start));selected.end=Math.max(...selected.cycles.map(c=>c.end));const committed=e.cycles.filter(c=>c.status!=='pending').reduce((v,c)=>({cost:v.cost+(c.estimate?.cost||0),importKWh:v.importKWh+(c.estimate?.importKWh||0),optimisticCost:v.optimisticCost+(c.estimate?.optimisticCost||0),pessimisticCost:v.pessimisticCost+(c.estimate?.pessimisticCost||0)}),{cost:0,importKWh:0,optimisticCost:0,pessimisticCost:0});selected.cost=chosen.schedule.cost+committed.cost;selected.importKWh=chosen.schedule.additionalImportKWh+committed.importKWh;selected.optimisticCost=chosen.schedule.optimisticCost+committed.optimisticCost;selected.pessimisticCost=chosen.schedule.pessimisticCost+committed.pessimisticCost;selected.surplusKWh=chosen.schedule.surplusKWh;
 e.timeline=previewTimeline(result,chosen);e.chartStart=now;e.lastCheck.changed=true;e.lastCheck.bestCost=chosen.schedule.cost;e.revision++;e.changes.unshift({at:now,saving:base.schedule.cost-chosen.schedule.cost,cycles:changes});e.changes=e.changes.slice(0,20);e.reviewMessage='Zaktualizowano przyszłe uruchomienia na podstawie aktualnej prognozy.';return true;
}
