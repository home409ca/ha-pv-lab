import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../src/defaults.mjs';
import {voltageBounds} from '../public/chart-ranges.js';
import {dayBounds} from '../public/presentation.js';
import {isProductionHour,productionRange,currentHour} from '../public/production-hours.js';
import {emptyReports,captureReportForecasts,updateReports,reportView,backfillHistoryComparison} from '../src/reports.mjs';
const c={...structuredClone(defaults),location:{latitude:52,longitude:21}},H=3600000,S=900000,day='2026-06-10',[begin,end]=dayBounds(day,c.timezone);
const rows=Array.from({length:(end-begin)/S},(_,i)=>{const start=begin+i*S,wh=isProductionHour(Math.floor(start/H)*H,c)?250:0;return {start,wh,beforeHistoryWh:wh*2,sources:c.providers.map(p=>({provider:p.id,originalWh:wh,rawWh:wh}))};});
test('voltage axis follows phase readings and preserves actual low readings rather than hiding them',()=>{
 assert.deepEqual(voltageBounds([230,234,239]),{min:228,max:241});assert.deepEqual(voltageBounds([234,234]),{min:232,max:236});assert.deepEqual(voltageBounds([null,NaN]),{min:200,max:260});assert.equal(voltageBounds([0,230]).min,0);
});
test('production range omits zero nights while preserving cloudy zero daylight and daylight gaps',()=>{
 const range=productionRange(day,c,rows,[]);assert.ok(range[0]>begin);assert.ok(range[1]<end);assert.equal(isProductionHour(begin,c),false);assert.equal(isProductionHour(begin+12*H,c),true);assert.deepEqual(productionRange(day,c,[],[]),range);
 assert.equal(isProductionHour(begin,c,{actualKWh:.1}),true);assert.equal(currentHour(begin+12*H,begin+13*H,begin+12*H+23*60000),true);assert.equal(currentHour(begin+12*H,begin+13*H,begin+13*H),false);
});
test('new pending and completed reports contain production periods only; a full production day remains complete',()=>{
 const state=emptyReports(),at=begin-2*H;captureReportForecasts(state,{at,providers:c.providers.map(p=>p.id),rows},c);assert.ok(!Object.values(state.pending).some(r=>!isProductionHour(r.start,c)));
 const stats=Object.fromEntries(Array.from({length:(end-begin)/H},(_,i)=>[begin+i*H,isProductionHour(begin+i*H,c)?1:0]));updateReports(state,[],c,end+1000,stats);
 assert.ok(!Object.values(state.hours).some(r=>!isProductionHour(r.start,c)));const result=state.days['rolling|'+day],expected=Array.from({length:24},(_,i)=>begin+i*H).filter(t=>isProductionHour(t,c)).length;
 assert.equal(result.expectedHours,expected);assert.equal(result.actualHours,expected);assert.equal(result.paired.pv_lab.dailyN,1);
 const count=Object.keys(state.hours).length;updateReports(state,[],c,end+2*H,stats);assert.equal(Object.keys(state.hours).length,count);
});
test('old zero-night entries are hidden from report view without erasing the archived record',()=>{
 const state=emptyReports(),row={mode:'rolling',start:begin,date:day,actualKWh:0,predictions:{pv_lab:0},providers:[],quality:[]};state.hours.test=row;assert.equal(reportView(state,c).hours.length,0);assert.equal(state.hours.test,row);
});
test('history effectiveness compares exact issued variants and survives monthly aggregation',()=>{
 const start=begin+12*H,state=emptyReports();captureReportForecasts(state,{at:start-60000,providers:c.providers.map(p=>p.id),rows:rows.filter(r=>r.start>=start&&r.start<start+H)},c);updateReports(state,[],c,start+H,{[start]:1});
 const r=state.hours['rolling|'+start];assert.equal(r.predictions.without_history,2);assert.equal(r.predictions.pv_lab,1);const effect=state.days['rolling|'+day].historyEffect;assert.deepEqual(effect,{n:1,changedHours:1,withErrorKWh:0,withoutErrorKWh:1});
 updateReports(state,[],c,Date.parse('2026-08-20T12:00:00Z'));assert.deepEqual(state.months['rolling|2026-06'].historyEffect,effect);
});
test('baseline backfill uses the exact original publication, never a later recomputed forecast',()=>{
 const start=begin+12*H,at=start-60000,make=()=>({hours:{r:{start,at,issued:{},predictions:{pv_lab:1}}}}),pub={at,rows:rows.filter(r=>r.start>=start&&r.start<start+H)};
 const valid=make();backfillHistoryComparison(valid,[pub]);assert.equal(valid.hours.r.predictions.without_history,2);assert.equal(valid.hours.r.issued.without_history,at);
 const invalid=make();backfillHistoryComparison(invalid,[{...pub,at:start+60000}]);assert.equal(invalid.hours.r.predictions.without_history,undefined);
});
