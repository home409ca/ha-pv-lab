export async function energyStatus(ha,includeHours=false){
  const [info,entries,prefs,forecasts]=await Promise.all([
    ha.websocket({type:'energy/info'}),ha.request(includeHours?'/config/config_entries/entry':'/config/config_entries/entry?domain=pv_lab'),
    ha.websocket({type:'energy/get_prefs'}),ha.websocket({type:'energy/solar_forecast'})
  ]);
  const selected=new Set((prefs.energy_sources||[]).filter(s=>s.type==='solar').flatMap(s=>s.config_entry_solar_forecast||[]));
  return {...(includeHours?{forecastEntries:entries.map(e=>({id:e.entry_id,title:e.title,domain:e.domain,state:e.state,hasData:Object.keys(forecasts[e.entry_id]?.wh_hours||{}).length>0})),solarSources:(prefs.energy_sources||[]).filter(s=>s.type==='solar').map(s=>({statisticId:s.stat_energy_from,forecastIds:s.config_entry_solar_forecast||[]}))}:{}),platformAvailable:(info.solar_forecast_domains||[]).includes('pv_lab'),entries:entries.filter(e=>e.domain==='pv_lab').map(e=>({... (includeHours?{id:e.entry_id,whHours:forecasts[e.entry_id]?.wh_hours||{}}:{}),title:e.title,state:e.state,selected:selected.has(e.entry_id),hours:Object.keys(forecasts[e.entry_id]?.wh_hours||{}).length}))};
}
