import {dayBounds} from '../public/presentation.js';
import {sunPosition} from './time.mjs';
const STEP=30000,LOOKBACK=5*60000;
export function checkedDay(date,zone,now=Date.now()){
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date||date<'2000-01-01')throw new Error('Podaj poprawną datę: RRRR-MM-DD.');
 const [start,end]=dayBounds(date,zone);if(start>=now)throw new Error('Nie można analizować przyszłego dnia.');return [start,Math.min(end,now)];
}
export function voltageEntities(c){return [{id:c.entities.power,role:'Moc AC',units:['W','kW']},{id:c.entities.inputPower,role:'Moc DC falownika',units:['W','kW']},{id:c.entities.status,role:'Status falownika',units:['state']},{id:c.entities.alarms,role:'Alarmy falownika',units:['state']},...c.entities.voltages.map((id,i)=>({id,role:'Napięcie fazy '+['A','B','C'][i],units:['V']}))];}
function lookup(rows){return t=>{let lo=0,hi=rows.length;while(lo<hi){const mid=(lo+hi)>>>1;if(rows[mid].at<=t)lo=mid+1;else hi=mid;}return rows[lo-1]||null;};}
function median(values){if(!values.length)return null;const a=[...values].sort((a,b)=>a-b);return a[Math.floor(a.length/2)];}
const emptySummary=()=>({daylightSeconds:0,powerObservedSeconds:0,highVoltageSeconds:0,warningOnlySeconds:0,suspectedStopSeconds:0,statusDropSeconds:0,dataGapSeconds:0,measuredKWh:0});
const labels={voltage_stop:'Prawdopodobny przestój przy wysokim napięciu',status_drop:'Niska moc i nieprawidłowy status — przyczyna nieustalona',high_status:'Wysokie napięcie i nieprawidłowy status — bez rozpoznanego przestoju',voltage_warning:'Wysokie napięcie — bez rozpoznanego przestoju',data_gap:'Brak wiarygodnego pomiaru mocy'};
export function analyseVoltage(series,c,date,available,now=Date.now()){
 const [start,end]=checkedDay(date,c.timezone,now),gap=c.quality.maxGapSeconds*1000,get=Object.fromEntries(Object.entries(series).map(([id,rows])=>[id,lookup(rows)])),units=Object.fromEntries(available.map(r=>[r.id,r.measurement])),summary=emptySummary(),events=[],hours=new Map(),history=[],trace=[];
 const raw=(id,t,fresh=true)=>{const r=get[id]?.(t);return r&&(!fresh||t-r.at<=gap)?r.value:null;},numeric=(id,t)=>{const v=raw(id,t);return typeof v==='number'&&Number.isFinite(v)?v:null;},watts=(id,t)=>{const v=numeric(id,t);return v===null?null:v*(units[id]==='kW'?1000:1);},text=(id,t)=>{const v=raw(id,t,false);return typeof v==='string'&&!['unknown','unavailable','none',''].includes(v.toLowerCase())?v:null;};
 let current=null,stop=null;
 for(let t=start-LOOKBACK;t<end;t+=STEP){
  const power=watts(c.entities.power,t),valid=power!==null&&power>=0&&power<=c.inverter.limitW*1.25,voltages=c.entities.voltages.map(id=>numeric(id,t)),status=text(c.entities.status,t),alarm=text(c.entities.alarms,t),normal=status!==null&&c.quality.normalStatuses.includes(status),high=voltages.some(v=>v!==null&&v>=c.quality.voltageWarning),dc=watts(c.entities.inputPower,t);
  while(history.length&&history[0].at<t-LOOKBACK)history.shift();
  const previous=history.filter(r=>r.normal&&r.valid&&r.power>=100),baseline=median(previous.map(r=>r.power)),beforeVoltage=history.flatMap(r=>r.voltages).filter(Number.isFinite),previousMax=beforeVoltage.length?Math.max(...beforeVoltage,...voltages.filter(Number.isFinite)):null,low=valid&&power<=Math.max(30,(baseline||0)*.1),sun=sunPosition(t,c.location),daylight=sun?sun.elevation>0:valid&&power>30||baseline>=100;
  if(t>=start){
   const seconds=Math.min(STEP,end-t)/1000,hour=Math.floor(t/3600000)*3600000,h=hours.get(hour)||{start:hour,...emptySummary()};hours.set(hour,h);
   for(const s of [summary,h]){if(daylight)s.daylightSeconds+=seconds;if(daylight&&valid)s.powerObservedSeconds+=seconds;if(valid)s.measuredKWh+=power*seconds/3600000;if(daylight&&high)s.highVoltageSeconds+=seconds;}
   if(!daylight||!valid||status===null||normal||power>Math.max(30,(stop?.baselineW||baseline||0)*.1))stop=null;
   if(daylight&&valid&&status!==null&&!normal&&low&&baseline!==null&&!stop)stop={baselineW:baseline,precedingVoltageMax:previousMax,kind:previousMax!==null&&previousMax>=c.quality.voltageWarning?'voltage_stop':'status_drop'};
   let kind=null;if(daylight){if(!valid)kind='data_gap';else if(stop)kind=stop.kind;else if(high)kind=status!==null&&!normal?'high_status':'voltage_warning';}
   for(const s of [summary,h]){if(kind==='voltage_stop')s.suspectedStopSeconds+=seconds;if(kind==='status_drop')s.statusDropSeconds+=seconds;if(kind==='voltage_warning'||kind==='high_status')s.warningOnlySeconds+=seconds;if(kind==='data_gap')s.dataGapSeconds+=seconds;}
   if(kind){if(!current||current.kind!==kind||current.end!==t){current={kind,label:labels[kind],start:t,end:t,seconds:0,powerMinW:null,powerMaxW:null,baselineW:stop?.baselineW??baseline,precedingVoltageMax:stop?.precedingVoltageMax??previousMax,phaseMax:[null,null,null],statuses:[],alarms:[],dcMaxW:null};events.push(current);}current.end=t+seconds*1000;current.seconds+=seconds;if(valid){current.powerMinW=current.powerMinW===null?power:Math.min(current.powerMinW,power);current.powerMaxW=current.powerMaxW===null?power:Math.max(current.powerMaxW,power);}voltages.forEach((v,i)=>{if(v!==null)current.phaseMax[i]=current.phaseMax[i]===null?v:Math.max(current.phaseMax[i],v);});if(status&&!current.statuses.includes(status)&&current.statuses.length<10)current.statuses.push(status);if(alarm&&!current.alarms.includes(alarm)&&current.alarms.length<10)current.alarms.push(alarm);if(dc!==null)current.dcMaxW=Math.max(current.dcMaxW??0,dc);}else current=null;
   trace.push({at:t,powerW:valid?power:null,voltages,status,kind,baselineW:stop?.baselineW??baseline});
  }
  history.push({at:t,power,valid,normal,voltages});
 }
 const warnings=[];if(!available.find(r=>r.id===c.entities.status&&r.measurement))warnings.push('Brak historii statusu: nie można rozpoznać przestoju z wymaganymi przesłankami.');if(!available.find(r=>r.id===c.entities.alarms&&r.measurement))warnings.push('Brak alarmów w rozpoznanym formacie.');if(summary.dataGapSeconds)warnings.push('Luki pomiarów nie są liczone jako przestoje.');
 return {report:{version:1,date,timezone:c.timezone,analysedAt:now,start,end,stepSeconds:STEP/1000,thresholdV:c.quality.voltageWarning,maxPowerGapSeconds:c.quality.maxGapSeconds,entities:available,summary,events,hours:[...hours.values()],warnings,forecastImpact:'observations',note:'Diagnostyka: wysokie napięcie nie dowodzi wyłączenia. Prawdopodobny przestój wymaga jednocześnie niskiej mocy, nieprawidłowego statusu, wcześniejszej normalnej produkcji i wysokiego napięcia w poprzednich 5 minutach. Związek przyczynowy nie jest potwierdzony. Czasy są oszacowane w krokach 30 s. Raport uzupełnia zagregowane obserwacje ryzyka. Końcowa prognoza uwzględnia je po spełnieniu warunków liczebności; sam próg napięcia nie powoduje potrącenia.'},trace};
}
export async function readVoltageAnalysis(client,c,date,now=Date.now()){
 const [start,end]=checkedDay(date,c.timezone,now),available=await client.inspect(c,voltageEntities(c));if(!available.some(r=>r.id===c.entities.power&&r.measurement))throw new Error('Nie znaleziono historii mocy AC w InfluxDB.');const series=await client.day(available,start-LOOKBACK,end);
 if(!(series[c.entities.power]||[]).some(r=>r.at>=start&&r.at<end))throw new Error('Brak rzeczywistych zapisów mocy AC w wybranym dniu; nie odtworzono ich zerami.');return analyseVoltage(series,c,date,available,now);
}
