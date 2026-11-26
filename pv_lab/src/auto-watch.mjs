import {randomUUID} from 'node:crypto';
import {localParts} from './time.mjs';
const M=60000;
export function createAutoWatch(setup,c,states,now=Date.now()){
 return {id:randomUUID(),active:true,range:setup.range,horizon:null,variants:setup.variants,profile_ids:setup.profile_ids,createdAt:now,lastDay:localParts(now,c.timezone).date,lastSwitch:Object.fromEntries(c.appliances.map(a=>[a.id,states.get(a.switchEntity)?.state??'unknown'])),queue:{},message:'Nowe wyłączenie switcha przygotowuje cykl w dniu tego zdarzenia.'};
}
export function advanceAutoWatch(watch,c,states,now=Date.now()){
 if(!watch?.active)return false;
 let changed=false;const day=localParts(now,c.timezone).date,dayChanged=watch.lastDay!==day;
 for(const a of c.appliances.filter(a=>['zmywarka','pralka'].includes(a.id))){
  const value=states.get(a.switchEntity)?.state,previous=watch.lastSwitch[a.id];
  if(!['on','off'].includes(value)){if(previous!=='unknown'){watch.lastSwitch[a.id]='unknown';changed=true;}continue;}
  // Unknown/unavailable and an unchanged off state never create a new trigger.
  if(value==='off'&&previous==='on'&&!watch.queue[a.id]){watch.queue[a.id]={at:now,readyAt:now+10*M,day};changed=true;}
  if(value==='on'&&watch.queue[a.id]){delete watch.queue[a.id];changed=true;}
  if(previous!==value){watch.lastSwitch[a.id]=value;changed=true;}
 }
 if(dayChanged){watch.lastDay=day;for(const [id,q] of Object.entries(watch.queue))if(q.day!==day)delete watch.queue[id];changed=true;}
 return changed;
}
export function watchBatch(watch,c,now=Date.now()){
 if(!watch?.active)return null;
 const day=localParts(now,c.timezone).date,ids=Object.entries(watch.queue).filter(([,q])=>q.day===day&&q.readyAt<=now).map(([id])=>id);
 if(!ids.length)return null;
 return {ids,counts:{zmywarka:ids.includes('zmywarka')?1:0,pralka:ids.includes('pralka')?1:0}};
}
