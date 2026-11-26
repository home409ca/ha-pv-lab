import test from 'node:test';import assert from 'node:assert/strict';
import {resolvePrices} from '../src/optimizer-tariff.mjs';
import {verifyOptimizerRecord} from '../src/optimizer-history.mjs';import {optimizerDefaults} from '../src/optimizer-settings.mjs';import {defaults} from '../src/defaults.mjs';
test('verification compares actual cost against accepted replan without overwriting the original forecast',async()=>{
 const t=Date.parse('2026-11-26T10:00:00Z'),c=structuredClone(defaults),settings=optimizerDefaults(c);settings.load.powerEntity='sensor.house';settings.measurements.netPower='';settings.balanceMode='hourly';settings.export.enabled=false;settings.tariff.grossConfirmed=true;
 const record={timezone:'Europe/Warsaw',settings,prices:resolvePrices(settings,new Map()),pvPowerEntity:'sensor.pv',housePowerEntity:'sensor.house',confirmedExecuted:true,result:{schedule:{cost:.6,additionalImportKWh:.5,lostExportKWh:0}},executionForecast:{cost:.2,importKWh:.15},cycles:[{id:'dish',powerEntity:'sensor.dish',start:t,end:t+3600000,curve:{kWh:1}}]};
 const ha={request:async()=>['sensor.house','sensor.pv','sensor.dish'].map(id=>[{entity_id:id,state:String(id==='sensor.house'?1300:1000),last_updated:new Date(t).toISOString(),attributes:{unit_of_measurement:'W'}}])};
 const result=await verifyOptimizerRecord(record,ha,t+7200000);assert.equal(result.predictedCost,.2);assert.equal(result.predictedImportKWh,.15);assert.ok(Math.abs(result.error-(result.measuredCost-.2))<1e-9);assert.equal(record.result.schedule.cost,.6);
});
