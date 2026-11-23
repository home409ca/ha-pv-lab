import {dayBounds,parseLocalInput} from '../public/presentation.js';
import {localParts} from './time.mjs';
import {tariffZone} from './optimizer-tariff.mjs';
import {rankDevice,reservations} from './optimizer.mjs';
const H=3600000,Q=900000;
const nextDay=day=>new Date(Date.parse(day+'T12:00:00Z')+24*H).toISOString().slice(0,10);
export function comparisonRequests(f,range,c,settings,now=range.earliest){
 const requests=[];
 for(let day=localParts(range.earliest,c.timezone).date;day<=localParts(range.latest-1,c.timezone).date;day=nextDay(day)){
  const [start,end]=dayBounds(day,c.timezone),month=Number(day.slice(5,7)),windows=settings.tariff.summerMonths.includes(month)?settings.tariff.summerOffPeak:settings.tariff.winterOffPeak;
  const window=windows.filter(w=>w[0]>=360&&w[0]<1080).sort((a,b)=>a[0]-b[0])[0],minute=window?.[0];
  let at=Number.isFinite(minute)?parseLocalInput(day+'T'+String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0'),c.timezone):null;
  if(at!==null)at=Math.ceil(at/Q)*Q;
  const windowStart=at,windowEnd=window?(window[1]===1440?end:parseLocalInput(day+'T'+String(Math.floor(window[1]/60)).padStart(2,'0')+':'+String(window[1]%60).padStart(2,'0'),c.timezone)):null,first=Math.ceil(Math.max(now,range.earliest)/Q)*Q;
  if(at!==null&&first>at&&first<windowEnd)at=first;
  requests.push({kind:'cheap',day,label:'Start tania strefa',at,windowStart,windowEnd,ongoing:at!==windowStart,note:at!==null&&tariffZone(at,settings.tariff,c.timezone).holiday?'Cały dzień w taniej strefie — bez dodatkowej zmiany ceny.':'',reason:at===null?'Brak dziennego okna taniej strefy w konfiguracji.':null});
  const hours=new Map();
  for(const row of f.fullRows||[]){if(row.start<start||row.start>=end||!Number.isFinite(row.wh)||row.wh<0)continue;const p=localParts(row.start,c.timezone),hour=row.start-Number(p.minute)*60000;const quarters=hours.get(hour)||new Map();quarters.set(row.start,row.wh);hours.set(hour,quarters);}
  const peak=[...hours].filter(([,rows])=>rows.size===4).map(([at,rows])=>({at,wh:[...rows.values()].reduce((n,w)=>n+w,0)})).filter(r=>r.wh>1).sort((a,b)=>b.wh-a.wh||a.at-b.at)[0];
  requests.push({kind:'peak',day,label:'Start szczyt PV',at:peak&&first>peak.at&&first<peak.at+H?first:peak?.at??null,windowStart:peak?.at??null,windowEnd:peak?peak.at+H:null,ongoing:!!peak&&first>peak.at&&first<peak.at+H,peakKWh:peak?peak.wh/1000:null,note:'',reason:peak?null:'Brak pełnej godzinowej prognozy z dodatnią produkcją PV.'});
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
  return {...request,plan,status:complete?'Pełny plan':comparisonBlockReason(ctx,prepared,request,range)};
 });
}

export function comparisonBlockReason(ctx,prepared,request,range){
 const period=ctx.s.balanceMode==='hourly'?H:ctx.s.balanceMode==='quarterly'?Q:300000,format=t=>new Intl.DateTimeFormat('pl-PL',{timeZone:ctx.c.timezone,hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(t);
 const uncertain=(ctx.activity?.devices||[]).filter(d=>['observing','unknown'].includes(d.status)&&d.blockedUntil>ctx.now&&request.at<Math.ceil(d.blockedUntil/period)*period);
 if(uncertain.length){const until=Math.max(...uncertain.map(d=>d.blockedUntil)),boundary=Math.ceil(until/period)*period,observing=uncertain.every(d=>d.status==='observing');return uncertain.map(d=>d.name||d.id).join(', ')+': '+(observing?'trwa potwierdzanie bezczynności':'brak potwierdzonego stanu pracy')+' do '+format(until)+'. '+(ctx.s.balanceMode==='hourly'?'Niepewność obejmuje bilans tej godziny; najbliższy okres bez niej zaczyna się o '+format(boundary)+'. ':'')+'Po potwierdzeniu stanu odczytaj dane i przelicz plan.';}
 const blocked=prepared.filter(p=>p.device.earliest>request.at);if(blocked.length===prepared.length)return blocked.map(p=>p.device.name+': najwcześniejszy dopuszczalny start '+format(p.device.earliest)).join('; ')+'.';
 if(prepared.some(p=>request.at+p.curve.duration>Math.min(range.latest,p.device.deadline??Infinity)))return 'Cykl rozpoczęty o '+format(request.at)+' nie zmieści się przed wymaganym zakończeniem.';
 if([...ctx.groups.values()].some(g=>!g.valid&&g.start<=request.at&&g.start+period>request.at))return 'Brak kompletnych danych prognozy, ceny lub bilansu dla okresu startu. Nie przyjmujemy brakujących danych jako zera.';
 return 'Nie mieści się pełny plan dla tej kombinacji: sprawdź dozwolone godziny, kolejność cykli i limit poboru.';
}
