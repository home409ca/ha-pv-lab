import {emptyModel,train} from './engine.mjs';
import {SLOT,DAY,floorSlot} from './time.mjs';
export function demoData(c,now=Date.now()){
  const at=floorSlot(now),start=at-3*DAY,samples=[],snapshots=[];
  const curve=t=>{const h=new Date(t).getUTCHours()+new Date(t).getUTCMinutes()/60;return Math.max(0,Math.sin((h-6)/11*Math.PI))*4900;};
  for(let t=start;t<=now;t+=60000){const base=curve(t),power=base*(.8+.05*Math.sin(t/5000000));const optimizers=Object.fromEntries(c.optimizers.map((o,i)=>[o.id,{power:power/18*(i===3?.65:1),energy:100+(t-start)/DAY*.4}]));
    samples.push({at:t,power,inputPower:power*1.04,totalEnergy:20000+(t-start)/DAY*17,dailyEnergy:(new Date(t).getUTCHours()/24)*17,status:'On-grid',voltages:[234,235,236],strings:{pv1:power*.62,pv2:power*.38},optimizers});}
  for(let issued=start;issued<=at;issued+=6*3600000)for(const [i,p] of c.providers.entries())snapshots.push({at:issued,provider:p.id,rows:Array.from({length:4*96},(_,j)=>{const t=floorSlot(issued)+j*SLOT;return {start:t,wh:curve(t+SLOT/2)/4*(1+i*.08)};})});
  const model=emptyModel();train(model,samples,snapshots,c,now);
  return {samples,snapshots,model,diagnostics:c.providers.map(p=>({id:p.id,ok:true,message:'Dane demonstracyjne — nie są pomiarem Twojej instalacji.'}))};
}
