import test from 'node:test';
import assert from 'node:assert/strict';
import {HA} from '../src/ha.mjs';
import {makeSample} from '../src/adapters.mjs';
import {sampleReasons,train,emptyModel} from '../src/engine.mjs';
import {defaults as c} from '../src/defaults.mjs';
const now=Date.parse('2026-11-11T14:21:49Z'),old='2026-11-11T11:48:47Z',id=c.entities.status;
function client(live){const ha=new HA();ha.request=async(path,body)=>{if(path==='/states')return [{entity_id:id,state:'On-grid',last_updated:old,last_reported:old}];assert.equal(path,'/template');assert.ok(body.template.includes('last_reported'));return live;};return ha;}
test('świeże zgłoszenie niezmiennego On-grid zastępuje stary czas serializowany w REST',async()=>{
  const ha=client({entity_id:id,state:'On-grid',reported:now/1000-10}),states=await ha.states(c),sample=makeSample(states,c,now);assert.equal(sample.status,'On-grid');assert.ok(!sampleReasons(sample,c).includes('status falownika'));
  const start=Math.floor(now/900000)*900000,samples=Array.from({length:16},(_,i)=>({...sample,at:start+i*60000,power:1000,voltages:[230,230,230],voltageFlag:'normal'})),model=emptyModel();
  train(model,samples,[{at:start-60000,provider:'solcast',rows:[{start,wh:250}]}],c,start+900001);assert.equal(model.evaluated,1);
});
test('rzeczywiście stare zgłoszenie wciąż blokuje kalibrację',async()=>{
  const sample=makeSample(await client({entity_id:id,state:'On-grid',reported:now/1000-3600}).states(c),c,now);assert.equal(sample.status,null);assert.ok(sampleReasons(sample,c).includes('status falownika'));
});
test('brak encji, unavailable i status awarii nie są normalną pracą',async()=>{
  for(const [state,reported] of [['unavailable',null],['unavailable',now/1000],['Fault',now/1000]]){const sample=makeSample(await client({entity_id:id,state,reported}).states(c),c,now);assert.ok(sampleReasons(sample,c).includes('status falownika'));}
});
test('błędna odpowiedź świeżości jest jawnym błędem, a nie fałszywie poprawnym statusem',async()=>{
  for(const live of ['invalid',{entity_id:'sensor.other',state:'On-grid',reported:now/1000},{entity_id:id,state:'On-grid',reported:'wrong'}])await assert.rejects(()=>client(live).states(c));
});
