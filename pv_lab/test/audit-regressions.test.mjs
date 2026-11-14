import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';
import {Storage} from '../src/storage.mjs';
import {defaults} from '../src/defaults.mjs';
import {migrateOptimizerPrices,optimizerDefaults} from '../src/optimizer-settings.mjs';
import {numeric} from '../src/adapters.mjs';
import {actualInterval} from '../src/engine.mjs';
import {HA} from '../src/ha.mjs';
import {buildContext,candidate,deviceCurve,optimizeEnergy} from '../src/optimizer.mjs';
import {emptyLoad} from '../src/optimizer-load.mjs';
import {createGridModel,emptyGridRisk,mergeGridDay,gridDefaults} from '../src/grid-risk.mjs';
const H=3600000,Q=900000;
test('Parallel atomic writes preserve call order, capture values at invocation and recover after failure',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'pv-audit-'));try{const store=new Storage(dir),value={n:0};await store.init();const pending=[];for(let n=0;n<40;n++){value.n=n;pending.push(store.atomic('model.json',value));}value.n=999;await Promise.all(pending);assert.deepEqual(JSON.parse(await readFile(path.join(dir,'model.json'),'utf8')),{n:39});await assert.rejects(store.atomic('missing/invalid.json',{}));await store.atomic('model.json',{n:40});assert.equal((await store.read('model.json',null)).n,40);}finally{await rm(dir,{recursive:true,force:true});}
});
test('Legacy price migration preserves user tariffs, deposit choice, monthly RCEm and historical price versions',()=>{
 const config=structuredClone(defaults),raw=optimizerDefaults(config);delete raw.pricePresetVersion;raw.tariff.versions[0].energyDay.value=2.15;raw.tariff.versions[0].distributionDay.value=.31;raw.tariff.grossConfirmed=false;raw.export.enabled=true;raw.export.official={month:'2026-09',entity:'',value:.22};const copy=structuredClone(raw),next=migrateOptimizerPrices(raw,config,{profiles:[]});assert.deepEqual(raw,copy);assert.deepEqual(next.tariff,raw.tariff);assert.equal(next.export.enabled,true);assert.deepEqual(next.export.official,raw.export.official);assert.equal(next.pricePresetVersion,1);
});
test('Whitespace is missing, while numeric zero remains valid; invalid powers cannot create measured energy',()=>{
 assert.equal(numeric('  '),null);assert.equal(numeric('\n'),null);assert.equal(numeric('0'),0);const c=structuredClone(defaults),at=Date.parse('2026-11-16T10:00:00Z'),samples=Array.from({length:16},(_,i)=>({at:at+i*60000,power:i===5?NaN:1000,status:'On-grid',voltageFlag:'normal'})),result=actualInterval(samples,at,c);assert.ok(Number.isFinite(result.wh));assert.ok(result.coverage<.95);assert.ok(result.reasons.includes('brak mocy'));
});
test('Malformed Home Assistant states produce a clear recoverable error instead of an internal map exception',async()=>{
 const ha=new HA();ha.request=async()=>({error:'unavailable'});await assert.rejects(ha.states(),/poprawnej listy encji/);ha.request=async()=>[{entity_id:'sensor.test',state:'0'}];assert.equal((await ha.states()).get('sensor.test').state,'0');
});
function setup(now){const c=structuredClone(defaults);c.timezone='Europe/Warsaw';c.location={latitude:52,longitude:21};const s=optimizerDefaults(c);s.load.baseW=500;s.load.uncertainty=0;s.riskWeight=0;s.export.enabled=false;s.devices=[];const f={fullRows:Array.from({length:196},(_,i)=>({start:Math.floor(now/Q)*Q+i*Q,wh:500}))},d={id:'washer',name:'Pralka',enabled:true,profileId:null,variant:'typical',powerEntity:'',energyKWh:1,durationMinutes:60,earliest:null,deadline:null,allowedHours:[[0,1440]],skipWeekends:false,priority:5},library={profiles:[]};return {c,s,f,d,library,ctx:()=>buildContext(f,[],c,s,emptyLoad(),null,new Map(),{},now)};}
test('Without deposit PV used by a device creates neither import cost nor export opportunity charge',()=>{
 const now=Date.parse('2026-11-16T10:00:00Z'),x=setup(now),r=candidate(x.ctx(),x.d,deviceCurve(x.d,x.library),now);assert.equal(r.additionalImportKWh,0);assert.equal(r.cost,0);assert.equal(r.opportunityCost,0);assert.ok(Math.abs(r.lostExportKWh-1)<1e-8);
});
test('An unavailable price invalidates a start, while manual zero fees and negative export value remain explicit',()=>{
 const now=Date.parse('2026-11-16T10:00:00Z'),x=setup(now);x.s.tariff.versions[0].energyDay={value:null,entity:'sensor.missing'};assert.equal(candidate(x.ctx(),x.d,deviceCurve(x.d,x.library),now),null);x.s.tariff.versions[0].energyDay={value:1.3,entity:''};x.s.export.enabled=true;x.s.export.official={month:'2026-10',value:-.1,entity:''};x.s.export.factor=1;const r=candidate(x.ctx(),x.d,deviceCurve(x.d,x.library),now);assert.ok(Math.abs(r.cost+.1)<1e-8);assert.ok(Math.abs(r.cost-r.gridCost-r.opportunityCost)<1e-8);
});
test('Settlement and quarter accounting conserve energy on both autumn repetitions and the spring clock change',()=>{
 for(const iso of ['2026-10-25T02:00:00+02:00','2026-10-25T02:00:00+01:00','2026-03-29T01:45:00+01:00']){const now=Date.parse(iso),x=setup(now),ctx=x.ctx();for(const row of ctx.quarterRows)assert.ok(Math.abs(row.netKWh-(row.baseKWh-row.pvKWh))<1e-10);const r=candidate(ctx,x.d,deviceCurve(x.d,x.library),now);assert.ok(r);assert.equal(r.end-r.start,H);assert.ok(Math.abs(r.pvKWh-2)<1e-8);}
});
test('Grid risk cache never transfers a loss from a stronger quarter to a low-energy quarter or changes repeated calculations',()=>{
 const c=structuredClone(defaults),now=Date.parse('2026-11-16T08:00:00Z'),target=Date.parse('2026-11-16T10:00:00Z'),state=emptyGridRisk();c.location={latitude:52,longitude:21};for(let n=1;n<=8;n++){const at=target-n*7*24*H;mergeGridDay(state,new Date(at).toISOString().slice(0,10),[[at,0,900,100,n<=4?40:0,60,254,n<=4?1:0,n<=4?360:0]],c,{now});}const model=createGridModel(state,c,gridDefaults,now);assert.ok(model.at(target,100).factor<1);assert.equal(model.at(target+Q,10).factor,1);assert.equal(model.at(target+Q,10).factor,1);assert.equal(model.at(now-Q,100).factor,1);
});
