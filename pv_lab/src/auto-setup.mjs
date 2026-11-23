import {randomUUID} from 'node:crypto';
export function prepareAuto(range,horizon,now=Date.now()){
 if(!['today','tomorrow','both'].includes(range)||!Number.isFinite(horizon.earliest)||!Number.isFinite(horizon.latest)||horizon.latest<=now+600000)throw new Error('Wybierz zakres, w którym po 10 minutach pozostanie czas na plan.');
 return {id:randomUUID(),active:true,requestedAt:now,readyAt:now+600000,range,horizon:structuredClone(horizon),message:'Masz 10 minut na przygotowanie urządzeń i wyłączenie ich switchy.'};
}
export function readyAuto(setup,id,now=Date.now()){
 if(!setup?.active||setup.id!==id)throw new Error('Auto zostało anulowane lub zastąpione.');
 if(now<setup.readyAt)throw new Error('Trwa 10 minut na przygotowanie urządzeń.');
 return setup;
}
