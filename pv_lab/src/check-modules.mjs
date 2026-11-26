// Link ES modules without evaluating application code: no HA requests, timers or /data writes.
import {SourceTextModule,SyntheticModule} from 'node:vm';
import {readFile,readdir} from 'node:fs/promises';
import {isBuiltin} from 'node:module';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
export async function verifyAppModules(root){
 if(!SourceTextModule)throw new Error('Run with node --experimental-vm-modules');
 root=path.resolve(root);const modules=new Map(),builtins=new Map();
 const local=async file=>{const id=pathToFileURL(file).href;if(!modules.has(id)){const source=await readFile(file,'utf8');if(file.endsWith('.json')){const value=JSON.parse(source);modules.set(id,new SyntheticModule(['default'],function(){this.setExport('default',value);},{identifier:id}));}else modules.set(id,new SourceTextModule(source,{identifier:id}));}return modules.get(id);};
 const link=async(specifier,reference)=>{
  if(isBuiltin(specifier)){if(!builtins.has(specifier)){const namespace=await import(specifier),names=Object.keys(namespace);builtins.set(specifier,new SyntheticModule(names,function(){for(const name of names)this.setExport(name,namespace[name]);},{identifier:specifier}));}return builtins.get(specifier);}
  if(!specifier.startsWith('.'))throw new Error('Unexpected external module '+specifier+' in '+reference.identifier);
  const target=fileURLToPath(new URL(specifier,reference.identifier)),relative=path.relative(root,target);if(relative.startsWith('..')||path.isAbsolute(relative))throw new Error('Module leaves app directory: '+specifier);return local(target);
 };
 const walk=async dir=>{const files=[];for(const e of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory())files.push(...await walk(file));else if(/\.(mjs|js|json)$/.test(e.name))files.push(file);}return files;};
 // Preload before linking; concurrent links can otherwise create duplicate module records.
 const files=[...await walk(path.join(root,'src')),...await walk(path.join(root,'public'))];for(const file of files)await local(file);
 const entry=await local(path.join(root,'src/server.mjs'));await entry.link(link);
 for(const module of modules.values())if(module.status==='unlinked')await module.link(link);
 return {modules:modules.size,entry:'src/server.mjs'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const result=await verifyAppModules(process.argv[2]||path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));console.log('App module imports/exports verified: '+result.modules+' modules; no application code executed.');}catch(e){console.error('Incomplete or incompatible PV Lab files: '+e.message);process.exitCode=1;}
}
