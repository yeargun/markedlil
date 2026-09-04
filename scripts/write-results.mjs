import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const sizes = JSON.parse(readFileSync(join(root, "reports", "sizes.json"), "utf8"))
let bench = { suites: [], browser: null, warmupDiscard: 2, loops: 10, interleaved: false }
try {
  bench = JSON.parse(readFileSync(join(root, "reports", "bench.json"), "utf8"))
} catch {
  // Playwright bench is optional until e2e/run.mjs has been run.
}
let compilerComparison = null
try {
  compilerComparison = JSON.parse(
    readFileSync(join(root, "site", "results.json"), "utf8"),
  ).compilerComparison ?? null
} catch {
  // Compiler history is additive and may not exist in a fresh checkout.
}

const officialOxc =
  sizes.lanes.find((lane) => lane.id === "parse-oxc-mangle") ??
  sizes.lanes.find((lane) => lane.baseline)
const parseRaw = sizes.lanes.find((lane) => lane.id === "parse")
const itslil = sizes.lanes.find((lane) => lane.primary)
const itslilGzip = sizes.lanes.find((lane) => lane.id === "itslil-gzip")
const itslilBytes = sizes.lanes.find((lane) => lane.id === "itslil-bytes")

const results = {
  pin: sizes.pin,
  package: sizes.package,
  node: sizes.node,
  codec: sizes.codec,
  comparison: sizes.comparison ?? null,
  browser: bench.browser ?? null,
  warmupDiscard: bench.warmupDiscard ?? 2,
  loops: bench.loops ?? 10,
  interleaved: bench.interleaved ?? false,
  spec: bench.spec ?? null,
  size: sizes.lanes
    .filter((lane) => !lane.diagnostic && lane.id !== "full")
    .map((lane) => ({
      id: lane.id,
      name: lane.name,
      raw: lane.raw,
      gzip9: lane.gzip9,
      brotli11: lane.brotli11,
      note: lane.note,
      primary: lane.primary,
      baseline: lane.baseline,
      diagnostic: lane.diagnostic,
      costModel: lane.costModel ?? null,
    })),
  matched: sizes.matched ?? null,
  throughput: (bench.suites ?? []).filter((row) => row.id !== "full"),
  hero: {
    brotliRatio: itslil && officialOxc ? itslil.brotli11 / officialOxc.brotli11 : null,
    officialBrotli: officialOxc?.brotli11 ?? null,
    itslilBrotli: itslil?.brotli11 ?? null,
    gzipRatio: itslilGzip && officialOxc ? itslilGzip.gzip9 / officialOxc.gzip9 : null,
    officialGzip: officialOxc?.gzip9 ?? null,
    itslilGzip: itslilGzip?.gzip9 ?? null,
    rawRatio: itslilBytes && officialOxc ? itslilBytes.raw / officialOxc.raw : null,
    officialRaw: officialOxc?.raw ?? null,
    itslilRaw: itslilBytes?.raw ?? null,
    parseRawBrotli: parseRaw?.brotli11 ?? null,
  },
  ...(compilerComparison ? { compilerComparison } : {}),
}

writeFileSync(join(root, "site", "results.json"), `${JSON.stringify(results, null, 2)}\n`)
console.log("wrote site/results.json")
