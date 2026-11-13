import {historyDefaults} from './historical-profile.mjs';
import {defaultPlan,validatePlan} from './planner.mjs';
import {defaultAppliances,validateAppliance} from './appliances.mjs';
import optimizers from './optimizers.json' with {type:'json'};
export const defaults = {
  version: 1,
  timezone: 'Europe/Warsaw',
  location: { latitude: null, longitude: null },
  inverter: { model: 'Huawei SUN2000-5KTL-M1', limitW: 5500 },
  strings: [
    { id: 'pv1', name: 'PV1 · południowy zachód', panels: 11, panelW: 410, tilt: 30, azimuth: 220, voltage: 'sensor.inverter_pv_1_voltage', current: 'sensor.inverter_pv_1_current' },
    { id: 'pv2', name: 'PV2 · południowy wschód', panels: 7, panelW: 410, tilt: 30, azimuth: 130, voltage: 'sensor.inverter_pv_2_voltage', current: 'sensor.inverter_pv_2_current' }
  ],
  entities: {
    power: 'sensor.inverter_active_power', inputPower: 'sensor.inverter_input_power',
    totalEnergy: 'sensor.inverter_total_yield', dailyEnergy: 'sensor.inverter_daily_yield',
    status: 'sensor.inverter_device_status', alarms: 'sensor.inverter_alarms',
    voltages: ['sensor.inverter_phase_a_voltage', 'sensor.inverter_phase_b_voltage', 'sensor.inverter_phase_c_voltage']
  },
  quality: { voltageWarning: 253, maxGapSeconds: 180, staleSeconds: 900, normalStatuses: ['On-grid'], minSamples: 20 },
  providers: [
    { id: 'forecast_solar', name: 'Forecast.Solar', enabled: true, kind: 'forecast_solar', groups: [
      { string: 'pv1', entities: ['sensor.energy_production_today', 'sensor.energy_production_tomorrow'], configEntry: '' },
      { string: 'pv2', entities: ['sensor.energy_production_today_2', 'sensor.energy_production_tomorrow_2'], configEntry: '' }
    ] },
    { id: 'open_meteo', name: 'Open-Meteo Solar', enabled: true, kind: 'open_meteo', groups: [
      { string: 'total', entities: ['sensor.energy_production_today_3', 'sensor.energy_production_tomorrow_3', ...Array.from({length: 6}, (_,i) => `sensor.energy_production_d${i+2}`)] }
    ] },
    { id: 'solcast', name: 'Solcast PV Forecast', enabled: true, kind: 'solcast', groups: [
      { string: 'total', entities: ['sensor.solcast_pv_forecast_prognoza_na_dzisiaj', 'sensor.solcast_pv_forecast_prognoza_na_jutro', ...Array.from({length: 5}, (_,i) => `sensor.solcast_pv_forecast_prognoza_na_dzien_${i+3}`)] }
    ] }
  ],
  optimizers: optimizers.sort((a,b)=>a.string.localeCompare(b.string)||a.panel.localeCompare(b.panel)),
  replacement: { string: 'pv2', panel: '01 (1.2.7)', previous: 'ns2299002886', current: 'ns2329141515', approximateFrom: '2023-09', approximateTo: '2023-10' },
  retention: { samplesDays: 7, forecastsDays: 14, voltageHours: 0, revisionsDays: 90 },
  appliances: structuredClone(defaultAppliances),
  planner: structuredClone(defaultPlan),
  grid: {hourBalance:'sensor.energia_bilans_netto',importEnergy:'sensor.0_electricity_meter_total_forward_active_energy_balanced',exportEnergy:'sensor.0_electricity_meter_total_reverse_active_energy_balanced',confirmed:true,countersAreHourlyBalanced:false,semanticsVersion:2},
  reports: {freezeTime:'20:00'},
  historyProfile: structuredClone(historyDefaults),
  statistics: { channels: [
    {id:'total', name:'Produkcja AC falownika', statisticId:'sensor.inverter_total_yield', confirmed:true, basis:'AC'},
    {id:'pv1', estimated:true, name:'Energia PV1 — do potwierdzenia', statisticId:'sensor.energia_czynna_pv1', confirmed:false, basis:'unknown'},
    {id:'pv2', estimated:true, name:'Energia PV2 — do potwierdzenia', statisticId:'sensor.energia_czynna_pv2', confirmed:false, basis:'unknown'}
  ] },
  pollSeconds: 60,
  forecastRefreshMinutes: 15
};

