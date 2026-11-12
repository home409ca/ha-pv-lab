import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,validate,migrateConfig} from '../src/defaults.mjs';
import {clearSkyHour,clearSkyPowers,solarHour,irradiance} from '../src/clear-sky.mjs';
import {geometryKey,createHistoricalProfile,historicalDay,applyHistoricalProfile,makeHistoryArchive,quantile} from '../src/historical-profile.mjs';
import {dayBounds} from '../public/presentation.js';
import {importStatistics} from '../src/statistics.mjs';
const H=3600000,D=86400000,now=Date.parse('2026-11-12T17:00:00Z'),c={...structuredClone(defaults),location:{latitude:52.23,longitude:21.01}},target=Date.parse('2026-06-10T10:00:00Z');
function archive(){const rows=[];for(const year of [2023,2024,2025])for(let offset=-15;offset<=15;offset++){const date=new Date(Date.UTC(year,5,10,12)+offset*D).toISOString().slice(0,10),[a,b]=dayBounds(date,c.timezone);for(let at=a;at<b;at+=H)rows.push([at,clearSkyHour(at,'total',c)*.8,'unknown']);}return {version:1,geometry:geometryKey(c),at:now,channels:{total:{...c.statistics.channels[0],rows,invalid:0}}};}
const source=archive(),profile=createHistoricalProfile(source,c,now);
test('clear-sky reference respects night, two orientations and the shared AC inverter cap',()=>{
 const midnight=Date.parse('2026-06-10T22:00:00Z');assert.equal(clearSkyHour(midnight,'total',c),0);assert.equal(clearSkyHour(target,'total',{...c,location:{latitude:null,longitude:null}}),null);
 const enlarged={...c,strings:c.strings.map(s=>({...s,panelW:2000}))},power=clearSkyPowers(target,enlarged);assert.equal(power.total,5500);assert.ok(Math.abs(Object.values(power.ac).reduce((a,b)=>a+b,0)-5500)<1e-8);
 assert.ok(clearSkyHour(Date.parse('2026-06-10T06:00:00Z'),'pv2',c)>clearSkyHour(Date.parse('2026-06-10T06:00:00Z'),'pv1',c));assert.ok(irradiance(target,c.location).ghi>0);
});
test('history has distinct maximum, percentile, median, years and normalized attainable energy',()=>{
 const row=profile.hour('total',target);assert.ok(row.days>=60);assert.equal(row.brightYears,3);assert.equal(row.eligible,true);assert.ok(Math.abs(row.attainableKWh-row.clearKWh*.8)<1e-8);assert.ok(row.maxKWh>=row.p95KWh&&row.p95KWh>=row.medianKWh);assert.ok(row.confidence>0&&row.confidence<=.8);assert.equal(quantile([1,2,3],.5),2);
});
test('soft correction touches only an excessive already-calibrated result and never source series',()=>{
 const rows=Array.from({length:4},(_,i)=>({start:target+i*900000,wh:1375,rawWh:1375,staticWh:1375}));applyHistoricalProfile(rows,profile,c);assert.ok(rows.every(r=>r.historyFactor<1&&r.historyFactor>=.75));assert.ok(rows.every(r=>r.rawWh===1375&&r.beforeHistoryWh===1375));
 const low=Array.from({length:4},(_,i)=>({start:target+i*900000,wh:100}));applyHistoricalProfile(low,profile,c);assert.ok(low.every(r=>r.wh===100&&r.historyFactor===1));
 const disabled=structuredClone(rows);disabled.forEach(r=>r.wh=1375);applyHistoricalProfile(disabled,profile,{...c,historyProfile:{...c.historyProfile,enabled:false}});assert.ok(disabled.every(r=>r.wh===1375));
});
test('insufficient years, unknown energy basis and changed geometry prevent correction',()=>{
 const changed=createHistoricalProfile(source,{...c,inverter:{...c.inverter,limitW:5000}},now);assert.equal(changed.hour('total',target).eligible,false);
 const oneYear=structuredClone(source);oneYear.channels.total.rows=oneYear.channels.total.rows.filter(r=>new Date(r[0]).getUTCFullYear()===2025);assert.equal(createHistoricalProfile(oneYear,c,now).hour('total',target).eligible,false);
 const unknown=structuredClone(source);unknown.channels.total.basis='unknown';const cx=structuredClone(c);cx.statistics.channels[0].basis='unknown';assert.equal(createHistoricalProfile(unknown,cx,now).hour('total',target).eligible,false);
});
test('known exclusions, validFrom and future observations are respected',()=>{
 const cut={...c,historyProfile:{...c.historyProfile,validFrom:'2025-01-01',excluded:[{channel:'total',from:'2025-05-01',to:'2025-06-30'}]}};assert.equal(createHistoricalProfile(source,cut,now).hour('total',target).days,0);
 const future=structuredClone(source);future.channels.total.rows.push([target+1000*D,999,'unknown']);assert.ok(createHistoricalProfile(future,c,now).summary.channels[0].rejected>0);
});
test('hourly archive deduplicates, removes corrected ranges and never retains raw counter states',()=>{
 const ch=[c.statistics.channels[0]],data={[ch[0].statisticId]:[{start:target/1000,change:1},{start:target/1000,change:2},{start:(target+H)/1000,change:-1},{start:(target+2*H)/1000,change:100}]};
 const first=makeHistoryArchive(data,ch,c,target,target+3*H);assert.equal(first.channels.total.rows.length,1);assert.equal(first.channels.total.rows[0][1],2);assert.equal(first.channels.total.estimated,false);
 const next=makeHistoryArchive({[ch[0].statisticId]:[]},ch,c,target,target+H,first);assert.equal(next.channels.total.rows.length,0);assert.ok(!JSON.stringify(first).includes('last_updated'));
});
test('whole-installation profile uses measured total rather than summed independent string maxima',()=>{
 const data=structuredClone(source);data.channels.pv1={...c.statistics.channels[1],confirmed:true,basis:'AC',rows:source.channels.total.rows.map(([at,k,q])=>[at,k*2,q])};
 const cx=structuredClone(c);cx.statistics.channels[1]={...cx.statistics.channels[1],confirmed:true,basis:'AC'};const p=createHistoricalProfile(data,cx,now);assert.equal(p.hour('total',target).maxKWh,profile.hour('total',target).maxKWh);
});
test('solar grouping is independent of local summer/winter clock offset; presentation retains 25 hours',()=>{
 assert.equal(historicalDay(profile,'2026-10-25',c).rows[0].hours.length,25);
 const winter=Date.parse('2026-10-25T00:00:00Z'),next=winter+H;assert.ok(Math.abs(solarHour(next,c.location.longitude)-solarHour(winter,c.location.longitude)-1)<.01);
});
test('all-history import discovers monthly beginning and reads hours only in 30-day chunks',async()=>{
 const calls=[],end=Math.floor(Date.now()/H)*H,first=end-40*D,ha={metadata:async ids=>ids.map(statistic_id=>({statistic_id,has_sum:true,statistics_unit_of_measurement:'kWh'})),statistics:async(ids,start,to,period='hour')=>{calls.push({start,to,period});return {[ids[0]]:period==='month'?[{start:first/1000,change:1}]:[{start:start/1000,change:.1}]};}};
 const report=await importStatistics(ha,c,'all');assert.equal(calls[0].period,'month');assert.ok(calls.slice(1).every(call=>call.period==='hour'&&call.to-call.start<=30*D));assert.equal(report.historyArchive.channels.total.rows.length,2);assert.equal(report.start,first);
});
test('historical configuration validates ranges, dates and excluded channels',()=>{
 const base=migrateConfig(structuredClone(defaults));assert.equal(validate(base).historyProfile.windowDays,31);assert.throws(()=>validate({...base,historyProfile:{...base.historyProfile,windowDays:30}}));assert.throws(()=>validate({...base,historyProfile:{...base.historyProfile,validFrom:'2026-02-30'}}));assert.throws(()=>validate({...base,historyProfile:{...base.historyProfile,excluded:[{channel:'bogus',from:'2020-01-01',to:'2020-02-01'}]}}));
});
test('December and January from one winter are not two independent historical seasons',()=>{
 const rows=[];for(let at=Date.parse('2024-12-20T00:00:00Z');at<Date.parse('2025-01-10T00:00:00Z');at+=H)rows.push([at,clearSkyHour(at,'total',c)*.8,'unknown']);
 const winter={version:1,geometry:geometryKey(c),at:now,channels:{total:{...c.statistics.channels[0],rows,invalid:0}}},p=createHistoricalProfile(winter,c,now),ref=p.hour('total',Date.parse('2026-01-01T11:00:00Z'));
 assert.equal(ref.years.length,2);assert.equal(ref.brightYears,1);assert.equal(ref.eligible,false);
});
test('known bad daylight hours exclude bright reference days while zero night standby is allowed',()=>{
 const night=structuredClone(source);night.channels.total.rows=night.channels.total.rows.map(([at,kWh])=>[at,kWh,kWh<.001?'excluded':'unknown']);assert.equal(createHistoricalProfile(night,c,now).hour('total',target).eligible,true);
 const bad=structuredClone(source);bad.channels.total.rows=bad.channels.total.rows.map(([at,kWh])=>[at,kWh,new Date(at).getUTCHours()===10?'excluded':'unknown']);assert.equal(createHistoricalProfile(bad,c,now).hour('total',target+H).brightDays,0);
});
