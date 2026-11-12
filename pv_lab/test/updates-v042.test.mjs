import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../src/defaults.mjs';
import {emptyReports,updateReports,reportView,migrateReports,captureReportForecasts} from '../src/reports.mjs';
import {bestWindows} from '../src/forecast.mjs';
import {updateRevisions} from '../src/revisions.mjs';
import {shortRange} from '../public/presentation.js';
const t=Date.parse('2026-06-10T10:00:00Z'),H=3600000,S=900000,c=structuredClone(defaults);
test('five best continuous windows rank by energy, preserve gaps and exclude past starts',()=>{
 const rows=Array.from({length:20},(_,i)=>({start:t+i*S,wh:100+i*10}));
 for(const hours of [1,2,3]){const ranked=bestWindows(rows,'2026-06-10',hours,c.timezone,t,5);assert.equal(ranked.length,5);assert.ok(ranked.every((w,i)=>!i||w.kWh<=ranked[i-1].kWh));assert.ok(ranked.every(w=>w.end-w.start===hours*H));}
 const gapped=bestWindows(rows.filter((_,i)=>i!==8),'2026-06-10',2,c.timezone,t+S,5);assert.ok(gapped.every(w=>w.start>=t+S&&!(w.start<=t+8*S&&w.end>t+8*S)));
});
test('minor revisions wait one hour while cumulative 0.5 kWh changes publish immediately',()=>{
 const f=value=>({days:[{date:'2026-06-10',totalKWh:value}]}),first=updateRevisions({},f(5),t);
 assert.equal(updateRevisions(first.state,f(5.1),t+60000).events.length,0);assert.equal(updateRevisions(first.state,f(5.49),t+120000).events.length,0);
 const big=updateRevisions(first.state,f(5.5),t+180000);assert.equal(big.events[0].deltaKWh,.5);
 assert.equal(updateRevisions(big.state,f(5.4),t+H).events.length,0);assert.equal(updateRevisions(big.state,f(5.4),t+H+180000).events[0].direction,'down');
});
test('local time range omits timezone normally and can distinguish repeated clock hours',()=>{
 assert.equal(shortRange(t,t+H,c.timezone),'12:00–13:00');assert.ok(shortRange(t,t+H,c.timezone,true).includes('GMT+2'));
});
function makeReports(){const state=emptyReports(),rows=Array.from({length:4},(_,i)=>({start:t+i*S,wh:200,sources:c.providers.map(p=>({provider:p.id,rawWh:200,originalWh:200}))}));captureReportForecasts(state,{at:t-60000,providers:c.providers.map(p=>p.id),rows},c);updateReports(state,[],c,t+H,{[t]:1});return state;}
test('0.4.1 legacy migration reunites hours and avoids counting derived months or years twice',()=>{
 const original=makeReports(),oldView=reportView(original),v2={...emptyReports(),version:2,legacy:oldView};
 const merged=migrateReports(v2,c),view=reportView(merged);assert.equal(view.hours.length,oldView.hours.length);assert.equal(view.days.length,oldView.days.length);assert.equal(view.months[0].actualSum,oldView.months[0].actualSum);assert.equal(view.years[0].actualSum,oldView.years[0].actualSum);assert.equal(merged.legacy,undefined);assert.equal(migrateReports(merged,c),merged);
});
test('legacy predictions fill missing values instead of duplicating a recently replayed hour',()=>{
 const original=makeReports(),current=structuredClone(original);current.version=2;current.legacy=reportView(original);for(const row of Object.values(current.hours))row.predictions.solcast=null;
 const merged=migrateReports(current,c);assert.equal(Object.keys(merged.hours).length,Object.keys(original.hours).length);const hour=Object.values(merged.hours).find(r=>r.predictions.pv_lab!==null);assert.equal(hour.predictions.solcast,.8);assert.equal(reportView(merged).months[0].actualSum,reportView(original).months[0].actualSum);
});
