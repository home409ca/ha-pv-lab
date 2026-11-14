import test from 'node:test';import assert from 'node:assert/strict';
import {defaults} from '../src/defaults.mjs';import {optimizerDefaults} from '../src/optimizer-settings.mjs';import {emptyLoad} from '../src/optimizer-load.mjs';import {createHouseForecast} from '../src/house-forecast.mjs';import {houseBalanceSeries} from '../public/presentation.js';import {productionScale} from '../public/chart-ranges.js';
const H=3600000,Q=900000,start=Date.parse('2026-11-14T11:00:00Z'),pv=Array.from({length:8},(_,i)=>({start:start+i*Q,wh:i<4?500:50}));
test('Optional house/surplus curves use the same baseline model, aggregate full hours, clip deficits and preserve missing data',()=>{
 const c=structuredClone(defaults),s=optimizerDefaults(c);s.load.baseW=400;const house=createHouseForecast({fullRows:pv},emptyLoad(),s,c,null,start);assert.equal(house.rows[0].wh,100);assert.deepEqual(houseBalanceSeries(pv,house,'2026-11-14',c.timezone,{}),[]);
 const series=houseBalanceSeries(pv,house,'2026-11-14',c.timezone,{house:true,surplus:true}),at=(line,t)=>line.points.find(p=>p.start===t);assert.equal(at(series[0],start).y,.4);assert.equal(at(series[1],start).y,1.6);assert.equal(at(series[1],start+H).y,0);
 assert.equal(at(series[0],start-H).y,null);const missing=houseBalanceSeries(pv.slice(1),house,'2026-11-14',c.timezone,{surplus:true});assert.equal(at(missing[0],start).y,null);
 const ongoing=createHouseForecast({fullRows:pv},emptyLoad(),s,c,null,start+50*60000);assert.equal(ongoing.rows.filter(p=>p.start<start+H).length,4);assert.ok(ongoing.rows.filter(p=>p.start<start+H).every(p=>p.wh===100));
});
test('PV chart scales around visible data and only shows inverter ceiling when production approaches it, not when house use rises',()=>{
 let scale=productionScale(1000,5500,'W');assert.equal(scale.limit,null);assert.ok(scale.max<1500);scale=productionScale(5000,5500,'W');assert.equal(scale.limit,5500);assert.ok(scale.max>5500);
 scale=productionScale(1,5500,'kWh');assert.equal(scale.limit,null);assert.ok(scale.max<1.5);scale=productionScale(5,5500,'kWh');assert.equal(scale.limit,5.5);assert.ok(scale.max>5.5);
 assert.equal(productionScale(6,5500,'kWh',1).limit,null);
});
