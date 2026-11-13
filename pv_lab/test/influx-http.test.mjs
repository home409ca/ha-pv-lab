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
 const dir=await mkdtemp(path.join(os.tmpdir(),'pv-influx-http-')),haDir=await mkdtemp(path.join(os.tmpdir(),'pv-ha-files-')),f=fixture();const oldStart=f.start,date=new Date(Date.now()-86400000).toISOString().slice(0,10),shift=Date.parse(date+'T00:00:00Z')-oldStart;f.start+=shift;for(const rows of Object.values(f.series))for(const row of rows)row.at+=shift;let calls=0;
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
  await post('external/settings',{url:'http://127.0.0.1:'+port,password:'INFLUX_PRIVATE_PASSWORD',from:date,until:date,autoRefresh:false});
  assert.ok((await post('external/inspect')).available.some(e=>e.measurement==='W'));
  await post('external/import');await until(async()=>{const x=await get('view');return x.job?.type==='influx'&&!x.job.running?x:null;});
  let view=await get('view');assert.equal(view.job.error,null);assert.equal(view.externalHistory.summary.days,1);assert.equal(view.externalHistory.summary.hours,24);assert.ok(view.historicalProfile.channels.some(ch=>ch.source==='influx'));const n=Object.values(view.analysis.shading).reduce((s,b)=>s+b.n,0);assert.ok(n>0);
  await post('external/import',{onlyMissing:false});await until(async()=>{const x=await get('view');return !x.job.running;});view=await get('view');assert.equal(view.job.error,null);assert.equal(Object.values(view.analysis.shading).reduce((s,b)=>s+b.n,0),n);
  const day=await get('external/day?date='+date);assert.equal(day.quarters.length,96);assert.ok(!JSON.stringify(day).includes('voltages'));assert.ok((await post('external/forecasts')).providers.length>0);
  const historyBefore=await readFile(path.join(dir,'influx-history.json'),'utf8');
  await post('voltage-analysis',{date});await until(async()=>{const x=await get('view');return x.job?.type==='voltage_analysis'&&!x.job.running?x:null;});
  assert.equal((await get('view')).job.error,null);const diagnostic=await get('voltage-analysis?date='+date);assert.equal(diagnostic.report.date,date);assert.equal(diagnostic.report.forecastImpact,'observations');assert.equal(diagnostic.trace,undefined);assert.equal(diagnostic.report.summary.suspectedStopSeconds,0);
  const saved=JSON.parse(await readFile(path.join(dir,'voltage-analysis-'+date+'.json'),'utf8'));assert.deepEqual(saved,diagnostic.report);assert.equal(saved.trace,undefined);assert.equal(saved.series,undefined);assert.ok(!JSON.stringify(saved).includes('INFLUX_PRIVATE_PASSWORD'));assert.equal(await readFile(path.join(dir,'influx-history.json'),'utf8'),historyBefore);
  const download=await fetch(base+'/api/voltage-analysis?date='+date+'&download=1');assert.match(download.headers.get('content-disposition'),/attachment/);assert.equal((await download.json()).date,date);
  assert.equal((await fetch(base+'/api/voltage-analysis',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date})})).status,403);
  assert.equal((await fetch(base+'/api/voltage-analysis?date=2099-01-01')).status,400);
  const oldDay=await get('external/day?date='+date);oldDay.qualificationVersion=1;for(const q of oldDay.quarters)if(q.quality==='valid'){q.quality='excluded';q.reasons=['wysokie napięcie'];}await writeFile(path.join(dir,'influx-day-'+date+'.json'),JSON.stringify(oldDay));
  await post('grid-risk/import',{days:1});await until(async()=>{const v=await get('view');return v.job?.type==='grid_risk'&&!v.job.running?v:null;});const afterRisk=await get('view');assert.equal(afterRisk.job.error,null);assert.ok(afterRisk.job.requalified>0);assert.equal((await get('external/day?date='+date)).qualificationVersion,2);assert.ok(afterRisk.gridRisk.observations>0);assert.equal(afterRisk.gridRisk.eventDays,0);const riskFile=await readFile(path.join(dir,'grid-risk.json'),'utf8');assert.ok(!riskFile.includes('voltages'));assert.ok(!riskFile.includes('INFLUX_PRIVATE_PASSWORD'));
  const exported=JSON.stringify(await get('export')),publicView=JSON.stringify(await get('view')),files=await get('files');assert.ok(!exported.includes('INFLUX_PRIVATE_PASSWORD'));assert.ok(!publicView.includes('INFLUX_PRIVATE_PASSWORD'));assert.ok(!files.files.some(f=>f.name==='influx-credentials.json'));assert.equal((await fetch(base+'/api/file?name=influx-credentials.json')).status,404);assert.ok(!output.includes('INFLUX_PRIVATE_PASSWORD'));assert.equal(JSON.parse(await readFile(path.join(dir,'influx-history.json'),'utf8')).channels.total.rows.length,24);assert.ok(calls>5);
 }finally{child.kill();await new Promise(r=>child.once('exit',r));await new Promise(r=>mock.close(r));await rm(dir,{recursive:true,force:true});await rm(haDir,{recursive:true,force:true});}
});
