export const SLOT = 15*60*1000;
export const DAY = 86400000;
export const floorSlot = t => Math.floor(t/SLOT)*SLOT;
const formatters=new Map();
export function localParts(t, zone) {
  if(!formatters.has(zone))formatters.set(zone,new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}));
  const a = Object.fromEntries(formatters.get(zone).formatToParts(t).map(x=>[x.type,x.value]));
  return {...a, date:`${a.year}-${a.month}-${a.day}`};
}
// Position calculated from the solar declination and equation of time; sufficient for broad calibration bins.
import {sunPosition} from '../public/production-hours.js';
export {sunPosition};
export function horizon(hours) { return hours<6?'0–6 h':hours<24?'6–24 h':hours<72?'1–3 dni':'3+ dni'; }
export function calibrationKey(provider,start,issued,c) {
  const sun=sunPosition(start+SLOT/2,c.location), p=localParts(start,c.timezone), season=Math.floor((Number(p.month)-1)/3);
  return `${provider}|${horizon((start-issued)/3600000)}|${season}|${sun?`${Math.floor(sun.azimuth/20)}:${Math.floor(sun.elevation/10)}`:`hour${p.hour}`}`;
}
