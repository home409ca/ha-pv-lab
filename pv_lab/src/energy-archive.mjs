// Independent from rolling observation journals. There is deliberately no pruning.
const HOUR=3600000,QUARTER=900000;
export const emptyEnergyArchive=()=>({version:1,hours:{}});
export function completeHours(rows){
  const buckets=new Map();
  for(const row of rows||[]){
    if(!Number.isFinite(row.start)||row.start%QUARTER!==0||!Number.isFinite(row.wh)||row.wh<0)continue;
    const hour=Math.floor(row.start/HOUR)*HOUR;
    if(!buckets.has(hour))buckets.set(hour,new Map());
    buckets.get(hour).set(row.start,row.wh);
  }
  return [...buckets].filter(([,quarters])=>quarters.size===4).map(([start,quarters])=>({start,wh:[...quarters.values()].reduce((a,b)=>a+b,0)}));
}
export function captureEnergyForecast(archive,published){
  if(!Number.isFinite(published.at))return false;
  let changed=false;
  for(const {start,wh} of completeHours(published.rows)){
    // Never turn a forecast issued during/after production into a historical prediction.
    if(published.at>start)continue;
    const key=new Date(start).toISOString(),previous=archive.hours[key];
    if(previous&&previous.issuedAt>=published.at)continue;
    archive.hours[key]={wh,issuedAt:published.at};changed=true;
  }
  return changed;
}
export function energyForecastHours(archive,forecast,available,now=Date.now()){
  const result={};
  for(const [start,row] of Object.entries(archive.hours)){
    if(Date.parse(start)+HOUR<=now&&Number.isFinite(row.wh)&&row.wh>=0)result[start]=row.wh;
  }
  if(available){
    // Live updates may change unfinished hours, but never replace a completed archive hour.
    for(const {start,wh} of completeHours(forecast.fullRows))if(start+HOUR>now)result[new Date(start).toISOString()]=wh;
  }
  return result;
}

// The preview uses exactly the same hourly exporter as the integration, without changing archives.
export function energyForecastComparison(archive,forecast,available,now=Date.now()){
 const exported=energyForecastHours(archive,forecast,available,now),current=new Map(completeHours(forecast.fullRows).map(r=>[r.start,r.wh])),keys=new Set([...current.keys(),...Object.keys(exported).map(Date.parse)]),rows=[];
 for(const row of forecast.fullRows||[])if(Number.isFinite(row.start))keys.add(Math.floor(row.start/HOUR)*HOUR);
 for(const start of [...keys].sort((a,b)=>a-b)){if(start<now-7*86400000||start>now+8*86400000)continue;const end=start+HOUR,key=new Date(start).toISOString(),actual=exported[key]??null,live=current.get(start)??null,frozen=end<=now,stored=archive.hours[key];let reason;
 if(actual===null)reason=frozen?'Brak prognozy zapisanej przed rozpoczęciem tej godziny':!available?'Brak świeżego połączenia lub aktualnej prognozy — godzina nie jest przekazywana':'Brak czterech poprawnych kwadransów — godzina nie jest przekazywana';
 else if(frozen)reason='Zakończona godzina: zachowana prognoza znana przed jej rozpoczęciem';else reason='Aktualna prognoza: suma czterech kwadransów końcowego wyniku PV Lab';
 rows.push({start,end,currentWh:live,exportedWh:actual,differenceWh:live===null||actual===null?null:actual-live,mode:actual===null?'missing':frozen?'archive':'live',issuedAt:actual===null?null:frozen?stored?.issuedAt??null:forecast.calculatedAt,reason});
 }
 return {at:now,calculatedAt:forecast.calculatedAt,available,rows};
}
