import test from 'node:test';import assert from 'node:assert/strict';
import {hourlyForecastSeries} from '../public/presentation.js';import {energyForecastConflicts} from '../public/insights.js';
const H=3600000,Q=900000,start=Date.parse('2026-11-14T11:00:00Z'),defs=[{id:'p',name:'Dostawca',enabled:true}],visibility={corrected:true,raw:true,measured:true,providers:{},basis:'limited'},rows=Array.from({length:4},(_,i)=>({start:start+i*Q,wh:500,rawWh:600,sources:[{provider:'p',rawWh:700,originalWh:800}]}));
test('Hourly production chart sums four quarters to kWh and uses completed measured hours, never forecasts as measurements',()=>{
 const series=hourlyForecastSeries(rows,'2026-11-14','Europe/Warsaw',visibility,defs,[{start,actualKWh:1.7},{start:start+H,actualKWh:.2}],start+H+Q),point=s=>s.points.find(p=>p.start===start);
 assert.equal(point(series.find(s=>s.provider==='p')).y,2.8);assert.equal(point(series.find(s=>s.label==='PV Lab — po korektach')).y,2);assert.equal(point(series.find(s=>s.label==='Połączona prognoza po limicie')).y,2.4);
 const measured=series.find(s=>s.label.startsWith('Pomiar'));assert.equal(point(measured).y,1.7);assert.equal(measured.points.find(p=>p.start===start+H).y,null);assert.equal(point(measured).x,start+H/2);assert.match(point(measured).tooltip,/12:00–13:00/);
 const missing=hourlyForecastSeries(rows.slice(0,3),'2026-11-14','Europe/Warsaw',visibility,defs,[],start+H);assert.equal(point(missing.find(s=>s.label==='PV Lab — po korektach')).y,null);
 const hidden=hourlyForecastSeries(rows,'2026-11-14','Europe/Warsaw',{...visibility,providers:{p:false},measured:false},defs);assert.equal(hidden.some(s=>s.provider==='p'),false);assert.equal(hidden.some(s=>s.label.startsWith('Pomiar')),false);
});
test('Forecast warning requires verified selection on the same PV meter; available providers and other installations do not trigger it',()=>{
 const entry={id:'pv'},other={id:'solar',title:'Dostawca',domain:'forecast_solar',state:'loaded',hasData:true},result={forecastEntries:[other],solarSources:[{statisticId:'sensor.pv',forecastIds:['pv']},{statisticId:'sensor.other',forecastIds:['solar']}]};assert.deepEqual(energyForecastConflicts(result,entry),[]);
 result.solarSources[0].forecastIds.push('solar');assert.deepEqual(energyForecastConflicts(result,entry),[other]);result.forecastEntries=[];assert.deepEqual(energyForecastConflicts(result,entry),[]);assert.deepEqual(energyForecastConflicts(result,null),[]);
});
