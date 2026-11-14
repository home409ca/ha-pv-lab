import test from 'node:test';import assert from 'node:assert/strict';
import {emptyEnergyArchive,captureEnergyForecast,energyForecastHours,energyForecastComparison} from '../src/energy-archive.mjs';
import {energyStatus} from '../src/energy-status.mjs';
import {energyReadbackEntry} from '../public/insights.js';
const H=3600000,Q=900000,t=Date.parse('2026-11-14T11:00:00Z'),rows=(start,wh)=>Array.from({length:4},(_,i)=>({start:start+i*Q,wh}));
test('Energy preview matches exporter for frozen history, changed current hour and future with UTC starts',()=>{
 const archive=emptyEnergyArchive();captureEnergyForecast(archive,{at:t-H,rows:rows(t,200)});const before=JSON.stringify(archive),now=t+H+Q,f={calculatedAt:now,fullRows:[...rows(t,300),...rows(t+H,250),...rows(t+2*H,150)]},preview=energyForecastComparison(archive,f,true,now),exported=energyForecastHours(archive,f,true,now);
 for(const r of preview.rows)assert.equal(r.exportedWh,exported[new Date(r.start).toISOString()]??null);
 const old=preview.rows.find(r=>r.start===t);assert.equal(old.currentWh,1200);assert.equal(old.exportedWh,800);assert.equal(old.differenceWh,-400);assert.equal(old.mode,'archive');assert.equal(old.issuedAt,t-H);
 const current=preview.rows.find(r=>r.start===t+H);assert.equal(current.exportedWh,1000);assert.equal(current.mode,'live');assert.equal(current.start,t+H);assert.equal(current.end,t+2*H);assert.equal(JSON.stringify(archive),before);
});
test('Missing hourly coverage and unavailable export remain missing, including past with no archive',()=>{
 const now=t+H,archive=emptyEnergyArchive(),f={calculatedAt:now,fullRows:[...rows(t,200),...rows(t+H,300),...rows(t+2*H,300).slice(0,3)]};let p=energyForecastComparison(archive,f,true,now);assert.equal(p.rows.find(r=>r.start===t).exportedWh,null);assert.equal(p.rows.find(r=>r.start===t+2*H).currentWh,null);assert.equal(p.rows.find(r=>r.start===t+2*H).exportedWh,null);assert.match(p.rows.find(r=>r.start===t+2*H).reason,/czterech/);
 p=energyForecastComparison(archive,f,false,now);assert.equal(p.rows.find(r=>r.start===t+H).exportedWh,null);assert.match(p.rows.find(r=>r.start===t+H).reason,/świeżego/);
});
test('HA readback carries exact forecast payload, selected entries and duplicate assignments; does not choose among multiple selected instances',async()=>{
 const raw={'2026-11-14T12:00:00+01:00':799},calls=[],ha={request:async()=>[{domain:'pv_lab',entry_id:'one',title:'PV Lab',state:'loaded'}],websocket:async q=>{calls.push(q.type);return q.type==='energy/info'?{solar_forecast_domains:['pv_lab']}:q.type==='energy/get_prefs'?{energy_sources:[{type:'solar',stat_energy_from:'sensor.pv',config_entry_solar_forecast:['one','other']},{type:'solar',stat_energy_from:'sensor.pv2',config_entry_solar_forecast:['one']}]}:{one:{wh_hours:raw}};}};
 const result=await energyStatus(ha,true);assert.deepEqual(result.entries[0].whHours,raw);assert.equal(result.entries[0].selected,true);assert.equal(result.solarSources.length,2);assert.equal(energyReadbackEntry(result).id,'one');assert.equal(energyReadbackEntry({entries:[{id:'one',selected:true},{id:'two',selected:true}]}),null);assert.ok(calls.includes('energy/solar_forecast'));
});
