import {localParts} from './time.mjs';
import {APP_VERSION} from './version.mjs';
export function integrationPayload(f,revisions,c,now=Date.now()){
  const today=localParts(now,c.timezone).date,age=now-f.calculatedAt,available=f.fullRows.length>0&&age>=0&&age<=Math.max(c.pollSeconds*4,300)*1000,daySensors=[];
  for(let offset=0;offset<8;offset++){const date=new Date(Date.parse(today+'T12:00:00Z')+offset*86400000).toISOString().slice(0,10),d=f.days.find(d=>d.date===date),revision=revisions[date];daySensors.push({offset,date,kWh:d?.totalKWh??null,complete:d?.complete||false,windows:d?.windows||{},revision:revision||null});}
  return {schema:1,version:APP_VERSION,available,calculatedAt:new Date(f.calculatedAt).toISOString(),timezone:c.timezone,days:daySensors,remainingTodayKWh:f.days.find(d=>d.date===today)?.complete?f.remainingTodayKWh:null,remainingHourKWh:f.remainingHourKWh,periods:f.fullRows.map(r=>({start:new Date(r.start).toISOString(),wh:r.wh})),note:f.note};
}
