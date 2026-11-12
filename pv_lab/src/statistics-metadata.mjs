// Recorder's public metadata response uses statistics_unit_of_measurement in newer HA.
// Keep the storage unit separate from the UI display unit: statistics requests convert to kWh.
export function normalizeStatisticsMetadata(result){
  if(!Array.isArray(result))throw new Error('HA zwrócił nieobsługiwany format metadanych statystyk (oczekiwano listy).');
  return result.filter(row=>row&&typeof row==='object').map(row=>{
    const raw=row.statistics_unit_of_measurement??row.unit_of_measurement;
    const unit=typeof raw==='string'?raw.trim():null;
    return {...row,unit_of_measurement:unit,statistics_unit_of_measurement:unit};
  });
}
export function inspectStatisticsChannels(channels,result){
  const metadata=normalizeStatisticsMetadata(result),byId=new Map(metadata.map(row=>[row.statistic_id,row]));
  return channels.map(channel=>{const meta=byId.get(channel.statisticId);let reason=null;
    if(!meta)reason='HA nie zwrócił statystyki o tym identyfikatorze. Sprawdź wybór w wyszukiwarce statystyk.';
    else if(meta.has_sum!==true)reason='HA nie udostępnia sumy/przyrostów dla tej statystyki (has_sum nie jest true).';
    else if(!['Wh','kWh'].includes(meta.unit_of_measurement))reason=`Jednostka zapisu statystyk to ${meta.unit_of_measurement||'brak jednostki'}, a obsługiwane są Wh i kWh. Jednostka wyświetlania encji może być inna.`;
    return {channel,ok:reason===null,reason,metadata:meta||null};
  });
}
