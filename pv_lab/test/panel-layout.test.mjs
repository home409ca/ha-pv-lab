import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../src/defaults.mjs';
import {defaultPanelLayout,resolvePanelLayout,validatePanelLayout} from '../src/panel-layout.mjs';
test('panel layout keeps all 18 identities, holes and roof-specific schematic positions',()=>{
  const result=defaultPanelLayout(defaults),by=(roof,num)=>defaults.optimizers.find(o=>o.string===roof&&Number(o.panel.slice(0,2))===num).id;
  assert.equal(Object.keys(result.panels).length,18);
  assert.equal(result.panels[by('pv1',1)].x,result.panels[by('pv1',3)].x);
  assert.equal(result.panels[by('pv1',6)].x,result.panels[by('pv1',10)].x);
  assert.equal(result.panels[by('pv2',1)].landscape,true);
  assert.deepEqual(validatePanelLayout(result,defaults),result);
});
test('visual changes leave physical config untouched, preserve known IDs and initialize new panels',()=>{
  const c=structuredClone(defaults),before=JSON.stringify(c),saved=defaultPanelLayout(c),id=c.optimizers[0].id;
  saved.panels[id]={x:80,y:70,landscape:true};
  assert.deepEqual(resolvePanelLayout(saved,c).panels[id],saved.panels[id]);assert.equal(JSON.stringify(c),before);
  c.optimizers.push({id:'new',panel:'12',string:'pv1'});
  assert.ok(resolvePanelLayout(saved,c).panels.new);assert.deepEqual(resolvePanelLayout(saved,c).panels[id],saved.panels[id]);
});
test('invalid positions, missing identities and unexpected panel identifiers cannot be saved',()=>{
  for(const change of [x=>x.panels.extra={x:0,y:0,landscape:false},x=>delete x.panels[defaults.optimizers[0].id],x=>x.panels[defaults.optimizers[0].id].x=Infinity,x=>x.panels[defaults.optimizers[0].id].y=81,x=>x.panels[defaults.optimizers[0].id].landscape='true']){const value=defaultPanelLayout(defaults);change(value);assert.throws(()=>validatePanelLayout(value,defaults));}
});
