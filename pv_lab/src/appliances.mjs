import {randomUUID} from 'node:crypto';
import {DAY,localParts} from './time.mjs';
export const detectionDefaults={startW:10,stopW:5,idleMinutes:20,minActiveMinutes:2,minDurationMinutes:10,maxDurationMinutes:480,minEnergyKWh:.05};
export const defaultAppliances=[
  {id:'pralka',name:'Pralka',powerEntity:'sensor.gniazdkopomiarpralka_energy_power',energyEntity:'sensor.gniazdkopomiarpralka_energy_today',detection:{...detectionDefaults}},
  {id:'zmywarka',name:'Zmywarka',powerEntity:'sensor.gniazdkopomiarzmywarka_energy_power',energyEntity:'sensor.gniazdkopomiarzmywarka_energy_today',detection:{...detectionDefaults}}
];
export const emptyProfiles=()=>({version:1,analyses:{},profiles:[]});
export function validateAppliance(d){
  if(!d||!/^[a-z0-9_]{1,40}$/.test(d.id)||typeof d.name!=='string'||!d.name.trim()||d.name.length>80)throw new Error('Niepoprawna nazwa lub identyfikator urządzenia.');
  const id=v=>typeof v==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(v);
  if(!id(d.powerEntity)||(d.energyEntity!==''&&!id(d.energyEntity)))throw new Error('Wskaż encję mocy oraz opcjonalną encję energii.');
  d={...d,name:d.name.trim(),detection:{...detectionDefaults,...d.detection}};const s=d.detection;
  for(const [key,min,max] of [['startW',1,30000],['stopW',0,1000],['idleMinutes',1,120],['minActiveMinutes',.5,60],['minDurationMinutes',1,240],['maxDurationMinutes',15,1440],['minEnergyKWh',.001,20]])if(!Number.isFinite(s[key])||s[key]<min||s[key]>max)throw new Error('Niepoprawny próg wykrywania: '+key);
  if(s.stopW>=s.startW||s.minDurationMinutes>=s.maxDurationMinutes)throw new Error('Próg zakończenia musi być niższy od progu startu; minimum czasu niższe od maksimum.');return d;
}
function historyPoints(rows,kind){let lastUnit=null;return rows.map(r=>{lastUnit=r.attributes?.unit_of_measurement||lastUnit;const x=Date.parse(r.last_updated||r.last_changed),number=typeof r.state==='string'&&r.state.trim()===''?NaN:Number(r.state);let y=null;
  if(r.state!==null&&r.state!==undefined&&Number.isFinite(number)&&number>=0){if(kind==='power')y=lastUnit==='W'?number:lastUnit==='kW'?number*1000:null;else y=lastUnit==='kWh'?number:lastUnit==='Wh'?number/1000:null;}
  return {x,y};}).filter(p=>Number.isFinite(p.x)).sort((a,b)=>a.x-b.x);}
