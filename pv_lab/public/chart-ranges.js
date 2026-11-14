export function voltageBounds(values){const valid=values.filter(v=>Number.isFinite(v)&&v>=0);if(!valid.length)return {min:200,max:260};const low=Math.min(...valid),high=Math.max(...valid),margin=Math.max(2,(high-low)*.15);return {min:Math.max(0,Math.floor(low-margin)),max:Math.ceil(high+margin)};}

export function productionScale(peak,limitW,unit='W',productionPeak=peak){const ceiling=unit==='kWh'?limitW/1000:limitW,minimum=unit==='kWh'?.1:100,show=productionPeak>=ceiling/1.1;return {min:0,max:Math.max(minimum,peak*1.12,show?ceiling*1.04:0),limit:show?ceiling:null};}
