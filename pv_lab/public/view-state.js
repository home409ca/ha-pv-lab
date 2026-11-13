function detailsKey(element){
 if(element.dataset.detailsKey)return element.dataset.detailsKey;
 if(element.id)return 'id:'+element.id;
 const card=element.closest('article'),heading=card?.querySelector('h2')?.textContent.trim()||'',parts=[];
 for(let node=element;node&&node!==card;node=node.parentElement)if(node.tagName==='DETAILS')parts.unshift(node.querySelector(':scope > summary')?.textContent.trim()||'');
 return heading+'|'+parts.join('|');
}
export function captureDetails(container){return new Set([...container.querySelectorAll('details[open]')].map(detailsKey));}
export function restoreDetails(container,open){if(!open)return;for(const element of container.querySelectorAll('details'))if(open.has(detailsKey(element)))element.open=true;}
