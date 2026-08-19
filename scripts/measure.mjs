import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { measureFile } from "./codec.mjs"
import { minifyLanes } from "./minify-lanes.mjs"
import { bundleOfficialParseOnly } from "./official-parse-bundle.mjs"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const lilPath = join(root, "dist/marked.esm.js")
const closedPath = join(root, "dist/marked.closed.js")
const licenseBanner = `${readFileSync(lilPath, "utf8").split("\n", 1)[0]}\n`
const lanesDir = join(root, ".tmp", "lanes")
const parseOnlyPath = join(root, ".tmp", "official-parse-only.js")

mkdirSync(lanesDir, { recursive: true })
mkdirSync(join(root, ".tmp"), { recursive: true })

const parseOnlySource = await bundleOfficialParseOnly(root)
writeFileSync(parseOnlyPath, parseOnlySource)

const parseMinified = await minifyLanes(parseOnlySource, "marked.parse-only.js")

const artifacts = [
  {
    id: "parse",
    name: "Parse-only official",
    note: "marked@18.0.10 Lexer/Parser/Tokenizer/Renderer only — no use(), Hooks, or walkTokens",
    sourcePath: parseOnlyPath,
  },
  {
    id: "parse-oxc-mangle",
    name: "Parse-only · Oxc mangle on",
    note: "Vite 8 Oxc minify of the parse-only 18.0.10 sources, mangle: true",
    code: parseMinified["oxc-mangle"],
    baseline: true,
  },
  {
    id: "parse-oxc-nomangle",
    name: "Parse-only · Oxc mangle off",
    note: "Vite 8 Oxc minify of the parse-only 18.0.10 sources, mangle: false",
    code: parseMinified["oxc-nomangle"],
  },
  {
    id: "parse-terser-mangle",
    name: "Parse-only · Terser mangle on",
    note: "Terser compress of the parse-only 18.0.10 sources, mangle: true",
    code: parseMinified["terser-mangle"],
  },
  {
    id: "parse-terser-nomangle",
    name: "Parse-only · Terser mangle off",
    note: "Terser compress of the parse-only 18.0.10 sources, mangle: false",
    code: parseMinified["terser-nomangle"],
  },
  {
    id: "itslil",
    name: "@itslil/marked",
    note: "JS library: extern class pins gfm / breaks / parse and the rest of the marked 18.0.10 object shape. Compiler-selected ESM, not post-minified.",
    sourcePath: lilPath,
    primary: true,
  },
  {
    id: "itslil-closed",
    name: "@itslil/marked · closed LilScript",
    note: "Same program with [mangle] extern_fields = false. Those public JS keys mangle. This is the size if callers were LilScript, not a JS options object. Not the npm file.",
    code: `${licenseBanner}${readFileSync(closedPath, "utf8").trimEnd()}\n`,
  },
]

const measured = []
for (const artifact of artifacts) {
  const outPath = join(lanesDir, `${artifact.id}.js`)
  if (artifact.sourcePath) {
    copyFileSync(artifact.sourcePath, outPath)
  } else {
    writeFileSync(outPath, artifact.code)
  }
  measured.push({
    id: artifact.id,
    name: artifact.name,
    note: artifact.note,
    primary: Boolean(artifact.primary),
    baseline: Boolean(artifact.baseline),
    diagnostic: Boolean(artifact.diagnostic),
    path: outPath,
    ...measureFile(outPath),
  })
}

const report = {
  generatedAt: new Date().toISOString(),
  node: process.version,
  pin: "marked@18.0.10",
  package: "@itslil/marked",
  codec: "lilscript-codec gzip-9 / brotli-11",
  comparison:
    "Every size and speed lane is the same surface: marked@18.0.10 Lexer/Parser/Tokenizer/Renderer (no use/Hooks/walkTokens), then Oxc or Terser, versus this port. @itslil/marked is the JS library (extern fields on). The closed LilScript lane turns that pin off. The published npm marked file is not a lane — it still contains the extension system.",
  lanes: measured,
}

mkdirSync(join(root, "reports"), { recursive: true })
writeFileSync(join(root, "reports", "sizes.json"), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
