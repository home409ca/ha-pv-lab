import {buildProfile} from './appliances.mjs';
export const profileOwner=p=>p.deviceId||p.source?.powerEntity||'';
export function assertProfileName(library,profile){if(library.profiles.some(p=>p.id!==profile.id&&profileOwner(p)===profileOwner(profile)&&p.name.trim().toLocaleLowerCase('pl')===profile.name.trim().toLocaleLowerCase('pl')))throw new Error('Profil o tej nazwie już istnieje dla tego urządzenia.');}
export function upgradeProfiles(library,now=Date.now()){
 const next=structuredClone(library),changed=[],skipped=[];
 next.profiles=next.profiles.map(p=>{if(p.manual||p.algorithmVersion>=2)return p;const a=next.analyses?.[p.deviceId];if(!a||!p.cycleIds?.length||p.cycleIds.some(id=>!a.cycles.some(c=>c.id===id))){skipped.push(p.id);return p;}const updated=buildProfile(a,p.cycleIds,p.name,p.id,now);changed.push(p.id);return {...p,...updated,source:p.source||updated.source,at:p.at,rebuiltAt:now,defaultVariant:p.defaultVariant&&updated.variants[p.defaultVariant]?p.defaultVariant:'typical'};});return {library:next,changed,skipped};
}
export function profilePreferences(library,body,config){
 const next=structuredClone(library),p=next.profiles.find(p=>p.id===body.id);if(!p)throw new Error('Nie znaleziono profilu.');
 if(body.defaultVariant!==undefined){if(!p.variants[body.defaultVariant])throw new Error('Wariant nie istnieje w tym profilu.');p.defaultVariant=body.defaultVariant;}
 if(body.primaryDeviceId!==undefined){const a=config.appliances.find(a=>a.id===body.primaryDeviceId);if(!a||p.deviceId&&p.deviceId!==a.id||!p.deviceId&&p.source?.powerEntity&&p.source.powerEntity!==a.powerEntity)throw new Error('Profil nie pasuje do wybranego urządzenia.');next.primaryProfiles={...next.primaryProfiles,[a.id]:p.id};}
 return next;
}

export function resolveMissingProfiles(input,config,library){const next=structuredClone(input);for(const entry of next.entries){if(!entry.profileId)continue;let p=library.profiles.find(p=>p.id===entry.profileId);if(!p){const id=entry.deviceId||config.appliances.find(a=>a.powerEntity===entry.powerEntity)?.id,matches=p=>p.deviceId?p.deviceId===id:p.source?.powerEntity?p.source.powerEntity===entry.powerEntity:true;p=library.profiles.find(p=>p.id===library.primaryProfiles?.[id]&&matches(p))||library.profiles.find(matches);entry.profileId=p?.id||null;entry.variant=p?.defaultVariant||'typical';}if(p&&!p.variants[entry.variant])entry.variant=p.defaultVariant||Object.keys(p.variants)[0];}return next;}
