import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { measureFile } from "./codec.mjs"
import { minifyLanes } from "./minify-lanes.mjs"
import { bundleOfficialParseOnly } from "./official-parse-bundle.mjs"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const officialFullPath = join(root, "node_modules/marked/lib/marked.esm.js")
const lilPath = join(root, "dist/marked.esm.js")
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
    note: "LilScript compiler-selected ESM, not post-minified. Same parse API; no extension system.",
    sourcePath: lilPath,
    primary: true,
  },
  {
    id: "full",
    name: "npm marked.esm.js (full)",
    note: "Published marked@18.0.10, already esbuild-minified. Includes use(), Hooks, walkTokens, Marked class.",
    sourcePath: officialFullPath,
    diagnostic: true,
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
    "Fair size lanes are parse-only marked@18.0.10 sources (no use/Hooks/walkTokens), then Oxc and Terser with mangling on and off. npm marked.esm.js is diagnostic: it still contains the extension ABI.",
  lanes: measured,
}

mkdirSync(join(root, "reports"), { recursive: true })
writeFileSync(join(root, "reports", "sizes.json"), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
