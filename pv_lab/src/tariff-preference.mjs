import {preferredCheapGridPlan} from '../public/tariff-preference.js';
import {planSignature} from './auto-policy.mjs';
export function preferTariffStart(plans,references=[]){
 if(!plans.length)return plans;
 const preferred=preferredCheapGridPlan([...plans,...references].map(plan=>({plan,complete:plan.schedule.devices===plan.schedule.requested&&plan.schedule.requested>0,cost:plan.schedule.cost,stress:plan.schedule.pessimisticCost,energy:plan.devices.filter(d=>d.scheduled).reduce((n,d)=>n+d.energyKWh,0),imported:plan.schedule.additionalImportKWh,cheap:plan.comparisonLabel==='Start tania strefa',start:plan.schedule.startsAt})));
 if(!preferred||preferred===plans[0])return plans;
 const key=planSignature(preferred);return [preferred,...plans.filter(p=>planSignature(p)!==key)].slice(0,Math.max(1,plans.length));
}
