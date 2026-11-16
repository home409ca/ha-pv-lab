// Visual coordinates only: never part of calibration or physical geometry.
const pv1=[[1,0],[0,1],[1,1],[0,2],[1,2],[3,2],[0,3],[1,3],[2,3],[3,3],[4,3]];
const pv2=[[0,0],[2,2],[2,1],[2,0],[3,3],[3,2],[3,1]];
export function defaultPanelLayout(c){
  const panels={};
  for(const str of c.strings){const opts=c.optimizers.filter(o=>o.string===str.id).sort((a,b)=>a.panel.localeCompare(b.panel));
    opts.forEach((o,i)=>{const point=(str.id==='pv1'?pv1:str.id==='pv2'?pv2:[])[i]||[i%5,Math.floor(i/5)];panels[o.id]={x:point[0]*18,y:point[1]*22,landscape:str.id==='pv2'&&i<4};});}
  return {version:1,panels};
}
export function resolvePanelLayout(saved,c){const result=defaultPanelLayout(c);for(const o of c.optimizers){const p=saved?.panels?.[o.id];if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=84&&p.y>=0&&p.y<=80&&typeof p.landscape==='boolean')result.panels[o.id]={x:p.x,y:p.y,landscape:p.landscape};}return result;}
export function validatePanelLayout(value,c){
  if(value?.version!==1||!value.panels||Array.isArray(value.panels))throw new Error('Nieprawidłowy układ paneli.');
  const ids=new Set(c.optimizers.map(o=>o.id)),entries=Object.entries(value.panels);
  if(entries.length!==ids.size||entries.some(([id])=>!ids.has(id)))throw new Error('Układ musi zawierać każdy skonfigurowany panel dokładnie raz.');
  for(const [,p] of entries)if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>84||p.y<0||p.y>80||typeof p.landscape!=='boolean')throw new Error('Panel musi mieścić się na mapie.');
  return resolvePanelLayout(value,c);
}
