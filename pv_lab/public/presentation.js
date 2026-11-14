const HOUR=3600000, SLOT=900000;
const dayFormatters=new Map(),boundsCache=new Map();
const dayAt=(t,zone)=>{if(!dayFormatters.has(zone))dayFormatters.set(zone,new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}));return dayFormatters.get(zone).format(t);};
export function dayBounds(day,zone){
  const cacheKey=day+'|'+zone;if(boundsCache.has(cacheKey))return [...boundsCache.get(cacheKey)];
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day+'T00:00:00Z'))||new Date(day+'T00:00:00Z').toISOString().slice(0,10)!==day)throw new Error('Nieprawidłowa data.');
  const utc=Date.parse(day+'T00:00:00Z');let start=null,end=null;
  for(let t=utc-18*HOUR;t<=utc+42*HOUR;t+=SLOT){if(dayAt(t,zone)===day){start??=t;end=t+SLOT;}else if(start!==null)break;}
  if(start===null)throw new Error('Nie znaleziono dnia w wybranej strefie.');if(boundsCache.size>4096)boundsCache.clear();boundsCache.set(cacheKey,[start,end]);return [start,end];
}
export function hourlyRows(rows,day,zone,now){
  const [start,end]=dayBounds(day,zone),byTime=new Map(rows.map(r=>[r.start,r])),out=[];
  for(let t=start;t<end;t+=HOUR){const parts=Array.from({length:4},(_,i)=>byTime.get(t+i*SLOT)),present=parts.filter(Boolean),complete=present.length===4,remainingCovered=present.length>0&&parts.every((r,i)=>t+(i+1)*SLOT<=now||r);
    const sum=key=>present.reduce((s,r)=>s+r[key],0)/1000;
    out.push({start:t,end:t+HOUR,complete,periods:present.length,rawKWh:complete?sum('rawWh'):null,kWh:complete?sum('wh'):null,remainingKWh:remainingCovered?present.reduce((s,r)=>s+r.wh*Math.max(0,Math.min(1,(r.start+SLOT-now)/SLOT)),0)/1000:null,providers:[...new Set(present.flatMap(r=>r.sources.map(s=>s.provider)))].map(provider=>{const src=present.map(r=>r.sources.find(s=>s.provider===provider));return {provider,kWh:complete&&src.every(Boolean)?src.reduce((s,r)=>s+r.rawWh,0)/1000:null};})});
  }return out;
}
export const providerColors={forecast_solar:'#ffbd66',open_meteo:'#43d9ce',solcast:'#c39bff'};
export function forecastSeries(rows,actual,{raw=true,corrected=true,measured=true,providers={},basis='limited'}={},definitions=[]){
  const sourceSeries=definitions.filter(p=>p.enabled&&providers[p.id]!==false).map((p,i)=>({label:p.name,provider:p.id,color:providerColors[p.id]||['#ffbd66','#43d9ce','#c39bff'][i%3],width:2,dashed:true,points:rows.map(r=>{const source=r.sources?.find(s=>s.provider===p.id),wh=source?.[basis==='limited'?'rawWh':'originalWh'];return {x:r.start+SLOT/2,y:Number.isFinite(wh)?wh*4:null};})}));
  // The wide dashed source line remains visible under an identical corrected line.
  return [...sourceSeries,...(raw?[{label:'Połączona prognoza po limicie',color:'#a7b4c5',width:7,dashed:true,points:rows.map(r=>({x:r.start+SLOT/2,y:r.rawWh*4}))}]:[]),...(corrected?[{label:'PV Lab — po korektach',color:'#bcf46b',width:3,points:rows.map(r=>({x:r.start+SLOT/2,y:r.wh*4}))}]:[]),...(measured?[{label:'Pomiar',color:'#72b8ff',width:2,points:actual.map(s=>({x:s.at,y:s.power}))}]:[])];
}

