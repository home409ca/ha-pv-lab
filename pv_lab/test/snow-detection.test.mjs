import test from 'node:test';import assert from 'node:assert/strict';
import {snowDefaults,snowSettings,clearSnow,snowWeather,freshSnowMeasurements,snowWindow,snowCandidate,detectSnow,applySnow} from '../src/snow-detection.mjs';
import {defaults} from '../src/defaults.mjs';
import {forecast} from '../src/forecast.mjs';import {emptyModel} from '../src/engine.mjs';
const Q=900000,H=3600000;
function fixture(at='2026-12-15T11:00:00Z'){
 const now=Date.parse(at),c=structuredClone(defaults);c.location={latitude:52,longitude:21};
 const rows=Array.from({length:200},(_,i)=>({start:Math.floor((now-2*H)/Q)*Q+i*Q,wh:250,staticWh:250,sources:[{rawWh:250},{rawWh:250}]}));
 const samples=Array.from({length:61},(_,i)=>({at:now-H+i*60000,power:0,status:'On-grid',voltageFlag:'normal',snowFresh:true}));
 return {now,c,rows,samples,state:snowDefaults()};
}
test('winter hour of healthy near-zero production activates same-day suspected snow with two sources',()=>{const x=fixture(),s=detectSnow(x.state,x.samples,x.rows,x.c,x.now);assert.equal(s.active,true);assert.equal(s.factor,.1);assert.deepEqual(s.excludedDays,['2026-12-15']);assert.equal(s.window.coveredMinutes,60);assert.match(s.reason,/nie jest potwierdzona/);assert.equal(s.until,null);});
test('no trigger with missing data, stale power, gaps, abnormal status or high voltage',()=>{
 for(const mutate of [x=>x.samples.forEach(s=>s.power=null),x=>x.samples.forEach(s=>s.snowFresh=false),x=>x.samples.splice(10,20),x=>x.samples.forEach(s=>s.status='Standby'),x=>x.samples.forEach(s=>s.voltageFlag='high'),x=>x.samples.forEach(s=>s.voltageFlag='missing'),x=>x.samples.splice(-4)]){
  const x=fixture();mutate(x);assert.equal(detectSnow(x.state,x.samples,x.rows,x.c,x.now).active,false);
 }
});
test('night, dawn, little expected energy and short observations cannot activate snow correction',()=>{
 for(const change of [x=>x.now=Date.parse('2026-12-15T01:00:00Z'),x=>x.rows.forEach(r=>r.staticWh=20),x=>x.samples.splice(0,31),x=>x.samples.forEach(s=>s.power=100)]){
  const x=fixture();change(x);assert.equal(detectSnow(x.state,x.samples,x.rows,x.c,x.now).active,false);
 }
});
test('one source without weather and ordinary summer mismatch do not become snow',()=>{let x=fixture();x.rows.forEach(r=>r.sources=[{rawWh:250}]);assert.equal(detectSnow(x.state,x.samples,x.rows,x.c,x.now).active,false);x.samples.forEach(s=>s.weather={temperature:0,snowing:false});assert.equal(detectSnow(x.state,x.samples,x.rows,x.c,x.now).factor,.05);x=fixture('2026-06-15T11:00:00Z');assert.equal(detectSnow(x.state,x.samples,x.rows,x.c,x.now).active,false);x.samples.forEach(s=>s.weather={temperature:0,snowing:true});assert.equal(detectSnow(x.state,x.samples,x.rows,x.c,x.now).active,true);});
test('manual disabling survives recalculation, restart and cannot silently re-enable',()=>{const x=fixture(),on=detectSnow(x.state,x.samples,x.rows,x.c,x.now),off=snowSettings(on,{enabled:false,weatherEntity:''});assert.equal(detectSnow(JSON.parse(JSON.stringify(off)),x.samples,x.rows,x.c,x.now).active,false);assert.equal(off.factor,1);assert.throws(()=>snowSettings(on,{enabled:'false',weatherEntity:''}));assert.throws(()=>snowSettings(on,{enabled:true,weatherEntity:'sensor.bad'}));});
test('confirmed production recovery lifts limitation gradually; gaps never indicate recovery',()=>{
 const x=fixture(),on=detectSnow(x.state,x.samples,x.rows,x.c,x.now);
 const returned=x.samples.map(s=>({...s,power:400})),partial=detectSnow(on,returned,x.rows,x.c,x.now);assert.equal(partial.active,true);assert.ok(Math.abs(partial.factor-.4)<1e-9);
 assert.equal(detectSnow(partial,returned.map(s=>({...s,power:800})),x.rows,x.c,x.now).active,false);
 const noData=detectSnow(on,[],x.rows,x.c,x.now+60000);assert.equal(noData.active,true);assert.match(noData.reason,/Brak wiarygodnych/);
 const next=detectSnow(on,[],x.rows,x.c,x.now+24*H);assert.equal(next.active,true);assert.equal(next.factor,.1);assert.ok(next.excludedDays.includes('2026-12-16'));const cleared=clearSnow(next,x.now+24*H);assert.equal(detectSnow(cleared,x.samples,x.rows,x.c,x.now+24*H).active,false);
});
test('absolute snow ceiling avoids duplicate live/grid/manual deductions, preserves past and carries unresolved obstruction into tomorrow',()=>{
 const x=fixture(),s=detectSnow(x.state,x.samples,x.rows,x.c,x.now);const rows=[{start:x.now-Q,staticWh:250,wh:75},{start:x.now,staticWh:250,wh:75},{start:x.now+Q,staticWh:250,wh:10},{start:x.now+24*H,staticWh:250,wh:250}];
 const result=applySnow(rows,s,x.c,x.now);assert.deepEqual(rows.map(r=>r.wh),[75,25,10,25]);assert.equal(result.reducedKWh,.275);assert.equal(result.changedQuarters,2);
 const second=applySnow(rows,s,x.c,x.now);assert.equal(second.reducedKWh,0);assert.equal(rows[1].wh,25);
});
test('weather is optional, fresh, unit-aware and read only from selected entity',()=>{
 const x=fixture(),row={last_reported:new Date(x.now).toISOString(),state:'snowy',attributes:{temperature:32,temperature_unit:'°F'}},states=new Map([['weather.home',row]]);
 assert.equal(snowWeather(states,'',x.now),null);assert.equal(snowWeather(states,'weather.home',x.now).temperature,0);assert.equal(snowWeather(states,'weather.home',x.now).snowing,true);assert.equal(snowWeather(states,'weather.home',x.now+4*H),null);
 for(const id of [x.c.entities.power,x.c.entities.status,...x.c.entities.voltages])states.set(id,row);assert.equal(freshSnowMeasurements(states,x.c,x.now),true);states.delete(x.c.entities.power);assert.equal(freshSnowMeasurements(states,x.c,x.now),false);
});
test('candidate exclusion starts before calibration, requires real fresh daylight measurements',()=>{const x=fixture();assert.equal(snowCandidate(x.samples.at(-1),x.rows,x.c,x.state),true);assert.equal(snowCandidate({...x.samples.at(-1),power:null},x.rows,x.c,x.state),false);assert.equal(snowCandidate({...x.samples.at(-1),voltageFlag:'high'},x.rows,x.c,x.state),false);});
test('full forecast applies snow to final energy and windows without rewriting provider forecasts; tomorrow is cautious until resolved',()=>{
 const x=fixture(),snapshots=['forecast_solar','open_meteo'].map(provider=>({provider,at:x.now-H,rows:x.rows.map(r=>({start:r.start,wh:250}))}));
 const normal=forecast(emptyModel(),snapshots,x.samples,{...x.c,snowState:{...x.state,enabled:false}},x.now),snow=forecast(emptyModel(),snapshots,x.samples,{...x.c,snowState:x.state},x.now);
 assert.equal(snow.snowCorrection.active,true);assert.ok(snow.remainingTodayKWh<normal.remainingTodayKWh);assert.equal(snow.fullRows.find(r=>r.start===x.now).wh,25);
 assert.deepEqual(snow.providerDays,normal.providerDays);assert.ok(snow.fullRows.find(r=>r.start===x.now+24*H).wh<normal.fullRows.find(r=>r.start===x.now+24*H).wh);
 assert.ok(snow.days[0].windows.twoHours.kWh<normal.days[0].windows.twoHours.kWh);
});

