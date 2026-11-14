// Optional receiver diagnostics must never block the locally available forecast.
export function createEnergyReadback(read,{clock=Date.now,interval=60000}={}){
 const state={data:null,error:null,busy:false,attemptedAt:null};let active=null;
 return {state,refresh(){
  if(active)return active;
  const now=clock();if(state.attemptedAt!==null&&now-state.attemptedAt<interval)return Promise.resolve();
  state.attemptedAt=now;state.busy=true;
  active=Promise.resolve().then(read).then(result=>{
   if(!result||!Array.isArray(result.entries))throw new Error('Niepoprawna odpowiedź kontroli Energii z HA.');
   const at=clock(),from=at-7*86400000,to=at+8*86400000;
   state.data={...result,at,entries:result.entries.map(e=>({...e,whHours:Object.fromEntries(Object.entries(e.whHours||{}).filter(([key])=>{const start=Date.parse(key);return start>=from&&start<=to;}))}))};state.error=null;
  }).catch(error=>{state.error=error.message||String(error);}).finally(()=>{state.busy=false;active=null;});
  return active;
 }};
}