const inputFormatters=new Map();
export function localInput(t,zone){if(t===null)return '';if(!inputFormatters.has(zone))inputFormatters.set(zone,new Intl.DateTimeFormat('sv-SE',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}));return inputFormatters.get(zone).format(t).replace(' ','T');}
export function parseLocalInput(value,zone){if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw new Error('Niepoprawna data planu.');const [start,end]=dayBounds(value.slice(0,10),zone);for(let t=start;t<end;t+=60000)if(localInput(t,zone)===value)return t;throw new Error('Wybrana godzina nie istnieje w tej strefie czasowej.');}

export function shortTime(at,zone){return new Intl.DateTimeFormat('pl-PL',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(at);}
export function shortRange(start,end,zone,includeOffset=false){const options={timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23',...(includeOffset?{timeZoneName:'shortOffset'}:{})},fmt=new Intl.DateTimeFormat('pl-PL',options);return fmt.format(start)+'–'+fmt.format(end);}

export function hourlyForecastSeries(rows,day,zone,visibility,definitions,actualHours=[],now=Date.now()){
 const [begin,end]=dayBounds(day,zone),base=forecastSeries(rows,[],{...visibility,measured:false},definitions),result=base.map(series=>{const quarters=new Map(series.points.map(p=>[p.x-SLOT/2,p.y])),points=[];for(let start=begin;start<end;start+=HOUR){const values=Array.from({length:4},(_,i)=>quarters.get(start+i*SLOT)),y=values.every(Number.isFinite)?values.reduce((a,b)=>a+b,0)/4000:null;points.push({x:start+HOUR/2,start,end:start+HOUR,y,tooltip:shortRange(start,start+HOUR,zone)+' · pełna godzina'});}return {...series,points,interval:true,maxGapMs:HOUR};});
 if(visibility.measured){const measured=new Map(actualHours.filter(r=>Number.isFinite(r.actualKWh)&&r.actualKWh>=0&&r.start+HOUR<=now).map(r=>[r.start,r.actualKWh])),points=[];for(let start=begin;start<end;start+=HOUR)points.push({x:start+HOUR/2,start,end:start+HOUR,y:measured.get(start)??null,tooltip:shortRange(start,start+HOUR,zone)+' · pomiar zakończonej godziny'});result.push({label:'Pomiar — zakończone godziny',color:'#72b8ff',width:2,points,interval:true,maxGapMs:HOUR});}
 return result;
}

export function houseBalanceSeries(pvRows,house,day,zone,visibility){
 if(!visibility.house&&!visibility.surplus)return [];const [begin,end]=dayBounds(day,zone),pv=new Map(pvRows.map(r=>[r.start,r.wh])),base=new Map((house?.rows||[]).map(r=>[r.start,r])),home=[],surplus=[];
 for(let start=begin;start<end;start+=HOUR){const times=Array.from({length:4},(_,i)=>start+i*SLOT),parts=times.map(t=>base.get(t)),valid=parts.every(p=>p&&Number.isFinite(p.wh)),pvValid=times.every(t=>Number.isFinite(pv.get(t))),homeKWh=valid?parts.reduce((sum,p)=>sum+p.wh,0)/1000:null,pvKWh=pvValid?times.reduce((sum,t)=>sum+pv.get(t),0)/1000:null,source=valid?[...new Set(parts.map(p=>p.source))].join(' / '):'brak pełnego profilu',tip=shortRange(start,start+HOUR,zone)+' · '+source+' · pełna godzina, przed dodatkowymi cyklami';home.push({x:start+HOUR/2,start,end:start+HOUR,y:homeKWh,tooltip:tip});surplus.push({x:start+HOUR/2,start,end:start+HOUR,y:homeKWh===null||pvKWh===null?null:Math.max(0,pvKWh-homeKWh),tooltip:tip+' · max(PV − baza domu, 0)'});}
 return [...(visibility.house?[{label:'Zużycie domu — baza bez planowanych urządzeń',color:'#f7a75b',width:2,points:home,interval:true,maxGapMs:HOUR}]:[]),...(visibility.surplus?[{label:'Nadwyżka godzinowa PV po odjęciu bazy domu',color:'#df9dff',width:3,points:surplus,interval:true,maxGapMs:HOUR}]:[])];
}
