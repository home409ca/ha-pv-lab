import test from 'node:test';
import assert from 'node:assert/strict';
// Only the share calculation is invoked; no simulated browser or HA state is used.
globalThis.HTMLElement=class {};
globalThis.customElements={get:()=>true};
globalThis.window={customCards:[]};
const {energyShare,nextCycleCount}=await import('../../custom_components/pv_lab/www/pv-lab-plan-card.js');
test('dashboard bar reports 80/20 after settlement, not sum of independently planned cycles',()=>{assert.deepEqual(energyShare({cycles:[{energyKWh:1},{energyKWh:2}],importKWh:.6}),{green:80,orange:20});});
test('dashboard bar handles full solar, full purchase, and missing values distinctly',()=>{assert.deepEqual(energyShare({cycles:[{energyKWh:1}],importKWh:0}),{green:100,orange:0});assert.deepEqual(energyShare({cycles:[{energyKWh:1}],importKWh:2}),{green:0,orange:100});for(const p of [{cycles:[],importKWh:0},{cycles:[{}],importKWh:0},{cycles:[{energyKWh:1}],importKWh:null}])assert.equal(energyShare(p),null);});

test('appliance taps cycle 0 to 3 then clear without a separate reset button',()=>{let n=0;const values=[];for(let i=0;i<8;i++){n=nextCycleCount(n);values.push(n);}assert.deepEqual(values,[1,2,3,0,1,2,3,0]);assert.equal(nextCycleCount(8),0);});
