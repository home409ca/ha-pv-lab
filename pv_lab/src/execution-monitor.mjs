import {emptyDashboardPlan} from './dashboard-plan.mjs';
const M=60000;
// Dispatch acknowledgement and physical execution are deliberately independent.
export function executionRecord(execution,records){
 if(!execution)return null;
 if(execution.recordId)return records.find(r=>r.id===execution.recordId)||null;
 const matches=records.filter(r=>Math.abs(r.at-execution.createdAt)<5000&&r.cycles.length===execution.cycles.length&&r.cycles.every(c=>execution.cycles.some(e=>e.key===c.id&&e.powerEntity===c.powerEntity)));
 return matches.length===1?matches[0]:null;
}
function completedMatch(c,history,now){
 const at=c.commandAt??c.start,rows=history.filter(h=>h.powerEntity===c.powerEntity&&Number.isFinite(h.start)&&Number.isFinite(h.end)&&h.start>=at-2*M&&h.start<=at+15*M&&h.end>h.start&&h.end<=now);
 return rows.length===1?rows[0]:null;
}
export function observeExecution(state,activity,now=Date.now(),history=[]){
 const e=state.execution||state.lastExecution;if(!e)return false;
 const archived=e===state.lastExecution;
 if(!archived&&(state.cancelledAt||e.finishedAt))return false;
 let changed=false;
 for(const c of e.cycles){
  if(!['sent','uncertain'].includes(c.status)||c.observedStatus==='completed')continue;
  const completed=completedMatch(c,history,now);
  if(completed){c.actualStart=completed.start;c.actualEnd=completed.end;c.completedAt=now;c.observedStatus='completed';c.observedSource='zapisany cykl z historii mocy';c.observedMessage='Cykl zakończony — potwierdzono zapisanym przebiegiem mocy.';changed=true;continue;}
  if(archived||c.observedStatus==='not_started')continue;
  const d=activity.devices.find(d=>d.powerEntity===c.powerEntity),start=d?.startedAt;
  if(d&&Number.isFinite(start)&&start>=(c.commandAt??c.start)-2*M&&start<=now&&d.running){
   if(c.actualStart!==start||c.observedStatus!=='running'){c.actualStart=start;c.observedStatus='running';c.observedMessage='Wykryto pracę urządzenia.';changed=true;}
  }
  if(c.actualStart&&d?.status==='idle'&&Number.isFinite(d.idleSince)&&d.idleSince>c.actualStart){
   c.actualEnd=d.idleSince;c.completedAt=now;c.observedStatus='completed';c.observedMessage='Cykl zakończony — potwierdzono bezczynność na podstawie mocy.';changed=true;
  }else if(!c.actualStart&&now>(c.commandAt??c.start)+15*M&&d?.status==='idle'&&Number.isFinite(d.idleSince)&&d.idleSince<=(c.commandAt??c.start)){
   c.observedStatus='not_started';c.observedMessage='Nie wykryto uruchomienia po wysłaniu polecenia.';changed=true;
  }else if(d?.status==='unknown'&&c.observedStatus!=='unknown'){
   c.observedStatus='unknown';c.observedMessage='Brak świeżych pomiarów — zakończenie niepotwierdzone.';changed=true;
  }
 }
 if(archived)return changed;
 const done=e.cycles.every(c=>['failed','missed','cancelled'].includes(c.status)||['completed','not_started'].includes(c.observedStatus));
 // Do not let missing telemetry leave Auto armed indefinitely beyond its consented dates.
 if(!done&&now>e.horizon.latest+24*60*M){for(const c of e.cycles)if(!['completed','not_started'].includes(c.observedStatus))c.observedMessage='Brak potwierdzenia zakończenia. Zamknięto obserwację po 24 h od zakresu planu.';}
 if(done||now>e.horizon.latest+24*60*M){
  e.enabled=false;e.auto=false;e.finishedAt=now;e.reviewMessage=done?'Zakończono obserwację planu.':'Zakończenie niepotwierdzone — brak danych.';
  const last=structuredClone(e),watch=state.autoWatch,setup=state.autoSetup;
  Object.assign(state,emptyDashboardPlan(),{execution:null,references:[],lastExecution:last,completedAt:now,autoWatch:watch,autoSetup:setup?{...setup,active:false}:null,timezone:state.timezone});changed=true;
 }
 return changed;
}
