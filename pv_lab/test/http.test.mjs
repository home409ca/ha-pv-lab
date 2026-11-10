import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {defaults} from '../src/defaults.mjs';
const listen=s=>new Promise(r=>s.listen(0,'127.0.0.1',()=>r(s.address().port)));
async function until(fn){const until=Date.now()+20000;while(Date.now()<until){try{const v=await fn();if(v)return v;}catch{}await new Promise(r=>setTimeout(r,50));}throw new Error('Przekroczono czas oczekiwania na aplikację.');}
test('HTTP: rzeczywisty odczyt przez adaptery, ustawienia, import, brak ujawnienia tokena', {timeout:30000},async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'pv-lab-http-')),now=Date.now(),slot=Math.floor(now/900000)*900000,hour=Math.floor(now/3600000)*3600000;
  const state=(id,value,unit,attributes={})=>({entity_id:id,state:String(value),last_updated:new Date(now).toISOString(),last_reported:new Date(now).toISOString(),attributes:{unit_of_measurement:unit,...attributes}});
  const states=[state(defaults.entities.power,1000,'W'),state(defaults.entities.inputPower,1050,'W'),state(defaults.entities.dailyEnergy,3,'kWh'),state(defaults.entities.totalEnergy,20000,'kWh'),state(defaults.entities.status,'On-grid'),state(defaults.entities.alarms,'None'),...defaults.entities.voltages.map(id=>state(id,230,'V'))];
  for(const s of defaults.strings)states.push(state(s.voltage,300,'V'),state(s.current,2,'A'));
  const map=Object.fromEntries(Array.from({length:8},(_,i)=>[new Date(slot+i*900000).toISOString(),250]));
  states.push(state('sensor.energy_production_today_3',3,'kWh',{wh_period_15m:map}));
  states.push(state('sensor.solcast_pv_forecast_prognoza_na_dzisiaj',3,'kWh',{detailedForecast:Array.from({length:4},(_,i)=>({period_start:new Date(slot+i*1800000).toISOString(),pv_estimate:1}))}));
  let badCall=false;const mock=http.createServer(async(req,res)=>{if(req.headers.authorization!=='Bearer TEST_PRIVATE_TOKEN'){badCall=true;res.writeHead(401);res.end();return;}
    let payload='';for await(const chunk of req)payload+=chunk;
    res.setHeader('Content-Type','application/json');if(req.url==='/api/states')return res.end(JSON.stringify(states));
    if(req.url==='/api/config')return res.end(JSON.stringify({latitude:52,longitude:21}));
    if(req.url==='/api/template')return res.end(JSON.stringify(payload.includes('today_2')?'pv2-entry':'pv1-entry'));
    if(req.url.startsWith('/api/services/forecast_solar/get_forecast')){const p=JSON.parse(payload);return res.end(JSON.stringify({service_response:{wh_period:{[new Date(hour).toISOString()]:p.config_entry==='pv1-entry'?1000:500}}}));}
    if(req.url.startsWith('/api/history/period/'))return res.end('[]');
    badCall=true;res.writeHead(404);res.end('{}');});
  const haPort=await listen(mock),portServer=http.createServer(),appPort=await listen(portServer);await new Promise(r=>portServer.close(r));
  const env={...process.env,HA_URL:`http://127.0.0.1:${haPort}`,HA_TOKEN:'TEST_PRIVATE_TOKEN',DATA_DIR:dir,PORT:String(appPort)};delete env.SUPERVISOR_TOKEN;
  const child=spawn(process.execPath,[fileURLToPath(new URL('../src/server.mjs',import.meta.url))],{env,stdio:'pipe'});let output='';child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);
  const base=`http://127.0.0.1:${appPort}`,get=p=>fetch(base+p).then(r=>r.json()),post=(p,b,h={})=>fetch(base+p,{method:'POST',headers:{'Content-Type':'application/json','X-PV-Lab':'1',...h},body:JSON.stringify(b)});
  try{
    const v=await until(async()=>{const x=await get('/api/view');return x.diagnostics?.length===3?x:null;});
    assert.equal(v.latest.power,1000);assert.equal(v.latest.strings.pv1,600);assert.equal(v.config.location.latitude,52);assert.equal(v.diagnostics.filter(d=>d.ok).length,3);assert.equal(v.forecast.details.length,3);
    const html=await fetch(base+'/');assert.equal(html.status,200);assert.ok((await html.text()).includes('PV Lab'));assert.equal((await fetch(base+'/app.js')).status,200);
    assert.equal((await post('/api/settings',v.config,{'Sec-Fetch-Site':'cross-site'})).status,403);
    assert.equal((await post('/api/settings',{...v.config,inverter:{limitW:0}})).status,400);
    const before=(await get('/api/view')).storage;await get('/api/view?demo=1');const after=(await get('/api/view')).storage;assert.equal(after.samples,before.samples);assert.equal(after.snapshots,before.snapshots);
    const exported=JSON.stringify(await get('/api/export'));assert.ok(!exported.includes('TEST_PRIVATE_TOKEN'));assert.ok(!output.includes('TEST_PRIVATE_TOKEN'));
    assert.equal((await post('/api/history',{days:1})).status,200);await until(async()=>{const x=await get('/api/view');return x.job&&!x.job.running;});
    const imported=await get('/api/view');assert.equal(imported.latest.power,1000);assert.ok(imported.storage.samples>1000);assert.equal(imported.analysis.evaluated,0);
    const changed=structuredClone(v.config);changed.inverter.limitW=5000;assert.equal((await post('/api/settings',changed)).status,200);assert.equal((await get('/api/settings')).inverter.limitW,5000);
    assert.equal(JSON.parse(await readFile(path.join(dir,'settings.json'),'utf8')).inverter.limitW,5000);assert.equal(badCall,false);
  }finally{child.kill();await new Promise(r=>child.once('exit',r));await new Promise(r=>mock.close(r));await rm(dir,{recursive:true,force:true});}
});
