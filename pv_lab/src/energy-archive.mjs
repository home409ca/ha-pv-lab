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
