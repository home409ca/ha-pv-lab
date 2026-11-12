import test from 'node:test';import assert from 'node:assert/strict';
import metadata from './fixtures/ha-statistics-metadata-2026.json' with {type:'json'};
import {normalizeStatisticsMetadata,inspectStatisticsChannels} from '../src/statistics-metadata.mjs';
import {importStatistics} from '../src/statistics.mjs';import {defaults} from '../src/defaults.mjs';import {HA} from '../src/ha.mjs';

test('rzeczywisty schemat publicznego API HA: jednostka zapisu nie ma klucza unit_of_measurement',()=>{
  assert.ok(metadata.every(row=>row.unit_of_measurement===undefined));const normalized=normalizeStatisticsMetadata(metadata);
  assert.equal(normalized[0].unit_of_measurement,'kWh');assert.equal(normalized[2].unit_of_measurement,'Wh');assert.equal(normalized[2].display_unit_of_measurement,'kWh');assert.equal(metadata[0].unit_of_measurement,undefined);assert.deepEqual(normalizeStatisticsMetadata(normalized),normalized);
});
test('starszy schemat metadanych pozostaje obsługiwany',()=>{const old=[{statistic_id:'sensor.x',unit_of_measurement:'kWh',has_sum:true}],checks=inspectStatisticsChannels([{statisticId:'sensor.x'}],old);assert.equal(checks[0].ok,true);});
test('wyświetlana jednostka nie zastępuje brakującej jednostki zapisu',()=>{const checks=inspectStatisticsChannels([{statisticId:'sensor.x'}],[{statistic_id:'sensor.x',display_unit_of_measurement:'kWh',has_sum:true}]);assert.equal(checks[0].ok,false);assert.match(checks[0].reason,/brak jednostki/);});
test('diagnostyka odróżnia brak ID od braku sumy i złej jednostki',()=>{
  const channels=['sensor.missing','sensor.power','sensor.other'].map(statisticId=>({statisticId})),checks=inspectStatisticsChannels(channels,[{statistic_id:'sensor.power',statistics_unit_of_measurement:'kWh',has_sum:false},{statistic_id:'sensor.other',statistics_unit_of_measurement:'W',has_sum:true}]);assert.match(checks[0].reason,/identyfikatorze/);assert.match(checks[1].reason,/has_sum/);assert.match(checks[2].reason,/ W,/);
});
test('metadane i lista liczników HA przechodzą tę samą normalizację',async()=>{const ha=new HA(),commands=[];ha.websocket=async command=>{commands.push(command.type);return metadata;};assert.equal((await ha.metadata(['sensor.inverter_total_yield']))[0].unit_of_measurement,'kWh');assert.equal((await ha.listStatistics())[2].unit_of_measurement,'Wh');assert.deepEqual(commands,['recorder/get_statistics_metadata','recorder/list_statistic_ids']);});
test('import nowego schematu dochodzi do historii i raportu, z konwersją żądaną do kWh',async()=>{const c=structuredClone(defaults);c.statistics.channels.forEach(ch=>ch.confirmed=true);const calls=[],progress=[];
  const ha={metadata:async()=>metadata,statistics:async(ids,start,end)=>{calls.push({ids,start,end});return Object.fromEntries(ids.map((id,i)=>[id,Array.from({length:24},(_,j)=>({start:(start+j*3600000)/1000,end:(start+(j+1)*3600000)/1000,change:[1,.6,.4][i]}))]));}};
  const report=await importStatistics(ha,c,65,p=>progress.push(p));assert.equal(calls.length,3);assert.equal(report.channels.length,3);assert.ok(report.days.length>0);assert.equal(progress.at(-1).done,65);assert.equal(report.metadata[2].unit_of_measurement,'Wh');
});
test('błąd przed importem pokazuje faktyczny powód i nie odpytuje historii',async()=>{const c=structuredClone(defaults);let called=false;await assert.rejects(importStatistics({metadata:async()=>[],statistics:async()=>{called=true;}},c,365),/sensor.inverter_total_yield: HA nie zwrócił/);assert.equal(called,false);});
