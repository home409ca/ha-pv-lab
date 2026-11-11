import {mkdir,readFile,writeFile,rename,appendFile,readdir,unlink,stat} from 'node:fs/promises';
import path from 'node:path';
export class Storage {
  constructor(dir) {this.dir=dir;this.queue=Promise.resolve();this.bytes=0;}
  async init(){await mkdir(this.dir,{recursive:true});}
  async read(name,fallback){try{return JSON.parse(await readFile(path.join(this.dir,name),'utf8'));}catch(e){if(e.code==='ENOENT')return structuredClone(fallback);throw new Error(`Nie można odczytać ${name}; plik zachowano do odzyskania.`);}}
  async atomic(name,value){const p=path.join(this.dir,name);await writeFile(p+'.tmp',JSON.stringify(value));await rename(p+'.tmp',p);}
  async journal(kind,row){const name=`${kind}-${new Date(row.at).toISOString().slice(0,10)}.jsonl`;await appendFile(path.join(this.dir,name),JSON.stringify(row)+'\n');}
  async load(kind,days){const since=Date.now()-days*86400000, rows=[];for(const name of (await readdir(this.dir)).filter(n=>n.startsWith(kind+'-')&&n.endsWith('.jsonl')).sort()){
    const day=Date.parse(name.slice(kind.length+1,kind.length+11));if(day+86400000<since)continue;
    const lines=(await readFile(path.join(this.dir,name),'utf8')).split('\n');
    for(let i=0;i<lines.length;i++){if(!lines[i])continue;try{const r=JSON.parse(lines[i]);if(r.at>=since)rows.push(r);}catch(e){if(i!==lines.length-1)throw new Error(`Uszkodzony dziennik ${name}, wiersz ${i+1}.`);
      // Save a crash-truncated last record separately so subsequent appends cannot corrupt the journal.
      await writeFile(path.join(this.dir,name+'.partial'),lines[i]);await writeFile(path.join(this.dir,name),lines.slice(0,i).join('\n')+'\n');}}
  }return rows;}
  async prune(c){let bytes=0;for(const name of await readdir(this.dir)){const days=name.startsWith('sample-')?c.retention.samplesDays:name.startsWith('forecast-')||name.startsWith('published-')?c.retention.forecastsDays:name.startsWith('revision-')?c.retention.revisionsDays:null;const p=path.join(this.dir,name);if(name.startsWith('sample-')&&name.endsWith('.partial')&&c.retention.voltageHours===0){await unlink(p);continue;}if(days!==null&&Date.parse(name.split('-').slice(1).join('-').slice(0,10))+86400000<Date.now()-days*86400000){await unlink(p);continue;}
    if(/^sample-.*\.jsonl$/.test(name)){const lines=(await readFile(p,'utf8')).split('\n');let changed=false;const out=[];for(const line of lines){if(!line)continue;let row;try{row=JSON.parse(line);}catch{throw new Error(`Uszkodzony dziennik ${name}; retencja nie zmieniła jego zawartości.`);}const clean=withoutExpiredVoltage(row,c);if(clean!==row)changed=true;out.push(JSON.stringify(clean));}if(changed){await writeFile(p+'.tmp',out.join('\n')+'\n');await rename(p+'.tmp',p);}}
    bytes+=(await stat(p)).size;}this.bytes=bytes;}
  async files(){return Promise.all((await readdir(this.dir)).filter(n=>n!=='integration-key.json'&&!n.endsWith('.tmp')).map(async name=>({name,bytes:(await stat(path.join(this.dir,name))).size})));}
}
export function withoutExpiredVoltage(row,c,now=Date.now()){
  if(!Array.isArray(row.voltages)||c.retention.voltageHours>0&&row.at>=now-c.retention.voltageHours*3600000)return row;
  const {voltages,...rest}=row;return {...rest,voltageFlag:row.voltageFlag||(voltages.some(v=>v===null)?'missing':voltages.some(v=>v>=c.quality.voltageWarning)?'high':'normal'),voltageThreshold:row.voltageThreshold||c.quality.voltageWarning};
}
