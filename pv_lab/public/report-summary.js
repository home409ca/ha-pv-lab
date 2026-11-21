// The signed error and absolute error suffice to recover both error directions.
export function riskError(s,underWeight=.5){return Math.max(0,(s.absErrorKWh+(s.biasKWh||0))/2)+underWeight*Math.max(0,(s.absErrorKWh-(s.biasKWh||0))/2);}
export function scoreError(actual,predicted,underWeight=.5){return predicted>=actual?predicted-actual:(actual-predicted)*underWeight;}
export function comparisonCohorts(records,{hourly=false,days=[],underWeight=.5}={}){
 const cohorts={};
 const merge=(key,id,s)=>{const x=(cohorts[key]??={})[id]??={n:0,actualKWh:0,forecastKWh:0,absErrorKWh:0,biasKWh:0,squaredError:0,dailyN:0,dailyAbsErrorKWh:0};for(const k of Object.keys(x))x[k]+=Number.isFinite(s[k])?s[k]:k==='biasKWh'?(s.forecastKWh||0)-(s.actualKWh||0):0;};
 for(const r of records){if(hourly){const ids=['pv_lab',...r.providers];if(!Number.isFinite(r.actualKWh)||!ids.every(id=>Number.isFinite(r.predictions[id])))continue;const key=[...ids].sort().join('|');for(const id of ids){const e=r.predictions[id]-r.actualKWh;merge(key,id,{n:1,actualKWh:r.actualKWh,forecastKWh:r.predictions[id],absErrorKWh:Math.abs(e),biasKWh:e,squaredError:e*e});}}else for(const [key,scores] of Object.entries(r.cohorts||{}))for(const [id,s] of Object.entries(scores))merge(key,id,s);}
 if(hourly){const dates=new Set(records.map(r=>r.mode+'|'+r.date));for(const day of days){if(!dates.has(day.mode+'|'+day.date))continue;for(const [key,scores] of Object.entries(day.cohorts||{})){if(!cohorts[key])continue;for(const [id,s] of Object.entries(scores)){const x=cohorts[key][id];if(x&&s.n===day.expectedHours&&s.n>0){x.dailyN++;x.dailyAbsErrorKWh+=Math.abs(s.forecastKWh-s.actualKWh);}}}}}
 for(const scores of Object.values(cohorts))for(const s of Object.values(scores)){s.overKWh=Math.max(0,(s.absErrorKWh+s.biasKWh)/2);s.underKWh=Math.max(0,(s.absErrorKWh-s.biasKWh)/2);s.riskErrorKWh=riskError(s,underWeight);}
 return cohorts;
}
