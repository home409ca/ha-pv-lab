import {localParts,sunPosition} from './time.mjs';
const H=3600000,Q=900000;
export const snowDefaults=()=>({version:1,enabled:true,weatherEntity:'',active:false,date:null,factor:1,detectedAt:null,lastSnowAt:null,monitorFrom:null,excludedDays:[],events:[]});
export function snowSettings(state,raw){
 if(typeof raw?.enabled!=='boolean'||typeof raw.weatherEntity!=='string'||raw.weatherEntity&&!/^weather\.[a-z0-9_]+$/.test(raw.weatherEntity))throw new Error('Wybierz włączoną lub wyłączoną korektę i poprawną encję weather.');
 return {...state,enabled:raw.enabled,weatherEntity:raw.weatherEntity,active:raw.enabled?state.active:false,factor:raw.enabled?state.factor:1};
}
export function clearSnow(state,now=Date.now()){return {...state,active:false,factor:1,detectedAt:null,monitorFrom:now,changedAt:now,reason:'Użytkownik potwierdził odsłonięcie paneli. Zbieramy nowe pomiary.'};}
export function snowWeather(states,entity,now){
 const row=entity?states.get(entity):null,at=Date.parse(row?.last_reported||row?.last_updated),a=row?.attributes;
 if(!Number.isFinite(at)||at>now+60000||now-at>3*H||!a)return null;
 let temperature=typeof a.temperature==='number'&&Number.isFinite(a.temperature)?a.temperature:null;
 if(a.temperature_unit==='°F'&&temperature!==null)temperature=(temperature-32)*5/9;
 else if(a.temperature_unit&&a.temperature_unit!=='°C')temperature=null;
 return {at,temperature,snowing:['snowy','snowy-rainy'].includes(row.state)};
}
export function freshSnowMeasurements(states,c,now){
 return [c.entities.power,c.entities.status,...c.entities.voltages].every(id=>{const s=states.get(id),at=Date.parse(s?.last_reported||s?.last_updated);return Number.isFinite(at)&&at<=now+60000&&now-at<=c.quality.maxGapSeconds*1000;});
}
function good(s,c){return !s.imported&&!s.historyUnverified&&s.snowFresh===true&&Number.isFinite(s.power)&&s.power>=0&&c.quality.normalStatuses.includes(s.status)&&s.voltageFlag==='normal';}
export function snowWindow(samples,rows,c,now,minutes=60){
 const from=now-minutes*60000,points=samples.filter(s=>s.at<=now&&s.at>=from-c.quality.maxGapSeconds*1000).sort((a,b)=>a.at-b.at),map=new Map(rows.map(r=>[r.start,r]));let duration=0,expected=0,actual=0,multi=0;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],lo=Math.max(from,a.at),hi=b.at;
  if(hi<=lo||b.at-a.at>c.quality.maxGapSeconds*1000||!good(a,c)||!good(b,c))continue;
  for(let t=lo;t<hi;){const row=map.get(Math.floor(t/Q)*Q),end=Math.min(hi,Math.floor(t/Q)*Q+Q),sun=sunPosition((t+end)/2,c.location);if(row&&Number.isFinite(row.staticWh)&&row.staticWh>=0&&sun?.elevation>=5){const dt=end-t;duration+=dt;expected+=row.staticWh*4*dt/H;actual+=a.power*dt/H;if((row.sources||[]).filter(s=>Number.isFinite(s.rawWh)&&s.rawWh*4>=300).length>=2)multi+=dt;}t=end;}
 }
 const last=points.at(-1),fresh=good(last||{},c)&&now-last.at<=c.quality.maxGapSeconds*1000;
 return {coveredMinutes:duration/60000,actualKWh:actual/1000,expectedKWh:expected/1000,ratio:expected>0?actual/expected:null,fresh,multipleSources:duration>0&&multi/duration>=.8};
}
export function snowCandidate(sample,rows,c,state){
 const month=Number(localParts(sample.at,c.timezone).date.slice(5,7)),winter=month>=11||month<=3;
 const row=rows.find(r=>r.start<=sample.at&&r.start+Q>sample.at),sun=sunPosition(sample.at,c.location);
 return (winter||sample.weather?.snowing)&&good(sample,c)&&sun?.elevation>=5&&row?.staticWh>=100&&sample.power<row.staticWh*4*.05;
}
export function detectSnow(previous,samples,rows,c,now){
 const state={...snowDefaults(),...previous},date=localParts(now,c.timezone).date,month=Number(date.slice(5,7)),winter=month>=11||month<=3;
 if(state.date!==date){state.date=date;}
 const recent=samples.filter(s=>s.at<=now&&now-s.at<24*H&&s.weather?.snowing),lastSnow=recent.at(-1)?.at;
 if(Number.isFinite(lastSnow))state.lastSnowAt=Math.max(state.lastSnowAt||0,lastSnow);
 const weather=samples.filter(s=>s.at<=now&&now-s.at<=3*H&&s.weather).at(-1)?.weather||null,weatherSupport=!!(state.lastSnowAt&&now-state.lastSnowAt<=24*H||weather?.temperature!==null&&Number.isFinite(weather?.temperature)&&weather.temperature<=3);
 const observed=samples.filter(s=>!state.monitorFrom||s.at>=state.monitorFrom),window=snowWindow(observed,rows,c,now),recovery=snowWindow(observed,rows,c,now,20);
 let reason='Obserwacja produkcji — brak przesłanek do korekty.';
 if(!state.enabled){state.active=false;state.factor=1;reason='Automatyczna korekta wyłączona przez użytkownika.';}
 else if(!state.active&&!(winter||state.lastSnowAt&&now-state.lastSnowAt<=24*H)){state.active=false;state.factor=1;reason='Poza okresem zimowym i bez informacji o śniegu — korekta nieaktywna.';}
 else if(state.active&&recovery.fresh&&recovery.coveredMinutes>=19&&recovery.expectedKWh>=.1&&recovery.ratio>=.3){
  state.factor=recovery.ratio>=.7?1:Math.min(1,Math.max(state.factor,recovery.ratio));
  state.active=state.factor<1;reason=state.active?'Produkcja wraca — stopniowo zdejmujemy ograniczenie.':'Produkcja wróciła — automatyczne ograniczenie zdjęte.';
 }else if(window.fresh&&window.coveredMinutes>=57&&window.expectedKWh>=.4&&window.ratio<.05&&(weatherSupport||window.multipleSources)){
  if(!state.active)state.detectedAt=now;
  state.active=true;state.factor=weatherSupport?.05:.1;
  state.excludedDays=[...new Set([...state.excludedDays,date])];
  reason='Podejrzenie zaśnieżenia lub zasłonięcia paneli — produkcja znacznie poniżej oczekiwanej. Przyczyna nie jest potwierdzona.';
 }else if(state.active)reason=window.fresh?'Podejrzenie zasłonięcia utrzymane do potwierdzenia powrotu produkcji lub odsłonięcia paneli.':'Brak wiarygodnych pomiarów potwierdzających odsłonięcie — zachowano podejrzenie także na kolejne dni.';
 else if(!window.fresh)reason='Oczekiwanie na świeże, poprawne pomiary mocy, napięć i statusu falownika.';
 else if(window.coveredMinutes<57)reason='Zbieranie obserwacji — wymagane około 60 minut poprawnych pomiarów w świetle dziennym.';
 state.reason=reason;state.window=window;state.weatherSupport=weatherSupport;state.until=null;if(state.active)state.excludedDays=[...new Set([...state.excludedDays,date])];
 if(state.active!==!!previous.active||Math.abs(state.factor-(previous.factor??1))>=.05||state.date!==previous.date){state.changedAt=now;state.events=[{at:now,active:state.active,factor:state.factor,reason},...(state.events||[])].slice(0,40);}
 return state;
}
export function applySnow(rows,state,c,now){
 let reducedWh=0,changedQuarters=0;
 for(const r of rows){r.beforeSnowWh=r.wh;r.snowFactor=1;
  if(!state?.enabled||!state.active||r.start+Q<=now)continue;
  // Absolute ceiling avoids multiplying existing live/history/grid/manual reductions again.
  const value=Math.min(r.wh,r.staticWh*state.factor);r.snowFactor=r.wh>0?value/r.wh:1;reducedWh+=(r.wh-value)*Math.min(1,(r.start+Q-now)/Q);if(value<r.wh)changedQuarters++;r.wh=value;
 }
 return {...state,reducedKWh:reducedWh/1000,changedQuarters};
}
