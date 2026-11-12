import {makeHistoryArchive} from './historical-profile.mjs';
import {localParts,DAY} from './time.mjs';
import {inspectStatisticsChannels} from './statistics-metadata.mjs';
function timestamp(v){return typeof v==='number'?(v>1e12?v:v*1000):Date.parse(v);}
function expectedHours(date,zone){let n=0;const m=Date.parse(date+'T00:00:00Z');for(let t=m-18*3600000;t<m+42*3600000;t+=3600000)if(localParts(t,zone).date===date)n++;return n;}
export function aggregateStatistics(data,channels,c,start,end){const daily=new Map(),profiles=new Map(),warnings=[];
  for(const ch of channels){const seen=new Set();let invalid=0;
    for(const row of data[ch.statisticId]||[]){const at=timestamp(row.start),change=row.change;if(!Number.isFinite(at)||at<start||at>=end||seen.has(at))continue;seen.add(at);
      const duration=row.end? (timestamp(row.end)-at)/3600000:1;
      const capacity=ch.id==='total'?(ch.basis==='DC'?c.strings.reduce((sum,s)=>sum+s.panels*s.panelW,0)/1000:c.inverter.limitW/1000):c.strings.find(s=>s.id===ch.id)?.panels*c.strings.find(s=>s.id===ch.id)?.panelW/1000;
      if(typeof change!=='number'||!Number.isFinite(change)||change<0||duration!==1||capacity&&change>capacity*1.25){invalid++;continue;}
      const p=localParts(at,c.timezone),key=`${ch.id}|${p.date}`,d=daily.get(key)||{channel:ch.id,date:p.date,kWh:0,hours:0};d.kWh+=change;d.hours++;daily.set(key,d);
      const profileKey=`${ch.id}|${p.month}|${p.hour}`,profile=profiles.get(profileKey)||{channel:ch.id,month:Number(p.month),hour:Number(p.hour),sumKWh:0,n:0};profile.sumKWh+=change;profile.n++;profiles.set(profileKey,profile);
    }if(invalid)warnings.push(`${ch.name}: pominięto ${invalid} niepoprawnych lub fizycznie niewiarygodnych przyrostów.`);}
  const days=[...daily.values()].map(d=>({...d,expectedHours:expectedHours(d.date,c.timezone),complete:d.hours===expectedHours(d.date,c.timezone)})).sort((a,b)=>a.date.localeCompare(b.date));
  const monthly=new Map();for(const d of days){const key=`${d.channel}|${d.date.slice(0,7)}`,m=monthly.get(key)||{channel:d.channel,month:d.date.slice(0,7),fullDays:0,partialDays:0,kWh:0,partialKWh:0};if(d.complete){m.fullDays++;m.kWh+=d.kWh;}else{m.partialDays++;m.partialKWh+=d.kWh;}monthly.set(key,m);}
  const months=[...monthly.values()].map(m=>{const str=c.strings.find(s=>s.id===m.channel),capacity=str?str.panels*str.panelW/1000:null;return {...m,averageDayKWh:m.fullDays?m.kWh/m.fullDays:null,kWhPerKWpDay:capacity&&m.fullDays?m.kWh/m.fullDays/capacity:null};});
  return {version:1,at:Date.now(),start,end,channels,days,months,profiles:[...profiles.values()].map(p=>({...p,averageKWh:p.sumKWh/p.n})),warnings,note:'Przyrosty change ze statystyk HA; nie sumujemy stanów liczników. Dane służą trendom, nie są dowodem zacienienia. Dla dawnych godzin jakość napięcia i przestoje są nieznane.'};
}
export async function importStatistics(ha,c,days,onProgress=()=>{},previousArchive=null,quality=new Map()){
  const channels=c.statistics.channels.filter(ch=>ch.confirmed);if(!channels.length)throw new Error('Najpierw wybierz i potwierdź przynajmniej jeden licznik energii.');
  const metadata=await ha.metadata(channels.map(ch=>ch.statisticId)),checks=inspectStatisticsChannels(channels,metadata),valid=checks.filter(check=>check.ok).map(check=>check.channel);
  if(!valid.length)throw new Error('Nie można rozpocząć importu. '+checks.map(check=>`${check.channel.statisticId}: ${check.reason}`).join(' '));
  const end=Math.floor(Date.now()/3600000)*3600000;let start;
  if(days==='all'){
    onProgress({done:0,days:0,phase:'Ustalanie pierwszych dostępnych statystyk'});
    const monthly=await ha.statistics(valid.map(ch=>ch.statisticId),Date.UTC(2000,0,1),end,'month'),starts=valid.flatMap(ch=>(monthly[ch.statisticId]||[]).filter(row=>typeof row.change==='number'&&Number.isFinite(row.change)&&row.change>=0).map(row=>timestamp(row.start))).filter(Number.isFinite);
    if(!starts.length)throw new Error('HA nie zwrócił statystyk miesięcznych. Sprawdź potwierdzone liczniki i dostępność długoterminowej historii.');start=Math.min(...starts);days=Math.ceil((end-start)/DAY);
  }else{if(!Number.isInteger(days)||days<1||days>7300)throw new Error('Zakres statystyk: 1–7300 dni lub cała historia.');start=end-days*DAY;}
  const all={};onProgress({done:0,days,phase:'Odczyt godzinowych przyrostów energii'});
  for(let from=start;from<end;from+=30*DAY){const to=Math.min(end,from+30*DAY),data=await ha.statistics(valid.map(ch=>ch.statisticId),from,to);for(const ch of valid)(all[ch.statisticId]??=[]).push(...(data[ch.statisticId]||[]));onProgress({done:Math.ceil((to-start)/DAY),days});}
  const archive=makeHistoryArchive(all,valid,c,start,end,previousArchive,quality),merged=Object.fromEntries(valid.map(ch=>[ch.statisticId,(archive.channels[ch.id]?.rows||[]).map(([at,change])=>({start:at,change}))])),begins=valid.map(ch=>archive.channels[ch.id]?.rows[0]?.[0]).filter(Number.isFinite),archiveStart=begins.length?Math.min(...begins):start,report=aggregateStatistics(merged,valid,c,archiveStart,end);report.lastRange={start,end};report.historyArchive=archive;report.metadata=checks.filter(check=>check.ok).map(check=>check.metadata);for(const check of checks.filter(check=>!check.ok))report.warnings.push(`${check.channel.name} (${check.channel.statisticId}): ${check.reason} Pominięto.`);if(!report.days.length)report.warnings.push('Liczniki zostały rozpoznane, ale HA nie zwrócił poprawnych przyrostów godzinowych w wybranym zakresie. Sprawdź dostępność długoterminowych statystyk i zakres dat.');return report;
}
