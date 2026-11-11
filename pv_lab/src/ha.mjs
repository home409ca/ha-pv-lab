import {groupSeries,combineGroups,seriesFromMap,quarterHours} from './adapters.mjs';
import {normalizeStatisticsMetadata} from './statistics-metadata.mjs';
export class HA {
  constructor(){this.token=process.env.SUPERVISOR_TOKEN||process.env.HA_TOKEN;this.base=process.env.SUPERVISOR_TOKEN?'http://supervisor/core/api':(process.env.HA_URL||'').replace(/\/$/,'')+'/api';}
  get connected(){return !!this.token;}
  async request(path,body){if(!this.token)throw new Error('Brak połączenia z HA. Zainstaluj aplikację w HA OS lub ustaw HA_URL i HA_TOKEN.');
    const res=await fetch(this.base+path,{method:body===undefined?'GET':'POST',headers:{Authorization:`Bearer ${this.token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
    if(!res.ok)throw new Error(`Home Assistant: HTTP ${res.status} (${path.split('?')[0]}).`);
    const txt=await res.text();try{return JSON.parse(txt);}catch{return txt;}}
  async states(c){
    const states=new Map((await this.request('/states')).map(s=>[s.entity_id,s]));
    if(c){
      const id=c.entities.status;
      if(!/^[a-z_]+\.[a-z0-9_]+$/.test(id))throw new Error('Niepoprawna encja statusu falownika.');
      // Read the live State properties: an unchanged status can have an old serialized timestamp.
      const template=`{% set s = states.${id} %}{% if s is defined and s is not none %}{{ {'entity_id': '${id}', 'state': s.state, 'reported': as_timestamp(s.last_reported if s.last_reported is defined else s.last_updated, none)} | to_json }}{% else %}{{ {'entity_id': '${id}', 'state': 'unavailable', 'reported': none} | to_json }}{% endif %}`;
      let live=await this.request('/template',{template});
      if(typeof live==='string')try{live=JSON.parse(live);}catch{throw new Error('Niepoprawna odpowiedź HA przy odczycie czasu zgłoszenia statusu.');}
      if(!live||live.entity_id!==id||typeof live.state!=='string'||(live.reported!==null&&!Number.isFinite(live.reported)))throw new Error('Niepoprawne dane statusu falownika z HA.');
      states.set(id,{...states.get(id),entity_id:id,state:live.state,last_reported:Number.isFinite(live.reported)?new Date(live.reported*1000).toISOString():null,last_updated:null});
    }
    return states;
  }
  async websocket(command){if(!this.connected)throw new Error('Brak połączenia z HA.');const url=process.env.SUPERVISOR_TOKEN?'ws://supervisor/core/websocket':this.base.replace(/^http/,'ws')+'/websocket';
    return new Promise((resolve,reject)=>{const ws=new WebSocket(url);let done=false;const finish=(error,result)=>{if(done)return;done=true;clearTimeout(timer);ws.close();error?reject(error):resolve(result);},timer=setTimeout(()=>finish(new Error('Przekroczono czas odczytu statystyk HA.')),30000);
      ws.addEventListener('message',event=>{try{const msg=JSON.parse(event.data);if(msg.type==='auth_required')ws.send(JSON.stringify({type:'auth',access_token:this.token}));else if(msg.type==='auth_ok')ws.send(JSON.stringify({id:1,...command}));else if(msg.type==='auth_invalid')finish(new Error('HA odrzucił dostęp do statystyk.'));else if(msg.type==='result'&&msg.id===1)finish(msg.success?null:new Error(msg.error?.message||'Błąd statystyk HA.'),msg.result);}catch{finish(new Error('Niepoprawna odpowiedź statystyk HA.'));}});
      ws.addEventListener('error',()=>finish(new Error('Nie udało się połączyć z API statystyk HA.')));ws.addEventListener('close',()=>{if(!done)finish(new Error('HA zamknął połączenie statystyk.'));});});}
  async metadata(ids){return normalizeStatisticsMetadata(await this.websocket({type:'recorder/get_statistics_metadata',statistic_ids:ids}));}
  async listStatistics(){return normalizeStatisticsMetadata(await this.websocket({type:'recorder/list_statistic_ids',statistic_type:'sum'}));}
  async statistics(ids,start,end){return this.websocket({type:'recorder/statistics_during_period',statistic_ids:ids,start_time:new Date(start).toISOString(),end_time:new Date(end).toISOString(),period:'hour',types:['change'],units:{energy:'kWh'}});}
  async appInfo(){if(!process.env.SUPERVISOR_TOKEN)return null;const r=await fetch('http://supervisor/addons/self/info',{headers:{Authorization:`Bearer ${this.token}`},signal:AbortSignal.timeout(5000)});if(!r.ok)return null;return (await r.json()).data;}
  async forecasts(c,states){const results=[],diagnostics=[];
    for(const p of c.providers.filter(p=>p.enabled)){try{const groups=[],serviceEntries=new Set();
      for(const g of p.groups){let rows=groupSeries(p,g,states);
        if(!rows.length&&p.kind==='forecast_solar'){
          const entry=g.configEntry||await this.request('/template',{template:`{{ config_entry_id('${g.entities[0]}') }}`});
          if(!entry||entry==='None')throw new Error(`Nie znaleziono konfiguracji ${g.entities[0]}.`);
          if(serviceEntries.has(String(entry)))throw new Error('Grupy wskazują tę samą konfigurację Forecast.Solar. Akcja zwraca sumę jej połaci — ustaw jedną grupę total, aby uniknąć podwójnego liczenia.');
          serviceEntries.add(String(entry));
          const response=await this.request('/services/forecast_solar/get_forecast?return_response',{config_entry:String(entry),resolution:'hourly'});
          const data=response.service_response||response;rows=quarterHours(seriesFromMap(data.wh_period,60));
        }
        if(!rows.length)throw new Error(`Brak przebiegu czasowego dla ${g.string}. Same sumy dzienne nie wystarczą. Sprawdź wersję integracji i atrybuty encji.`);
        groups.push(rows);
      }
      const rows=combineGroups(groups);if(!rows.length)throw new Error('Brak wspólnych przedziałów wszystkich stringów.');
      const sourceTimes=p.groups.flatMap(g=>g.entities.map(id=>Date.parse(states.get(id)?.last_updated))).filter(Number.isFinite);
      results.push({provider:p.id,rows,sourceUpdatedAt:sourceTimes.length?Math.max(...sourceTimes):null});diagnostics.push({id:p.id,ok:true,message:`Odczytano ${rows.length} przedziałów 15 min.`});
    }catch(e){diagnostics.push({id:p.id,ok:false,message:e.message});}}
    return {results,diagnostics};}
}
