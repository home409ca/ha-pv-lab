import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {emptyEnergyArchive,captureEnergyForecast,energyForecastHours} from '../src/energy-archive.mjs';
import {Storage} from '../src/storage.mjs';
const hour=Date.parse('2026-06-01T10:00:00Z'),key=new Date(hour).toISOString();
const rows=(wh=250,start=hour)=>Array.from({length:4},(_,i)=>({start:start+i*900000,wh}));
test('Energy freezes latest forecast known before the hour; no hindsight or incomplete hours',()=>{
 const archive=emptyEnergyArchive();
 assert.ok(captureEnergyForecast(archive,{at:hour-3600000,rows:rows()}));
 assert.ok(captureEnergyForecast(archive,{at:hour-60000,rows:rows(300)}));
 assert.equal(captureEnergyForecast(archive,{at:hour-7200000,rows:rows(50)}),false);
 assert.equal(captureEnergyForecast(archive,{at:hour+1,rows:rows(100)}),false);
 assert.equal(captureEnergyForecast(archive,{at:hour-1,rows:rows(400).slice(1)}),false);
 assert.equal(archive.hours[key].wh,1200);
 assert.deepEqual(energyForecastHours(archive,{fullRows:rows(1)},true,hour+3600000),{[key]:1200});
 assert.deepEqual(energyForecastHours(archive,{fullRows:rows(1)},true,hour+100),{[key]:4});
 assert.deepEqual(energyForecastHours(archive,{fullRows:[]},false,hour+3600000),{[key]:1200});
});
test('Energy archive survives retention and process storage reload; repeated DST hours stay distinct',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'pv-energy-'));
 try{
  const store=new Storage(dir);await store.init();const archive=emptyEnergyArchive();
  const first=Date.parse('2025-10-26T00:00:00Z'),second=first+3600000;
  captureEnergyForecast(archive,{at:first-1,rows:[...rows(100,first),...rows(200,second)]});
  await store.atomic('energy-forecast-archive.json',archive);
  await store.prune({retention:{samplesDays:1,forecastsDays:1,revisionsDays:1,voltageHours:0}});
  const restarted=new Storage(dir),loaded=await restarted.read('energy-forecast-archive.json',null);
  assert.deepEqual(loaded,archive);
  const values=energyForecastHours(loaded,{fullRows:[]},false);
  assert.equal(values[new Date(first).toISOString()],400);assert.equal(values[new Date(second).toISOString()],800);
 }finally{await rm(dir,{recursive:true,force:true});}
});
