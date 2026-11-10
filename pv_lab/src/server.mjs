import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {Storage} from './storage.mjs';
import {defaults,validate} from './defaults.mjs';
import {HA} from './ha.mjs';
import {makeSample} from './adapters.mjs';
import {emptyModel,train,forecast,sampleReasons} from './engine.mjs';
import {demoData} from './demo.mjs';
import {floorSlot,DAY} from './time.mjs';

const root=path.dirname(fileURLToPath(import.meta.url)),store=new Storage(process.env.DATA_DIR||path.join(root,'../data'));
await store.init();
let config=validate(await store.read('settings.json',defaults)),model=await store.read('model.json',emptyModel());
if((model.calibrationFrom||0)!==(config.calibrationFrom||0)){model=emptyModel();model.watermark=floorSlot(config.calibrationFrom||Date.now());model.calibrationFrom=config.calibrationFrom||0;}
let samples=(await store.load('sample',config.retention.samplesDays)).sort((a,b)=>a.at-b.at),snapshots=(await store.load('forecast',config.retention.forecastsDays)).sort((a,b)=>a.at-b.at);
const ha=new HA();
let lastPoll=null,lastForecast=0,lastError=null,diagnostics=[],busy=false,lastPrune=0,job=null;
const events=[];
function log(message){events.unshift({at:Date.now(),message});events.length=Math.min(events.length,80);console.log(message);}
async function maintain(){const now=Date.now();if(now-lastPrune<3600000)return;await store.prune(config);samples=samples.filter(s=>s.at>now-config.retention.samplesDays*DAY);snapshots=snapshots.filter(s=>s.at>now-config.retention.forecastsDays*DAY);lastPrune=now;}
async function poll(){if(busy)return;busy=true;
  try{const states=await ha.states(),now=Date.now();
    if(config.location.latitude===null){const hc=await ha.request('/config');if(Number.isFinite(hc.latitude)&&Number.isFinite(hc.longitude)){config.location={latitude:hc.latitude,longitude:hc.longitude};await store.atomic('settings.json',config);}}
    const sample=makeSample(states,config,now);await store.journal('sample',sample);samples.push(sample);lastPoll=now;lastError=null;
    if(now-lastForecast>=config.forecastRefreshMinutes*60000){const read=await ha.forecasts(config,states);diagnostics=read.diagnostics;
      for(const r of read.results){const snap={at:now,...r};await store.journal('forecast',snap);snapshots.push(snap);}lastForecast=now;}
    train(model,samples,snapshots,config,now);await store.atomic('model.json',model);await maintain();
  }catch(e){lastError=e.message;log(`Odczyt: ${e.message}`);}finally{busy=false;}}
function view(demo=false){let s=samples,f=snapshots,m=model,d=diagnostics;if(demo){const x=demoData(config);s=x.samples;f=x.snapshots;m=x.model;d=x.diagnostics;}
  const now=Date.now(),lastLive=s.filter(s=>!s.imported).at(-1),latest=lastLive&&now-lastLive.at<config.quality.staleSeconds*1000?lastLive:null,filtered=s.filter(s=>s.at>=now-2*DAY);
  // Minute data stays on disk; chart is thinned to five minutes.
  const chart=filtered.filter((_,i)=>i%5===0||i===filtered.length-1);
  return {version:'0.1.0',demo,now,config,connection:{configured:ha.connected,lastPoll:demo?now:lastPoll,error:demo?null:lastError,busy},latest,
    quality:latest?sampleReasons(latest,config):['oczekiwanie na dane'],forecast:forecast(m,f,s,config,now),diagnostics:d,
    analysis:{scores:m.scores,bins:m.bins,shading:m.shading,excluded:m.excluded,evaluated:m.evaluated,watermark:m.watermark},
    samples:chart,storage:{bytes:store.bytes,samples:s.length,snapshots:f.length},events,job};}
