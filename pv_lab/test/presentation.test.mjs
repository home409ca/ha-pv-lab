import test from 'node:test';
import assert from 'node:assert/strict';
import {dayBounds,hourlyRows,forecastSeries} from '../public/presentation.js';
import {calibrationStatus} from '../src/calibration-status.mjs';
import {voltageHistory} from '../src/voltage-history.mjs';
import {energyStatus} from '../src/energy-status.mjs';
import {defaults} from '../src/defaults.mjs';
import {emptyModel,train} from '../src/engine.mjs';
const c=structuredClone(defaults),zone=c.timezone,t=Date.parse('2026-06-10T10:00:00Z'),SLOT=900000;
const row=start=>({start,rawWh:250,wh:200,sources:[{provider:'solcast',rawWh:250}]}),sample=at=>({at,power:800,voltages:[230,230,230],voltageFlag:'normal',status:'On-grid',optimizers:{}});
test('oś doby i tabela zachowują 23/24/25 godzin, nie scalają powtórzonej godziny',()=>{
  for(const [day,hours] of [['2026-03-29',23],['2026-06-10',24],['2026-10-25',25]]){const [start,end]=dayBounds(day,zone),rows=Array.from({length:hours*4},(_,i)=>row(start+i*SLOT)),table=hourlyRows(rows,day,zone,start);assert.equal(end-start,hours*3600000);assert.equal(table.length,hours);assert.ok(Math.abs(table.reduce((s,r)=>s+r.kWh,0)-hours*.8)<1e-9);assert.equal(new Set(table.map(r=>r.start)).size,hours);}
  assert.throws(()=>dayBounds('2026-02-31',zone));
});
test('godziny mają energię dostawcy, po korekcie i pozostałą; luka nie udaje zera',()=>{
  const rows=Array.from({length:4},(_,i)=>row(t+i*SLOT)),hour=hourlyRows(rows,'2026-06-10',zone,t+30*60000).find(r=>r.start===t);
  assert.equal(hour.rawKWh,1);assert.equal(hour.kWh,.8);assert.equal(hour.remainingKWh,.4);assert.equal(hour.providers[0].kWh,1);
  const incomplete=hourlyRows(rows.slice(1),'2026-06-10',zone,t).find(r=>r.start===t);assert.equal(incomplete.kWh,null);assert.equal(incomplete.rawKWh,null);assert.equal(incomplete.periods,3);
});
test('identyczne krzywe zachowują szeroki ślad źródła; przełącznik ukrywa tylko wybraną',()=>{
  const r={...row(t),wh:250},series=forecastSeries([r],[sample(t)]);assert.equal(series[0].points[0].y,series[1].points[0].y);assert.ok(series[0].width>series[1].width);assert.equal(series[0].dashed,true);
  assert.equal(forecastSeries([r],[],{raw:false}).length,2);
});
test('wykres porównuje oddzielnych dostawców z PV Lab i nie wypełnia luk zerami',()=>{
  const definitions=c.providers,rows=[{...row(t),sources:[{provider:'forecast_solar',originalWh:2000,rawWh:1375},{provider:'open_meteo',originalWh:600,rawWh:600},{provider:'solcast',originalWh:700,rawWh:700}]},{...row(t+SLOT),sources:[{provider:'solcast',originalWh:800,rawWh:800}]}];
  const lines=forecastSeries(rows,[],{raw:false,measured:false},definitions);
  assert.equal(lines.length,4);assert.equal(lines.find(s=>s.provider==='forecast_solar').points[0].y,8000);
  assert.equal(lines.find(s=>s.provider==='open_meteo').points[1].y,null);
  assert.equal(lines.find(s=>s.label==='PV Lab — po korektach').points[0].y,800);
  assert.equal(new Set(lines.map(s=>s.color)).size,4);
  const limited=forecastSeries(rows,[],{raw:false,measured:false,basis:'limited'},definitions);
  assert.equal(limited.find(s=>s.provider==='forecast_solar').points[0].y,5500);
  assert.equal(limited.find(s=>s.label==='PV Lab — po korektach').points[0].y,800);
});
test('wyłączenie dostawcy na wykresie nie zmienia PV Lab ani danych obliczeń',()=>{
  const rows=[{...row(t),sources:[{provider:'solcast',originalWh:900,rawWh:900}]}],before=JSON.stringify(rows),options={raw:false,measured:false,providers:{forecast_solar:false,open_meteo:false,solcast:false}};
  const lines=forecastSeries(rows,[],options,c.providers);assert.equal(lines.length,1);assert.equal(lines[0].label,'PV Lab — po korektach');assert.equal(JSON.stringify(rows),before);
  assert.equal(forecastSeries(rows,[],{...options,corrected:false},c.providers).length,0);
});
test('kalibracja pokazuje brak wcześniejszej prognozy oraz wykluczenia pomiarów',()=>{
  const samples=Array.from({length:16},(_,i)=>sample(t+i*60000)),now=t+SLOT+1000;
  const status=calibrationStatus(emptyModel(),samples,[],c,now);assert.equal(status.lastInterval.coverage,1);assert.ok(status.blockers.some(r=>r.includes('przed jego rozpoczęciem')));
  const missing=calibrationStatus(emptyModel(),samples.map(s=>({...s,voltageFlag:'missing'})),[],c,now);assert.ok(missing.lastInterval.reasons.includes('brak napięcia'));assert.equal(missing.measuredStatus,'On-grid');
  const m=emptyModel();train(m,samples,[],c,now);assert.equal(m.evaluated,0);assert.equal(m.excluded['brak prognozy zapisanej przed kwadransem'],1);
});
test('poprawny pełny kwadrans uruchamia porównanie; noc jest wyjaśniona',()=>{
  const samples=Array.from({length:16},(_,i)=>sample(t+i*60000)),snaps=[{at:t-60000,provider:'solcast',rows:[row(t),row(t+SLOT)]}],now=t+SLOT+1000,m=emptyModel();train(m,samples,snaps,c,now);assert.equal(m.evaluated,1);assert.equal(calibrationStatus(m,samples,snaps,c,now).blockers.length,0);
  snaps[0].rows[0].wh=0;assert.ok(calibrationStatus(m,samples,snaps,c,now).blockers.some(s=>s.includes('20 Wh')));
});
test('historia napięć czyta tylko wybrany dzień i trzy encje, zachowuje luki',async()=>{
  let query;const ha={request:async path=>{query=path;return [[{entity_id:c.entities.voltages[0],state:'230',last_changed:new Date(t-3600000).toISOString(),attributes:{unit_of_measurement:'V'}},{entity_id:c.entities.voltages[0],state:'unavailable',last_changed:new Date(t).toISOString(),attributes:{unit_of_measurement:'V'}}]];}};
  const result=await voltageHistory(ha,c,'2026-06-10',t+3600000);assert.equal(result.series.length,3);assert.equal(result.series[0].points.at(-1).y,null);assert.equal(result.series[1].points.length,0);assert.ok(query.includes(encodeURIComponent(c.entities.voltages.join(','))));assert.equal(result.end-result.start,86400000);
  await assert.rejects(()=>voltageHistory(ha,c,'2026-06-11',t),/Wybierz/);await assert.rejects(()=>voltageHistory(ha,c,'2020-06-11',t),/Wybierz/);
});
test('stałe napięcie z historii trwa do końca odczytu, bez odcinka w przyszłości',async()=>{
  const ha={request:async()=>[[{entity_id:c.entities.voltages[0],state:'231',last_changed:new Date(t).toISOString(),attributes:{unit_of_measurement:'V'}}]]};
  const result=await voltageHistory(ha,c,'2026-06-10',t+60000);assert.deepEqual(result.series[0].points.at(-1),{x:t+60000,y:231});
});
test('diagnostyka Energii rozróżnia platformę, wybraną integrację i przekazane godziny',async()=>{
  const ha={request:async()=>[{domain:'pv_lab',entry_id:'abc',title:'PV Lab',state:'loaded',data:{secret:'PRIVATE'}}],websocket:async cmd=>({'energy/info':{solar_forecast_domains:['pv_lab']},'energy/get_prefs':{energy_sources:[{type:'solar',config_entry_solar_forecast:['abc']}]},'energy/solar_forecast':{abc:{wh_hours:{'2026-06-10T10:00:00Z':800}}}}[cmd.type])};
  const result=await energyStatus(ha);assert.equal(result.platformAvailable,true);assert.equal(result.entries[0].selected,true);assert.equal(result.entries[0].hours,1);assert.ok(!JSON.stringify(result).includes('PRIVATE'));
});
