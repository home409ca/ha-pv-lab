import test from 'node:test';import assert from 'node:assert/strict';
import {hourProduction} from '../src/hour-production.mjs';import {defaults} from '../src/defaults.mjs';
import {hourRangeTicks,ongoingProductionSeries} from '../public/presentation.js';
const H=3600000,at=Date.parse('2026-11-16T10:00:00+01:00'),c=structuredClone(defaults);c.quality.maxGapSeconds=180;
const samples=Array.from({length:31},(_,i)=>({at:at+i*60000,power:1000,totalEnergy:100+i/60,dailyEnergy:2+i/60}));
test('Current hour is counter energy since the boundary, not an extrapolated whole hour',()=>{
 const m=hourProduction(samples,c,at+30*60000+20000);assert.ok(Math.abs(m.kWh-.5)<1e-9);assert.equal(m.through,at+30*60000);assert.equal(m.start,at);assert.equal(m.end,at+H);assert.match(m.source,/licznik energii AC/);
 const partial=ongoingProductionSeries(m,'2026-11-16',c.timezone);assert.equal(partial.length,1);assert.equal(partial[0].partial,true);assert.equal(partial[0].marker,true);assert.equal(partial[0].points.length,1);assert.equal(partial[0].points[0].x,at+H/2);assert.match(partial[0].points[0].tooltip,/niepełna godzina/);assert.deepEqual(ongoingProductionSeries(m,'2026-11-16',c.timezone,false),[]);assert.deepEqual(ongoingProductionSeries(m,'2026-11-15',c.timezone),[]);
});
test('Power integration is a fallback; missing, reset and stale measurements never become fabricated zero energy',()=>{
 const power=samples.map(({at,power})=>({at,power}));const m=hourProduction(power,c,at+30*60000);assert.ok(Math.abs(m.kWh-.5)<1e-9);assert.match(m.source,/całkowanie/);
 assert.equal(hourProduction([],c,at+30*60000).kWh,null);assert.equal(hourProduction(power,c,at+40*60000).kWh,null);assert.equal(hourProduction(power.slice(10),c,at+30*60000).kWh,null);assert.equal(hourProduction(power,c,at+H).kWh,null);
 const reset=samples.map(s=>({...s,totalEnergy:s.at<at+15*60000?s.totalEnergy:s.totalEnergy-100,dailyEnergy:null}));assert.match(hourProduction(reset,c,at+30*60000).source,/całkowanie/);
 const stopped=samples.map(s=>({...s,power:0,totalEnergy:100,dailyEnergy:2}));assert.equal(hourProduction(stopped,c,at+30*60000).kWh,0);
});
test('Boundary interpolation is labelled and measurements end at the last valid read, never at an unknown later power',()=>{
 const shifted=samples.map(s=>({...s,at:s.at-30000,totalEnergy:s.totalEnergy-.5/60})),m=hourProduction(shifted,c,at+29*60000+40000);assert.ok(Math.abs(m.kWh-29.5/60)<1e-9);assert.match(m.source,/interpolowany/);
 const badLast=samples.map(({at,power})=>({at,power}));badLast.at(-1).power=null;const fallback=hourProduction(badLast,c,at+30*60000);assert.equal(fallback.through,at+29*60000);assert.ok(Math.abs(fallback.kWh-29/60)<1e-9);
});
test('Hourly axes show ranges and distinguish the repeated autumn hour',()=>{
 const ticks=hourRangeTicks(at-H,at+2*H,c.timezone);assert.deepEqual(ticks.map(p=>p.label),['09–10','10–11','11–12']);assert.equal(ticks[0].x,at-H/2);
 const fall=hourRangeTicks(Date.parse('2026-10-25T00:00:00Z'),Date.parse('2026-10-25T02:00:00Z'),c.timezone);assert.equal(fall.length,2);assert.notEqual(fall[0].label,fall[1].label);assert.match(fall[0].label,/GMT/);
});
