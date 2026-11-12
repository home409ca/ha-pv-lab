import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultAppliances,detectCycles,buildProfile,manualProfile,selectProfile,analyzeAppliance} from '../src/appliances.mjs';
import {planDevice,defaultPlan} from '../src/planner.mjs';
import {defaults} from '../src/defaults.mjs';
const t=Date.parse('2026-06-10T10:00:00Z'),M=60000,device=structuredClone(defaultAppliances[0]),zone='Europe/Warsaw';
const power=values=>values.map(([minute,y])=>({x:t+minute*M,y}));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('cykl zachowuje krótką pauzę, kończy się przed długim zerem i całkuje energię',()=>{
  const result=detectCycles(power([[0,2],[10,2000],[20,40],[25,0],[35,1000],[45,0],[70,0]]),[],device,t,t+70*M,zone);
  assert.equal(result.cycles.length,1);const c=result.cycles[0];assert.equal(c.start,t+10*M);assert.equal(c.end,t+45*M);close(c.energyKWh,.5033333333333333);assert.equal(c.peakW,2000);assert.equal(c.wh.length,7);assert.equal(c.meterKWh,null);
});
test('ucięte granice i unavailable nie są zakończonymi poprawnymi cyklami',()=>{
  assert.equal(detectCycles(power([[0,2000],[30,0],[55,0]]),[],device,t,t+55*M,zone).cycles.length,0);
  assert.equal(detectCycles(power([[0,0],[10,2000],[30,2000]]),[],device,t,t+40*M,zone).rejected.incomplete,1);
  const bad=detectCycles(power([[0,0],[10,2000],[20,null],[25,2000],[40,0],[65,0]]),[],device,t,t+65*M,zone);assert.equal(bad.cycles.length,0);assert.equal(bad.rejected.missing,1);
});
test('kontrolny licznik dzienny obsługuje północ i nie zmienia po cichu całki mocy',()=>{
  const base=Date.parse('2026-06-10T21:30:00Z'),p=[[0,0],[20,900],[40,0],[70,0]].map(([m,y])=>({x:base+m*M,y})),e=[[0,.9],[20,.9],[25,.975],[29.99,1.05],[30,0],[35,.075],[40,.15]].map(([m,y])=>({x:base+m*M,y}));
  const c=detectCycles(p,e,device,base,base+70*M,zone).cycles[0];close(c.energyKWh,.3);close(c.meterKWh,.3);
  const sameDay=detectCycles(power([[0,0],[10,2000],[30,0],[60,0]]),power([[0,1],[10,1],[20,0],[30,.1]]),device,t,t+60*M,zone).cycles[0];assert.equal(sameDay.meterKWh,null);
});
test('typowy wybiera realny cykl z najczęstszej długości, średni zachowuje średnią energię',()=>{
  const cycle=(id,wh,start)=>({id,start,durationMinutes:wh.length*5,wh,energyKWh:wh.reduce((a,b)=>a+b,0)/1000,peakW:3000});
  const cycles=[cycle('a',[100,100,100],1),cycle('b',[200,200,200],2),cycle('c',[300,300,300,300,300,300],3)],profile=buildProfile({cycles,deviceId:'pralka'},['a','b','c'],'Bawełna');
  assert.equal(profile.variants.typical.durationMinutes,15);close(profile.variants.mean.energyKWh,.9);close(profile.variants.maximum.energyKWh,1.8);assert.equal(profile.summary.cycles,3);assert.equal(profile.variants.mean.wh.length,6);
});
test('profil ręczny jest walidowany i dopełniony zerami bez dodawania energii',()=>{
  const p=manualProfile('Test',[2000]);assert.equal(p.variants.typical.durationMinutes,15);close(p.variants.typical.energyKWh,1/6);assert.deepEqual(p.variants.typical.wh.slice(1),[0,0]);
  assert.throws(()=>manualProfile('Zły',[-1]));assert.throws(()=>manualProfile('Zły',[0]));assert.throws(()=>manualProfile('Zły',[NaN]));assert.throws(()=>selectProfile({profiles:[]},'missing'));
});
test('rozłożenie energii profilu zmienia bilans i pobór fizyczny przy tej samej energii i długości',()=>{
  const now=Date.parse('2026-06-10T10:00:00Z'),profile=manualProfile('Grzanie',[6000,0,0,0,0,0]),c={...structuredClone(defaults),location:{latitude:52,longitude:21}},f={fullRows:[{start:now,wh:500},{start:now+900000,wh:0}]},plan={...defaultPlan,mode:'quarterly',energyKWh:.5,durationHours:.5,baseW:0,earliest:now,latest:now+1800000};
  const normal=planDevice(f,[],c,plan,now),shaped=planDevice(f,[],c,{...plan,profileId:profile.id},now,{profiles:[profile]});close(normal.best.deficitKWh,.25);close(shaped.best.deficitKWh,0);close(shaped.best.physicalImportKWh,1/3);assert.equal(shaped.profile.name,'Grzanie');
});
test('import rozpoznaje W/kW, nie zapisuje surowych stanów i raportuje postęp',async()=>{
  const to=t+70*M,rows=[[0,0],[10,2],[30,0],[70,0]].map(([m,y])=>({entity_id:device.powerEntity,state:String(y),last_updated:new Date(t+m*M).toISOString(),attributes:{unit_of_measurement:'kW'}}));let progress=0;
  const result=await analyzeAppliance({request:async()=>[rows]},device,1,zone,()=>progress++,to);assert.equal(result.cycles.length,1);close(result.cycles[0].energyKWh,2/3);assert.ok(progress>0);assert.ok(!Object.hasOwn(result,'raw'));
});
