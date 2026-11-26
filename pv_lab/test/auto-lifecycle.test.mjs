import test from 'node:test';import assert from 'node:assert/strict';
import {observeExecution} from '../src/execution-monitor.mjs';
import {createAutoWatch,advanceAutoWatch,watchBatch} from '../src/auto-watch.mjs';
import {applyAvailability,validateAvailability,missingProduction} from '../src/production-availability.mjs';
const M=60000,H=3600000,now=Date.parse('2026-11-26T09:00:00Z'),c={timezone:'Europe/Warsaw',appliances:[{id:'zmywarka',switchEntity:'switch.dish'}],quality:{maxGapSeconds:120}};
const state=()=>({timezone:c.timezone,execution:{auto:true,enabled:false,planId:'p',horizon:{latest:now+3*H},cycles:[{key:'dish_1',powerEntity:'sensor.dish',status:'sent',commandAt:now,start:now,end:now+H}],changes:[]}});
test('sent command does not claim completion; observed start and confirmed idle reset one-shot card and retain outcome',()=>{
 const s=state();assert.equal(observeExecution(s,{devices:[{powerEntity:'sensor.dish',status:'idle',idleSince:now-M}]},now+M),false);assert.ok(s.execution);
 observeExecution(s,{devices:[{powerEntity:'sensor.dish',status:'running',running:true,startedAt:now+M}]},now+2*M);assert.equal(s.execution.cycles[0].actualStart,now+M);
 observeExecution(s,{devices:[{powerEntity:'sensor.dish',status:'running',running:true,startedAt:now+M}]},now+2*H);assert.ok(s.execution); // elapsed plan alone cannot finish
 observeExecution(s,{devices:[{powerEntity:'sensor.dish',status:'idle',idleSince:now+2*H}]},now+2*H+20*M);assert.equal(s.execution,null);assert.equal(s.lastExecution.cycles[0].actualEnd,now+2*H);assert.equal(s.lastExecution.auto,false);assert.deepEqual(s.proposals,[]);assert.equal(s.request,null);
});
test('missing data never fabricates completed cycle; no observed start is explicitly reported',()=>{
 const s=state();observeExecution(s,{devices:[{powerEntity:'sensor.dish',status:'unknown'}]},now+2*H);assert.ok(s.execution);assert.equal(s.execution.cycles[0].observedStatus,'unknown');
 observeExecution(s,{devices:[{powerEntity:'sensor.dish',status:'idle',idleSince:now-M}]},now+3*H);assert.equal(s.lastExecution.cycles[0].observedStatus,'not_started');assert.equal(s.lastExecution.cycles[0].actualEnd,undefined);
});
test('continuous watch is unbounded, each fresh off edge creates exactly one delayed trigger',()=>{
 const states=new Map([['switch.dish',{state:'on'}]]),w=createAutoWatch({range:'today',horizon:{earliest:now,latest:now+H}},c,states,now);assert.equal(w.horizon,null);
 states.set('switch.dish',{state:'off'});assert.equal(advanceAutoWatch(w,c,states,now+M),true);assert.equal(watchBatch(w,c,now+5*M),null);assert.equal(watchBatch(w,c,now+11*M).counts.zmywarka,1);
 delete w.queue.zmywarka;advanceAutoWatch(w,c,states,now+12*M);assert.equal(watchBatch(w,c,now+30*M),null);
 states.set('switch.dish',{state:'on'});advanceAutoWatch(w,c,states,now+H);states.set('switch.dish',{state:'off'});advanceAutoWatch(w,c,states,now+H+M);assert.equal(watchBatch(w,c,now+H+11*M).counts.zmywarka,1);assert.equal(w.active,true);
});
test('off on previous day is not moved into next day; unavailable is not a new off edge',()=>{
 const start=Date.parse('2026-11-26T22:55:00Z'),states=new Map([['switch.dish',{state:'on'}]]),w=createAutoWatch({range:'both'},c,states,start);states.set('switch.dish',{state:'off'});advanceAutoWatch(w,c,states,start);
 advanceAutoWatch(w,c,states,start+10*M);assert.equal(watchBatch(w,c,start+10*M),null);assert.equal(w.active,true);
 states.set('switch.dish',{state:'on'});advanceAutoWatch(w,c,states,start+H);states.set('switch.dish',{state:'unavailable'});advanceAutoWatch(w,c,states,start+H+M);states.set('switch.dish',{state:'off'});advanceAutoWatch(w,c,states,start+H+2*M);assert.deepEqual(w.queue,{});
});
test('continuous watch survives physical completion without arming a duplicate batch',()=>{
 const s=state();s.autoWatch={active:true,id:'watch',queue:{}};s.execution.cycles[0].actualStart=now;s.execution.cycles[0].observedStatus='running';observeExecution(s,{devices:[{powerEntity:'sensor.dish',status:'idle',idleSince:now+H}]},now+H+20*M);assert.equal(s.autoWatch.active,true);assert.deepEqual(s.autoWatch.queue,{});
});
test('temporary production availability changes final future energy only, expires, and rejects indefinite blocks',()=>{
 const setting=validateAvailability({percent:0,until:now+H},now),rows=[{start:now-900000,wh:100},{start:now,wh:100},{start:now+H,wh:100}];applyAvailability(rows,setting,now);assert.deepEqual(rows.map(r=>r.wh),[100,0,100]);const normal=[{start:now,wh:100}];applyAvailability(normal,undefined,now);assert.equal(normal[0].wh,100);assert.throws(()=>validateAvailability({percent:0,until:null},now));assert.throws(()=>validateAvailability({percent:-1,until:now+H},now));assert.equal(applyAvailability([{start:now+H,wh:100}],setting,now+H).active,false);
});
test('production warning requires sustained covered daylight expectation, not a single zero or missing data',()=>{
 const rows=Array.from({length:5},(_,i)=>({start:now-H+i*900000,staticWh:200})),samples=Array.from({length:46},(_,i)=>({at:now-45*M+i*M,power:0}));assert.equal(missingProduction(rows,samples,c,now).suspected,true);assert.equal(missingProduction(rows,[samples.at(-1)],c,now).suspected,false);assert.equal(missingProduction(rows.map(r=>({...r,staticWh:0})),samples,c,now).suspected,false);
});
