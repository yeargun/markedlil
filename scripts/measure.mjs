import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { measureFile } from "./codec.mjs"
import { minifyLanes } from "./minify-lanes.mjs"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const officialPath = join(root, "node_modules/marked/lib/marked.esm.js")
const lilPath = join(root, "dist/marked.esm.js")
const lanesDir = join(root, ".tmp", "lanes")

mkdirSync(lanesDir, { recursive: true })

const officialSource = readFileSync(officialPath, "utf8")
const minified = await minifyLanes(officialSource, "marked.esm.js")

const artifacts = [
  {
    id: "official",
    name: "Official marked.esm.js",
    note: "published unminified ESM from marked@18.0.10",
    sourcePath: officialPath,
  },
  {
    id: "oxc-mangle",
    name: "Official · Oxc mangle on",
    note: "Vite 8 Oxc minify, mangle: true",
    code: minified["oxc-mangle"],
  },
  {
    id: "oxc-nomangle",
    name: "Official · Oxc mangle off",
    note: "Vite 8 Oxc minify, mangle: false",
    code: minified["oxc-nomangle"],
  },
  {
    id: "terser-mangle",
    name: "Official · Terser mangle on",
    note: "Terser compress + mangle: true",
    code: minified["terser-mangle"],
  },
  {
    id: "terser-nomangle",
    name: "Official · Terser mangle off",
    note: "Terser compress + mangle: false",
    code: minified["terser-nomangle"],
  },
  {
    id: "itslil",
    name: "@itslil/marked",
    note: "LilScript compiler-selected ESM, not post-minified",
    sourcePath: lilPath,
    primary: true,
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
  lanes: measured,
}

mkdirSync(join(root, "reports"), { recursive: true })
writeFileSync(join(root, "reports", "sizes.json"), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
