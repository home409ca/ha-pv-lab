import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,migrateConfig,validate} from '../src/defaults.mjs';
import {mergeAnalysis,detectWindows,validateAppliance,defaultAppliances} from '../src/appliances.mjs';
import {emptyReports,migrateReports,captureReportForecasts,reportView} from '../src/reports.mjs';
const start=Date.parse('2026-06-10T10:00:00Z'),M=60000;
const cycle=(id,offset=0)=>({id,start:start+offset,end:start+offset+30*M,wh:[10,10,10,10,10,10]});
const analysis=(cycles)=>({at:start,begin:start-M,end:start+100*M,deviceId:'pralka',powerEntity:'sensor.power',energyEntity:'sensor.energy',settings:{startW:10},cycles,warnings:[]});
test('repeat appliance imports merge cycles, update overlapping reads and retain earlier cycles',()=>{
 const old=analysis([cycle('a'),cycle('b',60*M)]),next=analysis([cycle('shifted',M),cycle('c',120*M)]),result=mergeAnalysis(old,next);
 assert.equal(result.cycles.length,3);assert.equal(result.added,1);assert.equal(result.cycles[0].id,'shifted');assert.equal(mergeAnalysis(result,next).added,0);
});
test('different thresholds or entities do not silently mix detection results',()=>{
 const old=analysis([cycle('a')]),next={...analysis([cycle('b')]),settings:{startW:100}};const result=mergeAnalysis(old,next);
 assert.equal(result.cycles.length,1);assert.equal(result.cycles[0].id,'b');assert.ok(result.warnings.some(w=>w.includes('Zmieniły')));
});
test('continuous device uses complete fixed windows and rejects unavailable intervals',()=>{
 const device=validateAppliance({...defaultAppliances[0],workType:'continuous',windowMinutes:60});
 const good=detectWindows([{x:start,y:1200}],device,start,start+120*M);assert.equal(good.cycles.length,2);assert.ok(Math.abs(good.cycles[0].energyKWh-1.2)<1e-8);
 const bad=detectWindows([{x:start,y:1200},{x:start+30*M,y:null},{x:start+60*M,y:1200}],device,start,start+120*M);assert.equal(bad.cycles.length,1);assert.equal(bad.rejected.missing,1);
 assert.throws(()=>validateAppliance({...device,windowMinutes:16}));
});
test('legacy reports remain accessible without mixing old scores into the new method',()=>{
 const old={version:1,hours:{test:{start,date:'2026-06-10',predictions:{pv_lab:2}}},days:{},months:{},years:{},pending:{},lastAt:start};
 const next=migrateReports(old);assert.equal(next.version,2);assert.deepEqual(next.hours,{});assert.equal(next.legacy.hours.length,1);assert.equal(reportView(next).legacy.method,'original');assert.equal(migrateReports(next),next);
});
test('provider cap applies to every quarter before summing, not merely to hourly total',()=>{
 const state=emptyReports(),c=structuredClone(defaults),rows=[2000,0,2000,0].map((value,i)=>({start:start+i*15*M,wh:Math.min(value,1375),sources:[{provider:'solcast',originalWh:value,rawWh:Math.min(value,1375)}]}));
 captureReportForecasts(state,{at:start-M,providers:['solcast'],rows},c);assert.equal(state.pending['rolling|'+start].predictions.solcast,2.75);assert.equal(state.pending['rolling|'+start].predictions.pv_lab,2.75);
 rows[0].sources[0].rawWh=9000;const second=emptyReports();captureReportForecasts(second,{at:start-M,providers:['solcast'],rows},c);assert.equal(second.pending['rolling|'+start].predictions.solcast,2.75);
});
test('unknown provider interval remains missing after limiting',()=>{
 const state=emptyReports(),c=structuredClone(defaults);captureReportForecasts(state,{at:start-M,providers:['solcast'],rows:Array.from({length:4},(_,i)=>({start:start+i*15*M,wh:100,sources:[{provider:'solcast',originalWh:200,rawWh:i===1?null:200}]}))},c);
 assert.equal(state.pending['rolling|'+start].predictions.solcast,null);
});
test('one-time migration corrects only the explicitly supplied user counters',()=>{
 const c=structuredClone(defaults);delete c.grid.semanticsVersion;c.grid.countersAreHourlyBalanced=true;const corrected=validate(migrateConfig(c));assert.equal(corrected.grid.countersAreHourlyBalanced,false);assert.equal(corrected.grid.confirmed,true);
 const other=structuredClone(c);other.grid.importEnergy='sensor.other_import';assert.equal(migrateConfig(other).grid.countersAreHourlyBalanced,true);
 corrected.grid.countersAreHourlyBalanced=true;assert.equal(migrateConfig(corrected).grid.countersAreHourlyBalanced,true);
});
