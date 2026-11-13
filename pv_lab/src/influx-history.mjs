import {DAY,SLOT,localParts,sunPosition} from './time.mjs';
import {geometryKey} from './historical-profile.mjs';
export const influxDefaults={url:'http://a0d7b954-influxdb:8086',database:'home_assistant',username:'homeassistant',policy:'autogen',from:'2023-09-01',until:'',homePower:'sensor.zamel_pobor_caly_dom',optimizerGapSeconds:420,autoRefresh:true};
export const emptyInfluxHistory=()=>({version:1,geometry:null,channels:{},shading:{},days:{},at:0});
export const historyImportKey=c=>JSON.stringify([c.location,c.strings,c.inverter,c.optimizers,c.quality]);
const compatible=(history,c)=>history?.geometry===geometryKey(c)&&(!history.importKey||history.importKey===historyImportKey(c));
export function validateInflux(input,previous={...influxDefaults,password:''}){
 const c={...influxDefaults,...previous,...input};let url;try{url=new URL(c.url);}catch{throw new Error('Niepoprawny adres InfluxDB.');}
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new Error('Adres InfluxDB: http/https, bez hasła i dodatkowej ścieżki.');
 for(const k of ['database','policy'])if(typeof c[k]!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(c[k]))throw new Error('Niepoprawna nazwa bazy lub retencji.');
 for(const k of ['username','password'])if(typeof c[k]!=='string'||c[k].length>1024||/[\r\n]/.test(c[k]))throw new Error('Niepoprawne dane logowania.');
 const validDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
 if(!validDate(c.from)||Date.parse(c.from+'T00:00:00Z')<Date.UTC(2000,0,1)||c.until&&!validDate(c.until)||c.until&&c.until<c.from)throw new Error('Niepoprawny zakres dat importu.');
 if(c.homePower!==''&&!/^sensor\.[a-z0-9_]+$/.test(c.homePower))throw new Error('Niepoprawna encja mocy domu.');
 if(typeof c.autoRefresh!=='boolean'||!Number.isInteger(c.optimizerGapSeconds)||c.optimizerGapSeconds<120||c.optimizerGapSeconds>1800)throw new Error('Niepoprawne ustawienie uzupełniania lub ważności optymalizatorów (120–1800 s).');
 c.url=url.origin;return c;
}
export const publicInflux=c=>{const {password,...safe}=c;return {...safe,passwordSet:!!password};};
const ident=s=>'"'+s.replaceAll('"','\\"')+'"';
export class InfluxClient{
 constructor(settings){this.settings=validateInflux(settings);}
 async query(query){
  if(!/^(SELECT|SHOW) /.test(query)||query.includes(';'))throw new Error('Dozwolony tylko odczyt InfluxDB.');
  const url=new URL(this.settings.url+'/query');url.searchParams.set('db',this.settings.database);url.searchParams.set('q',query);
  let response;try{response=await fetch(url,{headers:{Authorization:'Basic '+Buffer.from(this.settings.username+':'+this.settings.password).toString('base64')},redirect:'error',signal:AbortSignal.timeout(45000)});}catch{throw new Error('Brak połączenia z InfluxDB lub przekroczony czas odczytu.');}
  if(!response.ok){await response.body?.cancel();throw new Error('InfluxDB: HTTP '+response.status);}
  let length=0,chunks=[];for await(const chunk of response.body){length+=chunk.length;if(length>32*1024*1024)throw new Error('Za duża odpowiedź InfluxDB; zmniejsz zakres importu.');chunks.push(chunk);}
  let data;try{data=JSON.parse(Buffer.concat(chunks).toString());}catch{throw new Error('Niepoprawna odpowiedź InfluxDB.');}
  if(data.error||data.results?.some(r=>r.error))throw new Error('InfluxDB odrzucił zapytanie. Sprawdź bazę, retencję i uprawnienia.');
  return (data.results||[]).flatMap(r=>r.series||[]);
 }
 async inspect(c,requested=historyEntities(c,this.settings)){
  const ids=requested.map(x=>x.id.replace(/^sensor\./,'')),regex='^('+ids.join('|')+')$';
  const series=await this.query(`SHOW TAG VALUES FROM /.*/ WITH KEY = "entity_id" WHERE "entity_id" =~ /${regex}/ LIMIT 1000`);
  const found=series.flatMap(s=>(s.values||[]).map(v=>({measurement:s.name,entity:'sensor.'+v[1]})));
  return requested.map(r=>({...r,measurement:found.find(f=>f.entity===r.id&&r.units.includes(f.measurement))?.measurement||null}));
 }
 async day(available,start,end){
  const groups=new Map(),out={};for(const e of available.filter(x=>x.measurement)){const field=e.measurement==='state'?'state':'value',key=e.measurement+'|'+field;const g=groups.get(key)||{measurement:e.measurement,field,entities:[]};g.entities.push(e.id);groups.set(key,g);}
  for(const g of groups.values()){
   const ids=g.entities.map(id=>id.replace(/^sensor\./,'')),where=`"entity_id" =~ /^(${ids.join('|')})$/`,source=ident(this.settings.policy)+'.'+ident(g.measurement),field=ident(g.field);
   const seed=await this.query(`SELECT LAST(${field}) AS "value" FROM ${source} WHERE ${where} AND time < '${new Date(start).toISOString()}' GROUP BY "entity_id"`);
   const data=await this.query(`SELECT ${field} AS "value" FROM ${source} WHERE ${where} AND time >= '${new Date(start).toISOString()}' AND time <= '${new Date(end+180000).toISOString()}' GROUP BY "entity_id"`);
   for(const s of [...seed,...data]){const id='sensor.'+s.tags?.entity_id;if(!g.entities.includes(id))continue;const cols=s.columns||[],ti=cols.indexOf('time'),vi=cols.indexOf('value');for(const row of s.values||[]){const at=Date.parse(row[ti]),raw=row[vi],value=g.field==='state'?raw:typeof raw==='number'&&Number.isFinite(raw)?raw:null;if(Number.isFinite(at)&&value!==null&&value!==undefined)(out[id]??=[]).push({at,value});}}
  }
  for(const id of Object.keys(out))out[id]=[...new Map(out[id].map(r=>[r.at,r])).values()].sort((a,b)=>a.at-b.at);
  return out;
 }
}
export function historyEntities(c,settings){
 const rows=[{id:c.entities.power,role:'Moc AC falownika',units:['W','kW']},{id:c.entities.totalEnergy,role:'Licznik energii AC',units:['kWh','Wh']},{id:c.entities.status,role:'Status falownika',units:['state']},...c.entities.voltages.map(id=>({id,role:'Napięcie fazowe',units:['V']})),...c.strings.flatMap(s=>[{id:s.voltage,role:s.id+' napięcie DC',units:['V']},{id:s.current,role:s.id+' prąd DC',units:['A']}]),...c.optimizers.map(o=>({id:o.power,role:o.string+' · '+o.panel,optimizer:o.id,units:['W','kW']}))];
 if(settings.homePower)rows.push({id:settings.homePower,role:'Moc całego domu',units:['W','kW']});
 return [...new Map(rows.map(r=>[r.id,r])).values()];
}
function sampler(rows){return t=>{let lo=0,hi=rows.length;while(lo<hi){const mid=(lo+hi)>>>1;if(rows[mid].at<=t)lo=mid+1;else hi=mid;}return rows[lo-1]||null;};}
function energy(rows,start,end,gap){let wh=0,coverage=0;const get=sampler(rows);for(let t=start;t<end;t+=30000){const hi=Math.min(end,t+30000),r=get(t);if(!r||t-r.at>gap||!Number.isFinite(r.value)||r.value<0)continue;wh+=r.value*(hi-t)/3600000;coverage+=hi-t;}return {wh,coverage:coverage/(end-start)};}
export function analyseInfluxDay(series,c,start,available,settings){
 const end=start+DAY,gap=c.quality.maxGapSeconds*1000,get=Object.fromEntries(Object.entries(series).map(([id,rows])=>[id,sampler(rows)])),units=Object.fromEntries(available.map(e=>[e.id,e.measurement]));
 const value=(id,t,fresh=true)=>{const r=get[id]?.(t);if(!r||fresh&&t-r.at>gap)return null;return r.value;},watts=(id,t)=>{const v=value(id,t);return typeof v==='number'?v*(units[id]==='kW'?1000:1):null;};
 const quarters=[],shading={},home=[],optimizerRows=Object.fromEntries(c.optimizers.map(o=>[o.power,(series[o.power]||[]).map(r=>({...r,value:r.value*(units[o.power]==='kW'?1000:1)}))]));
 for(let t=start;t<end;t+=SLOT){
  const night=Array.from({length:5},(_,i)=>sunPosition(t+i*SLOT/4,c.location)?.elevation).every(x=>Number.isFinite(x)&&x< -3),reasons=new Set();let ac=0,coverage=0;const strings=Object.fromEntries(c.strings.map(s=>[s.id,{wh:0,coverage:0}]));
  for(let at=t;at<t+SLOT;at+=30000){const p=watts(c.entities.power,at);if(p===null||p<0){if(!night)reasons.add('brak mocy');continue;}if(p>c.inverter.limitW*1.05){reasons.add('skok mocy');continue;}ac+=p/120;coverage+=30000;if(p>=c.inverter.limitW*.98)reasons.add('limit falownika');
   if(!night){const status=value(c.entities.status,at,false);if(status===null)reasons.add('brak statusu');else if(!c.quality.normalStatuses.includes(status))reasons.add('status falownika');for(const id of c.entities.voltages){const v=value(id,at,false);if(v===null)reasons.add('brak napięcia');else if(v>=c.quality.voltageWarning)reasons.add('wysokie napięcie');}}
   const dc=c.strings.map(s=>{const v=value(s.voltage,at),i=value(s.current,at);return typeof v==='number'&&typeof i==='number'&&v>=0&&i>=0?v*i:null;}),sum=dc.every(v=>v!==null)?dc.reduce((a,b)=>a+b,0):null;
   if(p===0||sum>0)for(let i=0;i<c.strings.length;i++){strings[c.strings[i].id].wh+=p===0?0:p*dc[i]/sum/120;strings[c.strings[i].id].coverage+=30000;}
  }
  // Night zeros are explicitly astronomical estimates, never invented daytime observations.
  const isNight=night&&ac===0;
  const complete=coverage>=SLOT*.95||isNight;if(!complete)reasons.add('niepełny przedział');
  const quality=isNight?'night':!complete||reasons.size?'excluded':'valid';
  quarters.push({start:t,wh:complete?ac:null,quality,reasons:[...reasons],strings:Object.fromEntries(Object.entries(strings).map(([id,v])=>[id,isNight?0:v.coverage>=SLOT*.95?v.wh:null]))});
  if(quality!=='valid')continue;
  const sun=sunPosition(t+SLOT/2,c.location);if(!sun||sun.elevation<5)continue;
  const pos=`${Math.floor(sun.azimuth/20)}:${Math.floor(sun.elevation/10)}`,season=Math.floor((Number(localParts(t,c.timezone).month)-1)/3);
  for(const str of c.strings){const opts=c.optimizers.filter(o=>o.string===str.id),values=[];
   for(const o of opts){const v=energy(optimizerRows[o.power],t,t+SLOT,(settings.optimizerGapSeconds||420)*1000);if(v.coverage>=.95&&v.wh*4<=str.panelW*1.25)values.push({id:o.id,power:v.wh*4});}
   if(values.length<3)continue;const sorted=values.map(v=>v.power).sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length/2)];if(median<30)continue;
   for(const v of values){const key=`${v.id}|${season}|${pos}`,b=shading[key]??={id:v.id,n:0,ratio:0,position:pos,season,source:'influx'};b.n++;b.ratio+=Math.min(2,Math.max(0,v.power/median));}
  }
 }
 const hourly={total:[],...Object.fromEntries(c.strings.map(s=>[s.id,[]]))};
 for(let t=start;t<end;t+=3600000){const parts=quarters.filter(q=>q.start>=t&&q.start<t+3600000);if(parts.length!==4||parts.some(q=>q.wh===null))continue;let total=parts.reduce((s,q)=>s+q.wh,0);const quality=parts.every(q=>q.quality==='night')?'unknown':parts.some(q=>q.reasons.some(r=>r!=='limit falownika'))?'excluded':'valid';
  const before=value(c.entities.totalEnergy,t),after=value(c.entities.totalEnergy,t+3600000),delta=typeof before==='number'&&typeof after==='number'?(after-before)*(units[c.entities.totalEnergy]==='Wh'?.001:1):null;let source='influx_power';
  if(delta!==null&&delta>=0&&delta<=c.inverter.limitW/1000*1.05&&Math.abs(delta-total/1000)<=Math.max(.05,total/1000*.15)){total=delta*1000;source='influx_counter';}
  hourly.total.push([t,total/1000,quality,source]);const original=parts.reduce((s,q)=>s+q.wh,0),scale=original?total/original:1;
  for(const str of c.strings)if(parts.every(q=>q.strings[str.id]!==null))hourly[str.id].push([t,parts.reduce((s,q)=>s+q.strings[str.id],0)*scale/1000,quality,'influx_estimated_ac']);
 }
 if(settings.homePower)for(let t=start;t<end;t+=3600000){const rows=(series[settings.homePower]||[]).map(r=>({...r,value:r.value*(units[settings.homePower]==='kW'?1000:1)})),v=energy(rows,t,t+3600000,gap);if(v.coverage>=.95)home.push([t,v.wh]);}
 return {version:1,start,end,hourly,quarters,shading,home,optimizerIds:available.filter(e=>e.optimizer&&series[e.id]?.some(r=>r.at>=start&&r.at<end)).map(e=>e.optimizer),at:Date.now()};
}
export function mergeInfluxDay(state,day,c){
 const date=new Date(day.start).toISOString().slice(0,10),old=state.days[date];state.geometry=geometryKey(c);
 for(const [key,b] of Object.entries(old?.shading||{})){if(state.shading[key]){state.shading[key].n-=b.n;state.shading[key].ratio-=b.ratio;if(state.shading[key].n<=0)delete state.shading[key];}}
 for(const [key,b] of Object.entries(day.shading)){const x=state.shading[key]??={...b,n:0,ratio:0};x.n+=b.n;x.ratio+=b.ratio;}
 for(const [id,rows] of Object.entries(day.hourly)){const ch=state.channels[id]??={id,statisticId:'influx:'+id,name:id==='total'?'Produkcja AC falownika':'Energia '+id.toUpperCase()+' — szacowany podział AC',basis:'AC',confirmed:true,source:'influx',estimated:id!=='total',rows:[]};const map=new Map(ch.rows.filter(r=>r[0]<day.start||r[0]>=day.end).map(r=>[r[0],r]));for(const row of rows)map.set(row[0],row);ch.rows=[...map.values()].sort((a,b)=>a[0]-b[0]);}
 state.days[date]={at:day.at,shading:day.shading,hours:day.hourly.total.length,excluded:day.quarters.filter(q=>q.quality==='excluded').length,optimizerIds:day.optimizerIds,home:day.home};state.at=day.at;
}
export function mergeHistorySources(ha,influx,c){
 if(!influx?.at||!compatible(influx,c))return ha;
 const result=structuredClone(ha?.geometry===geometryKey(c)?ha:{version:1,geometry:geometryKey(c),channels:{}});result.at=Math.max(result.at||0,influx.at);
 for(const [id,ch] of Object.entries(influx.channels)){const current=result.channels[id],configured=c.statistics.channels.find(x=>x.id===id&&x.confirmed&&x.statisticId===current?.statisticId&&x.basis===current?.basis);if(!current||!configured){result.channels[id]=structuredClone(ch);continue;}const rows=new Map(ch.rows.map(r=>[r[0],r]));for(const row of current.rows){const peer=rows.get(row[0]);const conflict=peer&&Math.abs(peer[1]-row[1])>Math.max(.05,row[1]*.15);rows.set(row[0],[row[0],row[1],conflict?'excluded':peer?.[2]==='excluded'?'excluded':row[2]==='unknown'&&peer?.[2]==='valid'?'valid':row[2],conflict?'ha_influx_conflict':'ha_statistics']);}current.rows=[...rows.values()].sort((a,b)=>a[0]-b[0]);}
 return result;
}
export function combinedShading(live,history,c,liveFrom=Infinity){const out=structuredClone(live);if(!compatible(history,c))return out;const cutoff=Math.floor(Math.min(liveFrom,history.liveFrom??Infinity)/DAY)*DAY;for(const [date,day] of Object.entries(history.days||{})){if(Date.parse(date+'T00:00:00Z')>=cutoff)continue;for(const [key,b] of Object.entries(day.shading||{})){const x=out[key]??={...b,n:0,ratio:0,historicalN:0};x.n+=b.n;x.ratio+=b.ratio;x.historicalN=(x.historicalN||0)+b.n;}}return out;}
export function influxSummary(history,c){const days=Object.entries(history.days),home=days.flatMap(([,d])=>d.home||[]).map(r=>r[1]).sort((a,b)=>a-b);return {at:history.at,geometryMatches:compatible(history,c),days:days.length,hours:history.channels.total?.rows.length||0,start:history.channels.total?.rows[0]?.[0]??null,end:history.channels.total?.rows.at(-1)?.[0]??null,excludedQuarters:days.reduce((s,[,d])=>s+d.excluded,0),optimizers:[...new Set(days.flatMap(([,d])=>d.optimizerIds))],homeHours:home.length,homeBaselineW:home.length?home[Math.floor((home.length-1)*.2)]:null,homeLastAt:days.reduce((max,[,d])=>(d.home||[]).reduce((m,r)=>Math.max(m,r[0]),max),0)};}
