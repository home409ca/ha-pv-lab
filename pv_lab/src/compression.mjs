import {gzip,gunzip,constants,createGzip} from 'node:zlib';
import {promisify} from 'node:util';
import {Readable} from 'node:stream';
export const gzipBytes=promisify(gzip),gunzipBytes=promisify(gunzip);
export const isGzip=b=>b.length>=3&&b[0]===31&&b[1]===139&&b[2]===8;
export async function decodeBytes(b,{recoverTail=false}={}){if(!isGzip(b))return {bytes:b,truncated:false};try{return {bytes:await gunzipBytes(b),truncated:false};}catch(e){if(!recoverTail||e.code!=='Z_BUF_ERROR')throw e;return {bytes:await gunzipBytes(b,{finishFlush:constants.Z_SYNC_FLUSH}),truncated:true};}}
export async function verifiedGzip(bytes){const packed=await gzipBytes(bytes,{level:6});if(!(await gunzipBytes(packed)).equals(bytes))throw new Error('Nie udało się zweryfikować kompresji; oryginał pozostaje bez zmian.');return packed;}
// Stream root arrays by record: export never needs one enormous JSON string.
export function exportStream(value){return Readable.from((async function*(){yield '{';let first=true;for(const [key,v] of Object.entries(value)){if(v===undefined)continue;if(!first)yield ',';first=false;yield JSON.stringify(key)+':';if(Array.isArray(v)){yield '[';for(let i=0;i<v.length;i++){if(i)yield ',';yield JSON.stringify(v[i])??'null';}yield ']';}else yield JSON.stringify(v);}yield '}';})());}
export const exportGzip=()=>createGzip({level:6});
