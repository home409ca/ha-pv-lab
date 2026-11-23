import {detectionDefaults} from './appliances.mjs';
import {powerValue,powerHistory} from './optimizer-load.mjs';
import {deviceCurve} from './optimizer.mjs';
const MINUTE=60000,STEP=5*MINUTE;
export const emptyApplianceLive=()=>({version:1,devices:{}});

// A compact state machine, not a second copy of Recorder history.
export function observeAppliance(previous,at,w,detection=detectionDefaults){
 const s={idleConfirmed:false,idleSince:null,run:null,...structuredClone(previous||{})};
 if(s.at!==undefined&&at<s.at)return s;
 if(s.at!==undefined&&s.w!==null&&Number.isFinite(s.w)){
  if(s.w<=detection.stopW){s.idleSince??=s.at;if(at-s.idleSince>=detection.idleMinutes*MINUTE){s.idleConfirmed=true;s.run=null;}}
  else {s.idleSince=null;if(s.run&&s.w>=detection.startW)s.run.activeMs+=(at-s.at);}
 }
 if(w===null){s.idleConfirmed=false;s.idleSince=null;s.run&&=({...s.run,startedAt:null,uncertain:true});return {...s,at,w:null};}
 if(w>=detection.startW&&!s.run)s.run={anchorAt:at,startedAt:s.idleConfirmed?at:null,activeMs:0,peakW:w,uncertain:!s.idleConfirmed};
 if(w>detection.stopW){s.idleSince=null;s.idleConfirmed=false;}
 else s.idleSince??=at;
 if(s.run)s.run.peakW=Math.max(s.run.peakW,w);
 return {...s,at,w,lastGoodAt:at};
}
function devicesFor(c,input,library){
 const devices=new Map();
 for(const d of c.appliances.filter(d=>d.workType!=='continuous'))devices.set(d.powerEntity,{...d,detection:{...detectionDefaults,...d.detection}});
 for(const e of input.entries||[]){const profile=library.profiles.find(p=>p.id===e.profileId),id=e.powerEntity||profile?.source?.powerEntity;if(id&&!devices.has(id)&&!c.appliances.some(a=>a.powerEntity===id&&a.workType==='continuous'))devices.set(id,{id:e.id,name:e.name,powerEntity:id,detection:{...detectionDefaults}});}
 return [...devices.values()];
}
function estimate(device,input,library){
 const entry=(input.entries||[]).find(e=>e.powerEntity===device.powerEntity&&e.count>0)||(input.entries||[]).find(e=>e.powerEntity===device.powerEntity);
 if(entry){const profile=library.profiles.find(p=>p.id===entry.profileId);if(profile?.variants[entry.variant])return {...deviceCurve(entry,library),source:'wybrany profil: '+profile.name,profile:true};if(Number.isFinite(entry.durationMinutes)&&entry.durationMinutes>=15&&Number.isFinite(entry.energyKWh)&&entry.energyKWh>0)return {...deviceCurve({...entry,profileId:null},library),source:'ręczny czas i energia cyklu',profile:false};}
 const profile=library.profiles.find(p=>p.deviceId===device.id||p.source?.powerEntity===device.powerEntity);
 if(profile?.variants?.typical)return {...deviceCurve({profileId:profile.id,variant:'typical'},library),source:'profil typowy: '+profile.name,profile:true};
 return {duration:device.detection.maxDurationMinutes*MINUTE,wh:null,source:'maksymalny czas z progów wykrywania; brak profilu',profile:false};
}
export function liveApplianceSnapshot(state,c,input,library,now=Date.now()){
 const freshMs=Math.min(c.quality.staleSeconds*1000,Math.max(180000,c.pollSeconds*2000));
 const devices=devicesFor(c,input,library).map(d=>{
  const s=state.devices[d.powerEntity],fresh=s?.lastGoodAt!==undefined&&now-s.lastGoodAt<=freshMs&&s.w!==null,curve=estimate(d,input,library),run=s?.run;
  let status=fresh?(run?(s.w<=d.detection.stopW?'pause':run.activeMs<d.detection.minActiveMinutes*MINUTE?'starting':'running'):s.idleConfirmed?'idle':'observing'):'unknown';
  const anchor=run?.startedAt??run?.anchorAt??s?.idleSince??now;
  let predictedEnd=run?anchor+curve.duration:null;
  const overrun=!!run&&predictedEnd<=now;
  if(overrun)predictedEnd=Math.ceil((now+15*MINUTE)/STEP)*STEP;
  const blockedUntil=status==='idle'?now:status==='unknown'?Math.max(now+15*MINUTE,anchor+d.detection.maxDurationMinutes*MINUTE):run?Math.max(predictedEnd,(s.idleSince??0)+d.detection.idleMinutes*MINUTE):Math.max(now,(s.idleSince??now)+d.detection.idleMinutes*MINUTE);
  return {id:d.id,name:d.name,powerEntity:d.powerEntity,status,running:run&&fresh?true:status==='idle'?false:null,powerW:fresh?s.w:null,readAt:s?.lastGoodAt??null,validUntil:s?.lastGoodAt!==undefined?s.lastGoodAt+freshMs:null,startedAt:run?.startedAt??null,observedSince:run?.anchorAt??null,predictedEnd,blockedUntil,estimateSource:curve.source,uncertain:status!=='idle',overrun,historyError:s?.historyError||null,curve:run&&fresh?{...curve,start:anchor,end:blockedUntil,currentW:s.w}:null};
 });
 return {at:now,devices,key:JSON.stringify(devices.map(d=>[d.powerEntity,d.status,d.startedAt,d.observedSince,d.predictedEnd,Math.ceil(d.blockedUntil/STEP)*STEP,d.curve?.source,d.curve?.wh?null:Math.round((d.powerW||0)/100)]))};
}
export class ApplianceLive {
 constructor(state=emptyApplianceLive()){this.pending=Promise.resolve();this.state=state?.version===1&&state.devices?state:emptyApplianceLive();}
 refresh(...args){const next=this.pending.then(()=>this.refreshNow(...args));this.pending=next.catch(()=>{});return next;}
 async refreshNow(ha,states,c,input,library,now=Date.now(),force=false){
  const devices=devicesFor(c,input,library),need=devices.filter(d=>{const s=this.state.devices[d.powerEntity];return force||!s||s.detectionKey!==JSON.stringify(d.detection)||now-s.at>Math.max(180000,c.pollSeconds*2500)||(s.w===null&&powerValue(states.get(d.powerEntity))!==null)||(s.retryAt&&now>=s.retryAt);});
  if(need.length){
   const from=now-Math.max(...need.map(d=>d.detection.maxDurationMinutes+d.detection.idleMinutes))*MINUTE;
   try {
    const ids=need.map(d=>d.powerEntity),data=await ha.request(`/history/period/${new Date(from).toISOString()}?end_time=${encodeURIComponent(new Date(now).toISOString())}&filter_entity_id=${encodeURIComponent(ids.join(','))}&significant_changes_only=0`);
    if(!Array.isArray(data))throw new Error('Niepoprawna historia mocy urządzeń.');
    for(const d of need){try{const rows=data.find(rows=>Array.isArray(rows)&&rows[0]?.entity_id===d.powerEntity)||[];if(!rows.length||rows.length>30000)throw new Error('Brak wystarczającej historii mocy urządzenia.');const points=powerHistory(rows);let machine=null;for(const p of points)if(p.at<=now)machine=observeAppliance(machine,Math.max(from,p.at),p.value,d.detection);if(!machine||!points.some(p=>p.value!==null))throw new Error('Brak poprawnych pomiarów W/kW w historii.');this.state.devices[d.powerEntity]=machine;}catch(e){const prior=this.state.devices[d.powerEntity];this.state.devices[d.powerEntity]={...(prior&&now-prior.at<=Math.max(180000,c.pollSeconds*2500)?prior:{}),historyError:e.message,retryAt:now+15*MINUTE};}}
   }catch(e){for(const d of need){const prior=this.state.devices[d.powerEntity];this.state.devices[d.powerEntity]={...(prior&&now-prior.at<=Math.max(180000,c.pollSeconds*2500)?prior:{}),historyError:e.message,retryAt:now+15*MINUTE};}}
  }
  for(const d of devices){if(states.get(d.switchEntity)?.state==='off'){this.state.devices[d.powerEntity]={at:now,w:0,lastGoodAt:now,idleConfirmed:true,idleSince:now,run:null,detectionKey:JSON.stringify(d.detection),source:'switch_off'};continue;}const old=this.state.devices[d.powerEntity],w=powerValue(states.get(d.powerEntity));this.state.devices[d.powerEntity]={...observeAppliance(old,now,w,d.detection),detectionKey:JSON.stringify(d.detection)};}
  return this.state;
 }
 snapshot(c,input,library,now=Date.now()){return liveApplianceSnapshot(this.state,c,input,library,now);}
}

