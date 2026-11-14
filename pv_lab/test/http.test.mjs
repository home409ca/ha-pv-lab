import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {defaults} from '../src/defaults.mjs';
import statisticsMetadata from './fixtures/ha-statistics-metadata-2026.json' with {type:'json'};
import {attachStatisticsSocket} from './helpers/statistics-socket.mjs';
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
    if(req.url==='/api/config/config_entries/entry?domain=pv_lab'||req.url==='/api/config/config_entries/entry')return res.end(JSON.stringify([{domain:'pv_lab',entry_id:'pv-lab-test',title:'PV Lab',state:'loaded'}]));
    if(req.url==='/api/config')return res.end(JSON.stringify({latitude:52,longitude:21}));
    if(req.url==='/api/template'&&payload.includes('as_timestamp')){const id=JSON.parse(payload).template.match(/'entity_id': '([^']+)'/)[1];return res.end(JSON.stringify({entity_id:id,state:id===defaults.entities.status?'On-grid':'unavailable',reported:id===defaults.entities.status?now/1000:null}));}
    if(req.url==='/api/template')return res.end(JSON.stringify(payload.includes('today_2')?'pv2-entry':'pv1-entry'));
    if(req.url.startsWith('/api/services/forecast_solar/get_forecast')){const p=JSON.parse(payload);return res.end(JSON.stringify({service_response:{wh_period:{[new Date(hour).toISOString()]:p.config_entry==='pv1-entry'?1000:500}}}));}
    if(req.url.startsWith('/api/history/period/')){if(decodeURIComponent(req.url).includes(defaults.appliances[0].powerEntity)){const origin=now-100*60000,rows=[[0,0],[10,2000],[30,0],[100,0]].map(([m,w])=>({entity_id:defaults.appliances[0].powerEntity,state:String(w),last_updated:new Date(origin+m*60000).toISOString(),attributes:{unit_of_measurement:'W'}}));return res.end(JSON.stringify([rows]));}return res.end('[]');}
    badCall=true;res.writeHead(404);res.end('{}');});
  const statsSocket=attachStatisticsSocket(mock,msg=>{
    if(msg.type==='energy/info')return {solar_forecast_domains:['pv_lab']};
    if(msg.type==='energy/get_prefs')return {energy_sources:[{type:'solar',config_entry_solar_forecast:['pv-lab-test']}]};
    if(msg.type==='energy/solar_forecast')return {'pv-lab-test':{wh_hours:{'2026-11-11T10:00:00Z':1000}}};
    if(msg.type==='recorder/list_statistic_ids')return statisticsMetadata;
    if(msg.type==='recorder/get_statistics_metadata')return statisticsMetadata.filter(m=>msg.statistic_ids.includes(m.statistic_id));
    if(msg.type==='recorder/statistics_during_period'){assert.equal(msg.units.energy,'kWh');assert.deepEqual(msg.types,['change']);const at=Date.parse(msg.start_time);return Object.fromEntries(msg.statistic_ids.map(id=>[id,Array.from({length:24},(_,i)=>({start:(at+i*3600000)/1000,end:(at+(i+1)*3600000)/1000,change:1}))]));}
    throw new Error('Unexpected statistics command');
  });
  const haPort=await listen(mock),portServer=http.createServer(),appPort=await listen(portServer);await new Promise(r=>portServer.close(r));
  const env={...process.env,HA_URL:`http://127.0.0.1:${haPort}`,HA_TOKEN:'TEST_PRIVATE_TOKEN',DATA_DIR:dir,PORT:String(appPort)};delete env.SUPERVISOR_TOKEN;
  const permanentStart='2020-01-01T10:00:00.000Z';
  await writeFile(path.join(dir,'energy-forecast-archive.json'),JSON.stringify({version:1,hours:{[permanentStart]:{wh:1234,issuedAt:Date.parse(permanentStart)-1000}}}));
  const recoveryHour=hour-86400000,recoveryKey=new Date(recoveryHour).toISOString(),issued=recoveryHour-3600000;
  await writeFile(path.join(dir,'published-'+new Date(issued).toISOString().slice(0,10)+'.jsonl'),JSON.stringify({at:issued,providers:[],rows:Array.from({length:4},(_,i)=>({start:recoveryHour+i*900000,wh:100,sources:[]}))})+'\n');
  const child=spawn(process.execPath,[fileURLToPath(new URL('../src/server.mjs',import.meta.url))],{env,stdio:'pipe'});let output='';child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);
  const base=`http://127.0.0.1:${appPort}`,get=p=>fetch(base+p).then(r=>r.json()),post=(p,b,h={})=>fetch(base+p,{method:'POST',headers:{'Content-Type':'application/json','X-PV-Lab':'1',...h},body:JSON.stringify(b)});
  try{
    const v=await until(async()=>{const x=await get('/api/view');return x.diagnostics?.length===3&&!x.connection.busy?x:null;});
    assert.equal(v.latest.power,1000);assert.equal(v.latest.strings.pv1,600);assert.equal(v.config.location.latitude,52);assert.equal(v.diagnostics.filter(d=>d.ok).length,3,JSON.stringify(v.diagnostics));assert.equal(v.forecast.details.length,3);
    assert.equal(typeof v.analysis.status.lastInterval.coverage,'number');
    assert.equal((await fetch(base+'/presentation.js')).status,200);
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:v.config.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now),voltage=await get('/api/voltage?date='+today);assert.equal(voltage.series.length,3);assert.equal(voltage.day,today);assert.equal((await fetch(base+'/api/voltage?date=invalid')).status,400);assert.equal((await get('/api/view')).storage.samples,v.storage.samples);
    const energy=await get('/api/energy-status');assert.equal(energy.platformAvailable,true);assert.equal(energy.entries[0].selected,true);assert.equal(energy.entries[0].hours,1);
    const html=await fetch(base+'/');assert.equal(html.status,200);assert.ok((await html.text()).includes('PV Lab'));assert.equal((await fetch(base+'/app.js')).status,200);
    assert.equal((await fetch(base+'/insights.js')).status,200);
    assert.equal((await fetch(base+'/api/integration')).status,401);
    const pairingKey=v.integrationSetup.token,paired=await fetch(base+'/api/integration',{headers:{Authorization:'Bearer '+pairingKey}});assert.equal(paired.status,200);const contract=await paired.json();assert.equal(contract.schema,1);assert.equal(contract.days.length,8);assert.equal(contract.energyWhHours[permanentStart],1234);assert.equal(contract.energyWhHours[recoveryKey],400);assert.ok(!JSON.stringify(contract).includes(pairingKey));
    assert.equal((await post('/api/integration',{}, {Authorization:'Bearer '+pairingKey})).status,405);
    const files=await get('/api/files');assert.ok(!files.files.some(f=>f.name==='integration-key.json'));assert.equal((await fetch(base+'/api/file?name=integration-key.json')).status,404);
    const sampleName=files.files.find(f=>f.name.startsWith('sample-')).name,preview=await get('/api/file?name='+sampleName);assert.ok(!preview.text.includes('voltages'));assert.ok(preview.text.includes('voltageFlag'));
    assert.equal((await post('/api/settings',v.config,{'Sec-Fetch-Site':'cross-site'})).status,403);
    assert.equal((await post('/api/settings',{...v.config,inverter:{limitW:0}})).status,400);
    const before=(await get('/api/view')).storage;await get('/api/view?demo=1');const after=(await get('/api/view')).storage;assert.equal(after.samples,before.samples);assert.equal(after.snapshots,before.snapshots);
    const planEdit=await post('/api/plan',{energyKWh:5});assert.equal(planEdit.status,200);assert.equal((await planEdit.json()).settings.energyKWh,5);
    const externalPlan=await post('/api/plan',{durationHours:1},{Authorization:'Bearer '+pairingKey});assert.equal(externalPlan.status,200);assert.equal((await externalPlan.json()).settings.durationHours,1);
    assert.equal((await post('/api/plan',{energyKWh:0},{Authorization:'Bearer '+pairingKey})).status,400);assert.equal((await post('/api/plan',{entities:{}},{Authorization:'Bearer '+pairingKey})).status,400);assert.equal((await post('/api/plan',{energyKWh:4},{Authorization:'Bearer wrong'})).status,401);
    assert.ok((await get('/api/view')).reports);assert.ok((await get('/api/view')).planner);assert.equal((await fetch(base+'/planning.js')).status,200);
    assert.equal((await fetch(base+'/appliances.js')).status,200);
    const htmlResponse=await fetch(base+'/');assert.equal(htmlResponse.headers.get('cache-control'),'no-store');assert.ok((await htmlResponse.text()).includes('./ui/0.7.8/app.js'));
    const uiResponse=await fetch(base+'/ui/0.7.8/app.js');assert.equal(uiResponse.status,200);assert.ok(uiResponse.headers.get('cache-control').includes('immutable'));
    assert.equal((await fetch(base+'/ui/0.7.8/historical.js')).status,200);assert.equal((await fetch(base+'/ui/0.7.8/view-state.js')).status,200);assert.equal((await fetch(base+'/ui/0.4.2/app.js')).status,410);
    assert.ok((await get('/api/historical-profile?date=2026-06-10')).rows);

    assert.equal((await post('/api/profiles/analyze',{deviceId:'pralka',days:1})).status,200);
    await until(async()=>{const x=await get('/api/view');return x.job?.type==='appliance'&&!x.job.running;});
    const analyzed=await get('/api/view');assert.equal(analyzed.job.error,null);const analysis=analyzed.applianceProfiles.analyses.pralka;assert.equal(analysis.cycles.length,1);
    const saved=await post('/api/profiles/save',{deviceId:'pralka',cycleIds:[analysis.cycles[0].id],name:'Pralka test'});assert.equal(saved.status,200);const profile=await saved.json();
    const selected=await (await post('/api/plan',{profileId:profile.id,profileVariant:'mean'},{Authorization:'Bearer '+pairingKey})).json();assert.equal(selected.profile.id,profile.id);assert.ok(Math.abs(selected.settings.energyKWh-2/3)<1e-8);assert.equal(selected.settings.durationHours,.5);
    const override=await (await post('/api/plan',{energyKWh:2},{Authorization:'Bearer '+pairingKey})).json();assert.equal(override.settings.profileId,null);
    assert.equal((await post('/api/plan',{profileId:'missing-profile'},{Authorization:'Bearer '+pairingKey})).status,400);
    const profileFile=JSON.parse(await readFile(path.join(dir,'appliance-profiles.json'),'utf8'));assert.equal(profileFile.profiles.length,1);assert.ok(!JSON.stringify(profileFile).includes('last_updated'));
    await post('/api/plan',{profileId:profile.id,profileVariant:'typical'});assert.equal((await post('/api/profiles/delete',{id:profile.id})).status,200);assert.equal((await get('/api/view')).planner.settings.profileId,null);
    const discovered=await get('/api/statistics/metadata');assert.equal(discovered.items.length,3);assert.equal(discovered.items[0].unit_of_measurement,'kWh');assert.equal(discovered.items[2].unit_of_measurement,'Wh');
    assert.equal((await post('/api/statistics/import',{days:35})).status,200);await until(async()=>{const x=await get('/api/view');return x.job?.type==='statistics'&&!x.job.running;});const statisticsView=await get('/api/view');assert.equal(statisticsView.job.error,null);assert.equal(statisticsView.job.done,35);assert.ok(statisticsView.statistics.days.length>0);assert.equal(statsSocket.commands.filter(m=>m.type==='recorder/statistics_during_period').length,3);
    const backup=await get('/api/export');assert.equal(backup.energyArchive.hours[permanentStart].wh,1234);const exported=JSON.stringify(backup);assert.ok(!exported.includes('TEST_PRIVATE_TOKEN'));assert.ok(!exported.includes(pairingKey));assert.ok(!output.includes('TEST_PRIVATE_TOKEN'));
    assert.equal((await post('/api/history',{days:1})).status,200);await until(async()=>{const x=await get('/api/view');return x.job&&!x.job.running;});
    const imported=await get('/api/view');assert.equal(imported.latest.power,1000);assert.ok(imported.storage.samples>1000);assert.equal(imported.analysis.evaluated,0);
    const retentionOnly=structuredClone(v.config);retentionOnly.retention.samplesDays=10;const retentionResponse=await (await post('/api/settings',retentionOnly)).json();assert.equal(retentionResponse.reset,false);
    const changed=structuredClone(retentionOnly);changed.inverter.limitW=5000;const changedResponse=await post('/api/settings',changed);assert.equal(changedResponse.status,200);assert.equal((await changedResponse.json()).reset,true);assert.equal((await get('/api/settings')).inverter.limitW,5000);
    assert.equal(JSON.parse(await readFile(path.join(dir,'settings.json'),'utf8')).inverter.limitW,5000);assert.equal(JSON.parse(await readFile(path.join(dir,'energy-forecast-archive.json'),'utf8')).hours[permanentStart].wh,1234);assert.equal(badCall,false);
  }finally{child.kill();await new Promise(r=>child.once('exit',r));statsSocket.close();await new Promise(r=>mock.close(r));await rm(dir,{recursive:true,force:true});}
});
