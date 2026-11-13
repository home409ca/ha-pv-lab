import test from 'node:test';
import assert from 'node:assert/strict';
import {baseProfilePoints} from '../public/energy-optimizer.js';
test('House base chart preserves full-quarter energy and normalizes only the remaining part to W',()=>{
 const start=Date.parse('2026-11-14T12:00:00Z'),at=start+10*60000,rows=[{start,end:start+900000,baseKWh:.05,baseSource:'historia',baseDays:20},{start:start+900000,end:start+1800000,baseKWh:.15,baseSource:'historia',baseDays:22}];
 const p=baseProfilePoints(rows,at);assert.equal(p.length,2);assert.equal(p[0].x,at);assert.equal(p[0].y,600);assert.equal(p[0].kWh,.05);assert.equal(p[0].partial,true);assert.equal(p[1].y,600);assert.equal(p[1].kWh,.15);assert.equal(p[1].partial,false);assert.equal(p[1].days,22);assert.equal(p[1].source,'historia');
 assert.deepEqual(baseProfilePoints(rows,start+1800000),[]);assert.deepEqual(baseProfilePoints([],at),[]);
});
