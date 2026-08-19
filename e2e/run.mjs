import { chromium } from "playwright"
import { createServer } from "node:http"
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"
import { marked as officialMarked } from "marked"
import { parse as lilParse } from "../dist/marked.esm.js"
import { corpusMarkdown, loadSpecCases } from "../scripts/spec.mjs"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const lanesDir = join(root, ".tmp", "lanes")
const sizesPath = join(root, "reports", "sizes.json")

if (!existsSync(sizesPath) || !existsSync(join(lanesDir, "itslil.js")) || !existsSync(join(lanesDir, "parse.js"))) {
  const measured = spawnSync(process.execPath, [join(root, "scripts", "measure.mjs")], {
    cwd: root,
    stdio: "inherit",
  })
  if (measured.status !== 0) process.exit(measured.status ?? 1)
}

const sizes = JSON.parse(readFileSync(sizesPath, "utf8"))
const cases = loadSpecCases()
const spec = { total: cases.length, pass: 0, fail: [] }
for (const test of cases) {
  const officialHtml = officialMarked.parse(test.markdown)
  let lilHtml
  try {
    lilHtml = lilParse(test.markdown)
  } catch (error) {
    spec.fail.push({ example: test.example, section: test.section, error: String(error) })
    continue
  }
  if (officialHtml === lilHtml) spec.pass++
  else spec.fail.push({ example: test.example, section: test.section, file: test.file })
}
const passing = cases.filter((test) => {
  try {
    return lilParse(test.markdown) === officialMarked.parse(test.markdown)
  } catch {
    return false
  }
})
const documentCorpus = corpusMarkdown(passing)
const heavyDocument = Array.from({ length: 32 }, () => documentCorpus).join("\n\n")
const specCases = passing.map((test) => test.markdown)
const inlineCorpus = passing
  .map((test) => test.markdown.replace(/\n{2,}/g, " ").trim())
  .filter((src) => src.length > 0 && src.length < 400)
  .slice(0, 180)
  .join("\n")

const pageHtml = `<!doctype html>
<html>
  <body>
    <script type="module">
      window.__pageError = null;
      window.addEventListener("error", (event) => {
        window.__pageError = String(event.error || event.message);
      });
      const params = new URLSearchParams(location.search);
      const lane = params.get("lane");
      try {
        const mod = await import("/lane/" + lane + ".js");
        const parse = resolveParse(mod);
        const parseInline = resolveParseInline(mod);
        const corpus = await (await fetch("/corpus.json")).json();
        const html = parse(corpus.document);
        const inlineHtml = parseInline(corpus.inline);
        window.__ready = { parse, parseInline, corpus, html, inlineHtml };
      } catch (error) {
        window.__pageError = String(error && error.stack ? error.stack : error);
      }

      function resolveParse(mod) {
        if (typeof mod.parse === "function") return (src) => mod.parse(src);
        if (typeof mod.marked === "function") {
          return (src) => (mod.marked.parse ? mod.marked.parse(src) : mod.marked(src));
        }
        const def = mod.default;
        if (typeof def === "function") return (src) => (def.parse ? def.parse(src) : def(src));
        if (def && typeof def.parse === "function") return (src) => def.parse(src);
        throw new Error("no parse export");
      }

      function resolveParseInline(mod) {
        if (typeof mod.parseInline === "function") return (src) => mod.parseInline(src);
        if (mod.marked && typeof mod.marked.parseInline === "function") {
          return (src) => mod.marked.parseInline(src);
        }
        const def = mod.default;
        if (def && typeof def.parseInline === "function") return (src) => def.parseInline(src);
        return (src) => resolveParse(mod)(src);
      }
    </script>
  </body>
</html>`

