import {previewTimeline,allProposals} from './plan-selection.mjs';
import {publicExecution} from './execution-plan.mjs';
import {devicePriority} from '../public/device-order.js';
import {randomUUID} from 'node:crypto';
import {parseLocalInput} from '../public/presentation.js';
const IDS=['zmywarka','pralka'];
export const emptyDashboardPlan=()=>({version:1,id:null,createdAt:null,expiresAt:null,request:null,proposals:[],approvedId:null,approvedAt:null,cancelledAt:null,cancelReason:null});
export function validateDashboardVariants(raw){
 if(raw===undefined)return {};
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.entries(raw).some(([id,value])=>!IDS.includes(id)||!['typical','mean','maximum'].includes(value)))throw new Error('Wybierz wariant programu: Typowy, Średni lub Największy.');
 return {...raw};
}
export function validateDashboardProfiles(raw){
 if(raw===undefined)return {};
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.entries(raw).some(([id,value])=>!IDS.includes(id)||value!==null&&(typeof value!=='string'||!value||value.length>200)))throw new Error('Wybierz zapisany profil urządzenia.');return {...raw};
}
export function dashboardPrograms(settings,c,library={profiles:[]}){
 const titles={typical:'Typowy',mean:'Średni',maximum:'Największy'};
 return Object.fromEntries(IDS.map(id=>{const a=c.appliances.find(a=>a.id===id),entry=settings.entries.find(e=>e.deviceId===id)||settings.entries.find(e=>a?.powerEntity&&e.powerEntity===a.powerEntity),matches=p=>p.deviceId?p.deviceId===id:p.source?.powerEntity?p.source.powerEntity===a?.powerEntity:true,primary=library.profiles.find(p=>p.id===library.primaryProfiles?.[id]&&matches(p)),saved=library.profiles.find(p=>p.id===entry?.profileId&&matches(p)),profile=primary||saved||library.profiles.find(matches),curves=p=>Object.fromEntries(Object.entries(p?.variants||{}).map(([v,curve])=>[v,{durationMinutes:curve.wh?.length*5,energyKWh:curve.wh?.reduce((a,b)=>a+b,0)/1000}])),details=profile?curves(profile):Object.fromEntries(Object.keys(titles).map(v=>[v,{durationMinutes:entry?.durationMinutes,energyKWh:entry?.energyKWh}])),choices=[],seen=new Set(),add=(pid,v,label,info)=>{const key=JSON.stringify([pid,v]);if(!seen.has(key)){choices.push({key,profileId:pid,variant:v,label,...info});seen.add(key);}};
  for(const p of library.profiles.filter(p=>p.deviceId?p.deviceId===id:p.source?.powerEntity?p.source.powerEntity===a?.powerEntity:true).sort((a,b)=>Number(!!b.manual)-Number(!!a.manual)||a.name.localeCompare(b.name,'pl'))){const v=p.variants?.[p.defaultVariant]?p.defaultVariant:p.variants?.typical?'typical':Object.keys(p.variants||{})[0];if(v)add(p.id,v,p.name,curves(p)[v]);}
  for(const v of choices.length?[]:Object.keys(titles))add(profile?.id||null,v,titles[v],details[v]);
  return [id,{profileId:profile?.id||null,variant:profile?.defaultVariant||Object.keys(profile?.variants||{})[0]||'typical',name:profile?.name||'Profil ręczny',manual:!profile||!!profile.manual,variants:profile?Object.keys(titles).filter(v=>profile.variants?.[v]):Object.keys(titles),details,choices}];
 }));
}
const dashboardEntry=(settings,c,id)=>settings.entries.find(e=>e.deviceId===id)||settings.entries.find(e=>e.powerEntity===c.appliances.find(a=>a.id===id)?.powerEntity);
export const dashboardVariants=(settings,c)=>Object.fromEntries(IDS.map(id=>[id,dashboardEntry(settings,c,id)?.variant||'typical']));
export const dashboardProfileIds=(settings,c)=>Object.fromEntries(IDS.map(id=>[id,dashboardEntry(settings,c,id)?.profileId||null]));
export function dashboardInput(raw,settings,c,now=Date.now(),library=null){
 if(!raw||!IDS.every(id=>Number.isInteger(raw.counts?.[id])&&raw.counts[id]>=0&&raw.counts[id]<=8)||Object.values(raw.counts).reduce((a,b)=>a+b,0)<1||Object.values(raw.counts).reduce((a,b)=>a+b,0)>8||Object.keys(raw.counts).some(k=>!IDS.includes(k))||!['pv','cost'].includes(raw.goal)||!['today','tomorrow','both','custom'].includes(raw.range))throw new Error('Wybierz 1–8 cykli, zakres dat i cel analizy.');
 const variants=validateDashboardVariants(raw.variants),profiles=validateDashboardProfiles(raw.profile_ids),input=structuredClone(settings);input.preset=raw.range;
 if(raw.range==='custom'){input.earliest=parseLocalInput(raw.earliest,c.timezone);input.latest=parseLocalInput(raw.latest,c.timezone);}
 else{input.earliest=null;input.latest=null;}
 input.entries.forEach(e=>e.count=0);for(const [id,pid] of Object.entries(profiles)){const a=c.appliances.find(a=>a.id===id),entry=input.entries.find(e=>e.deviceId===id)||input.entries.find(e=>a?.powerEntity&&e.powerEntity===a.powerEntity);if(!entry)continue;if(pid&&library){const p=library.profiles.find(p=>p.id===pid);if(!p){const fallback=dashboardPrograms(settings,c,library)[id];entry.profileId=fallback.profileId;entry.variant=fallback.variant;variants[id]=fallback.variant;continue;}if(p.deviceId?p.deviceId!==id:p.source?.powerEntity?p.source.powerEntity!==a?.powerEntity:false)throw new Error('Profil nie pasuje do urządzenia '+id+'.');}entry.profileId=pid;}for(const [id,variant] of Object.entries(variants)){const a=c.appliances.find(a=>a.id===id),entry=input.entries.find(e=>e.deviceId===id)||input.entries.find(e=>a?.powerEntity&&e.powerEntity===a.powerEntity);if(entry)entry.variant=variant;}
 for(const id of IDS){if(!raw.counts[id])continue;const appliance=c.appliances.find(a=>a.id===id);const entry=input.entries.find(e=>e.deviceId===id)||input.entries.find(e=>appliance?.powerEntity&&e.powerEntity===appliance.powerEntity);if(!entry)throw new Error('Najpierw skonfiguruj profil '+id+' w Planowaniu zużycia.');entry.count=raw.counts[id];if(variants[id])entry.variant=variants[id];}
 if(library)for(const entry of input.entries){const p=library.profiles.find(p=>p.id===entry.profileId);if(p&&!p.variants[entry.variant])entry.variant=p.defaultVariant&&p.variants[p.defaultVariant]?p.defaultVariant:Object.keys(p.variants)[0];}
 return input;
}
export function dashboardProposals(result,request,c,now=Date.now()){
 const rows=result.dashboardAnalyses?.[request.goal]||result.analyses[request.goal];
 const pack=(r,i)=>({id:'p'+i,sourcePlanId:r.id,complete:r.schedule.devices===r.schedule.requested&&r.schedule.requested>0,status:r.status,start:r.schedule.startsAt,end:r.schedule.finishesAt,importKWh:r.schedule.additionalImportKWh,cost:r.schedule.cost,surplusKWh:r.schedule.surplusKWh,optimisticCost:r.schedule.optimisticCost,pessimisticCost:r.schedule.pessimisticCost,forecastAt:result.calculatedAt,horizon:{earliest:now,latest:result.range.latest},chartStart:now,timeline:previewTimeline(result,r),physicalImportKWh:r.schedule.physicalImportKWh,gridCost:r.schedule.gridCost,opportunityCost:r.schedule.opportunityCost,cycles:r.devices.filter(d=>d.scheduled).sort((a,b)=>a.scheduled.start-b.scheduled.start||devicePriority(a)-devicePriority(b)).map(d=>({id:d.id,deviceId:c.appliances.find(a=>a.powerEntity===d.powerEntity)?.id||d.id.slice(0,d.id.lastIndexOf('_')),name:d.name,powerEntity:d.powerEntity,start:d.scheduled.start,end:d.scheduled.end,energyKWh:d.energyKWh,profileSource:d.curve?.source||null})),missing:r.devices.filter(d=>!d.scheduled).map(d=>({name:d.name,reason:d.status}))});
 const proposals=rows.slice(0,3).map(pack),references=(result.comparisons||[]).map((row,i)=>({...pack(row.result,'ref'+i),label:row.label,day:row.day,kind:row.kind,referenceStart:row.at,windowStart:row.windowStart,windowEnd:row.windowEnd,ongoing:row.ongoing,peakKWh:row.peakKWh,note:row.note,status:row.status}));
 return {...emptyDashboardPlan(),selection:result.dashboardSelection?.[request.goal]||null,id:randomUUID(),createdAt:now,expiresAt:Math.min(now+300000,...rows.map(r=>r.validUntil),...proposals.map(p=>p.start||now+300000)),timezone:c.timezone,request:{...structuredClone(request),variants:dashboardVariants(result.settings,c),profile_ids:dashboardProfileIds(result.settings,c)},activitySnapshot:(result.activity?.devices||[]).map(({powerEntity,status,blockedUntil})=>({powerEntity,status,blockedUntil})),proposals,references};
}
export function dashboardPublic(state,now=Date.now()){
 const selected=allProposals(state).find(p=>p.id===state.approvedId)||null,ended=!!selected&&selected.end<=now;
 const approved=!!selected&&!!state.approvedAt&&!state.cancelledAt&&!ended;
 return {...state,execution:publicExecution(state.execution),lastExecution:publicExecution(state.lastExecution),readAt:now,approved,phase:state.cancelledAt?'anulowany':ended?'zakończony':approved?'zatwierdzony':state.id?(state.expiresAt<=now?'propozycje nieaktualne':'propozycje'):'brak planu',selected:approved?selected:null};
}
export function approveDashboard(state,id,previewId,activity,now=Date.now(),knownOff=new Set()){
 const proposal=allProposals(state).find(p=>p.id===id);
 if(state.id!==previewId||!proposal?.complete||state.expiresAt<=now||proposal.cycles.some(c=>c.start<now+60000))throw new Error('Propozycja jest niepełna lub nieaktualna. Przelicz harmonogram.');
 for(const cycle of proposal.cycles){
  if(knownOff.has(cycle.deviceId))continue;
  const device=activity?.devices?.find(d=>d.powerEntity===cycle.powerEntity),previous=state.activitySnapshot?.find(d=>d.powerEntity===cycle.powerEntity),name=cycle.name;
  if(!device||!['idle','unknown','observing','running','starting','pause'].includes(device.status)||!Number.isFinite(device.blockedUntil))throw new Error(name+': brak danych o dostępności urządzenia. Sprawdź encję mocy lub switch w ustawieniach.');
  const uncertain=['unknown','observing'].includes(device.status);
  if(uncertain&&!['unknown','observing'].includes(previous?.status))throw new Error(name+': od obliczenia planu utracono potwierdzenie stanu urządzenia. Przelicz propozycje na aktualnych danych.');
  if(device.status!=='idle'&&device.blockedUntil>cycle.start){const until=new Intl.DateTimeFormat('pl-PL',{timeZone:state.timezone||'Europe/Warsaw',hour:'2-digit',minute:'2-digit'}).format(device.blockedUntil);throw new Error(name+': '+(uncertain?'trwa potwierdzanie dostępności':'urządzenie nadal pracuje')+' — najwcześniejszy bezpieczny start '+until+'. Przelicz propozycje.');}
 }

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
