import {SLOT,floorSlot,horizon} from './time.mjs';
import {actualInterval} from './engine.mjs';
export function validatePublished(model,samples,published,c,now){if(!samples.length)return;model.ensembleScores??={};
  const first=Math.max(floorSlot(samples[0].at),model.validationWatermark?model.validationWatermark+SLOT:0),end=floorSlot(now)-SLOT;
  for(let t=first;t<=end;t+=SLOT){model.validationWatermark=t;const actual=actualInterval(samples,t,c);const healthy=actual.reasons.length===0,gridValid=actual.coverage>=.95&&actual.wh<=c.inverter.limitW/4*1.05&&actual.reasons.every(r=>['status falownika','limit falownika'].includes(r));if(!healthy&&!gridValid)continue;const byH=new Map();
    for(const pub of published){if(pub.at>t||pub.at<(c.calibrationFrom||0))continue;const row=pub.rows.find(r=>r.start===t);if(!row)continue;const h=horizon((t-pub.at)/3600000);if(!byH.has(h)||byH.get(h).at<pub.at)byH.set(h,{at:pub.at,row});}
    for(const [h,{row}] of byH){if(Math.max(row.rawWh||0,actual.wh)<20)continue;for(const [stage,key] of [...(healthy?[['raw','rawWh'],['simple','simpleWh'],['profile','staticWh'],['without_history','beforeHistoryWh'],['final','wh']]:[]),...(gridValid&&Number.isFinite(row.beforeGridWh)?[['before_grid','beforeGridWh'],['grid_final','wh']]:[])]){const value=row[key];if(!Number.isFinite(value))continue;const s=model.ensembleScores[`${h}|${stage}`]??={n:0,actualWh:0,errorWh:0,squaredError:0,biasWh:0};s.n++;s.actualWh+=actual.wh;s.errorWh+=Math.abs(actual.wh-value);s.squaredError+=(actual.wh-value)**2;s.biasWh+=value-actual.wh;}}
  }
}