function serve() {
  return new Promise((resolveListen) => {
    const server = createServer((req, res) => {
      const url = req.url.split("?")[0]
      if (url === "/corpus.json") {
        res.writeHead(200, { "content-type": "application/json" })
        res.end(JSON.stringify({
          document: documentCorpus,
          heavy: heavyDocument,
          cases: specCases,
          inline: inlineCorpus,
        }))
        return
      }
      if (url.startsWith("/lane/") && url.endsWith(".js")) {
        const id = url.slice("/lane/".length, -".js".length)
        const file = join(lanesDir, `${id}.js`)
        if (!existsSync(file)) {
          res.writeHead(404)
          res.end("missing lane")
          return
        }
        res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" })
        res.end(readFileSync(file))
        return
      }
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" })
      res.end(pageHtml)
    })
    server.listen(0, "127.0.0.1", () => resolveListen(server))
  })
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

async function timeSuite(page, kind, loops) {
  return page.evaluate(
    async ({ kind, loops }) => {
      const { parse, parseInline, corpus } = window.__ready
      const fn =
        kind === "inline"
          ? () => parseInline(corpus.inline)
          : kind === "spec"
            ? () => {
                for (let round = 0; round < 40; round++) {
                  for (const src of corpus.cases) parse(src)
                }
              }
            : () => parse(corpus.heavy)
      fn()
      const samples = []
      for (let i = 0; i < loops; i++) {
        const start = performance.now()
        fn()
        samples.push(performance.now() - start)
      }
      return samples
    },
    { kind, loops },
  )
}

const warmupDiscard = 3
const loops = 10
const server = await serve()
const { port } = server.address()
const browser = await chromium.launch()
const officialHtml = { document: null, inline: null }
const suites = []

for (const lane of sizes.lanes) {
  const page = await browser.newPage()
  page.on("pageerror", (error) => console.error(lane.id, error))
  await page.goto(`http://127.0.0.1:${port}/?lane=${encodeURIComponent(lane.id)}`)
  await page.waitForFunction(() => window.__ready || window.__pageError)
  const pageError = await page.evaluate(() => window.__pageError)
  if (pageError) {
    throw new Error(`${lane.id} page error: ${pageError}`)
  }
  const html = await page.evaluate(() => ({
    document: window.__ready.html,
    inline: window.__ready.inlineHtml,
  }))
  if (lane.id === "parse") {
    officialHtml.document = html.document
    officialHtml.inline = html.inline
  } else if (html.document !== officialHtml.document) {
    throw new Error(`${lane.id} document HTML diverged from parse-only marked@18.0.10`)
  } else if (html.inline !== officialHtml.inline) {
    throw new Error(`${lane.id} inline HTML diverged from parse-only marked@18.0.10`)
  }

  const documentSamples = await timeSuite(page, "document", loops)
  const specSamples = await timeSuite(page, "spec", loops)
  await page.close()
  suites.push({
    id: lane.id,
    name: lane.name,
    primary: lane.primary,
    documentMs: median(documentSamples.slice(warmupDiscard)),
    specMs: median(specSamples.slice(warmupDiscard)),
    htmlOk: true,
  })
}

await browser.close()
server.close()

const official = suites.find((row) => row.id === "parse")
const report = {
  generatedAt: new Date().toISOString(),
  browser: "playwright-chromium",
  pin: "marked@18.0.10",
  warmupDiscard,
  loops,
  spec,
  corpus: {
    documentChars: documentCorpus.length,
    heavyChars: heavyDocument.length,
    specCases: passing.length,
  },
  suites: suites.map((row) => ({
    ...row,
    documentRatio: row.documentMs / official.documentMs,
    specRatio: row.specMs / official.specMs,
  })),
}

mkdirSync(join(root, "reports"), { recursive: true })
mkdirSync(join(root, "e2e-out"), { recursive: true })
writeFileSync(join(root, "reports", "bench.json"), `${JSON.stringify(report, null, 2)}\n`)
writeFileSync(join(root, "e2e-out", "report.json"), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))

const writeResults = spawnSync(process.execPath, [join(root, "scripts", "write-results.mjs")], {
  cwd: root,
  stdio: "inherit",
})
if (writeResults.status !== 0) process.exit(writeResults.status ?? 1)
