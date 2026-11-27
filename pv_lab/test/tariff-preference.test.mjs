import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {preferredCheapGridPlan} from '../public/tariff-preference.js';
import {preferTariffStart} from '../src/tariff-preference.mjs';
const row=(id,start,cost=.62279,changes={})=>({plan:{id},start,cost,stress:.62279,energy:.916,imported:.916,complete:true,cheap:false,...changes});
test('same displayed 62 groszy and all-grid prefers 13:00 cheap start over 13:15',()=>{
 const a=row('normal',1315),b=row('cheap',1300,.62280,{cheap:true});
 assert.equal(preferredCheapGridPlan([a,b]),b.plan);
 assert.equal(preferredCheapGridPlan([a,row('later',1400,.62280,{cheap:true}),b]),b.plan);
});
test('no tariff promotion with meaningful solar, higher displayed cost, worse stress or incomplete data',()=>{
 const a=row('normal',1315);
 for(const changes of [{imported:.9},{cost:.635},{stress:.8},{complete:false},{energy:.8},{start:null}]){
  const b=row('cheap',1300,.62280,{cheap:true,...changes});
  assert.equal(preferredCheapGridPlan([a,b]),a.plan);
 }
 assert.equal(preferredCheapGridPlan([{...a,imported:.9},row('cheap',1300,.62280,{cheap:true})]),a.plan);
 assert.equal(preferredCheapGridPlan([{...a,stress:null},row('cheap',1300,.62280,{cheap:true})]),a.plan);
});
test('backend keeps list unique and bounded and does not invent a plan for empty search',()=>{
 const plan=(id,start,label)=>({id,comparisonLabel:label,schedule:{devices:1,requested:1,cost:.62279,pessimisticCost:.62279,additionalImportKWh:.916,startsAt:start},devices:[{id:'dish',powerEntity:'sensor.dish',energyKWh:.916,curve:{wh:[916]},scheduled:{start,end:start+900000}}]});
 const a=plan('a',1315),b=plan('b',1300,'Start tania strefa');
 const result=preferTariffStart([a,b],[b]);assert.equal(result[0],b);assert.equal(result.length,2);assert.equal(new Set(result.map(p=>p.id)).size,2);
 assert.deepEqual(preferTariffStart([],[b]),[]);
});
test('app and HACS card use byte-identical tariff preference helper',async()=>{
 assert.equal(await readFile(new URL('../public/tariff-preference.js',import.meta.url),'utf8'),await readFile(new URL('../../custom_components/pv_lab/www/tariff-preference.js',import.meta.url),'utf8'));
});
