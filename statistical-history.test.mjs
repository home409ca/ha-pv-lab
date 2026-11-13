import test from 'node:test';
import assert from 'node:assert/strict';
import {statisticalReference,historyDefaults,createHistoricalProfile,geometryKey,applyHistoricalProfile} from '../src/historical-profile.mjs';
import {defaults} from '../src/defaults.mjs';
import {clearSkyHour} from '../src/clear-sky.mjs';
const now=Date.parse('2026-11-13T12:00:00Z'),H=3600000,opts={...historyDefaults};
const records=(n,ratio=.4)=>Array.from({length:n},(_,i)=>({at:Date.UTC(2024+i%3,4,1+i%20,6),date:`${2024+i%3}-05-${String(1+i%20).padStart(2,'0')}`,year:2024+i%3,day:130,kWh:ratio,clear:1,quality:'valid'}));
test('repeated low production below the old 60% threshold supplies an explicit conservative statistical reference',()=>{
 const result=statisticalReference(records(45),45,1,opts,now,130);assert.equal(result.ratio,.4);assert.equal(result.eligible,true);assert.ok(result.confidence>0&&result.confidence<=.4);assert.equal(result.supportYears,3);
});
test('a normalized curve may be visible while excessive quality exclusions block its forecast correction',()=>{
 const result=statisticalReference(records(20),93,1,opts,now,130);assert.equal(result.ratio,.4);assert.equal(result.eligible,false);assert.equal(result.status,'quality_coverage');assert.equal(result.confidence,0);assert.match(result.reason,/20\/93/);
});
test('a lone high spike and high values from only one year do not enable statistical correction',()=>{
 const spike=records(10);spike[9].kWh=10;const a=statisticalReference(spike,10,1,opts,now,130);assert.equal(a.eligible,false);assert.equal(a.status,'unconfirmed_upper_tail');
 const concentrated=records(45,.1);for(let i=0;i<45;i++)if(concentrated[i].year===2026)concentrated[i].kWh=1;const b=statisticalReference(concentrated,45,1,opts,now,130);assert.equal(b.eligible,false);assert.equal(b.supportYears,1);
});
test('statistical references still require observation count, independent years and non-night reference energy',()=>{
 assert.equal(statisticalReference(records(9),9,1,opts,now,130).eligible,false);const year=records(30).map(r=>({...r,year:2025}));assert.equal(statisticalReference(year,30,1,opts,now,130).eligible,false);assert.equal(statisticalReference(records(30),30,0,opts,now,130).eligible,false);
});
test('untrusted data never enters fallback reference; a repeatable shaded-hour regression affects only excessive forecasts',()=>{
 const c={...structuredClone(defaults),location:{latitude:52,longitude:21}},start=Date.parse('2026-05-15T05:00:00Z'),rows=[];
 for(const year of [2024,2025,2026])for(let d=1;d<=25;d++){const t=Date.UTC(year,4,d,5);rows.push([t,clearSkyHour(t,'total',c)*.4,'valid']);rows.push([t+H,clearSkyHour(t+H,'total',c),'excluded']);}
 const archive={version:1,geometry:geometryKey(c),at:now,channels:{total:{...c.statistics.channels[0],rows}}},profile=createHistoricalProfile(archive,c,now),r=profile.hour('total',start);assert.equal(r.referenceMethod,'statistical');assert.equal(r.eligible,true);assert.equal(profile.hour('total',start+H).attainableKWh,null);
 const issue=Array.from({length:4},(_,i)=>({start:start+i*900000,wh:300,rawWh:300}));applyHistoricalProfile(issue,profile,c);assert.ok(issue.every(row=>row.wh<300&&row.wh>=225&&row.rawWh===300));assert.ok(issue.every(row=>row.history.days>0&&row.history.method==='statistical'));
 const low=issue.map(row=>({...row,wh:1}));applyHistoricalProfile(low,profile,c);assert.ok(low.every(row=>row.wh===1));
});
