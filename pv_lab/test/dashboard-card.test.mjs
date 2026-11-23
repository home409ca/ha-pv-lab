import test from 'node:test';
import assert from 'node:assert/strict';
// Only the share calculation is invoked; no simulated browser or HA state is used.
globalThis.HTMLElement=class {};
globalThis.customElements={get:()=>true};
globalThis.window={customCards:[]};
const {energyShare,nextCycleCount,alternativeSummary,cardOptions,nextExecutionMode,executionModes}=await import('../../custom_components/pv_lab/www/pv-lab-plan-card.js');
test('dashboard bar reports 80/20 after settlement, not sum of independently planned cycles',()=>{assert.deepEqual(energyShare({cycles:[{energyKWh:1},{energyKWh:2}],importKWh:.6}),{green:80,orange:20});});
test('dashboard bar handles full solar, full purchase, and missing values distinctly',()=>{assert.deepEqual(energyShare({cycles:[{energyKWh:1}],importKWh:0}),{green:100,orange:0});assert.deepEqual(energyShare({cycles:[{energyKWh:1}],importKWh:2}),{green:0,orange:100});for(const p of [{cycles:[],importKWh:0},{cycles:[{}],importKWh:0},{cycles:[{energyKWh:1}],importKWh:null}])assert.equal(energyShare(p),null);});

test('appliance taps cycle 0 to 3 then clear without a separate reset button',()=>{let n=0;const values=[];for(let i=0;i<8;i++){n=nextCycleCount(n);values.push(n);}assert.deepEqual(values,[1,2,3,0,1,2,3,0]);assert.equal(nextCycleCount(8),0);});

test('small positive solar contribution is not rounded to an all-grid bar',()=>{assert.deepEqual(energyShare({cycles:[{energyKWh:1}],importKWh:.998}),{green:.2,orange:99.8});});

test('alternative arrow describes all hidden raw purchases rather than rounded percentages',()=>{assert.equal(alternativeSummary([]),null);assert.equal(alternativeSummary([{importKWh:0},{importKWh:0}]).tone,'solar');assert.equal(alternativeSummary([{importKWh:0},{importKWh:.0001}]).tone,'purchase');assert.equal(alternativeSummary([{importKWh:null}]).tone,'unknown');});

test('small purchases remain visible so the orange alternative arrow is not contradicted by a 100% label',()=>{assert.deepEqual(energyShare({cycles:[{energyKWh:1}],importKWh:.002}),{green:99.8,orange:.2});});

 test('card appearance defaults are compact and options do not modify planning inputs',()=>{
  const c=cardOptions();assert.equal(c.layout,'compact');assert.equal(c.max_plans,3);assert.equal(c.show_header,true);assert.equal(c.show_energy_bar,true);assert.equal(c.show_details,true);
  assert.equal(cardOptions({title:''}).title,'');assert.equal(cardOptions({layout:'full',show_header:false,max_plans:1,show_details:false,show_energy_bar:false}).show_header,false);
  for(const input of [{layout:'tiny'},{max_plans:0},{max_plans:4},{max_plans:1.5},{show_header:'false'},{show_details:0},{title:false},[]])assert.throws(()=>cardOptions(input));
 });

test('execution mode cycle is explicit and keeps fixed as default',()=>{assert.equal(nextExecutionMode('fixed'),'finish');assert.equal(nextExecutionMode('flexible'),'fixed');assert.equal(nextExecutionMode('finish'),'flexible');assert.match(executionModes.finish.label,/późniejszego/);});

test('new card parameters validate colors and geometry, chart and reference toggles',()=>{const c=cardOptions();assert.equal(c.show_reference_plans,true);assert.equal(c.show_plan_chart,false);assert.equal(c.device_button_height,36);for(const v of [{device_color:'red'},{auto_color:'url(evil)'},{device_button_height:0},{show_plan_chart:1},{show_reference_plans:'no'}])assert.throws(()=>cardOptions(v));assert.equal(cardOptions({device_color:'#aAbB12',device_button_height:28}).device_button_height,28);});
test('unchanged status timestamps do not rebuild card and timeline chart preserves missing values',async()=>{const {renderFingerprint,planChart}=await import('../../custom_components/pv_lab/www/pv-lab-plan-card.js');assert.equal(renderFingerprint({readAt:1,execution:{mode:'fixed'}}),renderFingerprint({readAt:2,execution:{mode:'fixed'}}));assert.notEqual(renderFingerprint({execution:{mode:'finish'}}),renderFingerprint({execution:{mode:'fixed'}}));const x=planChart({cycles:[{start:0,end:2700000}],forecastAt:0,timeline:[{start:0,pvKWh:1,houseKWh:.1,deviceKWh:.2},{start:900000,pvKWh:null,houseKWh:.1,deviceKWh:.2},{start:1800000,pvKWh:1,houseKWh:.1,deviceKWh:.2}]},String);assert.match(x,/kWh/);assert.ok(!x.includes('NaN'));assert.match(x,/Nowe cykle/);assert.match(x,/M10.0,10.0 M210.0,10.0/);});
