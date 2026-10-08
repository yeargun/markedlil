import { chromium } from "playwright"
import { createServer } from "node:http"
import { readFileSync } from "node:fs"
import { join, resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { loadSpecCases, corpusMarkdown } from "./scripts/spec.mjs"

const root = resolve(dirname(fileURLToPath(import.meta.url)))
const lanesDir = join(root, ".tmp", "lanes")
const doc = corpusMarkdown(loadSpecCases())
const heavy = Array.from({ length: 32 }, () => doc).join("\n\n")

const html = `<!doctype html><html><body><script type="module">
window.__err=null;
const lane=new URLSearchParams(location.search).get("lane");
try{
  const mod=await import("/lane/"+lane+".js");
  const parse = mod.parse ? (s)=>mod.parse(s) : (s)=>mod.marked.parse(s);
  const c=await (await fetch("/corpus.json")).json();
  window.__r={parse,heavy:c.heavy};
}catch(e){window.__err=String(e&&e.stack||e)}
</script></body></html>`

const server = createServer((req,res)=>{
  const u=req.url.split("?")[0]
  if(u==="/corpus.json"){res.writeHead(200,{"content-type":"application/json"});res.end(JSON.stringify({heavy}));return}
  if(u.startsWith("/lane/")){res.writeHead(200,{"content-type":"text/javascript"});res.end(readFileSync(join(lanesDir,u.slice(6))));return}
  res.writeHead(200,{"content-type":"text/html"});res.end(html)
})
await new Promise(r=>server.listen(0,"127.0.0.1",r))
const { port } = server.address()

const LANES = process.argv[2] === "nine"
  ? ["parse","parse-oxc-mangle","parse-oxc-nomangle","parse-terser-mangle","parse-terser-nomangle","itslil","itslil-gzip","itslil-bytes","itslil-closed"]
  : ["parse","itslil"]

const browser = await chromium.launch()
const pages = []
for (const id of LANES) {
  const p = await browser.newPage()
  await p.goto(`http://127.0.0.1:${port}/?lane=${id}`)
  await p.waitForFunction(() => window.__r || window.__err)
  const e = await p.evaluate(() => window.__err)
  if (e) throw new Error(`${id}: ${e}`)
  pages.push({ id, page: p, s: [] })
}
const one = (page, timed) => page.evaluate((timed) => {
  const { parse, heavy } = window.__r
  if (!timed) { parse(heavy); return null }
  const t = performance.now(); parse(heavy); return performance.now() - t
}, timed)

const median = (v) => { const s=[...v].sort((a,b)=>a-b); const m=s.length>>1; return s.length%2?s[m]:(s[m-1]+s[m])/2 }
for (const e of pages) await one(e.page, false)
const LOOPS = 21, DISCARD = 5
for (let i = 0; i < LOOPS; i++)
  for (const e of (i % 2 ? [...pages].reverse() : pages)) e.s.push(await one(e.page, true))

console.log(`\n${LANES.length} lanes open, 1 call x 537k chars, ${LOOPS - DISCARD} counted samples\n`)
const base = pages[0]
const bm = median(base.s.slice(DISCARD))
for (const e of pages) {
  const c = e.s.slice(DISCARD), m = median(c)
  const pct = ((bm - m) / bm) * 100
  console.log(e.id.padEnd(24), `${m.toFixed(1)} ms`.padStart(9),
    `[${Math.min(...c).toFixed(0)}–${Math.max(...c).toFixed(0)}]`.padStart(12),
    e.id === base.id ? "  baseline" : `  ${pct>=0?"+":""}${pct.toFixed(1)}%`)
}
await browser.close(); server.close()
