import {mkdir,readFile,writeFile,rename,appendFile,readdir,unlink,stat,lstat} from 'node:fs/promises';
import path from 'node:path';
import {isGzip,decodeBytes,verifiedGzip,gzipBytes} from './compression.mjs';
export class Storage {
  constructor(dir) {this.dir=dir;this.queue=Promise.resolve();this.bytes=0;this.packed=new Set();}
  async init(){await mkdir(this.dir,{recursive:true});}
  async read(name,fallback){try{return JSON.parse(await readFile(path.join(this.dir,name),'utf8'));}catch(e){if(e.code==='ENOENT')return structuredClone(fallback);throw new Error(`Nie można odczytać ${name}; plik zachowano do odzyskania.`);}}
  async atomic(name,value){const p=path.join(this.dir,name),text=JSON.stringify(value);const task=this.queue.then(async()=>{await writeFile(p+'.tmp',text,{mode:0o600});await rename(p+'.tmp',p);});this.queue=task.catch(()=>{});return task;}
  async journal(kind,row){const name=`${kind}-${new Date(row.at).toISOString().slice(0,10)}.jsonl`,p=path.join(this.dir,name),text=JSON.stringify(row)+'\n';const task=this.queue.then(async()=>{if(['forecast','published'].includes(kind)){await this.packFile(name);await appendFile(p,await gzipBytes(Buffer.from(text),{level:6}),{mode:0o600});}else await appendFile(p,text,{mode:0o600});});this.queue=task.catch(()=>{});return task;}
  async packFile(name){if(this.packed.has(name))return;const p=path.join(this.dir,name);let original;try{original=await readFile(p);}catch(e){if(e.code==='ENOENT')return;throw e;}if(isGzip(original)){this.packed.add(name);return;}const packed=await verifiedGzip(original);await writeFile(p+'.tmp',packed,{mode:0o600});await rename(p+'.tmp',p);this.packed.add(name);}
  async compressForecastArchives(){const task=this.queue.then(async()=>{let count=0,before=0,after=0;for(const name of await readdir(this.dir)){if(!/^(forecast|published)-\d{4}-\d{2}-\d{2}\.jsonl$/.test(name))continue;const p=path.join(this.dir,name),old=await readFile(p);before+=old.length;if(!isGzip(old)){await this.packFile(name);count++;}after+=(await stat(p)).size;}return {count,beforeBytes:before,afterBytes:after};});this.queue=task.catch(()=>{});return task;}
  async load(kind,days){const since=Date.now()-days*86400000, rows=[];for(const name of (await readdir(this.dir)).filter(n=>n.startsWith(kind+'-')&&n.endsWith('.jsonl')).sort()){
    const day=Date.parse(name.slice(kind.length+1,kind.length+11));if(day+86400000<since)continue;
    const original=await readFile(path.join(this.dir,name)),decoded=await decodeBytes(original,{recoverTail:true}),lines=decoded.bytes.toString('utf8').split('\n'),good=[];
    if(decoded.truncated){await writeFile(path.join(this.dir,name+'.partial'),original,{mode:0o600});}
    for(let i=0;i<lines.length;i++){if(!lines[i])continue;try{const r=JSON.parse(lines[i]);good.push(lines[i]);if(r.at>=since)rows.push(r);}catch(e){if(i!==lines.length-1)throw new Error(`Uszkodzony dziennik ${name}, wiersz ${i+1}.`);
      // Save a crash-truncated last record separately so subsequent appends cannot corrupt the journal.
      if(!decoded.truncated)await writeFile(path.join(this.dir,name+'.partial'),lines[i]);const repaired=Buffer.from(lines.slice(0,i).join('\n')+'\n');await writeFile(path.join(this.dir,name)+'.tmp',isGzip(original)?await verifiedGzip(repaired):repaired,{mode:0o600});await rename(path.join(this.dir,name)+'.tmp',path.join(this.dir,name));}}
    if(decoded.truncated){await writeFile(path.join(this.dir,name)+'.tmp',await verifiedGzip(Buffer.from(good.join('\n')+(good.length?'\n':''))),{mode:0o600});await rename(path.join(this.dir,name)+'.tmp',path.join(this.dir,name));}
  }return rows;}
  async prune(c){let bytes=0;for(const name of await readdir(this.dir)){const days=name.startsWith('sample-')?c.retention.samplesDays:name.startsWith('forecast-')||name.startsWith('published-')?c.retention.forecastsDays:name.startsWith('revision-')?c.retention.revisionsDays:null;const p=path.join(this.dir,name);if(name.startsWith('sample-')&&name.endsWith('.partial')&&c.retention.voltageHours===0){await unlink(p);continue;}if(days!==null&&Date.parse(name.split('-').slice(1).join('-').slice(0,10))+86400000<Date.now()-days*86400000){await unlink(p);continue;}
    if(/^sample-.*\.jsonl$/.test(name)){const lines=(await readFile(p,'utf8')).split('\n');let changed=false;const out=[];for(const line of lines){if(!line)continue;let row;try{row=JSON.parse(line);}catch{throw new Error(`Uszkodzony dziennik ${name}; retencja nie zmieniła jego zawartości.`);}const clean=withoutExpiredVoltage(row,c);if(clean!==row)changed=true;out.push(JSON.stringify(clean));}if(changed){await writeFile(p+'.tmp',out.join('\n')+'\n');await rename(p+'.tmp',p);}}
    bytes+=(await stat(p)).size;}this.bytes=bytes;}
  async usage(codeDir){return {dataBytes:await directoryBytes(this.dir),codeBytes:codeDir?await directoryBytes(codeDir,new Set([path.resolve(this.dir)])):0,at:Date.now()};}
  async files(){const files=await Promise.all((await readdir(this.dir)).filter(n=>!['integration-key.json','influx-credentials.json','ai-private.json'].includes(n)&&!n.endsWith('.tmp')).map(async name=>{try{const info=await lstat(path.join(this.dir,name));if(!info.isFile())return null;let compressed=false;if(/^(forecast|published)-.*\.jsonl$/.test(name)){const {open}=await import('node:fs/promises'),handle=await open(path.join(this.dir,name),'r');try{const b=Buffer.alloc(3);await handle.read(b,0,3,0);compressed=isGzip(b);}finally{await handle.close();}}return {name,bytes:info.size,compressed};}catch(e){if(e.code==='ENOENT')return null;throw e;}}));return files.filter(Boolean);}

}
export function withoutExpiredVoltage(row,c,now=Date.now()){
  if(!Array.isArray(row.voltages)||c.retention.voltageHours>0&&row.at>=now-c.retention.voltageHours*3600000)return row;
  const {voltages,...rest}=row;return {...rest,voltageFlag:row.voltageFlag||(voltages.some(v=>v===null)?'missing':voltages.some(v=>v>=c.quality.voltageWarning)?'high':'normal'),voltageThreshold:row.voltageThreshold||c.quality.voltageWarning};
}

export async function directoryBytes(dir,excluded=new Set()){let total=0;for(const name of await readdir(dir)){const file=path.resolve(dir,name);if(excluded.has(file)||['.git','__pycache__','node_modules'].includes(name))continue;try{const info=await lstat(file);if(info.isSymbolicLink())continue;if(info.isDirectory())total+=await directoryBytes(file,excluded);else if(info.isFile())total+=info.size;}catch(e){if(e.code!=='ENOENT')throw e;}}return total;}
