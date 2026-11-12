import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Storage} from '../src/storage.mjs';
test('trwały zapis, odtworzenie i zachowanie uszkodzonego pliku',async()=>{const dir=await mkdtemp(path.join(os.tmpdir(),'pv-lab-test-'));try{const s=new Storage(dir);await s.init();await s.atomic('model.json',{version:1,n:3});assert.deepEqual(await s.read('model.json',{}),{version:1,n:3});const at=Date.now();await s.journal('sample',{at,power:123});assert.equal((await s.load('sample',1))[0].power,123);await writeFile(path.join(dir,'model.json'),'{broken');await assert.rejects(s.read('model.json',{}));assert.equal(await readFile(path.join(dir,'model.json'),'utf8'),'{broken');}finally{await rm(dir,{recursive:true,force:true});}});
test('urwany ostatni zapis po awarii nie psuje późniejszych dopisków',async()=>{const dir=await mkdtemp(path.join(os.tmpdir(),'pv-lab-recovery-'));try{const s=new Storage(dir);await s.init();const at=Date.now(),name=`sample-${new Date(at).toISOString().slice(0,10)}.jsonl`;await writeFile(path.join(dir,name),JSON.stringify({at,power:1})+'\n{"at":');assert.equal((await s.load('sample',1)).length,1);await s.journal('sample',{at:at+1,power:2});assert.equal((await s.load('sample',1)).length,2);assert.equal(await readFile(path.join(dir,name+'.partial'),'utf8'),'{"at":');}finally{await rm(dir,{recursive:true,force:true});}});
