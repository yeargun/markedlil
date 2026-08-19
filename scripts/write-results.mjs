import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const sizes = JSON.parse(readFileSync(join(root, "reports", "sizes.json"), "utf8"))
let bench = { suites: [], browser: null, warmupDiscard: 2 }
try {
  bench = JSON.parse(readFileSync(join(root, "reports", "bench.json"), "utf8"))
} catch {
  // Playwright bench is optional until e2e/run.mjs has been run.
}

const officialOxc =
  sizes.lanes.find((lane) => lane.id === "parse-oxc-mangle") ??
  sizes.lanes.find((lane) => lane.baseline)
const parseRaw = sizes.lanes.find((lane) => lane.id === "parse")
const itslil = sizes.lanes.find((lane) => lane.primary)

const results = {
  pin: sizes.pin,
  package: sizes.package,
  node: sizes.node,
  codec: sizes.codec,
  comparison: sizes.comparison ?? null,
  browser: bench.browser ?? null,
  warmupDiscard: bench.warmupDiscard ?? 2,
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
    })),
  throughput: (bench.suites ?? []).filter((row) => row.id !== "full"),
  hero: {
    brotliRatio: itslil && officialOxc ? itslil.brotli11 / officialOxc.brotli11 : null,
    officialBrotli: officialOxc?.brotli11 ?? null,
    itslilBrotli: itslil?.brotli11 ?? null,
    parseRawBrotli: parseRaw?.brotli11 ?? null,
  },
}

writeFileSync(join(root, "site", "results.json"), `${JSON.stringify(results, null, 2)}\n`)
console.log("wrote site/results.json")