test('Auto ranks the corrected forecast with the same load and cheap tariff',async()=>{
 const {planUnified,migrateUnified}=await import('../src/unified-planner.mjs'),{batchDefaults}=await import('../src/batch-planner.mjs'),{optimizerDefaults}=await import('../src/optimizer-settings.mjs'),{emptyLoad}=await import('../src/optimizer-load.mjs');
 const x=fixture(),library={profiles:[]},optimizer=optimizerDefaults(x.c,library);optimizer.load.baseW=300;optimizer.load.uncertainty=0;optimizer.tariff.cheapWeekends=false;optimizer.tariff.holidays=false;optimizer.tariff.winterOffPeak=[[780,900]];
 optimizer.tariff.versions[0].energyNight.value=.68;optimizer.tariff.versions[0].energyDay.value=1.3;
 const settings=migrateUnified(batchDefaults(x.c,library),optimizer,x.c,library);settings.preset='custom';settings.earliest=x.now;settings.latest=x.now+5*H;settings.entries.forEach(e=>e.count=0);settings.entries[1].count=1;
 const snapshots=['forecast_solar','open_meteo'].map(provider=>({provider,at:x.now-H,rows:x.rows.map(r=>({start:r.start,wh:250}))})),f=forecast(emptyModel(),snapshots,x.samples,{...x.c,snowState:x.state},x.now);
 const result=planUnified(f,x.samples,x.c,settings,optimizer,emptyLoad(),null,new Map(),{},library,x.now,null,{auto:true}),best=result.autoPlans[0];
 assert.equal(f.snowCorrection.active,true);assert.equal(best.schedule.startsAt,Date.parse('2026-12-15T12:00:00Z'));assert.ok(best.schedule.additionalImportKWh>0);assert.equal(best.schedule.devices,best.schedule.requested);
});

test('several snow-covered mornings never re-expose uncorrected PV, but clear requires new evidence',()=>{
 const x=fixture();let state=detectSnow(x.state,x.samples,x.rows,x.c,x.now);
 for(let d=1;d<=4;d++){const now=x.now+d*24*H;state=detectSnow(JSON.parse(JSON.stringify(state)),[],x.rows,x.c,now);const row={start:now,staticWh:250,wh:250};applySnow([row],state,x.c,now);assert.equal(row.wh,25);assert.equal(state.active,true);}
 const cleared=clearSnow(state,x.now+4*24*H);assert.equal(detectSnow(cleared,x.samples,x.rows,x.c,x.now+4*24*H).active,false);assert.equal(cleared.monitorFrom,x.now+4*24*H);
});
