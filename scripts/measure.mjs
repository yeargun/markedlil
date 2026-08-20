import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { measureFile } from "./codec.mjs"
import { minifyLanes } from "./minify-lanes.mjs"
import { bundleOfficialParseOnly } from "./official-parse-bundle.mjs"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const lilPath = join(root, "dist/marked.esm.js")
const closedPath = join(root, "dist/marked.closed.js")
const gzipPath = join(root, "dist/marked.gzip.js")
const bytesPath = join(root, "dist/marked.bytes.js")
const licenseBanner = `${readFileSync(lilPath, "utf8").split("\n", 1)[0]}\n`
const lanesDir = join(root, ".tmp", "lanes")
const parseOnlyPath = join(root, ".tmp", "official-parse-only.js")

function withBanner(path) {
  return `${licenseBanner}${readFileSync(path, "utf8").trimEnd()}\n`
}

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
    name: "@itslil/marked · cost_model brotli",
    note: "JS library compiled for Brotli. This is the npm ESM. extern class pins the marked 18.0.10 option keys.",
    sourcePath: lilPath,
    primary: true,
    costModel: "brotli",
  },
  {
    id: "itslil-gzip",
    name: "@itslil/marked · cost_model gzip",
    note: "Same library, compiled with javascript.cost_model = gzip. Not the npm file.",
    code: withBanner(gzipPath),
    costModel: "gzip",
  },
  {
    id: "itslil-bytes",
    name: "@itslil/marked · cost_model raw",
    note: "Same library, compiled with javascript.cost_model = raw. Not the npm file.",
    code: withBanner(bytesPath),
    costModel: "raw",
  },
  {
    id: "itslil-closed",
    name: "@itslil/marked · closed LilScript",
    note: "Brotli compile with [mangle] extern_fields = false. Public JS keys mangle. Not the npm file.",
    code: withBanner(closedPath),
    costModel: "brotli",
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
    costModel: artifact.costModel ?? null,
    path: outPath,
    ...measureFile(outPath),
  })
}

const oxc = measured.find((lane) => lane.id === "parse-oxc-mangle")
const brotliBuild = measured.find((lane) => lane.id === "itslil")
const gzipBuild = measured.find((lane) => lane.id === "itslil-gzip")
const rawBuild = measured.find((lane) => lane.id === "itslil-bytes")

const report = {
  generatedAt: new Date().toISOString(),
  node: process.version,
  pin: "marked@18.0.10",
  package: "@itslil/marked",
  codec: "lilscript-codec gzip-9 / brotli-11",
  comparison:
    "Same parse path on every official row: marked@18.0.10 Lexer/Parser/Tokenizer/Renderer, then Oxc or Terser. LilScript ships three compiles — cost_model raw, gzip, and brotli — because the search scores a different artifact for each codec. The npm file is the Brotli compile. The published official marked package is not a lane.",
  matched: {
    raw: rawBuild?.raw ?? null,
    gzip9: gzipBuild?.gzip9 ?? null,
    brotli11: brotliBuild?.brotli11 ?? null,
    vsOxc: {
      raw: oxc && rawBuild ? rawBuild.raw / oxc.raw : null,
      gzip9: oxc && gzipBuild ? gzipBuild.gzip9 / oxc.gzip9 : null,
      brotli11: oxc && brotliBuild ? brotliBuild.brotli11 / oxc.brotli11 : null,
    },
  },
  lanes: measured,
}

mkdirSync(join(root, "reports"), { recursive: true })
writeFileSync(join(root, "reports", "sizes.json"), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
