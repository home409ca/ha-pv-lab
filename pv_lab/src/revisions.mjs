export function updateRevisions(previous,forecast,at,reasons=[]){const state=structuredClone(previous||{}),events=[];
  for(const day of forecast.days){const value=day.totalKWh;if(value===null||!Number.isFinite(value))continue;const old=state[day.date],rounded=Math.round(value*1000)/1000;
    if(old&&Math.abs(rounded-old.valueKWh)<.001)continue;const delta=old?Math.round((rounded-old.valueKWh)*1000)/1000:null;
    const row={at,date:day.date,valueKWh:rounded,previousKWh:old?.valueKWh??null,deltaKWh:delta,direction:delta===null?'initial':delta>0?'up':'down',firstCalculatedAt:old?.firstCalculatedAt||at,changeCount:(old?.changeCount||0)+(old?1:0),reasons};
    state[day.date]=row;events.push(row);}
  return {state,events};}
