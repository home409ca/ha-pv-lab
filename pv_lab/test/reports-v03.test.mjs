import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../src/defaults.mjs';
import {emptyReports,captureReportForecasts,updateReports,reportView} from '../src/reports.mjs';
import {dayBounds} from '../public/presentation.js';
const c={...structuredClone(defaults),location:{latitude:52,longitude:21}},HOUR=3600000,SLOT=900000,start=Date.parse('2026-06-10T10:00:00Z');
const publication=(at,wh)=>({at,providers:c.providers.map(p=>p.id),rows:Array.from({length:4},(_,i)=>({start:start+i*SLOT,wh,sources:c.providers.map((p,j)=>({provider:p.id,originalWh:wh+j*10,rawWh:wh+j*10}))}))});
const samples=Array.from({length:61},(_,i)=>({at:start+i*60000,power:1000,voltages:[230,230,230],status:'On-grid'}));
test('plan na jutro zamraża prognozę przed 20:00, bieżąca korzysta z ostatniej przed godziną',()=>{
  const state=emptyReports();captureReportForecasts(state,publication(Date.parse('2026-06-09T17:59:00Z'),200),c);captureReportForecasts(state,publication(Date.parse('2026-06-09T18:01:00Z'),300),c);captureReportForecasts(state,publication(start-60000,250),c);captureReportForecasts(state,publication(start+60000,900),c);
  updateReports(state,samples,c,start+HOUR+1000);const plan=state.hours['day_ahead|'+start],rolling=state.hours['rolling|'+start];assert.equal(plan.predictions.pv_lab,.8);assert.equal(rolling.predictions.pv_lab,1);assert.ok(Math.abs(plan.actualKWh-1)<1e-8);assert.ok(Math.abs(rolling.actualKWh-1)<1e-8);assert.equal(plan.issued.pv_lab,Date.parse('2026-06-09T17:59:00Z'));
});
test('brak źródła nie jest zerem i nie tworzy wspólnego rankingu; rzeczywista produkcja nadal widoczna',()=>{
  const state=emptyReports(),pub=publication(start-60000,250);pub.rows.forEach(r=>r.sources=r.sources.filter(s=>s.provider!=='solcast'));captureReportForecasts(state,pub,c);updateReports(state,samples,c,start+HOUR+1000);const r=state.hours['rolling|'+start];assert.equal(r.predictions.solcast,null);assert.ok(Math.abs(r.actualKWh-1)<1e-8);assert.deepEqual(state.days['rolling|2026-06-10'].cohorts,{});
});
test('przestój i wysokie napięcie pozostają w raporcie pomiaru; nie dodajemy danych do modelu',()=>{
  const state=emptyReports();captureReportForecasts(state,publication(start-60000,250),c);updateReports(state,samples.map(s=>({...s,voltageFlag:'high'})),c,start+HOUR+1000);const r=state.hours['rolling|'+start];assert.ok(Math.abs(r.actualKWh-1)<1e-8);assert.ok(r.quality.includes('wysokie napięcie'));
});
test('statystyki HA uzupełniają rzeczywistą godzinę bez rekonstrukcji prognozy po fakcie',()=>{
  const state=emptyReports();updateReports(state,[],c,start+HOUR+1000,{[start]:1.2});const r=state.hours['rolling|'+start];assert.equal(r.actualKWh,1.2);assert.equal(r.predictions.pv_lab,null);assert.equal(r.actualSource,'statystyki HA');
});
test('agregacja zachowuje sumę błędów i jest idempotentna po ponownym przeliczeniu',()=>{
  const state=emptyReports();captureReportForecasts(state,publication(start-60000,200),c);updateReports(state,samples,c,start+HOUR+1000);const before=JSON.stringify(reportView(state));updateReports(state,samples,c,start+HOUR+1000);assert.equal(JSON.stringify(reportView(state)),before);const score=Object.values(state.days['rolling|2026-06-10'].cohorts)[0].pv_lab;assert.ok(Math.abs(score.absErrorKWh-.2)<1e-8);assert.equal(score.n,1);
});
test('przenoszenie dni do miesięcy i lat nie dubluje ani nie gubi wkładu po restarcie',()=>{
  const state=emptyReports();captureReportForecasts(state,publication(start-60000,200),c);updateReports(state,samples,c,start+HOUR+1000);
  updateReports(state,[],c,Date.parse('2026-08-20T12:00:00Z'));assert.equal(Object.keys(state.hours).length,0);assert.equal(Object.keys(state.days).length,0);assert.ok(Math.abs(state.months['rolling|2026-06'].actualSum-1)<1e-8);
  const restored=JSON.parse(JSON.stringify(state));updateReports(restored,[],c,Date.parse('2028-08-20T12:00:00Z'));assert.ok(Math.abs(restored.years['rolling|2026'].actualSum-1)<1e-8);updateReports(restored,[],c,Date.parse('2028-08-20T12:00:00Z'));assert.ok(Math.abs(restored.years['rolling|2026'].actualSum-1)<1e-8);assert.ok(Math.abs(restored.years['rolling|2026'].paired.pv_lab.absErrorKWh-.2)<1e-8);
});
test('raport obejmuje 25 osobnych godzin przy jesiennej zmianie czasu',()=>{
  const [a,b]=dayBounds('2026-10-25',c.timezone),state=emptyReports(),at=Date.parse('2026-10-24T17:59:00Z'),ids=c.providers.map(p=>p.id),pub={at,providers:ids,rows:Array.from({length:(b-a)/SLOT},(_,i)=>({start:a+i*SLOT,wh:25,sources:ids.map(provider=>({provider,originalWh:25}))}))},stats=Object.fromEntries(Array.from({length:25},(_,i)=>[a+i*HOUR,.1]));
  captureReportForecasts(state,pub,c);updateReports(state,[],c,b+1000,stats);const day=state.days['day_ahead|2026-10-25'];assert.equal(day.expectedHours,25);assert.equal(day.actualHours,25);assert.equal(day.paired.pv_lab.n,25);assert.equal(day.paired.pv_lab.dailyN,1);
});
test('przeciwne błędy godzinowe nie znikają, nawet jeśli suma doby jest idealna',()=>{
  const [a,b]=dayBounds('2026-06-10',c.timezone),state=emptyReports(),ids=c.providers.map(p=>p.id),pub={at:Date.parse('2026-06-09T17:59:00Z'),providers:ids,rows:Array.from({length:96},(_,i)=>({start:a+i*SLOT,wh:i>=40&&i<44?375:i>=44&&i<48?125:250,sources:ids.map(provider=>({provider,originalWh:250}))}))},stats=Object.fromEntries(Array.from({length:24},(_,i)=>[a+i*HOUR,1]));
  captureReportForecasts(state,pub,c);updateReports(state,[],c,b+1000,stats);const metric=state.days['day_ahead|2026-06-10'].paired.pv_lab;assert.equal(metric.absErrorKWh,1);assert.equal(metric.dailyAbsErrorKWh,0);assert.equal(metric.dailyN,1);
});
