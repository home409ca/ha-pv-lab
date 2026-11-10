import {groupSeries,combineGroups,seriesFromMap,quarterHours} from './adapters.mjs';
export class HA {
  constructor(){this.token=process.env.SUPERVISOR_TOKEN||process.env.HA_TOKEN;this.base=process.env.SUPERVISOR_TOKEN?'http://supervisor/core/api':(process.env.HA_URL||'').replace(/\/$/,'')+'/api';}
  get connected(){return !!this.token;}
  async request(path,body){if(!this.token)throw new Error('Brak połączenia z HA. Zainstaluj aplikację w HA OS lub ustaw HA_URL i HA_TOKEN.');
    const res=await fetch(this.base+path,{method:body===undefined?'GET':'POST',headers:{Authorization:`Bearer ${this.token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
    if(!res.ok)throw new Error(`Home Assistant: HTTP ${res.status} (${path.split('?')[0]}).`);
    const txt=await res.text();try{return JSON.parse(txt);}catch{return txt;}}
  async states(){return new Map((await this.request('/states')).map(s=>[s.entity_id,s]));}
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
      results.push({provider:p.id,rows});diagnostics.push({id:p.id,ok:true,message:`Odczytano ${rows.length} przedziałów 15 min.`});
    }catch(e){diagnostics.push({id:p.id,ok:false,message:e.message});}}
    return {results,diagnostics};}
}
