import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,readFile,rm,mkdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {fixture} from './helpers/influx-fixture.mjs';
const listen=s=>new Promise(r=>s.listen(0,'127.0.0.1',()=>r(s.address().port)));
async function until(fn){for(let i=0;i<200;i++){try{const x=await fn();if(x)return x;}catch{}await new Promise(r=>setTimeout(r,25));}throw new Error('Timeout');}
test('HTTP imports actual Influx events, persists deduplicated data, supplies profiles and never exports credentials',{timeout:20000},async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'pv-influx-http-')),haDir=await mkdtemp(path.join(os.tmpdir(),'pv-ha-files-')),f=fixture();let calls=0;
 const mock=http.createServer((req,res)=>{assert.ok(req.headers.authorization?.startsWith('Basic '));const q=new URL(req.url,'http://test').searchParams.get('q');assert.match(q,/^(SELECT|SHOW) /);calls++;let series=[];
  if(q.startsWith('SHOW TAG VALUES')){for(const measurement of new Set(f.available.map(e=>e.measurement)))series.push({name:measurement,columns:['key','value'],values:f.available.filter(e=>e.measurement===measurement&&f.series[e.id]).map(e=>['entity_id',e.id.slice(7)])});}
  else{const unit=q.match(/FROM "autogen"\."([^"]+)"/)?.[1];for(const e of f.available.filter(e=>e.measurement===unit)){const rows=f.series[e.id]||[];series.push({name:unit,tags:{entity_id:e.id.slice(7)},columns:['time','value'],values:(q.includes('LAST(')?rows.filter(r=>r.at<f.start).slice(-1):rows).map(r=>[new Date(r.at).toISOString(),r.value])});}}
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({results:[{series}]}));
 });
 const port=await listen(mock),free=http.createServer(),appPort=await listen(free);await new Promise(r=>free.close(r));
 await writeFile(path.join(dir,'settings.json'),JSON.stringify(f.c));await mkdir(path.join(haDir,'solcast_solar'));await writeFile(path.join(haDir,'solcast_solar/solcast.json'),JSON.stringify({siteinfo:{a:{forecasts:[{period_start:new Date(f.start+12*3600000).toISOString(),pv_estimate:1}]}}}));
 const env={...process.env,DATA_DIR:dir,PORT:String(appPort),HA_CONFIG_DIR:haDir};for(const key of ['SUPERVISOR_TOKEN','HA_TOKEN','HA_URL'])delete env[key];
 const child=spawn(process.execPath,[fileURLToPath(new URL('../src/server.mjs',import.meta.url))],{env,stdio:'pipe'});let output='';child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);const base='http://127.0.0.1:'+appPort;
 const get=p=>fetch(base+'/api/'+p).then(r=>r.json()),post=(p,b={})=>fetch(base+'/api/'+p,{method:'POST',headers:{'Content-Type':'application/json','X-PV-Lab':'1'},body:JSON.stringify(b)}).then(async r=>{const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data;});
 try{
  await until(()=>get('view'));
  await post('external/settings',{url:'http://127.0.0.1:'+port,password:'INFLUX_PRIVATE_PASSWORD',from:'2024-06-01',until:'2024-06-01',autoRefresh:false});
  assert.ok((await post('external/inspect')).available.some(e=>e.measurement==='W'));
  await post('external/import');await until(async()=>{const x=await get('view');return x.job?.type==='influx'&&!x.job.running?x:null;});
  let view=await get('view');assert.equal(view.job.error,null);assert.equal(view.externalHistory.summary.days,1);assert.equal(view.externalHistory.summary.hours,24);assert.ok(view.historicalProfile.channels.some(ch=>ch.source==='influx'));const n=Object.values(view.analysis.shading).reduce((s,b)=>s+b.n,0);assert.ok(n>0);
  await post('external/import',{onlyMissing:false});await until(async()=>{const x=await get('view');return !x.job.running;});view=await get('view');assert.equal(view.job.error,null);assert.equal(Object.values(view.analysis.shading).reduce((s,b)=>s+b.n,0),n);
  const day=await get('external/day?date=2024-06-01');assert.equal(day.quarters.length,96);assert.ok(!JSON.stringify(day).includes('voltages'));assert.ok((await post('external/forecasts')).providers.length>0);
  const exported=JSON.stringify(await get('export')),publicView=JSON.stringify(await get('view')),files=await get('files');assert.ok(!exported.includes('INFLUX_PRIVATE_PASSWORD'));assert.ok(!publicView.includes('INFLUX_PRIVATE_PASSWORD'));assert.ok(!files.files.some(f=>f.name==='influx-credentials.json'));assert.equal((await fetch(base+'/api/file?name=influx-credentials.json')).status,404);assert.ok(!output.includes('INFLUX_PRIVATE_PASSWORD'));assert.equal(JSON.parse(await readFile(path.join(dir,'influx-history.json'),'utf8')).channels.total.rows.length,24);assert.ok(calls>5);
 }finally{child.kill();await new Promise(r=>child.once('exit',r));await new Promise(r=>mock.close(r));await rm(dir,{recursive:true,force:true});await rm(haDir,{recursive:true,force:true});}
});
