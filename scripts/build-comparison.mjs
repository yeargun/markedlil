import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const hash=value=>createHash('sha256').update(value).digest('hex');
export function verifyComparison(root){
 const data=JSON.parse(readFileSync(join(root,'site/comparison.json'),'utf8'));
 if(data.schemaVersion!==4 || data.objectives.length!==3)throw Error('Expected three objective builds');
 const seen=new Set();
 for(const row of data.objectives){
  if(seen.has(row.objective))throw Error('Duplicate objective');seen.add(row.objective);
  for(const artifact of [row.lilscript,row.original]){
   const bytes=readFileSync(join(root,'site',artifact.artifact));
   if(hash(bytes)!==artifact.sha256 || bytes.length!==artifact.sizes.raw)throw Error(`Artifact changed: ${artifact.artifact}`);
  }
  const config=readFileSync(join(root,'site',row.lilscript.config),'utf8');
  if(hash(config)!==row.lilscript.configSha256 || !config.includes(`codecs = "${row.objective}"`))throw Error('Objective/config mismatch');
 }
 for(const row of data.minifiers){if(hash(readFileSync(join(root,'site',row.artifact)))!==row.sha256)throw Error('Upstream artifact changed')}
 const runtimeFile=readFileSync(join(root,'site',data.runtime.artifact));
 if(hash(runtimeFile)!==data.runtime.sha256)throw Error('Runtime evidence changed');
 const runtime=JSON.parse(runtimeFile);
 const brotli=data.objectives.find(row=>row.objective==='brotli');
 for(const [key,expected] of [['lilscript',brotli.lilscript],['original',brotli.original]]){
  const artifact=runtime[key];
  if(artifact.sha256!==expected.sha256 || hash(readFileSync(join(root,'site',artifact.artifact)))!==artifact.sha256)throw Error(`Timed artifact changed: ${key}`);
 }
 if(hash(readFileSync(join(root,'dist/marked.esm.js')))!==runtime.lilscript.sha256)throw Error('Package ESM differs from timed ESM');
 const receipt=JSON.parse(readFileSync(join(root,'site/comparison-builds.json')));
 for(const source of receipt.sourceInputs.modules){
  if(hash(readFileSync(join(root,source.repositoryPath)))!==source.sha256)throw Error(`Compared source changed: ${source.repositoryPath}`);
 }
 if(hash(readFileSync(join(root,'site',receipt.sourceArchive.artifact)))!==receipt.sourceArchive.sha256)throw Error('Source archive changed');
 return data;
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 verifyComparison(resolve(process.argv[2]??'.'));console.log('All objective artifacts and configuration hashes match');
}
