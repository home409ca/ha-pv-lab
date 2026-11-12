import {dayBounds} from './presentation.js';
export function sunPosition(t, location) {
  if(!location||!Number.isFinite(location.latitude)||!Number.isFinite(location.longitude)) return null;
  const date=new Date(t), year=date.getUTCFullYear(), n=(t-Date.UTC(year,0,1))/86400000;
  const g=2*Math.PI/365*(n-0.5), rad=Math.PI/180;
  const decl=.006918-.399912*Math.cos(g)+.070257*Math.sin(g)-.006758*Math.cos(2*g)+.000907*Math.sin(2*g)-.002697*Math.cos(3*g)+.00148*Math.sin(3*g);
  const eq=229.18*(.000075+.001868*Math.cos(g)-.032077*Math.sin(g)-.014615*Math.cos(2*g)-.040849*Math.sin(2*g));
  const minutes=date.getUTCHours()*60+date.getUTCMinutes()+date.getUTCSeconds()/60;
  const h=((minutes+eq+4*location.longitude)/4-180)*rad, lat=location.latitude*rad;
  const elevation=Math.asin(Math.sin(lat)*Math.sin(decl)+Math.cos(lat)*Math.cos(decl)*Math.cos(h))/rad;
  const azimuth=(Math.atan2(Math.sin(h),Math.cos(h)*Math.sin(lat)-Math.tan(decl)*Math.cos(lat))/rad+180+360)%360;
  return {azimuth,elevation};
}

const HOUR=3600000,cache=new Map();
export function isProductionHour(start,c,{forecastWh=0,actualKWh=0}={}){
 if(forecastWh>1||actualKWh>.001)return true;
 const location=c.location;if(!location||!Number.isFinite(location.latitude)||!Number.isFinite(location.longitude))return true;
 const key=start+'|'+location.latitude+'|'+location.longitude;if(cache.has(key))return cache.get(key);
 let active=false;for(let i=0;i<12;i++){if(sunPosition(start+(i+.5)*300000,location).elevation>0){active=true;break;}}
 if(cache.size>50000)cache.clear();cache.set(key,active);return active;
}
export function rowProductionHour(row,c){return isProductionHour(row.start,c,{actualKWh:row.actualKWh||0,forecastWh:Math.max(0,...Object.values(row.predictions||{}).filter(Number.isFinite))*1000});}
export function productionRange(date,c,rows=[],samples=[]){const [a,b]=dayBounds(date,c.timezone),evidence=new Map();
 for(const row of rows){if(row.start<a||row.start>=b)continue;const h=Math.floor(row.start/HOUR)*HOUR;evidence.set(h,Math.max(evidence.get(h)||0,row.wh||0,row.rawWh||0,...(row.sources||[]).map(s=>s.rawWh||0)));}
 for(const s of samples){if(s.at<a||s.at>=b)continue;const h=Math.floor(s.at/HOUR)*HOUR;evidence.set(h,Math.max(evidence.get(h)||0,(s.power||0)/4));}
 const hours=[];for(let t=a;t<b;t+=HOUR)if(isProductionHour(t,c,{forecastWh:evidence.get(t)||0}))hours.push(t);
 return hours.length?[hours[0],hours.at(-1)+HOUR]:null;
}
export const currentHour=(start,end,now)=>now>=start&&now<end;
