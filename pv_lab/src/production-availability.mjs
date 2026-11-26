export const availabilityDefault=()=>({factor:1,from:null,until:null,reason:''});
export function validateAvailability(raw,now=Date.now()){
 if(!raw||!Number.isFinite(raw.percent)||raw.percent<0||raw.percent>100||raw.percent<100&&(!Number.isFinite(raw.until)||raw.until<=now||raw.until>now+7*86400000))throw new Error('Podaj 0–100% oraz przyszły koniec ograniczenia, najwyżej za 7 dni.');
 return {factor:raw.percent/100,from:now,until:raw.percent===100?null:raw.until,reason:typeof raw.reason==='string'?raw.reason.slice(0,160):'Ograniczona dostępność paneli'};
}
export function applyAvailability(rows,setting,now){
 setting||=availabilityDefault();const active=setting?.factor>=0&&setting.factor<1&&setting.from<=now&&setting.until>now;
 for(const r of rows){r.beforeAvailabilityWh=r.wh;const a=Math.max(r.start,now,setting?.from??Infinity),b=Math.min(r.start+900000,setting?.until??-Infinity),part=active?Math.max(0,b-a)/Math.max(1,r.start+900000-Math.max(r.start,now)):0;r.availabilityFactor=1-part*(1-setting.factor);if(r.start+900000>now)r.wh*=r.availabilityFactor;}
 return {active,setting:setting||availabilityDefault()};
}
export function missingProduction(rows,samples,c,now){
 const from=now-45*60000,points=samples.filter(s=>s.at>=from&&s.at<=now&&Number.isFinite(s.power)&&s.power>=0).sort((a,b)=>a.at-b.at),map=new Map(rows.map(r=>[r.start,r]));let covered=0,actual=0,expected=0;
 for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],dt=b.at-a.at,row=map.get(Math.floor(a.at/900000)*900000);if(dt<=0||dt>c.quality.maxGapSeconds*1000||!row)continue;covered+=dt;actual+=a.power*dt/3600000;expected+=row.staticWh*4*dt/3600000;}
 return {suspected:covered>=40*60000&&expected>=400&&actual<expected*.05&&points.at(-1)?.at>=now-c.quality.maxGapSeconds*1000,actualKWh:actual/1000,expectedKWh:expected/1000,coveredMinutes:covered/60000,note:'Niska produkcja nie rozpoznaje śniegu. Sprawdź panele, falownik i pomiary.'};
}
