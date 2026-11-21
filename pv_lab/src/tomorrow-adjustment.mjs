import {localParts} from './time.mjs';
import {riskError} from '../public/report-summary.js';
export const tomorrowDefaults={enabled:true,blend:.5,minDays:3,lookbackDays:14};
export function buildTomorrowAdjustment(reports,c,now=Date.now()){
 const settings={...tomorrowDefaults,...c.tomorrowForecast},today=localParts(now,c.timezone).date,ids=c.providers.filter(p=>p.enabled).map(p=>p.id),cohort=['pv_lab',...ids].sort().join('|');
 const out={enabled:settings.enabled,active:false,blend:settings.blend,days:0,hours:0,provider:null,baselineRisk:null,providerRisk:null,reason:'Za mało pełnych wcześniejszych dni.'};if(!settings.enabled){out.reason='Wyłączona w ustawieniach.';return out;}
 // Exclude the entire issuance day, even after sunset; no target-day outcomes enter this decision.
 const resetDay=c.calibrationFrom?localParts(c.calibrationFrom,c.timezone).date:null;
 const days=Object.values(reports?.days||{}).filter(d=>d.mode==='day_ahead'&&d.date<today&&(!resetDay||d.date>resetDay)&&d.expectedHours>0&&d.cohorts?.[cohort]&&['pv_lab',...ids].every(id=>d.cohorts[cohort][id]?.n===d.expectedHours)&&(!d.paired?.without_tomorrow||d.paired.without_tomorrow.n===d.expectedHours)).sort((a,b)=>a.date.localeCompare(b.date)).slice(-settings.lookbackDays);
 out.days=days.length;out.hours=days.reduce((n,d)=>n+d.expectedHours,0);if(days.length<settings.minDays||!ids.length)return out;
 const score=id=>days.reduce((n,d)=>{const s=id==='pv_lab'?(d.paired?.without_tomorrow||d.cohorts[cohort].pv_lab):d.cohorts[cohort][id];return n+riskError({...s,biasKWh:s.biasKWh??s.forecastKWh-s.actualKWh},.5);},0)/out.hours;
 const best=[...ids].sort((a,b)=>score(a)-score(b)||a.localeCompare(b))[0];out.baselineRisk=score('pv_lab');out.providerRisk=score(best);out.provider=best;out.active=out.providerRisk<out.baselineRisk;out.reason=out.active?'Dostawca ma mniejszy błąd ważony na wcześniejszych wspólnych godzinach.':'Brak dostawcy lepszego od bazowego PV Lab na wcześniejszych dniach.';return out;
}
export function applyTomorrowAdjustment(rows,adjustment,c,now){const today=localParts(now,c.timezone).date,next=new Date(Date.parse(today+'T12:00:00Z')+86400000).toISOString().slice(0,10);let reducedWh=0,changed=0;
 for(const r of rows){r.beforeTomorrowWh=r.wh;r.tomorrowFactor=1;if(!adjustment.active||localParts(r.start,c.timezone).date!==next)continue;const source=r.sources.find(s=>s.provider===adjustment.provider);if(!Number.isFinite(source?.rawWh))continue;const nextWh=Math.min(r.wh,(1-adjustment.blend)*r.wh+adjustment.blend*source.rawWh);if(nextWh<r.wh-1e-9){reducedWh+=r.wh-nextWh;changed++;r.tomorrowFactor=r.wh>0?nextWh/r.wh:1;r.wh=nextWh;}}
 return {...adjustment,targetDate:next,reducedKWh:reducedWh/1000,changedQuarters:changed};}
