const HOUR=3600000, SLOT=900000;
const dayAt=(t,zone)=>new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(t);
export function dayBounds(day,zone){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day+'T00:00:00Z'))||new Date(day+'T00:00:00Z').toISOString().slice(0,10)!==day)throw new Error('Nieprawidłowa data.');
  const utc=Date.parse(day+'T00:00:00Z');let start=null,end=null;
  for(let t=utc-18*HOUR;t<=utc+42*HOUR;t+=SLOT){if(dayAt(t,zone)===day){start??=t;end=t+SLOT;}else if(start!==null)break;}
  if(start===null)throw new Error('Nie znaleziono dnia w wybranej strefie.');return [start,end];
}
export function hourlyRows(rows,day,zone,now){
  const [start,end]=dayBounds(day,zone),byTime=new Map(rows.map(r=>[r.start,r])),out=[];
  for(let t=start;t<end;t+=HOUR){const parts=Array.from({length:4},(_,i)=>byTime.get(t+i*SLOT)),present=parts.filter(Boolean),complete=present.length===4,remainingCovered=present.length>0&&parts.every((r,i)=>t+(i+1)*SLOT<=now||r);
    const sum=key=>present.reduce((s,r)=>s+r[key],0)/1000;
    out.push({start:t,end:t+HOUR,complete,periods:present.length,rawKWh:complete?sum('rawWh'):null,kWh:complete?sum('wh'):null,remainingKWh:remainingCovered?present.reduce((s,r)=>s+r.wh*Math.max(0,Math.min(1,(r.start+SLOT-now)/SLOT)),0)/1000:null,providers:[...new Set(present.flatMap(r=>r.sources.map(s=>s.provider)))].map(provider=>{const src=present.map(r=>r.sources.find(s=>s.provider===provider));return {provider,kWh:complete&&src.every(Boolean)?src.reduce((s,r)=>s+r.rawWh,0)/1000:null};})});
  }return out;
}
export function forecastSeries(rows,actual,{raw=true,corrected=true,measured=true}={}){
  // The wide dashed source line remains visible under an identical corrected line.
  return [...(raw?[{label:'Prognoza źródłowa po limicie',color:'#ffbd66',width:7,dashed:true,points:rows.map(r=>({x:r.start+SLOT/2,y:r.rawWh*4}))}]:[]),...(corrected?[{label:'Po korektach',color:'#bcf46b',width:2,points:rows.map(r=>({x:r.start+SLOT/2,y:r.wh*4}))}]:[]),...(measured?[{label:'Pomiar',color:'#72b8ff',width:2,points:actual.map(s=>({x:s.at,y:s.power}))}]:[])];
}
