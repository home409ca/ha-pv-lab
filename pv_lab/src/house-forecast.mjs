import {runningWh} from './appliance-live.mjs';
import {createLoadModel} from './optimizer-load.mjs';
// Full-quarter house baseline for charting; the optimizer still calculates remaining periods itself.
export function createHouseForecast(forecast,loadState,settings,config,live,now=Date.now(),activity=null){
 const model=createLoadModel(loadState,settings,config,now),first=Math.floor(now/3600000)*3600000,starts=[...new Set(forecast.fullRows.map(r=>r.start))].filter(t=>Number.isFinite(t)&&t>=first&&t<now+8*86400000).sort((a,b)=>a-b),rows=[];
 for(const start of starts){let wh=0;const sources=new Set();let days=Infinity;for(let at=start;at<start+900000;at+=300000){const base=model.at(at+150000,live);wh+=base.w/12;sources.add(base.source);days=Math.min(days,base.days);}const baseWh=wh;let activeWh=0,uncertain=false;for(const device of activity?.devices||[]){if(device.status==='idle'||start>=device.blockedUntil)continue;const clean=settings.load.mode==='constant'||settings.load.alreadyExcludesDevices||settings.load.excludeEntities.includes(device.powerEntity);if(!clean||['unknown','observing'].includes(device.status)){uncertain=true;continue;}activeWh+=runningWh(device.curve,start,start+900000);}wh=uncertain?null:wh+activeWh;if(activeWh>0)sources.add('trwający cykl urządzenia');rows.push({start,wh,baseWh,runningWh:activeWh,source:[...sources].join(' / '),days:Number.isFinite(days)?days:0});}
 return {at:now,mode:settings.load.mode,scope:'house_including_running_without_new_cycles',summary:model.summary,rows};
}
