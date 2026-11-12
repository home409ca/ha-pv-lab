import {DAY} from './time.mjs';
import {dayBounds} from '../public/presentation.js';
import {clearSkyHour,solarHour} from './clear-sky.mjs';
import {createHistoricalProfile,historicalDay,geometryKey} from './historical-profile.mjs';
let cache=null;
export function demoHistoricalDay(date,config,now=Date.now()){
 const key=date+'|'+geometryKey(config);if(cache?.key===key)return cache.value;
 const c=structuredClone(config);c.location={latitude:52.23,longitude:21.01};const channels=['total',...c.strings.map(s=>s.id)].map(id=>({id,name:id==='total'?'Produkcja AC falownika':id.toUpperCase(),statisticId:'sensor.demo_'+id,basis:'AC',confirmed:true,estimated:id!=='total'}));c.statistics.channels=channels;
 const archive={version:1,geometry:geometryKey(c),at:now,channels:Object.fromEntries(channels.map(ch=>[ch.id,{...ch,rows:[],invalid:0}]))},year=new Date(now).getUTCFullYear(),month=Number(date.slice(5,7))-1,day=Number(date.slice(8));
 for(let y=year-5;y<year;y++)for(let offset=-15;offset<=15;offset++){const mid=new Date(Date.UTC(y,month,day,12)+offset*DAY).toISOString().slice(0,10),[a,b]=dayBounds(mid,c.timezone),weather=.8+.15*Math.sin(offset*1.3+y);
  for(let at=a;at<b;at+=3600000){let sum=0;for(const ch of channels.filter(ch=>ch.id!=='total')){const clear=clearSkyHour(at,ch.id,c),shadow=ch.id==='pv2'&&solarHour(at+1800000,c.location.longitude)<10?.65:1,value=clear*weather*shadow;archive.channels[ch.id].rows.push([at,value,'unknown']);sum+=value;}archive.channels.total.rows.push([at,sum,'unknown']);}
 }
 const profile=createHistoricalProfile(archive,c,now),value=historicalDay(profile,date,c);value.warnings.unshift('Dane demonstracyjne dla przykładowej lokalizacji Warszawa; nie są historią Twojej instalacji.');cache={key,value};return value;
}
