import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,validate,migrateConfig} from '../src/defaults.mjs';
import {defaultPlan,planDevice,validatePlan} from '../src/planner.mjs';
import {forecast,emptyModel} from '../src/engine.mjs';
import {completeDayState} from '../src/day-state.mjs';
import {integrationPayload} from '../src/integration.mjs';
import {localInput,parseLocalInput} from '../public/presentation.js';
const c={...structuredClone(defaults),location:{latitude:52,longitude:21}},t=Date.parse('2026-06-10T10:30:00Z'),SLOT=900000;
function rows(values,start=t){return {fullRows:values.map((wh,i)=>({start:start+i*SLOT,wh}))};}
test('saldo godzinowe plus eksport redukuje niedobór tylko do końca tej godziny',()=>{
  const samples=[{at:t,gridBalance:2,gridBalanceReported:t}],f=rows(Array(12).fill(0)),p={...defaultPlan,baseW:0,energyKWh:1,durationHours:.5,earliest:t,latest:t+3600000};
  const hourly=planDevice(f,samples,c,p,t);assert.equal(hourly.best.start,t);assert.equal(hourly.best.deficitKWh,0);assert.equal(hourly.balance.source,'measured');assert.equal(hourly.balance.netKWh,2);assert.ok(Math.abs(hourly.best.physicalImportKWh-1)<1e-8);
  const later=planDevice(f,samples,c,{...p,earliest:t+1800000,latest:t+3600000},t);assert.equal(later.best.deficitKWh,1);
  const quarter=planDevice(f,samples,c,{...p,mode:'quarterly'},t);assert.equal(quarter.best.deficitKWh,1);assert.equal(quarter.balance.source,'estimated');
});
test('bilansowanie godziny różni się od kwadransów przy tej samej sumie PV',()=>{
  const now=Date.parse('2026-06-10T10:00:00Z'),f=rows([2000,0,0,0],now),p={...defaultPlan,baseW:0,energyKWh:2,durationHours:1,earliest:now,latest:now+3600000},samples=[{at:now,gridBalance:0,gridBalanceReported:now}];
  assert.equal(planDevice(f,samples,c,p,now).best.deficitKWh,0);
  assert.equal(planDevice(f,samples,c,{...p,mode:'quarterly'},now).best.deficitKWh,1.5);
});
test('plan nie obciąża urządzenia niedoborem, który dom ma bez niego',()=>{
  const now=Date.parse('2026-06-10T10:00:00Z'),f=rows([0,0,0,0],now),p={...defaultPlan,baseW:1000,energyKWh:1,durationHours:1,earliest:now,latest:now+3600000};
  const result=planDevice(f,[{at:now,gridBalance:0,gridBalanceReported:now}],c,p,now);assert.equal(result.best.deficitKWh,1);assert.ok(Math.abs(result.best.physicalImportKWh-1)<1e-8);
});
test('stare saldo poprzedniej godziny nie staje się kredytem nowej; braki dzienne blokują okno',()=>{
  const now=Date.parse('2026-06-10T11:00:00Z'),f=rows(Array(4).fill(0),now),p={...defaultPlan,baseW:0,energyKWh:1,durationHours:1,earliest:now,latest:now+3600000},result=planDevice(f,[{at:now,gridBalance:3,gridBalanceReported:now-1000}],c,p,now);
  assert.equal(result.best.deficitKWh,1);assert.equal(result.balance.source,'estimated');assert.equal(planDevice(rows([],now),[],c,p,now).best,null);
});
test('właściwe jednostki i walidacja planu; dodanie pól nie resetuje konfiguracji',()=>{
  assert.throws(()=>validatePlan({...defaultPlan,durationHours:.3}));assert.throws(()=>validatePlan({...defaultPlan,energyKWh:0}));assert.throws(()=>validatePlan({...defaultPlan,entities:{}}));
  const old=structuredClone(defaults);delete old.appliances;delete old.planner;delete old.grid;delete old.reports;const migrated=validate(migrateConfig(old));assert.equal(migrated.planner.energyKWh,4);assert.equal(migrated.planner.profileId,null);assert.equal(migrated.appliances[0].powerEntity,'sensor.gniazdkopomiarpralka_energy_power');
});
test('wieczorem zachowujemy wynik dnia, pozostało zero, okna bez wymyślonych dat',()=>{
  const now=Date.parse('2026-11-11T19:00:00Z'),samples=[{at:now,power:0,dailyEnergy:12.4,voltages:[230,230,230],status:'Standby',optimizers:{}}],ledger={};
  const f=completeDayState(forecast(emptyModel(),[],samples,c,now),samples,c,now,ledger);assert.equal(f.todayKWh,12.4);assert.equal(f.remainingTodayKWh,0);assert.equal(f.remainingHourKWh,0);assert.equal(f.days[0].windows.oneHour,null);assert.equal(f.days[0].windowStatus.oneHour,'produkcja na dziś zakończona');assert.equal(integrationPayload(f,{},c,now).available,true);
  const later=now+3600000,g=completeDayState(forecast(emptyModel(),[],[],c,later),[],c,later,ledger);assert.equal(g.todayKWh,12.4);
});
test('noc przed świtem nie kończy nowego dnia; brak dziennych danych nie udaje zera',()=>{
  const now=Date.parse('2026-06-10T00:00:00Z'),f=completeDayState(forecast(emptyModel(),[],[],c,now),[],c,now,{});assert.equal(f.dayEnded,false);assert.equal(f.todayKWh,null);assert.equal(f.remainingTodayKWh,null);
});
test('daty planowania są lokalne, z walidacją brakującej godziny przy zmianie czasu',()=>{
  assert.equal(localInput(t,c.timezone),'2026-06-10T12:30');assert.equal(parseLocalInput('2026-06-10T12:30',c.timezone),t);assert.throws(()=>parseLocalInput('2026-03-29T02:30',c.timezone));
});

test('dodatnia stara krzywa po zachodzie nie tworzy nocnego okna ani pozostałej produkcji',()=>{
  const now=Date.parse('2026-11-11T19:00:00Z'),f=forecast(emptyModel(),[{at:now-60000,provider:'solcast',rows:Array.from({length:12},(_,i)=>({start:now+i*SLOT,wh:500}))}],[],c,now);
  completeDayState(f,[],c,now,{});assert.equal(f.remainingTodayKWh,0);assert.equal(f.days[0].windows.oneHour,null);assert.ok(f.fullRows.every(r=>r.wh===0));
});
