import {sunPosition} from './time.mjs';
const R=Math.PI/180;
export const clearSkyDescription='Uproszczony model odniesienia: Haurwitz GHI, podział Erbs, izotropowe promieniowanie na połać. Bez pomiaru temperatury, śniegu i zamglenia; nie jest granicą fizyczną ani prognozą pogody.';
// Equations: pvlib clearsky.haurwitz and irradiance.erbs; isotropic sky + ground reflection.
// This is an independent small implementation, without runtime libraries or external weather calls.
export function irradiance(at,location){const sun=sunPosition(at,location);if(!sun)return null;if(sun.elevation<=0)return {...sun,ghi:0,dni:0,dhi:0};
 const cosZ=Math.sin(sun.elevation*R),ghi=1098*cosZ*Math.exp(-.059/cosZ),date=new Date(at),doy=(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate())-Date.UTC(date.getUTCFullYear(),0,0))/86400000;
 const extra=1366.1*(1+.033*Math.cos(2*Math.PI*doy/365)),kt=Math.max(0,Math.min(1,ghi/(extra*Math.max(cosZ,.065)))),kd=kt<=.22?1-.09*kt:kt<=.8?.9511-.1604*kt+4.388*kt**2-16.638*kt**3+12.336*kt**4:.165,dhi=ghi*kd;
 return {...sun,ghi,dhi,dni:sun.elevation>3?(ghi-dhi)/cosZ:0};
}
export function clearSkyPowers(at,c){const light=irradiance(at,c.location);if(!light)return null;const opts=c.historyProfile||{},dcFactor=opts.dcFactor??.9,acEfficiency=opts.acEfficiency??.97,dc={};
 for(const s of c.strings){const tilt=s.tilt*R,cosIncidence=Math.max(0,Math.sin(light.elevation*R)*Math.cos(tilt)+Math.cos(light.elevation*R)*Math.sin(tilt)*Math.cos((light.azimuth-s.azimuth)*R));
  const poa=light.elevation>0?light.dni*cosIncidence+light.dhi*(1+Math.cos(tilt))/2+light.ghi*.2*(1-Math.cos(tilt))/2:0;dc[s.id]=s.panels*s.panelW*poa/1000*dcFactor;}
 const sum=Object.values(dc).reduce((a,b)=>a+b,0),ac=Math.min(c.inverter.limitW,sum*acEfficiency),shares=Object.fromEntries(Object.entries(dc).map(([id,value])=>[id,sum>0?value/sum*ac:0]));return {dc,ac:shares,total:ac};
}
export function clearSkyHour(start,channel,c,basis='AC'){let wh=0;for(let i=0;i<12;i++){const power=clearSkyPowers(start+(i+.5)*300000,c);if(!power)return null;const value=channel==='total'?(basis==='DC'?Object.values(power.dc).reduce((a,b)=>a+b,0):power.total):(basis==='DC'?power.dc[channel]:power.ac[channel]);if(!Number.isFinite(value))return null;wh+=value/12;}return wh/1000;}
export function solarHour(at,longitude){const d=new Date(at),day=(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())-Date.UTC(d.getUTCFullYear(),0,0))/86400000,b=2*Math.PI*(day-81)/364,eq=9.87*Math.sin(2*b)-7.53*Math.cos(b)-1.5*Math.sin(b);return ((d.getUTCHours()+d.getUTCMinutes()/60+longitude/15+eq/60)%24+24)%24;}
