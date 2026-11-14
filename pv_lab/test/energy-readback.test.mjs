import test from 'node:test';import assert from 'node:assert/strict';
import {createEnergyReadback} from '../src/energy-readback.mjs';
test('Automatic receiver diagnostics deduplicate requests and refresh once per minute without blocking local view',async()=>{
 let now=Date.parse('2026-11-14T08:00:00Z'),calls=0,finish;const cache=createEnergyReadback(()=>{calls++;return new Promise(resolve=>finish=resolve);},{clock:()=>now});
 const first=cache.refresh(),second=cache.refresh();assert.equal(first,second);assert.equal(cache.state.busy,true);assert.equal(cache.state.data,null);await Promise.resolve();assert.equal(calls,1);
 finish({entries:[{id:'pv',whHours:{'2026-11-14T12:00:00Z':799,'2020-01-01T00:00:00Z':200}}]});await first;assert.equal(cache.state.busy,false);assert.deepEqual(cache.state.data.entries[0].whHours,{'2026-11-14T12:00:00Z':799});
 await cache.refresh();assert.equal(calls,1);now+=60000;const next=cache.refresh();await Promise.resolve();assert.equal(calls,2);finish({entries:[]});await next;assert.equal(cache.state.data.at,now);
});
test('Failed automatic control preserves dated last success, exposes error and retries at the next interval',async()=>{
 let now=100000,fail=false;const cache=createEnergyReadback(async()=>{if(fail)throw new Error('HA unavailable');return {entries:[]};},{clock:()=>now});await cache.refresh();const saved=cache.state.data;
 now+=60000;fail=true;await cache.refresh();assert.equal(cache.state.data,saved);assert.equal(cache.state.error,'HA unavailable');assert.equal(cache.state.busy,false);
 now+=60000;fail=false;await cache.refresh();assert.equal(cache.state.error,null);assert.equal(cache.state.data.at,now);
});
