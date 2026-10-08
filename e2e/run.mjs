// Current repository artifacts, measured with the same harness as the website.
// ENGINE=firefox selects Firefox; EXECUTABLE optionally selects a browser binary.
// DOCUMENT=path BATCH=12 repeats an independent document; default is the 32x corpus.
// REPEATS defaults to three fresh pages. INCLUDE_SPEC=1 also runs the full spec workload.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium,firefox} from 'playwright';
const playwright={chromium,firefox};
const engine=playwright[process.env.ENGINE||'chromium'];
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const site=path.join(root,'site');
const alternateCorpus=process.env.DOCUMENT?JSON.stringify({...JSON.parse(fs.readFileSync(site+'/corpus.json')),document:fs.readFileSync(process.env.DOCUMENT,'utf8')}):null;
const lanes={original:site+'/marked-official.js',lilscript:site+'/marked.js'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/corpus.json'&&alternateCorpus){res.setHeader('content-type','application/json');res.end(alternateCorpus);return;}
 if(url.pathname==='/'){res.setHeader('content-type','text/html');res.end('<!doctype html><title>Marked benchmark</title>');return;}
 const file=url.pathname==='/corpus.json'?site+'/corpus.json':url.pathname==='/bench.js'?site+'/bench.js':lanes[url.pathname.slice(1)];
 if(!file){res.writeHead(404);res.end();return;}
 res.setHeader('content-type',file.endsWith('json')?'application/json':'text/javascript');res.end(fs.readFileSync(file));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await engine.launch({headless:true,...(process.env.EXECUTABLE?{executablePath:process.env.EXECUTABLE}:{}),...(process.env.ENGINE==='firefox'?{}:{args:['--no-sandbox']})});
const rows=[];
const selected=Object.keys(lanes);
try{
 for(let repeat=0;repeat<Number(process.env.REPEATS||3);repeat++){
  const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const result=await page.evaluate(async({selected,repeat,skipSpec,batch})=>{
   const {loadCorpus,runSuite,verify,HARNESS}=await import('/bench.js');
   const corpus=await loadCorpus('/corpus.json');
   const lanes=[];
   for(const id of selected){const mod=await import('/'+id);lanes.push({id,name:id,parse:s=>{if(batch===1||s!==corpus.heavy)return mod.marked.parse(s);let out;for(let n=0;n<batch;n++)out=mod.marked.parse(s);return out}});}
   const verification=verify(lanes,corpus);if(!verification.ok)throw Error(JSON.stringify(verification));
   const expected=lanes[0].parse(corpus.heavy);for(const l of lanes)if(l.parse(corpus.heavy)!==expected)throw Error('Heavy mismatch '+l.id);
   const original=await runSuite({lanes:repeat%2?[...lanes].reverse():lanes,kind:'document',corpus});
   HARNESS.loops=24;HARNESS.warmupDiscard=8;
   const warm=await runSuite({lanes:repeat%2?[...lanes].reverse():lanes,kind:'document',corpus});
   let spec=null;if(repeat===0 && !skipSpec){HARNESS.loops=10;HARNESS.warmupDiscard=3;spec=await runSuite({lanes,kind:'spec',corpus});}
   for(const rows of [original,warm])for(const row of rows){row.ms/=batch;row.min/=batch;row.max/=batch;row.samples=row.samples.map(n=>n/batch)}
   return {repeat,verification,documentBatch:batch,heavyChars:corpus.heavy.length,original,warm,spec,userAgent:navigator.userAgent};
  },{selected,repeat,skipSpec:process.env.INCLUDE_SPEC!=='1',batch:Number(process.env.BATCH||1)});
  rows.push(result);console.log(JSON.stringify(result));await page.close();
 }
 fs.mkdirSync(path.join(root,'reports'),{recursive:true});
 const artifacts=Object.fromEntries(Object.entries(lanes).map(([name,file])=>[name,{file:path.relative(root,file),sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex')}]))
 fs.writeFileSync(path.join(root,'reports',process.env.OUTPUT||`runtime-${process.env.ENGINE||'chromium'}.json`),JSON.stringify({measuredAt:new Date().toISOString(),artifacts,rows},null,2)+'\n');
}finally{await browser.close();server.close();}
