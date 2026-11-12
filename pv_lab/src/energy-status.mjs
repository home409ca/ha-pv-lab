export async function energyStatus(ha){
  const [info,entries,prefs,forecasts]=await Promise.all([
    ha.websocket({type:'energy/info'}),ha.request('/config/config_entries/entry?domain=pv_lab'),
    ha.websocket({type:'energy/get_prefs'}),ha.websocket({type:'energy/solar_forecast'})
  ]);
  const selected=new Set((prefs.energy_sources||[]).filter(s=>s.type==='solar').flatMap(s=>s.config_entry_solar_forecast||[]));
  return {platformAvailable:(info.solar_forecast_domains||[]).includes('pv_lab'),entries:entries.filter(e=>e.domain==='pv_lab').map(e=>({title:e.title,state:e.state,selected:selected.has(e.entry_id),hours:Object.keys(forecasts[e.entry_id]?.wh_hours||{}).length}))};
}
