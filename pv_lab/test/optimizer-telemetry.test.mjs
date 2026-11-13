import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../src/defaults.mjs';
import {optimizerDefaults,loadKey} from '../src/optimizer-settings.mjs';
import {currentLoad,cleanLoadDay,importLoadStatistics,emptyLoad,createLoadModel,importLoadDayHA} from '../src/optimizer-load.mjs';
const H=3600000;
const state=(n,u='W')=>({state:String(n),attributes:{unit_of_measurement:u}});
function setup(){const c=structuredClone(defaults),s=optimizerDefaults(c);return {c,s};}

test('Signed grid power reconstructs house with import and export; night zero PV is not missing',()=>{
 const {s}=setup(),states=new Map(s.load.excludeEntities.map(id=>[id,state(0)]));
 states.set(s.measurements.netPower,state(-1500));
 let live=currentLoad(states,s,0,2000);assert.equal(live.houseW,500);assert.equal(live.baseW,500);assert.equal(live.grid.exportW,1500);assert.match(live.houseSource,/oszacowanie/);
 states.set(s.measurements.netPower,state(350));live=currentLoad(states,s,0,0);assert.equal(live.houseW,350);assert.equal(live.grid.importW,350);assert.equal(live.pvW,0);
 assert.equal(currentLoad(states,s,0,null).houseW,null);
 states.set(s.load.powerEntity,state(700));assert.equal(currentLoad(states,s,0,0).houseW,700);
 states.set(s.load.powerEntity,state(1,'kWh'));states.delete(s.measurements.netPower);assert.match(currentLoad(states,s).diagnostics[0].reason,/jednostka/);
});

test('Empty clean-load imports report missing appliance and inconsistent readings',()=>{
 const {s}=setup(),series={[s.load.powerEntity]:[{at:0,value:100}]};let rows=cleanLoadDay(series,s,0,H);assert.equal(rows.length,0);assert.ok(rows.diagnostics.missing.includes(s.load.excludeEntities[0]));
 for(const id of s.load.excludeEntities)series[id]=[{at:0,value:1000}];rows=cleanLoadDay(series,s,0,H);assert.equal(rows.length,0);assert.ok(rows.diagnostics.inconsistent>0);
});

test('HA power history reconstructs deleted house entity from signed grid and PV',async()=>{
 const {c,s}=setup(),at=Date.parse('2026-11-01T00:00:00Z'),ids=[c.entities.power,s.measurements.netPower,...s.load.excludeEntities],data=ids.map(id=>[{entity_id:id,...state(id===c.entities.power?2000:id===s.measurements.netPower?-1500:0),last_updated:new Date(at).toISOString()}]);
 const rows=await importLoadDayHA({request:async()=>data},s,at,at+H,c);assert.equal(rows.length,4);assert.ok(rows.every(r=>Math.abs(r[1]-.125)<1e-9));
});

test('Long-term energy history derives clean hourly base and refuses missing or already-hourly-netted energy',async()=>{
 const {c,s}=setup(),at=Date.parse('2026-11-01T00:00:00Z'),ids=[c.entities.totalEnergy,c.grid.importEnergy,c.grid.exportEnergy,...c.appliances.map(a=>a.energyEntity)],values=[2,1,.5,.2,.1],data=Object.fromEntries(ids.map((id,i)=>[id,[{start:at/1000,change:values[i]}]]));
 const ha={statistics:async()=>data};let result=await importLoadStatistics(ha,s,c,at,at+H);assert.equal(result.wholeHours,1);assert.equal(result.rows.length,1);assert.ok(Math.abs(result.rows[0][1]-2.2)<1e-9);
 const state=emptyLoad();state.key=loadKey(s,c);state.hourRows=result.rows;s.load.mode='history';s.load.minDays=1;let model=createLoadModel(state,s,c,at+H);assert.equal(model.summary.hours,1);assert.equal(model.summary.quarters,0);assert.match(model.at(at+86400000).source,/historia/);assert.equal(model.at(at+86400000).w,2200);
 delete data[ids.at(-1)];result=await importLoadStatistics(ha,s,c,at,at+H);assert.equal(result.rows.length,0);assert.equal(result.wholeHours,1);assert.ok(result.missing.includes(ids.at(-1)));
 c.grid.countersAreHourlyBalanced=true;await assert.rejects(()=>importLoadStatistics(ha,s,c,at,at+H),/nie są bilansowane/);
});