export function runningWh(curve,from,to){
 if(!curve)return 0;
 let wh=0;const end=Math.min(to,curve.end);if(end<=from)return 0;
 if(curve.wh){for(let i=Math.max(0,Math.floor((from-curve.start)/STEP));i<curve.wh.length&&curve.start+i*STEP<end;i++){const overlap=Math.max(0,Math.min(end,curve.start+(i+1)*STEP)-Math.max(from,curve.start+i*STEP));wh+=curve.wh[i]*overlap/STEP;}const extension=Math.max(0,end-Math.max(from,curve.start+curve.duration));wh+=curve.currentW*extension/3600000;}
 else wh+=curve.currentW*(end-from)/3600000;
 return wh;
}
// Running cycles belong to the baseline. New-cycle costs remain marginal and never charge them twice.
export function applyRunningAppliances(ctx,activity){
 if(!activity)return;
 ctx.observedAppliances=activity.devices.map(d=>d.powerEntity);
 for(const device of activity.devices){
  if(device.status==='idle')continue;
  const clean=ctx.s.load.mode==='constant'||ctx.s.load.alreadyExcludesDevices||ctx.s.load.excludeEntities.includes(device.powerEntity);
  const unknown=['unknown','observing'].includes(device.status);
  if(!clean||unknown)ctx.warnings.push(device.name+': '+(!clean?'baza domu nie wyklucza tego urządzenia. Oczyść bazę przed planowaniem w czasie jego pracy.':'niepotwierdzony stan pracy. Najbliższe niepewne okresy pomijamy.'));
  for(const slot of ctx.slots.values()){
   if(slot.at>=device.blockedUntil)continue;
   const group=ctx.groups.get(slot.group);
   if(!clean||unknown){group.valid=false;continue;}
   const wh=runningWh(device.curve,slot.at,slot.to);slot.runningWh=(slot.runningWh||0)+wh;
   for(let i=0;i<3;i++){slot.baseWh[i]+=wh;if(slot.net[i]!==null){slot.net[i]+=wh/1000;group.net[i]+=wh/1000;}}
  }
 }
 if(ctx.past.source==='oszacowanie'&&ctx.past.netWh!==null){const first=ctx.slots.values().next().value;if(first){const g=ctx.groups.get(first.group);for(const d of activity.devices){if(d.curve){if(d.startedAt===null&&ctx.past.start<d.observedSince)g.valid=false;const wh=runningWh(d.curve,ctx.past.start,ctx.now);ctx.past.netWh+=wh;g.net=g.net.map(n=>n+wh/1000);}}}}
 for(const row of ctx.quarterRows){row.runningKWh=0;for(const slot of ctx.slots.values())if(slot.at>=row.start&&slot.at<row.end)row.runningKWh+=(slot.runningWh||0)/1000;if(row.netKWh!==null)row.netKWh+=row.runningKWh;}
}
