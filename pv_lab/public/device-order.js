export function devicePriority(item){const id=String(item.deviceId||item.id||'').toLowerCase(),name=String(item.name||'').toLowerCase();return id==='zmywarka'||id.startsWith('zmywarka_')||/zmywark|dishwasher/.test(name)?0:id==='pralka'||id.startsWith('pralka_')||/pralk|washer/.test(name)?1:2;}
export const orderedDevices=items=>[...items].sort((a,b)=>devicePriority(a)-devicePriority(b));
export const deviceEntries=items=>items.map((item,index)=>({item,index})).sort((a,b)=>devicePriority(a.item)-devicePriority(b.item));
