import {comparisonRequests,buildComparisonPlans} from './planning-comparisons.mjs';
import {applyRunningAppliances} from './appliance-live.mjs';
import {selectDiverseSchedules,selectDashboardSchedules} from './schedule-alternatives.mjs';
import {buildContext,deviceCurve,rankDevice,reservations,candidate} from './optimizer.mjs';
import {validateOptimizer} from './optimizer-settings.mjs';
import {dayBounds,parseLocalInput} from '../public/presentation.js';
import {localParts} from './time.mjs';
const H=3600000,Q=900000,STEP=300000;
const addDay=(day,n)=>new Date(Date.parse(day+'T12:00:00Z')+n*24*H).toISOString().slice(0,10);
export function planRange(s,c,now){
 const day=localParts(now,c.timezone).date;
 const start=s.preset==='tomorrow'?dayBounds(addDay(day,1),c.timezone)[0]:now;
 const end=dayBounds(addDay(day,s.preset==='both'||s.preset==='tomorrow'?1:0),c.timezone)[1];
 return {earliest:s.preset==='custom'?Math.max(now,s.earliest):start,latest:s.preset==='custom'?s.latest:end};
}
export function migrateUnified(batch,optimizer,c,library){
 const entries=(batch.entries||[]).map(e=>{const a=c.appliances.find(a=>a.id===e.deviceId);return {...e,id:e.deviceId,name:a?.name||e.deviceId,powerEntity:a?.powerEntity||'',finishBy:'',finishDate:'',template:null};});
 for(const d of optimizer.devices.filter(d=>d.enabled)){
  const p=library.profiles.find(p=>p.id===d.profileId),resource=d.powerEntity||p?.source?.powerEntity||c.appliances.find(a=>a.id===p?.deviceId)?.powerEntity||'';
  if(entries.some(e=>e.count&&resource&&e.powerEntity===resource))continue;
  entries.push({id:'old_'+d.id,deviceId:p?.deviceId||null,name:d.name,powerEntity:resource,count:1,profileId:d.profileId,variant:d.variant,energyKWh:d.energyKWh,durationMinutes:d.durationMinutes,finishBy:'',finishDate:'',template:structuredClone(d)});
 }
 let remaining=8;for(const e of entries){const accepted=Math.min(e.count,remaining);remaining-=accepted;e.count=accepted;}
 return {version:1,preset:batch.latest?'custom':'today',earliest:batch.earliest,latest:batch.latest,mode:batch.mode,entries,migration:'Zachowano liczbę cykli z Planowania. Dodatkowe urządzenia ze starego Optymalizatora włączono tylko, gdy nie powielały sprzętu z tej listy. Wspólna baza domu i cennik pochodzą z Optymalizatora; dawne ustawienia pozostają w osobnych plikach i kopii danych.'};
}
export function validateUnified(raw,c,library,optimizer){
 if(raw?.version!==1||!['today','tomorrow','both','custom'].includes(raw.preset)||!['hourly','quarterly','instant'].includes(raw.mode)||!Array.isArray(raw.entries)||raw.entries.length>40||new Set(raw.entries.map(e=>e.id)).size!==raw.entries.length)throw new Error('Niepoprawna konfiguracja wspólnego planu.');
 if(raw.preset==='custom'&&(!Number.isFinite(raw.earliest)||!Number.isFinite(raw.latest)||raw.latest<=raw.earliest))throw new Error('Sprawdź początek i koniec zakresu.');
 const next=structuredClone(raw);let count=0;
 for(const e of next.entries){
  if(typeof e.id!=='string'||!e.id||typeof e.name!=='string'||!e.name.trim()||!Number.isInteger(e.count)||e.count<0||e.count>8||typeof e.powerEntity!=='string')throw new Error('Sprawdź nazwę urządzenia i liczbę cykli.');
  count+=e.count;
  if(e.finishBy&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(e.finishBy))throw new Error('Termin zakończenia wpisz jako HH:MM.');
  if(e.finishDate&&(!/^\d{4}-\d\d-\d\d$/.test(e.finishDate)||!Number.isFinite(Date.parse(e.finishDate+'T12:00:00Z'))))throw new Error('Sprawdź datę zakończenia.');
  if(e.finishDate&&!e.finishBy)throw new Error('Przy dacie zakończenia podaj również godzinę.');
  if(e.profileId){const p=library.profiles.find(p=>p.id===e.profileId);if(!p?.variants[e.variant])throw new Error('Profil lub wariant urządzenia nie jest dostępny. Wybierz go ponownie.');e.powerEntity||=p.source?.powerEntity||c.appliances.find(a=>a.id===p.deviceId)?.powerEntity||'';}
  validateOptimizer({...structuredClone(optimizer),devices:[task(e,0,0,1e15)]});
 }
 if(count>8)throw new Error('Można zaplanować najwyżej 8 cykli łącznie.');
 return next;
}
function task(e,i,earliest,deadline){return {...e.template,id:e.id+'_'+(i+1),name:e.name+' · cykl '+(i+1),enabled:true,powerEntity:e.powerEntity,profileId:e.profileId||null,variant:e.variant,energyKWh:e.energyKWh,durationMinutes:e.durationMinutes,earliest:Math.max(earliest,e.template?.earliest??0),deadline:Math.min(deadline,e.template?.deadline??Infinity),allowedHours:e.template?.allowedHours||[[0,1440]],skipWeekends:e.template?.skipWeekends||false,priority:e.template?.priority||5};}
export function expandUnified(input,c,library,optimizer,now){
 const s=validateUnified(input,c,library,optimizer),range=planRange(s,c,now),settings=structuredClone(optimizer);
 if(range.latest<=range.earliest)throw new Error('Wybrany zakres już minął. Wybierz dziś, jutro lub nowe daty.');
 if(range.latest-now>168*H)throw new Error('Zakres może kończyć się najwyżej 7 dni od teraz.');
 settings.horizonHours=range.latest-now<=48*H?48:range.latest-now<=72*H?72:168;settings.balanceMode=s.mode;settings.devices=[];
 const lastDay=localParts(range.latest-1,c.timezone).date,deadlines=new Map();
 for(const e of s.entries.filter(e=>e.count))if(e.finishBy){const deadline=parseLocalInput((e.finishDate||lastDay)+'T'+e.finishBy,c.timezone),key=e.powerEntity||e.id;deadlines.set(key,Math.min(deadlines.get(key)??Infinity,deadline));}
 for(const e of s.entries)for(let i=0;i<e.count;i++)settings.devices.push(task(e,i,range.earliest,Math.min(range.latest,deadlines.get(e.powerEntity||e.id)??Infinity)));
 return {settings,range};
}
const rounded=v=>Math.round(v*1e8);
export const PLAN_COST_TOLERANCE=.05;
export function compareCostPlans(a,b,cheapest,tolerance=PLAN_COST_TOLERANCE){
 const eligible=p=>rounded(p.cost)<=rounded(cheapest+tolerance),ae=eligible(a),be=eligible(b);
 if(ae!==be)return ae?-1:1;
 return (ae?rounded(b.surplusKWh)-rounded(a.surplusKWh)||rounded(a.pessimisticCost)-rounded(b.pessimisticCost):0)||rounded(a.cost)-rounded(b.cost)||rounded(b.surplusKWh)-rounded(a.surplusKWh)||rounded(a.additionalImportKWh)-rounded(b.additionalImportKWh)||a.start-b.start;
}
function metrics(ctx,assignments){
 const r=reservations(ctx,assignments);let additionalImportKWh=0,lostExportKWh=0,physicalImportKWh=0,gridCost=0,opportunityCost=0,surplusKWh=0,minimumSurplusKWh=Infinity;
 for(const [id,kWh] of r.groups){const g=ctx.groups.get(id),di=Math.max(0,g.net[0]+kWh)-Math.max(0,g.net[0]),de=Math.max(0,-g.net[0])-Math.max(0,-g.net[0]-kWh);const spare=Math.max(0,-g.net[0]-kWh);surplusKWh+=spare;minimumSurplusKWh=Math.min(minimumSurplusKWh,spare);additionalImportKWh+=di;lostExportKWh+=de;gridCost+=di*g.price.buy;opportunityCost+=de*g.price.sell;}
 for(const [at,kWh] of r.slots){const net=ctx.slots.get(at).net[0];physicalImportKWh+=Math.max(0,net+kWh)-Math.max(0,net);}
 return {...r,surplusKWh,minimumSurplusKWh:Number.isFinite(minimumSurplusKWh)?minimumSurplusKWh:0,additionalImportKWh,lostExportKWh,physicalImportKWh,balancingKWh:ctx.s.balanceMode==='instant'?0:Math.max(0,physicalImportKWh-additionalImportKWh),gridCost,opportunityCost,cost:r.costs[0],optimisticCost:Math.min(...r.costs),pessimisticCost:Math.max(...r.costs),objective:r.costs[0]+ctx.s.riskWeight*(Math.max(...r.costs)-r.costs[0])};
}
function search(ctx,prepared,objective,comparisons=[]){
 const cmp=(a,b)=>rounded(a[objective==='pv'?'additionalImportKWh':'cost'])-rounded(b[objective==='pv'?'additionalImportKWh':'cost'])||(objective==='cost'||a.additionalImportKWh<1e-8&&b.additionalImportKWh<1e-8?rounded(b.surplusKWh)-rounded(a.surplusKWh):0)||rounded(a.additionalImportKWh)-rounded(b.additionalImportKWh)||rounded((a.pessimisticCost??a.cost)) - rounded((b.pessimisticCost??b.cost))||(objective==='pv'?rounded(a.physicalImportKWh)-rounded(b.physicalImportKWh):0)||a.start-b.start;
 const margin=(item,option,reserved)=>{const used=new Map(reserved.groups);item.curve.wh.forEach((wh,i)=>{const id=ctx.slots.get(option.start+i*STEP).group;used.set(id,(used.get(id)||0)+wh/1000);});return [...used].reduce((sum,[id,kWh])=>sum+Math.max(0,-ctx.groups.get(id).net[0]-kWh),0);};
 const rank=(item,assigned)=>{ctx.unifiedRanks??=new Map();const key=item.device.id+'|'+assigned.map(a=>a.device.id+':'+a.start).sort().join(','),cached=ctx.unifiedRanks.get(key);if(cached)return [...cached].sort(cmp);const reserved=reservations(ctx,assigned),rows=rankDevice(ctx,item.device,item.curve,reserved).map(r=>({...r,surplusKWh:margin(item,r,reserved)}));if(ctx.unifiedRanks.size<32)ctx.unifiedRanks.set(key,rows);return [...rows].sort(cmp);};
 const evaluatedPlans=new WeakMap(),evaluate=p=>{if(!evaluatedPlans.has(p))evaluatedPlans.set(p,metrics(ctx,p));return evaluatedPlans.get(p);};
 const compare=(a,b)=>{if(a.length!==b.length)return b.length-a.length;return cmp({...evaluate(a),start:Math.max(0,...a.map(a=>a.start+a.curve.duration))},{...evaluate(b),start:Math.max(0,...b.map(a=>a.start+a.curve.duration))});};
 const base=[...prepared].sort((a,b)=>a.device.deadline-b.device.deadline||b.curve.duration-a.curve.duration||a.device.id.localeCompare(b.device.id));
 const orders=[base,[...base].sort((a,b)=>b.device.priority-a.device.priority),[...base].reverse(),[...base].sort((a,b)=>b.curve.kWh-a.curve.kWh)];
 for(let i=1;i<Math.min(base.length,5);i++)orders.push([...base.slice(i),...base.slice(0,i)]);
 const found=new Map();let evaluated=0;const remember=plan=>{const copy=plan.map(a=>({...a})),signature=copy.map(a=>JSON.stringify([a.device._resource,a.curve.wh,a.start])).sort().join('|');if(!found.has(signature))found.set(signature,copy);};
 for(const row of comparisons)if(row.plan.length===prepared.length&&prepared.length)remember(row.plan);
 const uniqueOrders=[...new Map(orders.map(order=>[order.map(a=>a.device.id).join('|'),order])).values()];
 for(const order of prepared.length===1?[]:uniqueOrders)for(const seed of [0,1,2]){
  const assigned=[];
  for(const item of order){const choices=rank(item,assigned);evaluated+=choices.length;const best=choices[assigned.length===0?Math.min(seed,choices.length-1):0];if(best)assigned.push({...item,start:best.start});}
  remember(assigned);
  for(let pass=0;pass<2;pass++)for(const item of order){const old=assigned.find(a=>a.device.id===item.device.id),others=assigned.filter(a=>a!==old),choices=rank(item,others);evaluated+=choices.length;const best=choices[0];if(!best)continue;if(!old)assigned.push({...item,start:best.start});else{const reserved=reservations(ctx,others),before=candidate(ctx,item.device,item.curve,old.start,reserved);before.surplusKWh=margin(item,before,reserved);if(cmp({...best,start:0},{...before,start:0})<0)old.start=best.start;}}
  remember(assigned);
 }
 // A single appliance is cheap to scan exhaustively: keep every legal 15-minute start.
 if(prepared.length===1){const item=prepared[0],choices=rank(item,[]);evaluated+=choices.length;for(const option of choices)remember([{...item,start:option.start}]);}
 // Two bounded timing preferences add convenient alternatives without enumerating combinations.
 for(const order of prepared.length===1?[]:[base,[...base].reverse()])for(const timing of ['early','late']){const assigned=[];for(const item of order){const choices=rank(item,assigned);evaluated+=choices.length;choices.sort((a,b)=>timing==='early'?a.start-b.start:b.start-a.start);if(choices[0])assigned.push({...item,start:choices[0].start});}remember(assigned);}
 const pool=[...found.values()],complete=Math.max(0,...pool.map(p=>p.length)),cheapest=Math.min(...pool.filter(p=>p.length===complete).map(p=>evaluate(p).cost));
 // Anchor the tolerance to one cheapest complete plan; pairwise tolerances are not transitive.
 const finalCompare=objective==='cost'?(a,b)=>b.length-a.length||compareCostPlans({...evaluate(a),start:Math.max(0,...a.map(x=>x.start+x.curve.duration))},{...evaluate(b),start:Math.max(0,...b.map(x=>x.start+x.curve.duration))},cheapest):compare;
 const plans=selectDiverseSchedules(pool,finalCompare,evaluate,10);return {plans,pool,evaluate,compare:finalCompare,evaluated,distinct:found.size,cheapestFoundCost:cheapest};
}
function materialize(ctx,prepared,assignments,objective,stats,range){
 const total=metrics(ctx,assignments),{slots,groups,costs,resources,...summary}=total;
 const devices=prepared.map(p=>{const a=assignments.find(a=>a.device.id===p.device.id);return {id:p.device.id,name:p.device.name,powerEntity:p.device.powerEntity||null,curve:p.curve,energyKWh:p.curve.kWh,durationMinutes:p.curve.duration/60000,scheduled:a?candidate(ctx,p.device,p.curve,a.start,reservations(ctx,assignments,p.device.id)):null,status:a?'gotowe':'Brak pełnego okna: termin zakończenia, kolejność cykli, prognoza lub limit poboru.'};});
 const sequence=new Map();for(const d of devices.filter(d=>d.scheduled).sort((a,b)=>a.scheduled.start-b.scheduled.start||a.id.localeCompare(b.id))){const group=d.id.slice(0,d.id.lastIndexOf('_')),n=(sequence.get(group)||0)+1;sequence.set(group,n);d.name=d.name.replace(/ · cykl \d+$/,' · cykl '+n);}
 const assigned=[];for(const a of [...assignments].sort((a,b)=>a.start-b.start||a.device.id.localeCompare(b.device.id))){const d=devices.find(d=>d.id===a.device.id);d.accounting=candidate(ctx,a.device,a.curve,a.start,reservations(ctx,assigned));d.accounting.balancingKWh=ctx.s.balanceMode==='instant'?0:Math.max(0,d.accounting.physicalImportKWh-d.accounting.additionalImportKWh);assigned.push(a);}
 return {version:1,calculatedAt:ctx.now,validUntil:Math.floor(ctx.now/Q)*Q+Q,range,horizonHours:ctx.s.horizonHours,mode:ctx.s.balanceMode,objective,status:devices.length?(assignments.length===devices.length?'Pełny plan':'Plan niepełny — sprawdź brakujące cykle'):'Dodaj cykle urządzeń',devices,schedule:{...summary,cheapestFoundCost:stats.cheapestFoundCost,surchargeLimit:objective==='cost'?PLAN_COST_TOLERANCE:0,scenarioCosts:costs,devices:assignments.length,requested:devices.length,startsAt:assignments.length?Math.min(...assignments.map(a=>a.start)):null,finishesAt:assignments.length?Math.max(...assignments.map(a=>a.start+a.curve.duration)):null,method:'Różne kolejności, trzy punkty startowe i dwa przejścia poprawek; bez gwarancji globalnego minimum.',evaluated:stats.evaluated,distinct:stats.distinct},timeline:ctx.quarterRows.filter(r=>r.end>range.earliest&&r.start<range.latest).map(r=>{let deviceKWh=0;for(let at=r.start;at<r.end;at+=STEP)deviceKWh+=slots.get(at)||0;return {...r,deviceKWh,netWithDevicesKWh:r.netKWh===null?null:r.netKWh+deviceKWh};}),load:ctx.load.summary,prices:ctx.prices,errors:ctx.errors,warnings:ctx.warnings};
}
export function planUnified(f,samples,c,input,optimizer,load,live,states,model,library,now=Date.now(),activity=null){
 input=validateUnified(input,c,library,optimizer);const {settings,range}=expandUnified(input,c,library,optimizer,now),ctx=buildContext(f,samples,c,settings,load,live,states,model,now);
 applyRunningAppliances(ctx,activity);
 for(const device of settings.devices){const running=activity?.devices.find(d=>d.powerEntity===device.powerEntity);if(running&&running.status!=='idle')device.earliest=Math.max(device.earliest??now,running.blockedUntil);}
 const prepared=settings.devices.map(device=>({device:{...device,_resource:device.powerEntity||input.entries.find(e=>e.id===device.id.slice(0,device.id.lastIndexOf('_')))?.id||device.id},curve:deviceCurve(device,library)}));
 if(settings.load.mode==='history')for(const entity of settings.load.excludeEntities)if(!prepared.some(p=>p.device.powerEntity===entity)&&!activity?.devices.some(d=>d.powerEntity===entity))ctx.warnings.push('Od bazy odjęto '+entity+', ale ten sprzęt nie ma cyklu we wspólnym planie. Jego niezaplanowana praca nie jest uwzględniona.');
 const references=buildComparisonPlans(ctx,prepared,comparisonRequests(f,range,c,settings),range);
 const searches=Object.fromEntries(['pv','cost'].map(goal=>[goal,search(ctx,prepared,goal,references)])),analyses={},dashboardAnalyses={},dashboardSelection={};
 for(const objective of ['pv','cost']){const found=searches[objective];analyses[objective]=found.plans.map(({plan,reason},i)=>({...materialize(ctx,prepared,plan,objective,found,range),id:objective+'_'+i,alternativeReason:reason}));
  const pool=[...searches.cost.pool,...searches.pv.pool],full=pool.filter(p=>p.length===prepared.length),cheapest=Math.min(...full.map(p=>found.evaluate(p).cost));
  const compare=objective==='cost'?(a,b)=>b.length-a.length||compareCostPlans({...found.evaluate(a),start:Math.min(...a.map(x=>x.start))},{...found.evaluate(b),start:Math.min(...b.map(x=>x.start))},cheapest):found.compare;
  const selection=selectDashboardSchedules(pool,compare,found.evaluate,prepared.length);
  dashboardSelection[objective]={mode:selection.mode,omittedGrid:selection.omittedGrid};
  dashboardAnalyses[objective]=selection.plans.map(({plan,reason},i)=>({...materialize(ctx,prepared,plan,objective,found,range),id:'dashboard_'+objective+'_'+i,alternativeReason:reason}));
 }
 const signature=p=>p.devices.filter(d=>d.scheduled).map(d=>JSON.stringify([d.powerEntity||d.id,d.curve.wh,d.scheduled.start])).sort().join('|');
 const comparisons=references.map(row=>{const {plan,...info}=row,result=materialize(ctx,prepared,plan,'cost',searches.cost,range),id='comparison_'+row.kind+'_'+row.day;result.id=id;result.comparisonLabel=row.label;result.schedule.method='Wariant ze wskazanym startem; kolejne cykle najwcześniej po zwolnieniu sprzętu, z zachowaniem ograniczeń.';const match=Object.fromEntries(['cost','pv'].map(goal=>[goal,result.schedule.devices===result.schedule.requested&&result.schedule.requested?analyses[goal].find(r=>signature(r)===signature(result))?.id||null:null]));return {...info,id,result,matchedPlan:match};});
 return {settings:input,expandedSettings:settings,calculatedAt:now,range,analyses,dashboardAnalyses,dashboardSelection,comparisons,activity};
}
