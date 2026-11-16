import {localParts} from './time.mjs';
const HOUR=3600000;
// This is a measurement of elapsed time, never an estimate of the rest of the hour.
export function hourProduction(samples,c,now=Date.now()){
 const start=Math.floor(now/HOUR)*HOUR,end=start+HOUR,gap=c.quality.maxGapSeconds*1000;
 const missing=reason=>({start,end,kWh:null,through:null,source:null,coverage:0,reason});
 if(now===start)return missing('Godzina dopiero się rozpoczęła.');
 const rows=samples.filter(s=>!s.imported&&s.at>=start-gap&&s.at<=now).sort((a,b)=>a.at-b.at),last=rows.at(-1);
 if(!last||now-last.at>gap||last.at<=start)return missing('Brak świeżego pomiaru bieżącej godziny.');
 const date=localParts(start,c.timezone).date;
 for(const [key,source] of [['totalEnergy','licznik energii AC'],['dailyEnergy','licznik dziennej energii AC']]){
  const valid=rows.filter(s=>Number.isFinite(s[key])&&s[key]>=0&&(key!=='dailyEnergy'||localParts(s.at,c.timezone).date===date)),before=valid.filter(s=>s.at<=start).at(-1),after=valid.find(s=>s.at>=start),latest=valid.at(-1);
  if(!before||!after||!latest||latest.at<=start||now-latest.at>gap||after.at-before.at>gap)continue;
  // Reject resets or corrections anywhere in the measured interval.
  if(valid.some((s,i)=>i&&s[key]<valid[i-1][key]))continue;
  const initial=before.at===start?before[key]:before[key]+(after[key]-before[key])*(start-before.at)/(after.at-before.at),kWh=latest[key]-initial,maximum=c.inverter.limitW*(latest.at-start)/3600000000*1.05+.02;
  if(kWh<0||kWh>maximum)continue;
  return {start,end,through:latest.at,kWh,coverage:1,source:source+(before.at===start?'':' · początek interpolowany'),reason:null};
 }
 const validPower=v=>Number.isFinite(v)&&v>=0&&v<=c.inverter.limitW*1.05,powerLast=rows.filter(s=>validPower(s.power)).at(-1);
 if(!powerLast||powerLast.at<=start||now-powerLast.at>gap)return missing('Brak świeżego pomiaru energii lub mocy bieżącej godziny.');
 let wh=0,covered=0;
 for(let i=1;i<rows.length;i++){const a=rows[i-1],b=rows[i],lo=Math.max(start,a.at),hi=b.at;if(hi>powerLast.at||hi<=lo||b.at-a.at>gap||![a.power,b.power].every(validPower))continue;const x=a.power+(b.power-a.power)*(lo-a.at)/(b.at-a.at);wh+=(x+b.power)/2*(hi-lo)/3600000;covered+=hi-lo;}
 const duration=powerLast.at-start,coverage=duration>0?covered/duration:0;
 if(coverage<.95)return {...missing('Niepełne pomiary od początku godziny — nie zastępujemy braków zerem.'),coverage};
 return {start,end,through:powerLast.at,kWh:wh/1000,source:'całkowanie pomiarów mocy AC · pokrycie '+Math.round(coverage*100)+'%',coverage,reason:null};
}
