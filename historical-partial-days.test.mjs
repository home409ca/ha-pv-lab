import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../src/defaults.mjs';
import {clearSkyHour} from '../src/clear-sky.mjs';
import {dayBounds} from '../public/presentation.js';
import {geometryKey,createHistoricalProfile,applyHistoricalProfile,qualifyReferences,historyDefaults} from '../src/historical-profile.mjs';
const H=3600000,D=86400000,c={...structuredClone(defaults),location:{latitude:52.23,longitude:21.01}},target=Date.parse('2026-06-10T10:00:00Z'),now=Date.parse('2026-11-13T12:00:00Z');
function archive({hours=null,ratio=.8,badHour=null}={}){const rows=[];for(const year of [2024,2025])for(let day=4;day<=15;day++){const date=`${year}-06-${String(day).padStart(2,'0')}`,[begin,end]=dayBounds(date,c.timezone);for(let at=begin;at<end;at+=H){if(hours&&!hours.includes(new Date(at).getUTCHours()))continue;const clear=clearSkyHour(at,'total',c);rows.push([at,clear*ratio,new Date(at).getUTCHours()===badHour?'excluded':'valid']);}}return {version:1,geometry:geometryKey(c),at:now,channels:{total:{...c.statistics.channels[0],rows}}};}
test('a single excluded midday hour no longer discards every other good hour of a sunny day',()=>{
 const profile=createHistoricalProfile(archive({badHour:9}),c,now),bad=profile.hour('total',target-H),good=profile.hour('total',target);
 assert.equal(bad.days,0);assert.equal(bad.actualExcludedFromLearning,false);assert.equal(bad.brightDays,0);assert.ok(good.brightDays>=10);assert.equal(good.eligible,true);assert.equal(good.brightYears,2);
 const issued=Array.from({length:4},(_,i)=>({start:target+i*900000,wh:1375}));applyHistoricalProfile(issued,profile,c);assert.ok(issued.every(r=>r.historyFactor<1&&r.historyFactor>=.75));
});
test('missing night records do not prevent a sufficiently covered sunny production day from qualifying',()=>{
 const daylight=archive();daylight.channels.total.rows=daylight.channels.total.rows.filter(([at])=>clearSkyHour(at,'total',c)>=.05);
 const profile=createHistoricalProfile(daylight,c,now),ref=profile.hour('total',target);assert.equal(ref.eligible,true);assert.equal(ref.fragmentDays,0);assert.ok(profile.summary.channels[0].referenceDiagnostics.dayReferences>0);
});
test('three good consecutive sunny hours can supply a conservative fragment reference across independent years',()=>{
 const profile=createHistoricalProfile(archive({hours:[9,10,11]}),c,now),ref=profile.hour('total',target);
 assert.equal(ref.eligible,true);assert.equal(ref.fragmentDays,ref.brightDays);assert.ok(ref.brightDays>=10);assert.equal(ref.brightYears,2);assert.ok(ref.confidence>0);assert.ok(profile.summary.channels[0].referenceDiagnostics.fragmentReferences>0);
 const full=createHistoricalProfile(archive(),c,now).hour('total',target);assert.ok(ref.confidence<full.confidence);assert.ok(Math.abs(ref.attainableKWh-ref.clearKWh*.8)<1e-8);
});
test('partial days cannot create a bright reference but repeated valid hours may build a statistical profile',()=>{
 for(const input of [{hours:[9,10]},{hours:[9,11,13]},{hours:[9,10,11],ratio:.2},{hours:[9,10,11],badHour:10}]){
  const p=createHistoricalProfile(archive(input),c,now),ref=p.hour('total',target);assert.equal(ref.brightDays,0,JSON.stringify(input));if(input.hours.includes(10)&&input.badHour!==10){assert.equal(ref.referenceMethod,'statistical');assert.equal(ref.eligible,true);assert.ok(ref.confidence<=.4);}else assert.equal(ref.eligible,false,JSON.stringify(input));
 }
});
test('unstable high production inside an otherwise sparse fragment is not interpreted as a sunny reference',()=>{
 const start=Date.parse('2025-06-10T09:00:00Z'),records=[.65,1.2,.65].map((kWh,i)=>({at:start+i*H,kWh,clear:1})),cache=new Map();const [begin,end]=dayBounds('2025-06-10',c.timezone);for(let at=begin;at<end;at+=H)cache.set(at,1);
 qualifyReferences(records,'2025-06-10','total','AC',c,historyDefaults,cache);assert.ok(records.every(r=>!r.bright));
});
