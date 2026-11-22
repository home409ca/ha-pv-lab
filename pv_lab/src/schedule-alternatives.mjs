const MINUTE=60000;
function shape(plan){
 const groups=new Map();
 for(const a of plan){const key=JSON.stringify([a.device._resource||a.device.id,a.curve.wh]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(a.start);}
 for(const starts of groups.values())starts.sort((a,b)=>a-b);
 return {groups,first:plan.length?Math.min(...plan.map(a=>a.start)):0,last:plan.length?Math.max(...plan.map(a=>a.start+a.curve.duration)):0,order:plan.slice().sort((a,b)=>a.start-b.start||String(a.device._resource).localeCompare(String(b.device._resource))).map(a=>a.device._resource||a.device.id).join('|')};
}
function distance(a,b){let total=0,count=0,max=0;for(const [key,starts] of a.groups){const other=b.groups.get(key);if(!other||other.length!==starts.length)return Infinity;starts.forEach((at,i)=>{const delta=Math.abs(at-other[i])/MINUTE;total+=delta;count++;max=Math.max(max,delta);});}const orderChanged=a.order!==b.order;return max>=30||Math.abs(a.last-b.last)>=30*MINUTE||orderChanged?(total/Math.max(1,count)+Math.abs(a.last-b.last)/MINUTE+(orderChanged?60:0)):0;}
// Keep the actual winner first. Other entries describe useful choices, not an exhaustive ranking.
export function selectDiverseSchedules(pool,compare,evaluate,limit=10){
 if(!pool.length)return [];
 const complete=Math.max(...pool.map(p=>p.length)),ranked=pool.filter(p=>p.length===complete).sort(compare),features=new Map(ranked.map(p=>[p,shape(p)])),selected=[];
 const add=(plan,reason)=>{if(!plan||selected.length>=limit||selected.some(p=>distance(features.get(p.plan),features.get(plan))===0))return false;selected.push({plan,reason});return true;};
 add(ranked[0],'Najlepszy według celu');
 const choose=(cmp,reason,accept)=>{for(const p of ranked.filter(accept).sort(cmp))if(add(p,reason))break;};
 choose((a,b)=>evaluate(b).surplusKWh-evaluate(a).surplusKWh||compare(a,b),'Większy zapas PV',p=>evaluate(p).surplusKWh>evaluate(ranked[0]).surplusKWh+1e-8);
 choose((a,b)=>features.get(a).last-features.get(b).last||compare(a,b),'Wcześniejszy koniec',p=>features.get(p).last<features.get(ranked[0]).last);
 choose((a,b)=>features.get(b).first-features.get(a).first||compare(a,b),'Późniejszy start',p=>features.get(p).first>features.get(ranked[0]).first);
 const order=features.get(ranked[0]).order;
 for(const p of ranked)if(features.get(p).order!==order&&add(p,'Inna kolejność urządzeń'))break;
 while(selected.length<limit){let best=null,score=0;for(let i=0;i<ranked.length;i++){const p=ranked[i],separation=Math.min(...selected.map(s=>distance(features.get(s.plan),features.get(p)))),value=separation/(1+i*.3);if(value>score){best=p;score=value;}}if(!best||!add(best,'Inne godziny pracy'))break;}
 return selected;
}
