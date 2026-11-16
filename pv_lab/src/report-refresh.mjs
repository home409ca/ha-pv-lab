// One shared request; failed and delayed statistics can be retried without waiting an hour.
export function createReportRefresh(read,{clock=Date.now,interval=120000}={}){
 const state={at:null,attemptedAt:null,error:null,busy:false,fullHour:null};let active=null;
 return {state,refresh(force=false){const now=clock();if(active)return active;if(!force&&state.attemptedAt!==null&&now-state.attemptedAt<interval)return Promise.resolve();state.attemptedAt=now;state.busy=true;const hour=Math.floor(now/3600000)*3600000,full=state.fullHour!==hour;active=Promise.resolve().then(()=>read({now,hour,full})).then(()=>{state.at=clock();state.error=null;if(full)state.fullHour=hour;}).catch(e=>{state.error=e.message||String(e);}).finally(()=>{active=null;state.busy=false;});return active;}}
}
