import {optimizeEnergy,buildContext,candidate} from './optimizer.mjs';
import {optimizerDefaults,rateKeys} from './optimizer-settings.mjs';
import {emptyLoad} from './optimizer-load.mjs';
import {dayBounds} from '../public/presentation.js';
import {localParts} from './time.mjs';
export function batchDefaults(c,library){return {version:1,baseW:c.planner.baseW,mode:c.planner.mode,earliest:null,latest:null,entries:c.appliances.map(a=>({deviceId:a.id,count:a.id==='pralka'?2:a.id==='zmywarka'?1:0,profileId:library.profiles.find(p=>p.deviceId===a.id)?.id||null,variant:'typical',energyKWh:1,durationMinutes:60}))};}
export function resolveBatch(saved,c,library){const out=batchDefaults(c,library);if(!saved)return out;for(const key of ['baseW','mode','earliest','latest'])out[key]=saved[key]??out[key];out.entries=out.entries.map(e=>{const old=saved.entries?.find(x=>x.deviceId===e.deviceId);if(!old)return e;const next={...e,...old};if(next.profileId&&!library.profiles.some(p=>p.id===next.profileId&&p.deviceId===e.deviceId))next.profileId=null;return next;});return validateBatch(out,c,library);}
export function validateBatch(raw,c,library){
 if(raw?.version!==1||!['hourly','quarterly','instant'].includes(raw.mode)||!Number.isFinite(raw.baseW)||raw.baseW<0||raw.baseW>50000||!Array.isArray(raw.entries)||raw.entries.length>20||new Set(raw.entries.map(e=>e?.deviceId)).size!==raw.entries.length)throw new Error('Niepoprawny wspólny plan.');
 for(const k of ['earliest','latest'])if(raw[k]!==null&&(!Number.isFinite(raw[k])||raw[k]<0))throw new Error('Niepoprawny czas wspólnego planu.');
 if(raw.earliest!==null&&raw.latest!==null&&raw.earliest>=raw.latest)throw new Error('Zakończenie musi być później niż start.');
 const entries=raw.entries.map(e=>{const a=c.appliances.find(a=>a.id===e.deviceId),p=library.profiles.find(p=>p.id===e.profileId);if(!a||!Number.isInteger(e.count)||e.count<0||e.count>8||!['typical','mean','maximum'].includes(e.variant)||!Number.isFinite(e.energyKWh)||e.energyKWh<.01||e.energyKWh>100||!Number.isInteger(e.durationMinutes)||e.durationMinutes<15||e.durationMinutes>1440||e.durationMinutes%15)throw new Error('Sprawdź urządzenie, liczbę cykli, energię i czas.');if(e.profileId!==null&&(!p||p.deviceId!==a.id||!p.variants[e.variant]))throw new Error('Profil musi należeć do wybranego urządzenia i zawierać wybrany wariant.');return {deviceId:e.deviceId,count:e.count,profileId:e.profileId,variant:e.variant,energyKWh:e.energyKWh,durationMinutes:e.durationMinutes};});
 if(entries.reduce((n,e)=>n+e.count,0)>8)throw new Error('W jednym planie można zaplanować maksymalnie 8 cykli.');
 return {version:1,baseW:raw.baseW,mode:raw.mode,earliest:raw.earliest,latest:raw.latest,entries};
}
export function planBatch(f,samples,c,raw,library,now=Date.now()){
 const today=localParts(now,c.timezone).date,[begin,end]=dayBounds(today,c.timezone),input=validateBatch(resolveBatch(raw,c,library),c,library);
 if(input.latest!==null&&input.latest<=begin){input.earliest=null;input.latest=null;}
 const earliest=Math.max(now,input.earliest??begin),latest=input.latest??end,s=optimizerDefaults(c,library);
 // This view minimizes additional imported energy, independently of tariff and deposit.
 s.horizonHours=48;s.riskWeight=0;s.balanceMode=input.mode;s.export.enabled=false;s.devices=[];s.load.mode='constant';s.load.baseW=input.baseW;s.load.uncertainty=0;
 for(const v of s.tariff.versions)for(const k of rateKeys)v[k]={value:['energyDay','energyNight'].includes(k)?1:0,entity:''};
 const seen=new Map();for(const e of input.entries){const a=c.appliances.find(a=>a.id===e.deviceId);for(let i=0;i<e.count;i++){const seq=(seen.get(a.id)||0)+1;seen.set(a.id,seq);s.devices.push({id:a.id+'_'+seq,name:a.name+' · cykl '+seq,enabled:true,profileId:e.profileId,variant:e.variant,powerEntity:a.powerEntity,energyKWh:e.energyKWh,durationMinutes:e.durationMinutes,earliest,deadline:latest,allowedHours:[[0,1440]],skipWeekends:false,priority:5});}}
 const result=optimizeEnergy(f,samples,c,s,emptyLoad(),null,new Map(),{},library,now);
 // Shared totals are computed once from the combined load, not by summing marginal rows.
 const ctx=buildContext(f,samples,c,s,emptyLoad(),null,new Map(),{},now),reserved={slots:new Map(),groups:new Map(),costs:[0,0,0]};let physical=0;
 for(const device of result.devices.filter(d=>d.scheduled).sort((a,b)=>a.scheduled.start-b.scheduled.start||a.id.localeCompare(b.id))){
  device.accounting=candidate(ctx,s.devices.find(d=>d.id===device.id),device.curve,device.scheduled.start,reserved);physical+=device.accounting.physicalImportKWh;
  device.accounting.balancingKWh=input.mode==='instant'?0:Math.max(0,device.accounting.physicalImportKWh-device.accounting.additionalImportKWh);
  device.curve.wh.forEach((wh,i)=>{const at=device.scheduled.start+i*300000,group=ctx.slots.get(at).group;reserved.slots.set(at,(reserved.slots.get(at)||0)+wh/1000);reserved.groups.set(group,(reserved.groups.get(group)||0)+wh/1000);});reserved.costs=reserved.costs.map((v,i)=>v+device.accounting.scenarioCosts[i]);
 }
 result.schedule.physicalImportKWh=physical;result.schedule.balancingKWh=input.mode==='instant'?0:Math.max(0,physical-result.schedule.additionalImportKWh);
 result.settings=input;result.range={earliest,latest};return result;
}