export function validate(c) {
  const number = (v, min, max, label) => { if (!Number.isFinite(v) || v < min || v > max) throw new Error(`Nieprawidłowa wartość: ${label} (${min}–${max}).`); };
  const id = v => typeof v === 'string' && /^[a-z_]+\.[a-z0-9_]+$/.test(v);
  if (!c || c.version !== 1) throw new Error('Nieobsługiwana wersja konfiguracji.');
  new Intl.DateTimeFormat('pl', {timeZone:c.timezone}).format();
  for (const [key,min,max] of [['latitude',-90,90],['longitude',-180,180]]) if(c.location[key] !== null) number(c.location[key], min,max,key);
  if ((c.location.latitude === null) !== (c.location.longitude === null)) throw new Error('Podaj obie współrzędne albo pozostaw obie puste.');
  number(c.inverter.limitW,100,1000000,'limit falownika');
  number(c.pollSeconds,15,300,'odczyt'); number(c.forecastRefreshMinutes,5,120,'prognozy');
  number(c.quality.voltageWarning,200,300,'próg napięcia');
  number(c.quality.maxGapSeconds,c.pollSeconds * 1.5,3600,'maksymalna przerwa');
  number(c.quality.staleSeconds,c.pollSeconds,86400,'ważność pomiaru');
  number(c.quality.minSamples,5,1000,'liczba próbek kalibracji');
  if(!Array.isArray(c.quality.normalStatuses) || !c.quality.normalStatuses.length || c.quality.normalStatuses.some(x=>typeof x!=='string')) throw new Error('Podaj poprawne statusy normalnej pracy.');
  number(c.retention.samplesDays,1,90,'retencja pomiarów'); number(c.retention.forecastsDays,2,30,'retencja prognoz');
  number(c.retention.voltageHours,0,168,'retencja napięć [h]');number(c.retention.revisionsDays,1,365,'retencja zmian prognozy');
  if(!Array.isArray(c.statistics?.channels)||c.statistics.channels.length>8)throw new Error('Niepoprawna konfiguracja statystyk.');
  for(const ch of c.statistics.channels)if(!/^[a-z0-9_]+$/.test(ch.id)||!id(ch.statisticId)||typeof ch.confirmed!=='boolean'||!['AC','DC','unknown'].includes(ch.basis))throw new Error('Niepoprawny kanał statystyk.');
  if(new Set(c.statistics.channels.map(ch=>ch.id)).size!==c.statistics.channels.length)throw new Error('Powielone identyfikatory kanałów statystyk.');
  if(!Array.isArray(c.strings) || !c.strings.length || c.strings.length>8) throw new Error('Wymagany przynajmniej jeden string (maks. 8).');
  for(const s of c.strings) {
    if(!/^[a-z0-9_]+$/.test(s.id)) throw new Error('Niepoprawny identyfikator stringu.');
    number(s.panels,1,500,'liczba paneli'); if(!Number.isInteger(s.panels)) throw new Error('Liczba paneli musi być całkowita.');
    number(s.panelW,1,2000,'moc panelu'); number(s.tilt,0,90,'nachylenie'); number(s.azimuth,0,359.999,'azymut od północy');
    if(!id(s.voltage)||!id(s.current)) throw new Error('Niepoprawne encje stringu.');
  }
  if(new Set(c.strings.map(s=>s.id)).size!==c.strings.length) throw new Error('Identyfikatory stringów muszą być unikalne.');
  for(const [key,v] of Object.entries(c.entities)) {
    if(key==='voltages') { if(!Array.isArray(v)||v.length!==3||v.some(x=>!id(x))) throw new Error('Wymagane trzy encje napięcia.'); }
    else if(!id(v)) throw new Error(`Niepoprawna encja ${key}.`);
  }
  if(!Array.isArray(c.providers)||c.providers.length>8) throw new Error('Nieprawidłowa lista dostawców.');
  for(const p of c.providers) {
    if(!/^[a-z0-9_]+$/.test(p.id)||!['forecast_solar','open_meteo','solcast'].includes(p.kind)||typeof p.enabled!=='boolean') throw new Error('Niepoprawny dostawca.');
    if(!Array.isArray(p.groups)||!p.groups.length) throw new Error('Brak grup prognozy.');
    for(const g of p.groups) if(!['total',...c.strings.map(s=>s.id)].includes(g.string)||!Array.isArray(g.entities)||!g.entities.length||g.entities.some(x=>!id(x))) throw new Error('Niepoprawna grupa prognozy.');
    if(p.groups.some(g=>g.string==='total')&&p.groups.length!==1) throw new Error('Prognoza całkowita nie może być sumowana z prognozami stringów.');
    if(new Set(p.groups.map(g=>g.string)).size!==p.groups.length) throw new Error('Powielona grupa prognozy.');
    if(!p.groups.some(g=>g.string==='total')&&p.groups.length!==c.strings.length) throw new Error('Prognoza instalacji musi obejmować wszystkie stringi.');
  }
  if(new Set(c.providers.map(p=>p.id)).size!==c.providers.length) throw new Error('Powielony dostawca.');
  if(!Array.isArray(c.optimizers)||c.optimizers.length>500) throw new Error('Nieprawidłowa lista optymalizatorów.');
  for(const o of c.optimizers) if(!id(o.power)||!id(o.energy)||!c.strings.some(s=>s.id===o.string)) throw new Error('Niepoprawny optymalizator.');
  if(!Array.isArray(c.appliances)||c.appliances.length>20)throw new Error('Lista urządzeń: maksymalnie 20.');
  c.appliances=c.appliances.map(validateAppliance);if(new Set(c.appliances.map(d=>d.id)).size!==c.appliances.length)throw new Error('Powielony identyfikator urządzenia.');
  validatePlan(c.planner);
  if(!c.grid||typeof c.grid.confirmed!=='boolean'||typeof c.grid.countersAreHourlyBalanced!=='boolean')throw new Error('Niepoprawne ustawienia bilansu.');
  for(const k of ['hourBalance','importEnergy','exportEnergy'])if(c.grid[k]!==''&&!id(c.grid[k]))throw new Error('Niepoprawna encja bilansu: '+k);
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(c.reports?.freezeTime||''))throw new Error('Godzina zapisania planu: HH:MM.');
  c.historyProfile={...historyDefaults,...c.historyProfile};const hp=c.historyProfile;
  if(typeof hp.enabled!=='boolean'||typeof hp.autoRefresh!=='boolean')throw new Error('Niepoprawny przełącznik profilu historycznego.');
  for(const [key,min,max] of [['windowDays',7,91],['percentile',.8,.99],['minDays',10,500],['minYears',1,10],['maxReduction',0,.5],['margin',0,.5],['dcFactor',.5,1],['acEfficiency',.8,1],['minReferenceHours',3,8],['minReferenceCoverage',.25,1],['minReferenceRatio',.4,1],['maxFragmentSpread',0,1]])number(hp[key],min,max,'profil historyczny: '+key);
  if(!Number.isInteger(hp.minReferenceHours))throw new Error('Liczba godzin fragmentu musi być całkowita.');
  if(!Number.isInteger(hp.windowDays)||hp.windowDays%2!==1||!Number.isInteger(hp.minDays)||!Number.isInteger(hp.minYears))throw new Error('Okno profilu musi mieć nieparzystą liczbę dni, progi dni i lat muszą być całkowite.');
  const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
  if(hp.validFrom!==''&&!date(hp.validFrom))throw new Error('Początek zgodnego okresu: RRRR-MM-DD.');
  if(!Array.isArray(hp.excluded)||hp.excluded.length>100||hp.excluded.some(x=>!['all','total',...c.strings.map(s=>s.id)].includes(x.channel)||!date(x.from)||!date(x.to)||x.from>x.to))throw new Error('Wykluczenia profilu: kanał, data od i data do.');
  return c;
}

export function migrateConfig(c){if(!c.grid?.semanticsVersion&&c.grid?.hourBalance==='sensor.energia_bilans_netto'&&c.grid?.importEnergy===defaults.grid.importEnergy&&c.grid?.exportEnergy===defaults.grid.exportEnergy)c={...c,grid:{...c.grid,countersAreHourlyBalanced:false,semanticsVersion:2}};return {...c,historyProfile:{...historyDefaults,...c.historyProfile},appliances:c.appliances||structuredClone(defaultAppliances),planner:{...defaultPlan,...c.planner},grid:{...defaults.grid,...c.grid},reports:{...defaults.reports,...c.reports},retention:{...defaults.retention,...c.retention},statistics:c.statistics||structuredClone(defaults.statistics)};}
