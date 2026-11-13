import {DAY,localParts} from './time.mjs';
import {dayBounds} from '../public/presentation.js';
import {clearSkyHour,solarHour,clearSkyDescription} from './clear-sky.mjs';
export const historyDefaults={enabled:true,autoRefresh:true,windowDays:31,percentile:.95,minDays:30,minYears:2,maxReduction:.25,margin:.15,dcFactor:.9,acEfficiency:.97,validFrom:'',excluded:[]};
export const geometryKey=c=>JSON.stringify([c.location,c.strings.map(({id,panels,panelW,tilt,azimuth})=>({id,panels,panelW,tilt,azimuth})),c.inverter.limitW]);
const stamp=v=>typeof v==='number'?(v>1e12?v:v*1000):Date.parse(v);
const seasonDay=date=>Math.round((Date.parse('2000-'+date.slice(5)+'T12:00:00Z')-Date.parse('2000-01-01T12:00:00Z'))/DAY);
export function quantile(values,q){if(!values.length)return null;const a=[...values].sort((x,y)=>x-y),at=(a.length-1)*q,lo=Math.floor(at);return a[lo]+(a[Math.ceil(at)]-a[lo])*(at-lo);}
export function weightedQuantile(values,q){if(!values.length)return null;const a=[...values].sort((x,y)=>x.value-y.value),total=a.reduce((s,r)=>s+r.weight,0);let sum=0;for(const r of a){sum+=r.weight;if(sum>=q*total)return r.value;}return a.at(-1).value;}
export function profileReadiness({days,years,clear,geometryMatches,basis,estimated=false,matureDays=30,minYears=2}){
 const inactive=(status,reason,confidence=0)=>({eligible:false,confidence,status,reason});
 if(clear===0)return inactive('night','Noc — korekta nie dotyczy',null);
 if(clear===null||!Number.isFinite(clear))return inactive('blocked','Brak modelu odniesienia — sprawdź współrzędne');
 if(clear<.05)return inactive('low_sun','Mała energia — korekta nieaktywna',null);
 if(!geometryMatches)return inactive('blocked','Zmieniona konfiguracja instalacji');
 if(basis==='unknown')return inactive('blocked','Potwierdź AC/DC kanału');
 const minimum=Math.min(10,matureDays);
 if(days<minimum)return inactive('insufficient',`Za mało jasnych dni: ${days}/${minimum}`);
 if(years<minYears)return inactive('insufficient',`Za mało niezależnych sezonów rocznych: ${years}/${minYears}`);
 // Counts gradually increase influence; reaching the target never introduces a jump.
 const maturity=Math.min(1,days/matureDays),confidence=Math.min(1,days/60)*Math.min(1,years/3)*(estimated?.65:.8)*maturity;
 return {eligible:true,confidence,status:days<matureDays?'preliminary':'mature',reason:days<matureDays?`Profil wstępny — ${days}/${matureDays} jasnych dni`:`Profil dojrzały — ${days} jasnych dni`};
}
export function makeHistoryArchive(data,channels,c,start,end,previous=null,quality=new Map()){
 const archive=previous?.version===1?structuredClone(previous):{version:1,channels:{},at:0};archive.geometry=geometryKey(c);archive.at=Date.now();
 for(const ch of channels){const old=archive.channels[ch.id],same=old?.statisticId===ch.statisticId&&old?.basis===ch.basis,rows=new Map(same?old.rows.map(row=>[row[0],row]):[]);let invalid=0;
  // Replace the requested range: deleted/corrected HA statistics do not leave stale observations.
  for(const at of rows.keys())if(at>=start&&at<end)rows.delete(at);
  const string=c.strings.find(s=>s.id===ch.id),max=ch.id==='total'?(ch.basis==='DC'?c.strings.reduce((sum,s)=>sum+s.panels*s.panelW,0)/1000:c.inverter.limitW/1000):string?string.panels*string.panelW/1000:0;
  for(const row of data[ch.statisticId]||[]){const at=stamp(row.start),value=row.change,duration=row.end?(stamp(row.end)-at):3600000;if(!Number.isFinite(at)||at<start||at+3600000>end||!Number.isFinite(value)||value<0||duration!==3600000||!max||value>max*(ch.id==='total'&&ch.basis==='AC'?1.05:1.25)){invalid++;continue;}rows.set(at,[at,value,quality.get(at)||'unknown']);}
  archive.channels[ch.id]={...ch,estimated:ch.estimated===true||ch.id!=='total'&&/energia_czynna_pv[12]$/.test(ch.statisticId),rows:[...rows.values()].sort((a,b)=>a[0]-b[0]),invalid};
 }
 // Never keep silently enabled observations for counters no longer confirmed in settings.
 for(const id of Object.keys(archive.channels))if(!channels.some(ch=>ch.id===id&&ch.confirmed))delete archive.channels[id];return archive;
}
export function createHistoricalProfile(archive,c,now=Date.now()){
 const opts={...historyDefaults,...c.historyProfile},index=new Map(),channels=[],cache=new Map(),validGeometry=archive?.geometry===geometryKey(c),cutoff=opts.validFrom?Date.parse(opts.validFrom+'T00:00:00Z'):-Infinity;
 const summary={available:!!archive,at:archive?.at||null,geometryMatches:validGeometry,model:clearSkyDescription,channels:[],warnings:['Dawne napięcia i status falownika mogą być nieznane. Profil wskazuje powtarzalne różnice, nie potwierdza zacienienia.'],settings:opts};
 if(!c.location||c.location.latitude===null||c.location.longitude===null)summary.warnings.push('Brak współrzędnych instalacji — ustaw je przed importem.');
 if(archive&&!validGeometry)summary.warnings.push('Parametry instalacji lub lokalizacja zmieniły się od importu. Profil nie koryguje prognozy; ustaw początek zgodnego okresu i ponownie odczytaj statystyki.');
 for(const channel of Object.values(archive?.channels||{})){const configured=c.statistics.channels.find(ch=>ch.id===channel.id&&ch.confirmed&&ch.statisticId===channel.statisticId&&ch.basis===channel.basis);if(!configured&&!(channel.source==='influx'&&channel.confirmed&&channel.basis==='AC'))continue;const accepted=[],dayGroups=new Map(),observed=new Map();let rejected=0,unknown=0;
  for(const [at,kWh,quality='unknown'] of channel.rows){if(Number.isFinite(at)&&Number.isFinite(kWh)&&kWh>=0&&at+3600000<=now)observed.set(at,{kWh,quality});const day=localParts(at,c.timezone).date,clear=clearSkyHour(at,channel.id,c,channel.basis),normalNight=clear!==null&&clear<.005&&kWh<.005;if(at<cutoff||at+3600000>now||quality!=='unknown'&&quality!=='valid'&&!normalNight||opts.excluded.some(x=>(x.channel==='all'||x.channel===channel.id)&&day>=x.from&&day<=x.to)){rejected++;continue;}
   const date=day,record={at,kWh,clear,date,year:Number(date.slice(0,4)),day:seasonDay(date),solar:Math.floor(solarHour(at+1800000,c.location.longitude||0)),quality:quality||'unknown'};accepted.push(record);if(record.quality==='unknown')unknown++;const group=dayGroups.get(date)||{energy:0,clear:0,n:0,expected:0};group.energy+=kWh;group.clear+=clear||0;group.n++;dayGroups.set(date,group);}
  // Bright reference days require a near-complete day and substantial energy versus the model.
  for(const [date,group] of dayGroups){const [a,b]=dayBounds(date,c.timezone);group.expected=(b-a)/3600000;group.bright=group.n===group.expected&&group.clear>.1&&group.energy/group.clear>=.6;}
  for(const record of accepted){record.bright=dayGroups.get(record.date).bright;const key=channel.id+'|'+record.day+'|'+record.solar;(index.get(key)||index.set(key,[]).get(key)).push(record);}
  const meta={id:channel.id,name:channel.name,basis:channel.basis,estimated:channel.estimated===true,source:channel.source||'ha_statistics',rows:accepted.length,observedRows:observed.size,days:dayGroups.size,years:[...new Set(accepted.map(r=>r.year))],start:accepted[0]?.at??null,end:accepted.at(-1)?.at??null,rejected,invalid:channel.invalid||0,unknownQuality:unknown};channels.push({...channel,meta,observed,acceptedStarts:new Set(accepted.map(row=>row.at))});summary.channels.push(meta);
 }
 function hour(channelId,start){const key=channelId+'|'+start;if(cache.has(key))return cache.get(key);const channel=channels.find(ch=>ch.id===channelId);if(!channel)return null;const day=seasonDay(localParts(start,c.timezone).date),solar=Math.floor(solarHour(start+1800000,c.location.longitude||0)),half=Math.floor(opts.windowDays/2),records=[];
  for(let i=-half;i<=half;i++)records.push(...(index.get(channelId+'|'+((day+i+366)%366)+'|'+solar)||[]));
  const clear=clearSkyHour(start,channelId,c,channel.basis),values=records.map(r=>r.kWh),days=new Set(records.map(r=>r.date)),years=new Set(records.map(r=>r.year)),bright=records.filter(r=>r.bright&&r.clear>=.05),brightDays=new Set(bright.map(r=>r.date)),brightYears=new Set(bright.map(r=>r.year+(r.day-day>183?1:day-r.day>183?-1:0)));
  const normalized=bright.map(r=>({value:r.kWh/r.clear,weight:Math.pow(.5,Math.max(0,now-r.at)/(3*365.25*DAY))})),ratio=weightedQuantile(normalized,opts.percentile),attainable=clear!==null&&ratio!==null?clear*ratio:null;
  const readiness=profileReadiness({days:brightDays.size,years:brightYears.size,clear,geometryMatches:validGeometry,basis:channel.basis,estimated:channel.estimated,matureDays:opts.minDays,minYears:opts.minYears});
  const measurement=channel.observed.get(start),actualExcludedFromLearning=!!measurement&&!channel.acceptedStarts.has(start);
  const result={start,channel:channelId,actualKWh:measurement?.kWh??null,actualQuality:measurement?.quality??null,actualExcludedFromLearning,clearKWh:clear,maxKWh:values.length?Math.max(...values):null,p95KWh:quantile(values,opts.percentile),medianKWh:quantile(values,.5),attainableKWh:attainable,ratio,days:days.size,years:[...years].sort(),brightDays:brightDays.size,brightYears:brightYears.size,...readiness,quality:records.some(r=>r.quality==='unknown')?'część jakości historycznej nieznana':'oznaczone poprawne pomiary'};cache.set(key,result);return result;
 }
 return {summary,hour};
}
export function historicalDay(profile,date,c){const [begin,end]=dayBounds(date,c.timezone);return {...profile.summary,date,rows:profile.summary.channels.map(channel=>({...channel,hours:Array.from({length:(end-begin)/3600000},(_,i)=>profile.hour(channel.id,begin+i*3600000))}))};}
export function applyHistoricalProfile(rows,profile,c){const opts={...historyDefaults,...c.historyProfile};for(const r of rows){r.beforeHistoryWh=r.wh;r.historyFactor=1;r.historyCheck={status:!opts.enabled?'disabled':'missing',reason:!opts.enabled?'Korekta historyczna wyłączona':'Brak potwierdzonego profilu AC całości'};}if(!opts.enabled||!profile)return;
 if(!profile.summary.channels.some(ch=>ch.id==='total'&&ch.basis==='AC'))return;
 const groups=new Map();for(const row of rows){const hour=Math.floor(row.start/3600000)*3600000;(groups.get(hour)||groups.set(hour,[]).get(hour)).push(row);}
 for(const [start,parts] of groups){if(parts.length!==4||new Set(parts.map(r=>r.start)).size!==4)continue;const ref=profile.hour('total',start),sum=parts.reduce((s,r)=>s+r.wh,0);if(ref)for(const row of parts)row.historyCheck={status:ref.status,reason:ref.reason,eligible:ref.eligible,confidence:ref.confidence,referenceKWh:ref.attainableKWh};if(!ref?.eligible||ref.attainableKWh===null||sum<=0)continue;const target=ref.attainableKWh*1000*(1+opts.margin);if(sum<=target)continue;
  // A soft upper-envelope check on the already calibrated result, never another loss multiplier.
  const factor=Math.max(1-opts.maxReduction,1-opts.maxReduction*ref.confidence*(1-target/sum));for(const row of parts){row.wh*=factor;row.historyFactor=factor;row.history={days:ref.brightDays,years:ref.brightYears,referenceKWh:ref.attainableKWh,confidence:ref.confidence};}
 }
}
