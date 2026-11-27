import {createHash} from 'node:crypto';
import {experimentDefaults,validateExperiment,readExperimentalML,readWeatherObservation,parseWeatherForecast} from './experimental-ml.mjs';
import {H,DAY,weatherFactor,empiricalBand,integral,loadTemperatureModel,predictLoad,summarizeExperiment,roofDiagnostics} from './lab-models.mjs';
import {actualInterval} from './engine.mjs';
import {localParts,sunPosition} from './time.mjs';
import {clearSkyHour,solarHour} from './clear-sky.mjs';
const Q=900000;
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0,20);
export const loadDefinition=s=>hash(s?.load||{});
export function freshLabBase(states,live,settings,c,now){if(!live?.clean)return null;const direct=states.get(settings.load.powerEntity),ids=[...(direct&&!['unavailable','unknown'].includes(direct.state)?[settings.load.powerEntity]:[settings.measurements?.netPower,c.entities.power]),...settings.load.excludeEntities];if(!ids.length||ids.some(id=>{const e=states.get(id),at=Date.parse(e?.last_reported||e?.last_updated);return !Number.isFinite(at)||at>now+60000||now-at>settings.load.maxGapSeconds*1000;}))return null;return Number.isFinite(live.baseW)?live.baseW:null;}
const empty=()=>({schema:1,settings:experimentDefaults(),pending:{},days:{},lastCapture:null,weather:{rows:[],at:0,entity:null,error:null},source:{status:'waiting',rows:[],reason:'Oczekiwanie na pierwszy odczyt HA.',influence:0}});
const sumHour=(rows,start,key)=>{const map=new Map(rows.map(r=>[r.start,r]));let sum=0;for(let i=0;i<4;i++){const x=map.get(start+i*Q)?.[key];if(!Number.isFinite(x)||x<0)return null;sum+=x;}return sum;};
export class ForecastLab{
 constructor(store){this.store=store;this.state=empty();this.records=[];this.files=new Map();this.inflight=false;this.lastAttempt=0;}
 async init(now=Date.now()){
  try{const stored=await this.store.read('forecast-lab.json',empty());if(stored.schema!==1||!stored.pending||typeof stored.pending!=='object'||!stored.days||typeof stored.days!=='object')throw new Error('schema');this.state={...empty(),...stored,settings:validateExperiment(stored.settings)};
   for(const file of await this.store.files()){if(!/^lab-day-\d{4}-\d{2}-\d{2}\.json$/.test(file.name)||Date.parse(file.name.slice(8,18)+'T12:00:00Z')<now-92*DAY)continue;const data=await this.store.read(file.name,null);if(data?.schema!==1||data.date!==file.name.slice(8,18)||!Array.isArray(data.records)||data.records.some(r=>!r||!Number.isFinite(r.start)||r.date!==data.date||typeof r.context!=='string'||!r.predictions))throw new Error('archive');this.files.set(data.date,data);this.records.push(...data.records);}
  }catch{this.writable=false;this.state=empty();this.state.settings.enabled=false;this.state.error='Nie można odczytać plików eksperymentu. Zachowano je do odzyskania; główna prognoza i Auto działają niezależnie.';this.state.source={...this.state.source,status:'error',reason:this.state.error};this.records=[];this.files.clear();}return this;
 }
 async settings(raw){if(this.writable===false)throw new Error(this.state.error);this.state.settings=validateExperiment(raw);this.state.lastCapture=null;this.lastAttempt=0;await this.save();}
 async save(){if(this.writable===false)return;await this.store.atomic('forecast-lab.json',this.state);}
 async refreshWeather(ha,states,snow,now=Date.now()){
  if(this.writable===false)return;
  const entity=this.state.settings.weatherEntity||snow?.weatherEntity;if(!this.state.settings.enabled||!entity||this.inflight||now-this.lastAttempt<30*60000)return;
  this.lastAttempt=now;this.inflight=true;try{const response=await ha.request('/services/weather/get_forecasts?return_response',{entity_id:entity,type:'hourly'}),rows=parseWeatherForecast(response,entity,states.get(entity)?.attributes?.temperature_unit,now);this.state.weather={entity,at:now,rows,error:rows.length?null:'Brak godzinowej prognozy pogody w odpowiedzi HA.'};}catch(e){this.state.weather={...this.state.weather,error:'Nie udało się odczytać godzinowej pogody. Podstawowy PV Lab działa niezależnie.'};}finally{this.inflight=false;await this.save();}}
 async observe({states,forecast,samples,config,loadSettings,houseForecast,statistics={},snow,appVersion=null,now=Date.now(),force=false}){
  if(this.writable===false)return;
  this.state.source=readExperimentalML(states,this.state.settings,now);
  const entity=this.state.settings.weatherEntity||snow?.weatherEntity||'',observation=readWeatherObservation(states,entity,now);this.state.observation=observation;
  if(!this.state.settings.enabled)return;
  if(!force&&this.state.lastCapture!==null&&Math.floor(this.state.lastCapture/Q)===Math.floor(now/Q))return;
  const context=hash([1,config.calibrationFrom,config.entities,config.location,config.strings,config.providers,config.historyProfile,config.quality,config.tomorrowForecast,loadDefinition(loadSettings),entity,this.state.settings.curveEntity,this.state.settings.statusEntity]);this.state.context=context;
  await this.settle(samples,config,loadSettings,statistics,now);
  const ml=this.state.source.rows,base=forecast.fullRows||[],weather=this.state.weather.entity===entity&&now-this.state.weather.at<=H?this.state.weather.rows:[],load=loadTemperatureModel(this.records,context,now),history=this.records;
  const recent=history.filter(r=>r.mode==='rolling'&&r.context===context&&r.trainEligible&&r.settledAt<=now&&r.start+H<=now&&now-r.start<4*H),actual=recent.reduce((n,r)=>n+r.actual,0),expected=recent.reduce((n,r)=>n+r.baseline,0),recentFactor=recent.length>=2&&expected>=.2?Math.max(.5,Math.min(1.5,actual/expected)):null;
  const starts=[...new Set(base.map(r=>Math.floor(r.start/H)*H))].filter(t=>t>=now&&t<=now+72*H).sort((a,b)=>a-b),minute=Number(localParts(now,config.timezone).hour)*60+Number(localParts(now,config.timezone).minute),freeze=(config.reports?.freezeTime||'20:00').split(':').map(Number),freezeM=freeze[0]*60+freeze[1];
  for(const start of starts){const raw=sumHour(base,start,'wh');if(raw===null)continue;const baseline=raw/1000,date=localParts(start,config.timezone).date,w=weather.find(r=>r.start===start),weatherRow=w?{temperature:w.temperature,cloud:w.cloud,condition:w.condition,issuedAt:w.issuedAt,source:w.entity}:null,previous=new Date(Date.parse(date+'T12:00:00Z')-DAY).toISOString().slice(0,10),modes=['rolling'];if(localParts(now,config.timezone).date===previous&&minute<=freezeM&&minute>=freezeM-360)modes.push('day_ahead');
   for(const mode of modes){const key=mode+':'+start,old=this.state.pending[key];if(old&&old.issuedAt>now)continue;const leadHours=(start-now)/H,predictions={},clamp=x=>Math.min(config.inverter.limitW/1000,Math.max(0,x));
    if(this.state.source.status==='ready'){const mid=sumHour(ml,start,'p50'),lo=sumHour(ml,start,'p10'),hi=sumHour(ml,start,'p90');if([lo,mid,hi].every(Number.isFinite))predictions.ml={p10:clamp(lo/1000),p50:clamp(mid/1000),p90:clamp(hi/1000),originalP50:mid/1000,sourceAt:this.state.source.reportedAt,model:this.state.source.model,modelAt:this.state.source.modelAt,variant:this.state.source.variant,modelState:this.state.source.modelState};}
    const f=weatherFactor(history,weatherRow,start,now,config.timezone,context,mode);if(f&&f.n>=20&&f.days>=7)predictions.weather={p50:clamp(baseline*f.factor),factor:f.factor,n:f.n};
    if(recentFactor!==null&&leadHours<=6&&date===localParts(now,config.timezone).date)predictions.nowcast={p50:clamp(baseline*(1+(recentFactor-1)*Math.exp(-leadHours/3))),factor:recentFactor,n:recent.length};
    const band=empiricalBand(history,baseline,context,mode,leadHours,now);if(band)predictions.band={p50:baseline,p10:clamp(Math.min(baseline,band.p10)),p90:clamp(Math.max(baseline,band.p90)),n:band.n};
    const baseWh=sumHour(houseForecast?.rows||[],start,'baseWh'),houseBase=baseWh===null?null:baseWh/1000,temp=predictLoad(load,houseBase,weatherRow?.temperature);if(temp!==null)predictions.temperature={p50:temp,n:load.n};
    // Capture all targets, including missing ML, so later arrivals never backfill earlier forecasts.
    this.state.pending[key]={start,date,mode,issuedAt:now,baseline,base:houseBase,loadKey:loadDefinition(loadSettings),predictions,weather:weatherRow,leadHours,context,appVersion,hourBucket:Math.floor(Number(localParts(start,config.timezone).hour)/3),solarHour:solarHour(start+H/2,config.location.longitude||0)};
   }
  }
  this.state.lastCapture=now;this.state.lastModel={temperature:load?{days:load.days,n:load.n,coefficients:load.coefficients}:null,recentHours:recent.length};await this.save();
 }
 async settle(samples,c,loadSettings,statistics,now){const changed=new Set(),loadKey=loadDefinition(loadSettings);for(const [key,r] of Object.entries(this.state.pending)){
   if(r.start+H>now)continue;const near=samples.filter(s=>s.at>=r.start-c.quality.maxGapSeconds*1000&&s.at<=r.start+H+c.quality.maxGapSeconds*1000&&s.at<=now),quarters=Array.from({length:4},(_,i)=>actualInterval(near,r.start+i*Q,c)),powerValid=quarters.every(q=>q.coverage>=.95&&!q.reasons.some(x=>x!=='limit falownika'));
   const stat=statistics[r.start],fromStatistics=Number.isFinite(stat)&&stat>=0&&stat<=c.inverter.limitW/1000*1.25,actual=fromStatistics?stat:powerValid?quarters.reduce((n,q)=>n+q.wh,0)/1000:null;
   if(actual===null&&now-r.start<7*DAY)continue;
   const trainEligible=actual!==null&&powerValid&&!near.some(s=>s.at>=r.start&&s.at<r.start+H&&(s.productionBlocked||s.voltageFlag!=='normal'||!c.quality.normalStatuses.includes(s.status))),baseActual=r.loadKey===loadKey?integral(near,r.start,r.start+H,s=>s.labBaseKey===r.loadKey?s.labBaseW:null,c.quality.maxGapSeconds*1000).kWh:null,roofs={};
   if(trainEligible)for(const id of c.strings.map(s=>s.id)){const dc=integral(near,r.start,r.start+H,s=>s.strings?.[id],c.quality.maxGapSeconds*1000).kWh;roofs[id]={dc,reference:clearSkyHour(r.start,id,c,'DC')};}
   const record={...r,actual,actualBase:baseActual,actualSource:fromStatistics?'statystyki HA':powerValid?'całkowanie mocy AC':'brak poprawnego pomiaru',settledAt:now,trainEligible,roofs};const day=this.files.get(r.date)||{schema:1,date:r.date,records:[]};day.records=day.records.filter(x=>x.mode!==r.mode||x.start!==r.start);day.records.push(record);this.files.set(r.date,day);this.records=this.records.filter(x=>x.mode!==r.mode||x.start!==r.start);this.records.push(record);changed.add(r.date);delete this.state.pending[key];
  }
  for(const date of changed){const day=this.files.get(date);await this.store.atomic('lab-day-'+date+'.json',day);this.state.days[date]={hours:day.records.filter(r=>r.mode==='rolling'&&r.actual!==null).length,excluded:day.records.filter(r=>r.actual===null).length};}
  this.records=this.records.filter(r=>r.start>=now-92*DAY);for(const [date] of this.files)if(Date.parse(date+'T12:00:00Z')<now-92*DAY)this.files.delete(date);
 }
 view(c,now=Date.now()){
  const context=this.state.context,metrics=['rolling','day_ahead'].flatMap(mode=>['ml','weather','band','nowcast','temperature'].map(method=>summarizeExperiment(this.records,method,context,mode))),latest=Object.values(this.state.pending).filter(r=>r.context===context&&r.mode==='rolling'&&r.start>=now-H).sort((a,b)=>a.start-b.start),past=this.records.filter(r=>r.context===context&&r.mode==='rolling'&&now-r.start<3*DAY).map(r=>({start:r.start,actual:r.actual,baseline:r.baseline,ml:r.predictions.ml?.p50??null}));
  return {schema:1,enabled:this.state.settings.enabled,settings:this.state.settings,influence:0,readOnly:true,source:{...this.state.source,rows:undefined,periods:this.state.source.rows?.length||0},weather:{entity:this.state.weather.entity,at:this.state.weather.at,error:this.state.weather.error,periods:this.state.weather.rows?.length||0,observation:this.state.observation},lastCapture:this.state.lastCapture,metrics,models:this.state.lastModel,roofs:roofDiagnostics(this.records,context,c.strings.map(s=>s.id)),archivedDays:Object.keys(this.state.days).length,pendingHours:latest.length,curves:latest.map(r=>({start:r.start,baseline:r.baseline,base:r.base,...r.predictions})),past,history:this.records.filter(r=>r.context===context&&r.actual!==null).sort((a,b)=>b.start-a.start).slice(0,120).map(({roofs,...r})=>r)};
 }
 async export(){if(this.writable===false)return {...this.state,archiveError:this.state.error};const days=[];for(const file of await this.store.files())if(/^lab-day-\d{4}-\d{2}-\d{2}\.json$/.test(file.name))days.push(await this.store.read(file.name,null));return {...this.state,archivedDays:days};}
}
