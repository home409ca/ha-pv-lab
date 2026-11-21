import {scoreError} from './report-summary.js';
export function hourComparison(row,d,providers,underWeight=.5,mode='rolling'){
 const done=row.end<=d.now,current=row.start<=d.now&&row.end>d.now,report=(d.reports?.hours||[]).find(x=>x.mode===mode&&x.start===row.start),partial=d.currentHourProduction;
 const actual=done?(Number.isFinite(report?.actualKWh)?report.actualKWh:null):current&&partial?.start===row.start&&Number.isFinite(partial.kWh)?partial.kWh:null;
 const predictions=Object.fromEntries([...providers.map(p=>p.id),'pv_lab'].map(id=>[id,done?(report?.predictions?.[id]??null):id==='pv_lab'?row.kWh:row.providers.find(p=>p.provider===id)?.kWh??null]));
 const scores=Object.entries(predictions).filter(([,v])=>Number.isFinite(v)).map(([id,p])=>({id,error:actual===null?null:scoreError(actual,p,underWeight)}));
 const best=done&&actual!==null&&scores.length>1?Math.min(...scores.map(s=>s.error)):null,worst=best===null?null:Math.max(...scores.map(s=>s.error));
 const classes=Object.fromEntries(scores.map(s=>[s.id,best===null?'':Math.abs(s.error-best)<1e-6?'forecast-best':worst-best>1e-6&&Math.abs(s.error-worst)<1e-6?'forecast-worst':'']));
 return {actual,partial:current&&actual!==null,through:partial?.through??null,predictions,classes,archived:done,ranked:best!==null,source:done?report?.actualSource:null};
}