function uniquePoints(points){return [...new Map(points.map(p=>[p.x,p])).values()].sort((a,b)=>a.x-b.x);}
function binsFromSegments(segments,start,end){const count=Math.ceil((end-start)/300000),bins=Array(count).fill(0);for(const seg of segments){if(seg.y===null)continue;for(let i=Math.max(0,Math.floor((seg.start-start)/300000));i<count&&start+i*300000<seg.end;i++){const overlap=Math.max(0,Math.min(end,start+(i+1)*300000,seg.end)-Math.max(start+i*300000,seg.start,start));bins[i]+=seg.y*overlap/3600000;}}return bins;}
function meterDifference(points,start,end,zone){
  // This is a cross-check, not a reconstruction of the power curve. Accept reset only across local midnight.
  const before=points.filter(p=>p.x<=start).at(-1),last=points.filter(p=>p.x<=end).at(-1);if(!before||!last||before.y===null||last.y===null)return null;
  let previous=before,total=0;for(const p of points){if(p.x<=start||p.x>end)continue;if(p.y===null)return null;if(p.y<previous.y){if(localParts(previous.x,zone).date===localParts(p.x,zone).date)return null;total+=p.y;}else total+=p.y-previous.y;previous=p;}return total;
}
export function detectCycles(power,energy,device,begin,end,zone){
  const s=validateAppliance(device).detection,points=uniquePoints(power),cycles=[],rejected={incomplete:0,short:0,missing:0,long:0},step=300000;
  let run=null,idleAt=null,seenIdle=false;
  function finish(at){if(!run)return;const minutes=(at-run.start)/60000,wh=binsFromSegments(run.segments,run.start,at),total=wh.reduce((a,b)=>a+b,0)/1000;
    if(run.start<begin||run.truncated){rejected.incomplete++;}
    else if(run.missing){rejected.missing++;}
    else if(minutes>s.maxDurationMinutes){rejected.long++;}
    else if(minutes<s.minDurationMinutes||run.active<s.minActiveMinutes||total<s.minEnergyKWh){rejected.short++;}
    else{const meterKWh=meterDifference(energy,run.start,at,zone),warning=meterKWh!==null&&Math.abs(meterKWh-total)>Math.max(.03,total*.2)?'Licznik energii i całka mocy różnią się o ponad 20% — sprawdź cykl.':null;
      cycles.push({id:device.id+'-'+run.start,start:run.start,end:at,durationMinutes:minutes,energyKWh:total,peakW:run.peak,meterKWh,warning,stepMinutes:step/60000,wh});}
    run=null;idleAt=null;
  }
  for(let i=0;i<points.length;i++){const p=points[i],to=Math.min(end,points[i+1]?.x??end);if(p.x>=end||to<=p.x)continue;
    if(p.y===null){if(run)run.missing=true;seenIdle=false;idleAt=null;continue;}
    if(!run&&p.y>=s.startW){run={start:p.x,active:0,peak:0,segments:[],missing:false,truncated:!seenIdle};}
    if(p.y<=s.stopW){seenIdle=true;if(run)idleAt??=p.x;}else idleAt=null;
    if(run){run.segments.push({start:p.x,end:to,y:p.y});run.peak=Math.max(run.peak,p.y);if(p.y>=s.startW)run.active+=(to-p.x)/60000;
      if(idleAt!==null&&to-idleAt>=s.idleMinutes*60000)finish(idleAt);
    }
  }
  if(run)rejected.incomplete++;
  return {cycles:cycles.slice(-120),rejected,warnings:cycles.length>120?['Zachowano ostatnie 120 zakończonych cykli.']:[],detected:cycles.length};
}
export async function analyzeAppliance(ha,device,days,zone,onProgress=()=>{},now=Date.now()){
  device=validateAppliance(device);if(!Number.isInteger(days)||days<1||days>30)throw new Error('Historia urządzenia: 1–30 dni.');
  const begin=now-days*DAY,from=begin-device.detection.maxDurationMinutes*60000,ids=[device.powerEntity,...(device.energyEntity?[device.energyEntity]:[])],power=[],energy=[];let count=0;
  for(let at=from;at<now;at+=DAY){const to=Math.min(now,at+DAY),result=await ha.request(`/history/period/${new Date(at).toISOString()}?end_time=${encodeURIComponent(new Date(to).toISOString())}&filter_entity_id=${encodeURIComponent(ids.join(','))}&significant_changes_only=0`);if(!Array.isArray(result))throw new Error('HA nie zwrócił historii urządzenia.');
    for(const rows of result){if(!Array.isArray(rows)||!rows.length)continue;count+=rows.length;if(count>250000)throw new Error('Historia ma ponad 250 tys. zmian. Wybierz krótszy zakres.');if(rows[0].entity_id===device.powerEntity)power.push(...historyPoints(rows,'power'));if(rows[0].entity_id===device.energyEntity)energy.push(...historyPoints(rows,'energy'));}
    onProgress({done:Math.min(days,Math.max(0,Math.ceil((to-begin)/DAY))),days});
  }
  if(!power.some(p=>p.y!==null))throw new Error('Brak historii mocy W/kW dla '+device.powerEntity+'. Same sumy kWh nie odtworzą przebiegu cyklu.');
  const detected=detectCycles(uniquePoints(power),uniquePoints(energy),device,begin,now,zone);
  return {at:now,begin,end:now,deviceId:device.id,deviceName:device.name,powerEntity:device.powerEntity,energyEntity:device.energyEntity,settings:device.detection,...detected,warnings:[...detected.warnings,...(!energy.length&&device.energyEntity?['Brak historii licznika energii; użyto całkowania mocy.']:[])],note:'Historia zmian mocy jest traktowana jako przebieg schodkowy. Surowa historia nie jest zapisywana. Cykle i grupowanie programów wymagają Twojego sprawdzenia.'};
}
const median=values=>{const a=[...values].sort((a,b)=>a-b),i=Math.floor(a.length/2);return a.length%2?a[i]:(a[i-1]+a[i])/2;};
function shape(wh){const values=[...wh];while(values.length%3)values.push(0);return {stepMinutes:5,wh:values,durationMinutes:values.length*5,energyKWh:values.reduce((a,b)=>a+b,0)/1000};}
export function buildProfile(analysis,cycleIds,name,existingId=null,now=Date.now()){
  if(typeof name!=='string'||!name.trim()||name.length>80)throw new Error('Podaj nazwę profilu (do 80 znaków).');
  if(!Array.isArray(cycleIds)||!cycleIds.length||new Set(cycleIds).size!==cycleIds.length)throw new Error('Wybierz zakończone cykle.');const cycles=cycleIds.map(id=>analysis.cycles.find(c=>c.id===id));if(cycles.some(c=>!c))throw new Error('Cykl nie istnieje w bieżącej analizie.');
  const buckets=new Map();for(const c of cycles){const key=Math.ceil(c.durationMinutes/15)*15;(buckets.get(key)||buckets.set(key,[]).get(key)).push(c);}const typicalGroup=[...buckets].sort(([a,x],[b,y])=>y.length-x.length||a-b)[0][1],mid=median(typicalGroup.map(c=>c.energyKWh));
  const typical=[...typicalGroup].sort((a,b)=>Math.abs(a.energyKWh-mid)-Math.abs(b.energyKWh-mid)||a.start-b.start)[0],maximum=[...cycles].sort((a,b)=>b.energyKWh-a.energyKWh||b.durationMinutes-a.durationMinutes)[0],length=Math.max(...cycles.map(c=>c.wh.length)),mean=Array.from({length},(_,i)=>cycles.reduce((sum,c)=>sum+(c.wh[i]||0),0)/cycles.length);
  const variants={typical:shape(typical.wh),mean:shape(mean),maximum:shape(maximum.wh)};
  for(const v of Object.values(variants))validateShape(v);
  return {id:existingId||randomUUID(),name:name.trim(),deviceId:analysis.deviceId,source:{powerEntity:analysis.powerEntity||null,energyEntity:analysis.energyEntity||null,begin:analysis.begin||null,end:analysis.end||null},at:now,cycleIds,summary:{cycles:cycles.length,minKWh:Math.min(...cycles.map(c=>c.energyKWh)),meanKWh:cycles.reduce((s,c)=>s+c.energyKWh,0)/cycles.length,maxKWh:maximum.energyKWh,medianKWh:median(cycles.map(c=>c.energyKWh)),peakW:Math.max(...cycles.map(c=>c.peakW)),typicalDurationMinutes:Math.ceil(typical.durationMinutes/15)*15},variants};
}
export function validateShape(v){if(!v||v.stepMinutes!==5||!Array.isArray(v.wh)||!v.wh.length||v.wh.length>288||v.wh.length%3||v.wh.some(x=>!Number.isFinite(x)||x<0||x>100000/12))throw new Error('Niepoprawny przebieg 5-minutowy profilu.');const energy=v.wh.reduce((a,b)=>a+b,0)/1000;if(energy<.01||energy>100)throw new Error('Energia profilu musi wynosić 0,01–100 kWh.');return v;}
export function manualProfile(name,powersW,existingId=null,now=Date.now()){
  if(typeof name!=='string'||!name.trim()||name.length>80||!Array.isArray(powersW)||!powersW.length||powersW.length>288||powersW.some(v=>!Number.isFinite(v)||v<0||v>100000))throw new Error('Podaj nazwę i od 1 do 288 wartości mocy W (0–100000).');
  const variant=shape(powersW.map(w=>w/12));validateShape(variant);return {id:existingId||randomUUID(),name:name.trim(),deviceId:null,at:now,manual:true,cycleIds:[],summary:{cycles:0,minKWh:variant.energyKWh,meanKWh:variant.energyKWh,maxKWh:variant.energyKWh,medianKWh:variant.energyKWh,peakW:Math.max(...powersW),typicalDurationMinutes:variant.durationMinutes},variants:{typical:variant}};
}
export function selectProfile(library,id,variant='typical'){
  if(!id)return null;const profile=library.profiles.find(p=>p.id===id);if(!profile)throw new Error('Wybrany profil urządzenia nie istnieje.');const curve=profile.variants[variant];if(!curve)throw new Error('Wybrany wariant profilu nie istnieje.');validateShape(curve);return {id:profile.id,name:profile.name,variant,...curve,durationMinutes:curve.wh.length*5,energyKWh:curve.wh.reduce((a,b)=>a+b,0)/1000};
}
