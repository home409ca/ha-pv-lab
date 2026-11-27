// Shared by the app and the separately served HA card. Compare displayed cents, not hidden fractions.
export const allGrid=(energy,imported)=>Number.isFinite(energy)&&energy>0&&Number.isFinite(imported)&&Math.abs(energy-imported)<=Math.max(1e-6,energy*.00005);
const cents=n=>Number.isFinite(n)?Math.round((n+1e-10)*100):null;
export function preferredCheapGridPlan(rows){
 const first=rows[0];if(!first?.complete||!allGrid(first.energy,first.imported)||cents(first.cost)===null||cents(first.stress)===null)return first?.plan||null;
 const matches=rows.filter(r=>r.complete&&r.cheap&&allGrid(r.energy,r.imported)&&Math.abs(r.energy-first.energy)<=1e-6&&cents(r.cost)===cents(first.cost)&&cents(r.stress)===cents(first.stress)&&Number.isFinite(r.start)&&r.start<=first.start);
 return matches.sort((a,b)=>a.start-b.start)[0]?.plan||first.plan;
}
