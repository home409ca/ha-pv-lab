import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {defaults} from '../src/defaults.mjs';
import {geometryKey,createHistoricalProfile} from '../src/historical-profile.mjs';
import {influxDefaults,validateInflux,InfluxClient,historyEntities,analyseInfluxDay,mergeInfluxDay,emptyInfluxHistory,mergeHistorySources,combinedShading} from '../src/influx-history.mjs';
import {readProviderArchives,archiveComparison} from '../src/provider-archive.mjs';
import {emptyReports,updateReports} from '../src/reports.mjs';
import {fixture} from './helpers/influx-fixture.mjs';
test('Influx credentials validation and read-only query guard',async()=>{assert.throws(()=>validateInflux({...influxDefaults,url:'http://user:password@host:8086'}));assert.throws(()=>validateInflux({...influxDefaults,from:'2024-02-31'}));const client=new InfluxClient({...influxDefaults,password:'private'});await assert.rejects(client.query('DROP DATABASE "home_assistant"'));await assert.rejects(client.query('SELECT * FROM "W"; DELETE FROM "W"'));});
test('Influx integrates actual AC and DC string shares; imports are idempotent and fill actual profile',()=>{
 const {c,start,series,available}=fixture(),day=analyseInfluxDay(series,c,start,available,influxDefaults),state=emptyInfluxHistory();
 assert.equal(day.hourly.total.length,24);assert.ok(Math.abs(day.hourly.total.reduce((s,r)=>s+r[1],0)-2.4)<.01);
 const noon=day.hourly.pv1.find(r=>r[0]===start+12*3600000);assert.ok(Math.abs(noon[1]-.4)<.01);assert.ok(Object.keys(day.shading).length>0);
 mergeInfluxDay(state,day,c);const n=Object.values(state.shading).reduce((s,b)=>s+b.n,0);mergeInfluxDay(state,day,c);assert.equal(Object.values(state.shading).reduce((s,b)=>s+b.n,0),n);assert.equal(state.channels.total.rows.length,24);
 const profile=createHistoricalProfile(mergeHistorySources(null,state,c),c);assert.equal(profile.summary.channels.length,3);assert.equal(profile.summary.channels.find(ch=>ch.id==='pv1').source,'influx');
 const combined=combinedShading({},state,c,start+86400000);assert.equal(Object.values(combined).reduce((s,b)=>s+b.n,0),n);assert.deepEqual(combinedShading({},state,c,start),{});
});
test('High voltage and missing daytime input never teach shade or invent zero production',()=>{
 const {c,start,series,available}=fixture();series[c.entities.voltages[0]]=series[c.entities.voltages[0]].map(r=>({...r,value:260}));const high=analyseInfluxDay(series,c,start,available,influxDefaults);assert.ok(Object.keys(high.shading).length>0);assert.equal(high.hourly.total.find(r=>r[0]===start+12*3600000)[2],'valid');assert.ok(high.quarters.some(q=>q.warnings.includes('wysokie napięcie')));
 delete series[c.entities.power];const missing=analyseInfluxDay(series,c,start,available,influxDefaults);assert.equal(missing.quarters.find(q=>q.start===start+12*3600000).wh,null);assert.ok(!missing.hourly.total.some(r=>r[0]===start+12*3600000));
});
test('Five-minute optimizer records are usable but a longer outage is not carried through a quarter',()=>{
 const {c,start,series,available}=fixture();for(const o of c.optimizers)series[o.power]=series[o.power].filter((_,i)=>i%10===0);
 const sparse=analyseInfluxDay(series,c,start,available,influxDefaults);assert.ok(Object.keys(sparse.shading).length>0);
 for(const o of c.optimizers)series[o.power]=series[o.power].filter(r=>r.at<start+11*3600000||r.at>=start+13*3600000);
 const gaps=analyseInfluxDay(series,c,start,available,influxDefaults);assert.ok(Object.values(gaps.shading).reduce((s,b)=>s+b.n,0)<Object.values(sparse.shading).reduce((s,b)=>s+b.n,0));
});
test('Report actuals retain Influx provenance and never overwrite a previously recorded HA value with a fallback',()=>{
 const {c,start}=fixture(),t=start+12*3600000,state=emptyReports();updateReports(state,[],c,t+3600000,{[t]:.6},{[t]:'historia InfluxDB'});
 assert.equal(state.hours['rolling|'+t].actualSource,'historia InfluxDB');assert.equal(state.hours['rolling|'+t].predictions.pv_lab,null);
 updateReports(state,[],c,t+3600000,{[t]:.7});assert.equal(state.hours['rolling|'+t].actualSource,'statystyki HA');
 updateReports(state,[],c,t+3600000,{[t]:.6},{[t]:'historia InfluxDB'});assert.equal(state.hours['rolling|'+t].actualKWh,.7);
});
test('HA statistics have priority, conflicts are not learned, and source changes do not double count',()=>{
 const {c,start,series,available}=fixture(),day=analyseInfluxDay(series,c,start,available,influxDefaults),state=emptyInfluxHistory();mergeInfluxDay(state,day,c);
 const ch={...c.statistics.channels[0],rows:[[start+12*3600000,1.2,'unknown']]},ha={version:1,geometry:geometryKey(c),channels:{total:ch}};
 const merged=mergeHistorySources(ha,state,c),row=merged.channels.total.rows.find(r=>r[0]===start+12*3600000);assert.equal(row[1],1.2);assert.equal(row[2],'excluded');assert.equal(row[3],'ha_influx_conflict');assert.equal(merged.channels.total.rows.length,24);
 const changed=structuredClone(c);changed.inverter.limitW=5000;assert.equal(mergeHistorySources(ha,state,changed),ha);
});
test('Provider cache parsing sums sites, caps inverter, keeps issuance unknown and compares only matched hours',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'pv-cache-'));try{await mkdir(path.join(dir,'solcast_solar'));await mkdir(path.join(dir,'.storage'));const start=Date.parse('2024-06-01T10:00:00Z'),forecasts=[0,1].map(i=>({period_start:new Date(start+i*1800000).toISOString(),pv_estimate:4}));await writeFile(path.join(dir,'solcast_solar/solcast.json'),JSON.stringify({siteinfo:{a:{forecasts},b:{forecasts}}}));await writeFile(path.join(dir,'.storage/open_meteo_solar_forecast.test'),JSON.stringify({data:{wh_period_15m:Object.fromEntries([0,1,2,3].map(i=>[new Date(start+i*900000).toISOString(),2000]))}}));const c=structuredClone(defaults),data=await readProviderArchives(dir,c);assert.equal(data.providers.length,2);for(const p of data.providers){assert.equal(p.issuanceKnown,false);assert.equal(p.rows.length,4);assert.ok(p.rows.every(r=>r.wh===1375));}const comparisons=archiveComparison(data,{channels:{total:{rows:[[start,5,'valid']]}}},c);assert.equal(comparisons[0].days[0].forecastKWh,5.5);assert.equal(comparisons[0].days[0].actualKWh,5);assert.equal(comparisons[0].days[0].hours,1);
 }finally{await rm(dir,{recursive:true,force:true});}
});
