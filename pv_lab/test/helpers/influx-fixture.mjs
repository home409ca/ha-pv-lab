import {defaults} from '../../src/defaults.mjs';
import {historyEntities,influxDefaults} from '../../src/influx-history.mjs';
export function fixture(){
 const c=structuredClone(defaults);c.location={latitude:52,longitude:21};const start=Date.parse('2024-06-01T00:00:00Z'),series={},available=historyEntities(c,influxDefaults).map(r=>({...r,measurement:r.units[0]}));
 let total=1000;for(let i=0;i<=2880;i++){const at=start+i*30000,h=i/120,p=h>=10&&h<14?600:0;total+=i?p/120000:0;for(const [id,value] of [[c.entities.power,p],[c.entities.totalEnergy,total],...c.entities.voltages.map(id=>[id,230]),...c.strings.flatMap((s,index)=>[[s.voltage,300],[s.current,index?1:2]]),...c.optimizers.map(o=>[o.power,p?150:0])]){(series[id]??=[]).push({at,value});}}
 series[c.entities.status]=[{at:start-86400000,value:'On-grid'}];return {c,start,series,available};
}
