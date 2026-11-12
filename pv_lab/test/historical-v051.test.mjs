import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../src/defaults.mjs';
import {profileReadiness,createHistoricalProfile,geometryKey,applyHistoricalProfile} from '../src/historical-profile.mjs';
const H=3600000,start=Date.parse('2026-06-10T10:00:00Z'),now=start+10*H,c={...structuredClone(defaults),location:{latitude:52.23,longitude:21.01}};
const ready=(days,years=4,extra={})=>profileReadiness({days,years,clear:2,geometryMatches:true,basis:'AC',matureDays:30,minYears:2,...extra});
test('observed counts 20, 26 and 28 days are preliminary with gradual nonzero influence',()=>{
 const references=[20,26,28].map(n=>ready(n));assert.ok(references.every(r=>r.eligible&&r.status==='preliminary'&&r.confidence>0));assert.ok(references[0].confidence<references[1].confidence&&references[1].confidence<references[2].confidence);assert.ok(Math.abs(references[1].confidence-.30044444444444446)<1e-8);
 const at29=ready(29),at30=ready(30),at31=ready(31);assert.equal(at30.status,'mature');assert.ok(at29.confidence<at30.confidence&&at30.confidence<at31.confidence);assert.ok(at30.confidence-at29.confidence<.03);
 assert.ok(ready(20,3,{estimated:true}).confidence<ready(20,3).confidence);
});
test('preliminary profile still requires minimum data, independent years and valid energy basis',()=>{
 assert.equal(ready(9).eligible,false);assert.equal(ready(10).eligible,true);assert.equal(ready(28,1).eligible,false);assert.equal(ready(28,4,{geometryMatches:false}).eligible,false);assert.equal(ready(28,4,{basis:'unknown'}).eligible,false);
});
test('night and small-energy periods do not show misleading zero confidence or data shortage',()=>{
 const night=ready(0,0,{clear:0});assert.equal(night.status,'night');assert.equal(night.confidence,null);assert.equal(night.eligible,false);assert.equal(night.reason,'Noc — korekta nie dotyczy');
 const low=ready(0,0,{clear:.001});assert.equal(low.status,'low_sun');assert.equal(low.confidence,null);assert.equal(ready(20,3,{clear:null}).status,'blocked');
});
test('excluded real measurements remain visible but do not enter records or normalized profile',()=>{
 const archive={version:1,geometry:geometryKey(c),at:now,channels:{total:{...c.statistics.channels[0],rows:[[start,2,'excluded']],invalid:0}}},p=createHistoricalProfile(archive,c,now),r=p.hour('total',start);
 assert.equal(r.actualKWh,2);assert.equal(r.actualQuality,'excluded');assert.equal(r.actualExcludedFromLearning,true);assert.equal(r.maxKWh,null);assert.equal(r.attainableKWh,null);assert.equal(r.days,0);assert.equal(r.eligible,false);assert.equal(p.hour('total',start+H).actualKWh,null);
 const cut=createHistoricalProfile({...archive,channels:{total:{...archive.channels.total,rows:[[start,2,'valid']]}}},{...c,historyProfile:{...c.historyProfile,validFrom:'2026-07-01'}},now);assert.equal(cut.hour('total',start).actualKWh,2);assert.equal(cut.hour('total',start).actualExcludedFromLearning,true);
});
test('preliminary profile can gently adjust excessive forecast while mature profile has stronger influence',()=>{
 const rows=()=>Array.from({length:4},(_,i)=>({start:start+i*900000,wh:1000})),p=days=>({summary:{channels:[{id:'total',basis:'AC'}]},hour:()=>({...ready(days),attainableKWh:1,brightDays:days,brightYears:4})});
 const preliminary=rows(),mature=rows();applyHistoricalProfile(preliminary,p(20),c);applyHistoricalProfile(mature,p(30),c);assert.ok(preliminary[0].wh<1000);assert.ok(preliminary[0].wh>mature[0].wh);assert.ok(mature[0].wh>=750);assert.equal(preliminary[0].beforeHistoryWh,1000);
});
