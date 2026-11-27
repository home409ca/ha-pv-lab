import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
test('every module reachable from app.js has a served browser asset route',async()=>{
 const server=await readFile(new URL('../src/server-v2.mjs',import.meta.url),'utf8'),section=server.slice(server.indexOf('const assets='),server.indexOf(';const match=route.match',server.indexOf('const assets='))),routes=new Set([...section.matchAll(/'\/([^']+)':'([^']+)'/g)].map(m=>m[2]));
 const queue=['app.js'],seen=new Set();
 while(queue.length){const name=queue.pop();if(seen.has(name))continue;seen.add(name);assert.ok(routes.has(name),'Missing served asset: '+name);const code=await readFile(new URL('../public/'+name,import.meta.url),'utf8');for(const match of code.matchAll(/(?:\bfrom\s*|\bimport\s*)['"]\.\/([^'"]+)['"]/g))queue.push(match[1]);}
 assert.ok(seen.has('snow-status.js'));
});
