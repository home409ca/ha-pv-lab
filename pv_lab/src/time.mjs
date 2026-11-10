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
export function sunPosition(t, location) {
  if(location.latitude===null || location.longitude===null) return null;
  const date=new Date(t), year=date.getUTCFullYear(), n=(t-Date.UTC(year,0,1))/DAY;
  const g=2*Math.PI/365*(n-0.5), rad=Math.PI/180;
  const decl=.006918-.399912*Math.cos(g)+.070257*Math.sin(g)-.006758*Math.cos(2*g)+.000907*Math.sin(2*g)-.002697*Math.cos(3*g)+.00148*Math.sin(3*g);
  const eq=229.18*(.000075+.001868*Math.cos(g)-.032077*Math.sin(g)-.014615*Math.cos(2*g)-.040849*Math.sin(2*g));
  const minutes=date.getUTCHours()*60+date.getUTCMinutes()+date.getUTCSeconds()/60;
  const h=((minutes+eq+4*location.longitude)/4-180)*rad, lat=location.latitude*rad;
  const elevation=Math.asin(Math.sin(lat)*Math.sin(decl)+Math.cos(lat)*Math.cos(decl)*Math.cos(h))/rad;
  const azimuth=(Math.atan2(Math.sin(h),Math.cos(h)*Math.sin(lat)-Math.tan(decl)*Math.cos(lat))/rad+180+360)%360;
  return {azimuth,elevation};
}
export function horizon(hours) { return hours<6?'0–6 h':hours<24?'6–24 h':hours<72?'1–3 dni':'3+ dni'; }
export function calibrationKey(provider,start,issued,c) {
  const sun=sunPosition(start+SLOT/2,c.location), p=localParts(start,c.timezone), season=Math.floor((Number(p.month)-1)/3);
  return `${provider}|${horizon((start-issued)/3600000)}|${season}|${sun?`${Math.floor(sun.azimuth/20)}:${Math.floor(sun.elevation/10)}`:`hour${p.hour}`}`;
}
