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

test('new card parameters validate colors and geometry, chart and reference toggles',()=>{const c=cardOptions();assert.equal(c.show_reference_plans,true);assert.equal(c.show_plan_chart,true);assert.equal(c.device_button_height,36);for(const v of [{device_color:'red'},{auto_color:'url(evil)'},{device_button_height:0},{show_plan_chart:1},{show_reference_plans:'no'}])assert.throws(()=>cardOptions(v));assert.equal(cardOptions({device_color:'#aAbB12',device_button_height:28}).device_button_height,28);});
test('unchanged status timestamps do not rebuild card and timeline chart preserves missing values',async()=>{const {renderFingerprint,planChart}=await import('../../custom_components/pv_lab/www/pv-lab-plan-card.js');assert.equal(renderFingerprint({readAt:1,execution:{mode:'fixed'}}),renderFingerprint({readAt:2,execution:{mode:'fixed'}}));assert.notEqual(renderFingerprint({execution:{mode:'finish'}}),renderFingerprint({execution:{mode:'fixed'}}));const x=planChart({cycles:[{start:0,end:2700000}],forecastAt:0,timeline:[{start:0,pvKWh:1,houseKWh:.1,deviceKWh:.2},{start:900000,pvKWh:null,houseKWh:.1,deviceKWh:.2},{start:1800000,pvKWh:1,houseKWh:.1,deviceKWh:.2}]},String,0);assert.match(x,/kWh/);assert.ok(!x.includes('NaN'));assert.match(x,/Urządzenia/);assert.match(x,/M40.0,15.0 L130.0,15.0 M220.0,15.0/);});

test('reference labels are short, always visible and replace only identical full normal schedules',async()=>{
 const {visibleCardPlans}=await import('../../custom_components/pv_lab/www/pv-lab-plan-card.js');
 const plan=(id,start=1000)=>({id,complete:true,cycles:[{powerEntity:'sensor.washer',start,end:start+1000,energyKWh:1,profileSource:'typical'}]}),normal=plan('p0'),cheap={...plan('ref1'),kind:'cheap',label:'Old label'},peak={...plan('ref2',4000),kind:'peak'};
 const state={proposals:[normal,plan('p1',6000)],references:[cheap,peak]};
 let rows=visibleCardPlans(state,3);assert.deepEqual(rows.map(p=>p.id),['ref1','p1','ref2']);assert.deepEqual(rows.filter(p=>p.kind).map(p=>p.label),['Start tania strefa','Start szczyt PV']);
 rows=visibleCardPlans(state,1);assert.deepEqual(rows.map(p=>p.id),['ref1','ref2']);assert.equal(cardOptions({show_reference_plans:false}).show_reference_plans,true);
 state.references[1].cycles[0].start=1000;state.references[1].cycles[0].end=2000;rows=visibleCardPlans(state,3);assert.equal(rows.length,2);assert.match(rows[0].label,/Start tania strefa.*Start szczyt PV/);
 state.approved=true;state.approvedId='p0';rows=visibleCardPlans(state,3);assert.equal(rows[0].id,'p0');assert.match(rows[0].label,/Start tania strefa/);
 state.approvedId='ref2';assert.equal(visibleCardPlans(state,3)[0].id,'ref2');
});
test('same initial start alone does not merge different cycles, counts, durations or energy; incomplete references survive',async()=>{
 const {visibleCardPlans}=await import('../../custom_components/pv_lab/www/pv-lab-plan-card.js');const cycle={powerEntity:'sensor.washer',start:1000,end:2000,energyKWh:1},normal={id:'p0',complete:true,cycles:[cycle]};
 for(const cycles of [[{...cycle,end:3000}],[{...cycle,energyKWh:2}],[cycle,{...cycle,start:2000,end:3000}],[{...cycle,powerEntity:'sensor.dishwasher'}]])assert.equal(visibleCardPlans({proposals:[normal],references:[{id:'r',kind:'peak',complete:true,cycles}]}).length,2);
 assert.equal(visibleCardPlans({proposals:[normal],references:[{id:'r',kind:'cheap',complete:false,cycles:[]},{id:'q',kind:'peak',complete:false,cycles:[]}]}).length,3);
});

