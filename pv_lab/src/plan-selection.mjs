export const allProposals=state=>[...(state.proposals||[]),...(state.references||[])];
export const sourcePlan=(result,id,goal='cost')=>[...(result.dashboardAnalyses?.[goal]||result.analyses?.[goal]||[]),...(result.comparisons||[]).map(r=>r.result)].find(r=>r?.id===id);
export const planTimeline=result=>(result?.timeline||[]).map(({start,end,pvKWh,baseKWh,runningKWh,deviceKWh})=>({start,end,pvKWh,houseKWh:Number.isFinite(baseKWh)?baseKWh+(runningKWh||0):null,deviceKWh,runningKWh}));

export const previewTimeline=(result,plan)=>planTimeline({...plan,timeline:(result.dashboardTimeline||plan?.timeline||[]).map(row=>({...row,deviceKWh:plan?.timeline?.find(x=>x.start===row.start)?.deviceKWh||0}))});
