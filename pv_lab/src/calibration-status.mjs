import {SLOT,floorSlot} from './time.mjs';
import {actualInterval,sampleReasons} from './engine.mjs';
export function calibrationStatus(model,samples,snapshots,c,now){
  const start=floorSlot(now)-SLOT,actual=actualInterval(samples,start,c),enabled=c.providers.filter(p=>p.enabled),latest=samples.filter(s=>!s.imported).at(-1);
  const available=enabled.filter(p=>snapshots.some(s=>s.provider===p.id&&s.at>=(c.calibrationFrom||0)&&s.at<=now&&now-s.at<36*3600000&&s.rows.some(r=>r.start+SLOT>now)));
  const prior=snapshots.filter(s=>s.at>=(c.calibrationFrom||0)&&s.at<=start&&enabled.some(p=>p.id===s.provider)).flatMap(s=>s.rows.filter(r=>r.start===start));
  const blockers=[];
  if(!latest||now-latest.at>c.quality.staleSeconds*1000)blockers.push('Brak świeżych pomiarów z falownika.');
  if(!available.length)blockers.push('Brak aktualnych przebiegów prognoz. Sprawdź zakładkę Źródła danych.');
  if(actual.reasons.length)blockers.push('Ostatni pełny kwadrans: '+actual.reasons.join(', ')+'.');
  if(!prior.length)blockers.push('Dla ostatniego kwadransa nie zapisano prognozy przed jego rozpoczęciem.');
  else if(!prior.some(r=>r.wh>=20))blockers.push('Ostatnia prognoza była mniejsza niż 20 Wh na kwadrans — za mało do kalibracji (np. noc).');
  return {lastInterval:{start,end:start+SLOT,coverage:actual.coverage,reasons:actual.reasons,priorForecasts:prior.length},blockers,activeProviders:available.map(p=>p.id),nextFullIntervalEnd:floorSlot(now)+2*SLOT,latestReasons:latest?sampleReasons(latest,c):['brak próbki'],measuredStatus:latest?.status??null,expectedStatuses:c.quality.normalStatuses,firstObservationAt:samples.find(s=>!s.imported)?.at??null,calibrationFrom:c.calibrationFrom||null,evaluated:model.evaluated};
}