test('program variant controls have configurable visibility and placement',()=>{assert.equal(cardOptions().show_program_variants,true);assert.equal(cardOptions().program_variants_position,'below_devices');assert.equal(cardOptions({show_program_variants:false,program_variants_position:'details'}).show_program_variants,false);assert.throws(()=>cardOptions({program_variants_position:'footer'}));assert.throws(()=>cardOptions({show_program_variants:'true'}));});

test('program buttons expose duration/energy toggles and optional dropdown style',async()=>{const {programDuration,programChoices}=await import('../../custom_components/pv_lab/www/pv-lab-plan-card.js');assert.equal(cardOptions().program_variants_style,'buttons');assert.equal(cardOptions().show_program_duration,true);assert.equal(cardOptions().show_program_energy,true);assert.equal(programDuration(75),'1 h 15 min');assert.equal(programDuration(60),'1 h');assert.equal(programChoices().length,3);for(const input of [{program_variants_style:'bad'},{show_program_duration:0},{show_program_energy:'false'}])assert.throws(()=>cardOptions(input));});


test('named tariff/peak comparison participates in ranking rather than appended after expensive normal plans',async()=>{
 const {visibleCardPlans}=await import('../../custom_components/pv_lab/www/pv-lab-plan-card.js');const p=(id,cost,start)=>({id,cost,start,complete:true,surplusKWh:0,pessimisticCost:cost,cycles:[{deviceId:'dish',start,end:start+3600000,energyKWh:.91}]});
 const state={proposals:[p('p0',.53,0),p('p1',.69,100000),p('p2',.76,200000)],references:[{...p('r0',.62,300000),kind:'cheap'},{...p('r1',.62,300000),kind:'peak',peakKWh:1.2}]};const rows=visibleCardPlans(state);assert.deepEqual(rows.map(p=>p.cost),[.53,.62,.69,.76]);assert.match(rows[1].label,/Start tania strefa.*Start szczyt PV/);assert.equal(rows[1].peakKWh,1.2);
});

test('card defaults are empty and configurable without modifying an armed request',async()=>{
 assert.deepEqual(cardOptions().default_cycles,{zmywarka:0,pralka:0});assert.deepEqual(cardOptions({default_cycles:{zmywarka:1}}).default_cycles,{zmywarka:1,pralka:0});for(const default_cycles of [null,[],{pralka:4},{dryer:1},{pralka:'1'}])assert.throws(()=>cardOptions({default_cycles}));
 const {PVLabPlanCard}=await import('../../custom_components/pv_lab/www/pv-lab-plan-card.js'),card=Object.create(PVLabPlanCard.prototype);Object.assign(card,{_config:cardOptions(),_sequence:0,_busy:false,_dirty:false,_usingDefaults:true,_request:{},render(){},async call(){return {defaults:{counts:{zmywarka:1,pralka:0},range:'tomorrow'},programs:{}};}});await card.status();assert.deepEqual(card._request.counts,{zmywarka:0,pralka:0});card.call=async()=>({approved:true,request:{counts:{zmywarka:2,pralka:0},range:'today',goal:'cost'}});await card.status();assert.equal(card._request.counts.zmywarka,2);
});


test('elapsed cheap and peak references disappear, active windows and approved execution remain visible',async()=>{
 const {visibleCardPlans}=await import('../../custom_components/pv_lab/www/pv-lab-plan-card.js'),H=3600000,now=12.75*H;
 const state={proposals:[],references:[{id:'peak',kind:'peak',referenceStart:11*H,windowEnd:12*H,complete:false,cycles:[]},{id:'cheap',kind:'cheap',referenceStart:13*H,windowEnd:15*H,complete:false,cycles:[]}]};
 assert.deepEqual(visibleCardPlans(state,3,now).map(p=>p.id),['cheap']);assert.equal(visibleCardPlans(state,3,13.5*H).length,1);assert.equal(visibleCardPlans(state,3,15*H).length,0);
 state.approved=true;state.approvedId='peak';assert.equal(visibleCardPlans(state,3,now)[0].id,'peak');
});