async function body(req){let size=0,chunks=[];for await(const ch of req){size+=ch.length;if(size>2*1024*1024)throw new Error('Maksymalny rozmiar żądania to 2 MB.');chunks.push(ch);}return JSON.parse(Buffer.concat(chunks).toString()||'{}');}
function json(res,value,status=200){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
async function historyImport(days){if(busy)throw new Error('Poczekaj na zakończenie odczytu.');busy=true;job={running:true,done:0,days,error:null,imported:0};
  const ids=[...new Set([...Object.values(config.entities).flat(),...config.strings.flatMap(s=>[s.voltage,s.current]),...config.optimizers.flatMap(o=>[o.power,o.energy])])];
  try{const end=Date.now(),begin=end-days*DAY;
    for(let from=begin;from<end;from+=DAY){const to=Math.min(from+DAY,end),response=await ha.request(`/history/period/${new Date(from).toISOString()}?end_time=${encodeURIComponent(new Date(to).toISOString())}&filter_entity_id=${encodeURIComponent(ids.join(','))}&significant_changes_only=0`);
      const series=new Map(response.filter(a=>a.length).map(a=>[a[0].entity_id,a.map(s=>({...s,at:Date.parse(s.last_updated||s.last_changed)})).sort((a,b)=>a.at-b.at)]));
      const pointers=new Map(),existing=new Set(samples.map(s=>Math.floor(s.at/60000)));
      for(let t=Math.ceil(from/60000)*60000;t<to;t+=60000){if(existing.has(Math.floor(t/60000)))continue;const states=new Map();
        for(const [id,rows] of series){let i=pointers.get(id)||0;if(rows[i]?.at>t)continue;while(i+1<rows.length&&rows[i+1].at<=t)i++;pointers.set(id,i);const s=rows[i];
          // Recorder is event-based: unchanged states are valid until the next event. A separate import coverage flag prevents inferring production over unobserved long gaps.
          states.set(id,{...s,last_reported:new Date(t).toISOString()});}
        const sample=makeSample(states,config,t);sample.imported=true;
        // Historical states cannot prove device freshness. Keep for inspection, never for forecast calibration.
        sample.historyUnverified=true;await store.journal('sample',sample);samples.push(sample);job.imported++;}
      job.done++;}
    samples.sort((a,b)=>a.at-b.at);log(`Import historii: ${job.imported} punktów. Historia nie odtwarza dawnych prognoz.`);
  }catch(e){job.error=e.message;log(`Import historii: ${e.message}`);}finally{job.running=false;busy=false;}}

const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'");
  const peer=req.socket.remoteAddress?.replace('::ffff:','');
  if(process.env.SUPERVISOR_TOKEN&&peer!=='172.30.32.2'){res.writeHead(403);res.end('Ingress only');return;}
  if(!process.env.SUPERVISOR_TOKEN&&!['127.0.0.1','::1'].includes(peer)){res.writeHead(403);res.end('Local only');return;}
  try{const url=new URL(req.url,'http://localhost'),route=url.pathname;
    if(req.method==='POST'&&(req.headers['x-pv-lab']!=='1'||req.headers['sec-fetch-site']==='cross-site'))return json(res,{error:'Odrzucono żądanie z innej strony.'},403);
    if(req.method==='GET'&&route==='/api/view')return json(res,view(url.searchParams.get('demo')==='1'));
    if(req.method==='GET'&&route==='/api/settings')return json(res,config);
    if(req.method==='GET'&&route==='/api/export'){res.setHeader('Content-Disposition','attachment; filename="pv-lab-backup.json"');return json(res,{version:1,exportedAt:Date.now(),config,model,samples,snapshots});}
    if(req.method==='POST'&&route==='/api/poll'){if(busy)return json(res,{error:'Trwa inna operacja.'},409);await poll();return json(res,{ok:!lastError,error:lastError});}
    if(req.method==='POST'&&route==='/api/settings'){if(busy)return json(res,{error:'Trwa odczyt lub import. Spróbuj ponownie.'},409);
      const candidate=validate(await body(req));candidate.calibrationFrom=Date.now();
      await store.atomic(`settings-backup.json`,config);await store.atomic('settings.json',candidate);config=candidate;
      model=emptyModel();model.watermark=floorSlot(Date.now());model.calibrationFrom=config.calibrationFrom;await store.atomic('model.json',model);lastForecast=0;log('Zapisano ustawienia. Kalibracja nowej konfiguracji rozpoczyna się od kolejnego pełnego przedziału.');return json(res,{ok:true});}
    if(req.method==='POST'&&route==='/api/history'){if(!ha.connected)return json(res,{error:'Najpierw połącz z Home Assistant.'},400);if(busy)return json(res,{error:'Trwa inna operacja.'},409);const b=await body(req);if(!Number.isInteger(b.days)||b.days<1||b.days>7)throw new Error('Import obejmuje od 1 do 7 dni.');void historyImport(b.days);return json(res,{ok:true});}
    if(req.method!=='GET')return json(res,{error:'Nie znaleziono.'},404);
    const assets={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/style.css':'style.css'};
    if(!assets[route])return json(res,{error:'Nie znaleziono.'},404);
    const file=assets[route],content=await readFile(path.join(root,'../public',file));res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-cache'});res.end(content);
  }catch(e){json(res,{error:e.message},400);}
});
const port=Number(process.env.PORT||8099),host=process.env.SUPERVISOR_TOKEN?'0.0.0.0':'127.0.0.1';
server.listen(port,host,()=>log(`PV Lab: http://127.0.0.1:${port}`));
let timer;async function tick(){if(ha.connected)await poll();timer=setTimeout(tick,config.pollSeconds*1000);timer.unref();}void tick();
async function shutdown(){clearTimeout(timer);server.close();while(busy)await new Promise(r=>setTimeout(r,50));await store.atomic('model.json',model);process.exit(0);}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
