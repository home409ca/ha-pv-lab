import {expandUnified} from './unified-planner.mjs';
import {buildContext,deviceCurve,rankDevice,reservations} from './optimizer.mjs';
import {applyRunningAppliances} from './appliance-live.mjs';
export function defaultPlanningSelection(f,samples,c,saved,optimizer,load,live,states,model,library,now=Date.now(),activity=null){
 const input=structuredClone(saved);input.preset='today';input.earliest=null;input.latest=null;input.entries.forEach(e=>e.count=0);
 const appliance=c.appliances.find(a=>a.id==='zmywarka'),matches=e=>e.deviceId==='zmywarka'||appliance?.powerEntity&&e.powerEntity===appliance.powerEntity;
 const entry=input.entries.find(matches);
 let reason='Domyślnie: zmywarka ×1, dziś.';
 if(!entry)return {input,request:{counts:{zmywarka:1,pralka:0},range:'today',goal:'cost'},reason:'Skonfiguruj zmywarkę, aby używać domyślnego wyboru.'};
 entry.count=1;
 try{
  const {settings,range}=expandUnified(input,c,library,optimizer,now),device=settings.devices[0],curve=deviceCurve(device,library);
  if(Math.ceil(now/900000)*900000+curve.duration>range.latest){input.preset='tomorrow';reason='Dzisiaj cykl już się nie zmieści — wybrano jutro.';}
  else{
   // Only today's legal windows are needed. Do not run either schedule search here.
   settings.horizonHours=(range.latest-now)/3600000;
   const ctx=buildContext(f,samples,c,settings,load,live,states,model,now);applyRunningAppliances(ctx,activity);
   const running=activity?.devices.find(d=>d.powerEntity===device.powerEntity);if(running&&running.status!=='idle')device.earliest=Math.max(device.earliest??now,running.blockedUntil);
   const options=rankDevice(ctx,{...device,_resource:device.powerEntity||entry.id},curve,reservations(ctx,[]));
   const incomplete=ctx.quarterRows.some(r=>r.start<range.latest&&r.end>now&&r.pvKWh===null);
   if(incomplete)reason='Niepełna prognoza na dziś — pozostawiono dziś; brak danych nie oznacza braku PV.';
   else if(options.length&&!options.some(p=>curve.kWh-p.additionalImportKWh>1e-6)){input.preset='tomorrow';reason='Dzisiaj dostępne cykle wymagają zakupu całej energii — wybrano jutro.';}
   else if(!options.length)reason='Brak potwierdzonego okna na dziś. Sprawdź dane i ograniczenia; nie uznajemy braku danych za brak PV.';
  }
 }catch{reason='Nie można jeszcze ocenić udziału PV. Pozostawiono dziś; sprawdź profil i ograniczenia.';}
 return {input,request:{counts:{zmywarka:1,pralka:0},range:input.preset,goal:'cost'},reason};
}
