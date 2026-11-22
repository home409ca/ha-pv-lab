import {dayBounds,parseLocalInput} from '../public/presentation.js';
import {localParts} from './time.mjs';
import {tariffZone} from './optimizer-tariff.mjs';
import {rankDevice,reservations} from './optimizer.mjs';
const H=3600000,Q=900000;
const nextDay=day=>new Date(Date.parse(day+'T12:00:00Z')+24*H).toISOString().slice(0,10);
export function comparisonRequests(f,range,c,settings){
 const requests=[];
 for(let day=localParts(range.earliest,c.timezone).date;day<=localParts(range.latest-1,c.timezone).date;day=nextDay(day)){
  const [start,end]=dayBounds(day,c.timezone),month=Number(day.slice(5,7)),windows=settings.tariff.summerMonths.includes(month)?settings.tariff.summerOffPeak:settings.tariff.winterOffPeak;
  const minute=windows.map(w=>w[0]).filter(v=>v>=360&&v<1080).sort((a,b)=>a-b)[0];
  let at=Number.isFinite(minute)?parseLocalInput(day+'T'+String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0'),c.timezone):null;
  if(at!==null)at=Math.ceil(at/Q)*Q;
  requests.push({kind:'cheap',day,label:'Start dziennej taniej strefy',at,note:at!==null&&tariffZone(at,settings.tariff,c.timezone).holiday?'Cały dzień w taniej strefie — bez dodatkowej zmiany ceny.':'',reason:at===null?'Brak dziennego okna taniej strefy w konfiguracji.':null});
  const hours=new Map();
  for(const row of f.fullRows||[]){if(row.start<start||row.start>=end||!Number.isFinite(row.wh)||row.wh<0)continue;const p=localParts(row.start,c.timezone),hour=row.start-Number(p.minute)*60000;const quarters=hours.get(hour)||new Map();quarters.set(row.start,row.wh);hours.set(hour,quarters);}
  const peak=[...hours].filter(([,rows])=>rows.size===4).map(([at,rows])=>({at,wh:[...rows.values()].reduce((n,w)=>n+w,0)})).filter(r=>r.wh>1).sort((a,b)=>b.wh-a.wh||a.at-b.at)[0];
  requests.push({kind:'peak',day,label:'Start w godzinie szczytu PV',at:peak?.at??null,peakKWh:peak?peak.wh/1000:null,note:'',reason:peak?null:'Brak pełnej godzinowej prognozy z dodatnią produkcją PV.'});
 }
 return requests;
}
export function buildComparisonPlans(ctx,prepared,requests,range){
 return requests.map(request=>{
  if(!prepared.length)return {...request,plan:[],status:'Najpierw wybierz cykle.'};
  if(request.at===null)return {...request,plan:[],status:request.reason};
  if(request.at<range.earliest||request.at<ctx.first)return {...request,plan:[],status:'Ta godzina już minęła lub jest przed początkiem zakresu.'};
  if(request.at>=range.latest)return {...request,plan:[],status:'Godzina poza wybranym zakresem.'};
  const base=[...prepared].sort((a,b)=>a.device.deadline-b.device.deadline||a.device.id.localeCompare(b.device.id)),attempts=[];
  // Try each resource first so a blocked appliance cannot hide another valid exact start.
  for(let i=0;i<base.length;i++){
   const order=[...base.slice(i),...base.slice(0,i)],assigned=[];
   for(const item of order){const first=!assigned.length,device={...item.device,earliest:Math.max(request.at,item.device.earliest??0),deadline:first?Math.min(item.device.deadline??Infinity,request.at+item.curve.duration):item.device.deadline};
    const choices=rankDevice(ctx,device,item.curve,reservations(ctx,assigned)).filter(r=>!first||r.start===request.at).sort((a,b)=>a.start-b.start);
    if(choices[0])assigned.push({...item,start:choices[0].start});
   }
   attempts.push(assigned);
  }
  attempts.sort((a,b)=>b.length-a.length||reservations(ctx,a).costs[0]-reservations(ctx,b).costs[0]||Math.max(0,...a.map(x=>x.start+x.curve.duration))-Math.max(0,...b.map(x=>x.start+x.curve.duration)));
  const plan=attempts[0]||[],complete=plan.length===prepared.length;
  return {...request,plan,status:complete?'Pełny plan':'Nie mieści się pełny plan: ograniczenia sprzętu, terminy, prognoza lub limit poboru.'};
 });
}
