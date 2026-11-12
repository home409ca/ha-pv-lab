import {SLOT,localParts,sunPosition} from './time.mjs';
import {dayBounds} from '../public/presentation.js';
import {bestWindows} from './forecast.mjs';
export function completeDayState(f,samples,c,now,ledger={}){
  const today=localParts(now,c.timezone).date,[begin,end]=dayBounds(today,c.timezone),last=samples.filter(s=>!s.imported&&s.at<=now&&localParts(s.at,c.timezone).date===today).at(-1);
  if(last&&now-last.at<=c.quality.staleSeconds*1000&&Number.isFinite(last.dailyEnergy)&&last.dailyEnergy>=0)ledger[today]={kWh:last.dailyEnergy,at:last.at};
  let futureDaylight=false,knownLocation=true;for(let t=Math.floor(now/SLOT)*SLOT;t<end;t+=SLOT){const sun=sunPosition(Math.max(now,t+SLOT/2),c.location);if(!sun){knownLocation=false;break;}if(sun.elevation>0){futureDaylight=true;break;}}
  const ended=knownLocation&&!futureDaylight;f.dayEnded=ended;
  if(ended&&!f.days.some(d=>d.date===today))f.days.unshift({date:today,remainingWh:0,curveWh:0,periods:0,complete:true,missingPeriods:0,expectedPeriods:0});
  // Night slots are physically zero; daylight gaps remain gaps.
  const rows=[...f.rows],seen=new Set(rows.map(r=>r.start));for(const day of f.days){const [a,b]=dayBounds(day.date,c.timezone);for(let t=Math.max(a,Math.ceil(now/SLOT)*SLOT);t<b;t+=SLOT){const sun=sunPosition(t+SLOT/2,c.location);if(!seen.has(t)&&sun&&sun.elevation<=0){rows.push({start:t,wh:0});seen.add(t);}}}
  if(ended){for(const row of f.fullRows)if(row.start+SLOT>now&&localParts(row.start,c.timezone).date===today)row.wh=0;for(const row of rows)if(row.start+SLOT>now&&localParts(row.start,c.timezone).date===today)row.wh=0;}
  rows.sort((a,b)=>a.start-b.start);
  for(const d of f.days){d.windows={};d.topWindows={};for(const [key,hours] of [['oneHour',1],['twoHours',2],['threeHours',3]]){const options=d.date===today&&ended?[]:bestWindows(rows,d.date,hours,c.timezone,now,5);d.topWindows[key]=options;d.windows[key]=options[0]||null;}
    d.windowStatus={};for(const [key,hours] of [['oneHour',1],['twoHours',2],['threeHours',3]])d.windowStatus[key]=d.windows[key]?'okno dostępne':d.date===today&&ended?'produkcja na dziś zakończona':d.complete?'brak pełnego okna przed końcem dnia':'brak danych prognozy';
    if(d.date===today&&ended){d.complete=true;d.missingPeriods=0;d.remainingWh=0;d.totalKWh=ledger[today]?.kWh??null;f.remainingTodayKWh=0;f.remainingHourKWh=0;f.todayKWh=d.totalKWh;f.actualTodayKWh=ledger[today]?.kWh??f.actualTodayKWh;}
  }
  const cutoff=new Date(begin-35*86400000).toISOString().slice(0,10);for(const date of Object.keys(ledger))if(date<cutoff)delete ledger[date];return f;
}
