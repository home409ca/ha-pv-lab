import {SLOT,DAY,localParts,sunPosition} from './time.mjs';
import {selectProfile,emptyProfiles} from './appliances.mjs';
import {dayBounds} from '../public/presentation.js';
export const defaultPlan={energyKWh:4,durationHours:2,baseW:300,mode:'hourly',earliest:null,latest:null,profileId:null,profileVariant:'typical'};
export function validatePlan(p){
  if(!p||Object.keys(p).some(k=>!Object.hasOwn(defaultPlan,k)))throw new Error('Nieznane pole planowania.');
  for(const [k,min,max] of [['energyKWh',.01,100],['durationHours',.25,24],['baseW',0,50000]])if(!Number.isFinite(p[k])||p[k]<min||p[k]>max)throw new Error('Niepoprawna wartość planu: '+k);
  if(Math.abs(p.durationHours*4-Math.round(p.durationHours*4))>1e-8)throw new Error('Czas pracy musi być wielokrotnością 15 minut.');
  if(!['hourly','quarterly','instant'].includes(p.mode))throw new Error('Niepoprawny tryb bilansowania.');
  for(const k of ['earliest','latest'])if(p[k]!==null&&(!Number.isFinite(p[k])||p[k]<0||p[k]>8640000000000000))throw new Error('Niepoprawna data planu.');
  if(p.profileId!==null&&(typeof p.profileId!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(p.profileId)))throw new Error('Niepoprawny profil urządzenia.');
  if(!['typical','mean','maximum'].includes(p.profileVariant))throw new Error('Niepoprawny wariant profilu.');
  if(p.earliest!==null&&p.latest!==null&&p.earliest>=p.latest)throw new Error('Koniec zakresu musi być późniejszy niż początek.');return p;
}
export function pvEnergy(rows,start,end,c){
  let wh=0;for(let t=Math.floor(start/SLOT)*SLOT;t<end;t+=SLOT){const row=rows.get(t),duration=Math.min(end,t+SLOT)-Math.max(start,t);if(duration<=0)continue;
    if(row&&Number.isFinite(row.wh))wh+=row.wh*duration/SLOT;
    else {const sun=sunPosition(t+SLOT/2,c.location);if(!sun||sun.elevation>0)return null;}
  }return wh;
}
function counterAt(samples,key,at,maxGap){
  let before=null;for(const s of samples){if(s.imported||!Number.isFinite(s[key]))continue;if(s.at<=at){before=s;if(s.at===at)return s[key];continue;}
    if(before&&s.at-before.at<=maxGap)return before[key]+(s[key]-before[key])*(at-before.at)/(s.at-before.at);return null;}
  return before&&at-before.at<=maxGap/2?before[key]:null;
}
export function measuredBalance(samples,start,end,c){
  if(!c.grid?.confirmed)return null;
  if(c.planner?.mode==='hourly'){const last=samples.filter(s=>!s.imported&&s.at<=end&&Number.isFinite(s.gridBalance)&&s.gridBalanceReported>=start&&s.gridBalanceReported<=end+30000&&end-s.at<=c.quality.maxGapSeconds*1000&&s.gridBalance<=c.inverter.limitW*(end-start)/3600000000+.01).at(-1);if(last)return {netWh:-last.gridBalance*1000,importWh:null,exportWh:null,direct:true};}
  if(c.grid.countersAreHourlyBalanced)return null;
  const values={};for(const key of ['gridImport','gridExport']){const a=counterAt(samples,key,start,c.quality.maxGapSeconds*1000),b=counterAt(samples,key,end,c.quality.maxGapSeconds*1000);if(a===null||b===null||b<a)return null;values[key]=(b-a)*1000;}
  return {netWh:values.gridImport-values.gridExport,importWh:values.gridImport,exportWh:values.gridExport};
}
function periodBounds(t,mode,c){const size=mode==='hourly'?3600000:mode==='quarterly'?SLOT:300000;const [midnight]=dayBounds(localParts(t,c.timezone).date,c.timezone),start=midnight+Math.floor((t-midnight)/size)*size;return [start,start+size];}
export function planDevice(f,samples,c,plan=defaultPlan,now=Date.now(),library=emptyProfiles()){
  const input=validatePlan({...defaultPlan,...plan}),profile=selectProfile(library,input.profileId,input.profileVariant),p=profile?{...input,energyKWh:profile.energyKWh,durationHours:profile.durationMinutes/60}:input,map=new Map(f.fullRows.map(r=>[r.start,r])),duration=p.durationHours*3600000,power=p.energyKWh*1000/p.durationHours;
  const deviceWh=(from,to,cycleStart)=>{const lo=Math.max(0,from-cycleStart),hi=Math.min(duration,to-cycleStart);if(hi<=lo)return 0;if(!profile)return power*(hi-lo)/3600000;let wh=0;for(let i=Math.floor(lo/300000);i<profile.wh.length&&i*300000<hi;i++)wh+=profile.wh[i]*Math.max(0,Math.min(hi,(i+1)*300000)-Math.max(lo,i*300000))/300000;return wh;};
  const tomorrow=new Date(Date.parse(localParts(now,c.timezone).date+'T12:00:00Z')+DAY).toISOString().slice(0,10),defaultEnd=dayBounds(tomorrow,c.timezone)[1],first=Math.ceil(Math.max(now,p.earliest??now)/SLOT)*SLOT,last=Math.min(p.latest??defaultEnd,now+8*DAY);
  const [periodStart,periodEnd]=periodBounds(now,p.mode,c),measured=measuredBalance(samples,periodStart,now,{...c,planner:p}),pastPV=pvEnergy(map,periodStart,now,c),futurePV=pvEnergy(map,now,periodEnd,c);
  const estimatedPast=pastPV===null?null:p.baseW*(now-periodStart)/3600000-pastPV,pastNet=measured?.netWh??estimatedPast;
  const balance={start:periodStart,end:periodEnd,source:measured?'measured':'estimated',importKWh:measured?.importWh===null||!measured?null:measured.importWh/1000,exportKWh:measured?.exportWh===null||!measured?null:measured.exportWh/1000,netKWh:pastNet===null?null:-pastNet/1000,forecastNetKWh:pastNet===null||futurePV===null?null:-(pastNet+p.baseW*(periodEnd-now)/3600000-futurePV)/1000,afterDeviceKWh:null,secondsLeft:Math.max(0,(periodEnd-now)/1000)};
  const result={settings:p,profile:profile?{id:profile.id,name:profile.name,variant:profile.variant,stepMinutes:5,wh:profile.wh}:null,profiles:library.profiles.map(p=>({id:p.id,name:p.name,variants:Object.keys(p.variants)})),calculatedAt:now,status:'brak kompletnej prognozy',best:null,alternatives:[],balance,assumption:(profile?'Przebieg urządzenia z wybranego profilu 5-minutowego i stała rezerwa dla domu.':'Równomierny pobór urządzenia i stała rezerwa dla domu.')+' Pokrycie po bilansowaniu nie oznacza równoczesnego zasilania wyłącznie przez PV.'};
  if(first+duration>last){result.status='brak okna w zadanym zakresie';return result;}
  const options=[];
  for(let start=first;start+duration<=last;start+=SLOT){const end=start+duration;let incremental=0,physical=0,ok=true,estimated=false;
    for(let t=start;t<end;){const [a,b]=periodBounds(t,p.mode,c),futureStart=Math.max(a,now),pv=pvEnergy(map,futureStart,b,c),energy=deviceWh(Math.max(start,a),Math.min(end,b),start);
      if(pv===null){ok=false;break;}let net=p.baseW*(b-futureStart)/3600000-pv;
      if(a<now){if(pastNet===null){ok=false;break;}net+=pastNet;estimated||=!measured;}
      incremental+=Math.max(0,net+energy)-Math.max(0,net);t=b;
    }
    if(!ok)continue;
    // Physical import is estimated in the native 15-minute forecast resolution.
    for(let t=start;t<end;t+=300000){const to=Math.min(t+300000,end),pv=pvEnergy(map,t,to,c);if(pv===null){ok=false;break;}const base=p.baseW*(to-t)/3600000,device=deviceWh(t,to,start);physical+=Math.max(0,base+device-pv)-Math.max(0,base-pv);}
    if(!ok)continue;const deficit=Math.max(0,Math.min(p.energyKWh,incremental/1000));
    options.push({start,end,energyKWh:p.energyKWh,averageW:power,coveredKWh:p.energyKWh-deficit,coveragePercent:(1-deficit/p.energyKWh)*100,deficitKWh:deficit,physicalImportKWh:physical/1000,balanceEstimated:estimated,mode:p.mode});
  }
  options.sort((a,b)=>Math.round(a.deficitKWh*1e6)-Math.round(b.deficitKWh*1e6)||a.start-b.start);result.best=options[0]||null;result.alternatives=options.slice(0,3);
  if(result.best){result.status=result.best.deficitKWh<.000001?'pełne pokrycie':'częściowe pokrycie';balance.afterDeviceKWh=balance.forecastNetKWh===null?null:balance.forecastNetKWh-deviceWh(Math.max(result.best.start,now),Math.min(result.best.end,periodEnd),result.best.start)/1000;}
  return result;
}
