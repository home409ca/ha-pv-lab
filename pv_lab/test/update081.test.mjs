import test from 'node:test';import assert from 'node:assert/strict';
import {applyHistoricalProfile} from '../src/historical-profile.mjs';
import {defaults} from '../src/defaults.mjs';
import {archivedHourlySeries} from '../public/presentation.js';
import {createReportRefresh} from '../src/report-refresh.mjs';
import {Storage} from '../src/storage.mjs';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
const start=Date.parse('2026-11-15T10:00:00Z'),H=3600000;
test('Normalized envelope clips qualified complete hours, preserves shape and low forecasts, and bounds extreme reductions',()=>{
 const c=structuredClone(defaults),profile={summary:{channels:[{id:'total',basis:'AC'}]},hour:()=>({eligible:true,attainableKWh:1,confidence:.4,referenceDays:30,referenceYears:3,referenceMethod:'bright'})},rows=[100,200,300,400].map((wh,i)=>({start:start+i*900000,wh}));applyHistoricalProfile(rows,profile,c);assert.equal(rows.reduce((s,r)=>s+r.wh,0),1000);rows.forEach(r=>r.wh*=2);applyHistoricalProfile(rows,profile,c);assert.equal(rows.reduce((s,r)=>s+r.wh,0),1000);assert.equal(rows[3].wh/rows[0].wh,4);assert.equal(rows[0].historyCheck.limitMode,'normalized');
 const extreme=Array.from({length:4},(_,i)=>({start:start+i*900000,wh:1375}));applyHistoricalProfile(extreme,{...profile,hour:()=>({...profile.hour(),attainableKWh:.1})},c);assert.equal(extreme[0].historyFactor,.25);
 const blocked=Array.from({length:4},(_,i)=>({start:start+i*900000,wh:500}));applyHistoricalProfile(blocked,{...profile,hour:()=>({...profile.hour(),eligible:false})},c);assert.ok(blocked.every(r=>r.wh===500));
});
test('Statistics retry within the hour, force bypasses throttle, parallel requests share one read, failures do not freeze the hour',async()=>{
 let now=start,calls=0,fail=true;const requests=[],r=createReportRefresh(async x=>{calls++;requests.push(x);if(fail)throw new Error('502');},{clock:()=>now});await Promise.all([r.refresh(),r.refresh()]);assert.equal(calls,1);assert.equal(r.state.error,'502');assert.equal(r.state.fullHour,null);fail=false;now+=120001;await r.refresh();assert.equal(calls,2);assert.equal(requests[1].full,true);assert.equal(r.state.error,null);await r.refresh();assert.equal(calls,2);await r.refresh(true);assert.equal(calls,3);assert.equal(requests[2].full,false);now+=H;await r.refresh();assert.equal(requests.at(-1).full,true);
});
test('Archived chart uses frozen issued values rather than current forecasts; missing variants never become zero',()=>{
 const rows=[{mode:'day_ahead',date:'2026-11-15',start,actualKWh:.4,actualSource:'statystyki HA',predictions:{pv_lab:1,solcast:2},issued:{pv_lab:start-H}},{mode:'rolling',date:'2026-11-15',start,actualKWh:.4,predictions:{pv_lab:.5}}],visibility={corrected:true,measured:true,raw:true,providers:{}},definitions=[{id:'solcast',name:'Solcast',enabled:true}];const series=archivedHourlySeries(rows,'2026-11-15','day_ahead',visibility,definitions,'Europe/Warsaw');assert.equal(series.find(s=>s.label==='PV Lab — zapisana prognoza').points[0].y,1);assert.equal(series.find(s=>s.label==='Rzeczywista produkcja').points[0].y,.4);assert.equal(series.find(s=>s.label==='PV Lab przed historią').points[0].y,null);assert.equal(series[0].points[0].x,start+H/2);
});
test('Disk accounting includes nested data and private config sizes, while private files stay outside the file browser',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'pv-usage-'));try{const data=path.join(dir,'data'),store=new Storage(data);await store.init();await mkdir(path.join(data,'sub'));await writeFile(path.join(data,'sub','file.txt'),'12345');await writeFile(path.join(data,'integration-key.json'),'123');await writeFile(path.join(dir,'code.mjs'),'1234567');const usage=await store.usage(dir);assert.equal(usage.dataBytes,8);assert.equal(usage.codeBytes,7);assert.ok(!(await store.files()).some(f=>f.name==='integration-key.json'));}finally{await rm(dir,{recursive:true,force:true});}
});
