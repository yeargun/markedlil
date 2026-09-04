import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { describe, it } from "node:test"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const site = resolve(root, "_site")

describe("github pages artifact", () => {
  it("ships the landing page, both parsers, and results", () => {
    for (const path of [
      "index.html",
      "styles.css",
      "app.js",
      "compiler-comparison.js",
      "results.json",
      "bench.js",
      "corpus.json",
      "marked.js",
      "marked-official.js",
      ".nojekyll",
    ]) {
      assert.equal(existsSync(resolve(site, path)), true, path)
    }
  })

  it("exposes the published package name and fair minify lanes", () => {
    const html = readFileSync(resolve(site, "index.html"), "utf8")
    assert.match(html, /@itslil\/marked/)
    assert.match(html, /Oxc/)
    assert.match(html, /Terser/)
    assert.match(html, /mangle/)
    assert.match(html, /parse path/)
    assert.match(html, /use\(\)/)
    assert.match(html, /extern_fields/)
    assert.match(html, /[Cc]losed LilScript/)
    assert.match(html, /cost_model/)
    assert.match(html, /Brotli-11/)
    assert.match(html, /gzip-9/)
    assert.doesNotMatch(html, /npm’s full/)
    assert.doesNotMatch(html, /listed last as a diagnostic/)
  })

  it("compares Brotli, gzip, and raw from matching LilScript compiles", () => {
    const html = readFileSync(resolve(site, "index.html"), "utf8")
    assert.match(html, /id="body-brotli"/)
    assert.match(html, /id="body-gzip"/)
    assert.match(html, /id="body-raw"/)
    assert.match(html, /id="body-matched"/)
    const results = JSON.parse(readFileSync(resolve(site, "results.json"), "utf8"))
    const library = results.size.find((lane) => lane.id === "itslil")
    const gzip = results.size.find((lane) => lane.id === "itslil-gzip")
    const bytes = results.size.find((lane) => lane.id === "itslil-bytes")
    const closed = results.size.find((lane) => lane.id === "itslil-closed")
    const oxc = results.size.find((lane) => lane.id === "parse-oxc-mangle")
    assert.equal(library.primary, true)
    assert.equal(library.costModel, "brotli")
    assert.equal(gzip.costModel, "gzip")
    assert.equal(bytes.costModel, "raw")
    assert.ok(library.brotli11 < oxc.brotli11)
    assert.ok(gzip.gzip9 < oxc.gzip9)
    assert.ok(bytes.raw < oxc.raw)
    assert.ok(closed.brotli11 <= library.brotli11)
    assert.equal(results.hero.itslilBrotli, library.brotli11)
    assert.equal(results.hero.itslilGzip, gzip.gzip9)
    assert.equal(results.hero.itslilRaw, bytes.raw)
    assert.equal(results.matched.brotli11, library.brotli11)
    assert.equal(results.matched.gzip9, gzip.gzip9)
    assert.equal(results.matched.raw, bytes.raw)
  })

  it("races the official parse path, not published marked.esm.js", () => {
    const official = readFileSync(resolve(site, "marked-official.js"), "utf8")
    assert.match(official, /export/)
    assert.doesNotMatch(official, /function use\(/)
    assert.doesNotMatch(official, /\.use\s*=/)
    assert.doesNotMatch(official, /class Marked/)
  })

  it("does not point the playground at the repo-root dist path", () => {
    const app = readFileSync(resolve(site, "app.js"), "utf8")
    assert.match(app, /from ["']\.\/marked\.js["']/)
    assert.doesNotMatch(app, /\/dist\/marked/)
  })

  it("lets a reader run the benchmark instead of trusting it", () => {
    const html = readFileSync(resolve(site, "index.html"), "utf8")
    assert.match(html, /id="verify"/)
    assert.match(html, /id="verify-run"/)
    assert.match(html, /id="verify-out"/)
    const app = readFileSync(resolve(site, "app.js"), "utf8")
    assert.match(app, /from ["']\.\/bench\.js["']/)
    assert.match(app, /bindVerify\(\)/)
    const checked = spawnSync(process.execPath, ["--check", resolve(site, "bench.js")], { encoding: "utf8" })
    assert.equal(checked.status, 0, checked.stderr)
  })

  it("links the source of every speed number to GitHub", () => {
    const html = readFileSync(resolve(site, "index.html"), "utf8")
    for (const path of ["e2e/run.mjs", "site/bench.js", "scripts/spec.mjs", "reports/bench.json"]) {
      assert.match(html, new RegExp(`https://github\\.com/yeargun/markedlil/blob/main/${path.replace(/[/.]/g, "\\$&")}`), path)
    }
  })

  it("ships the corpus the browser benchmark measures, and the harness agrees with it", () => {
    const corpus = JSON.parse(readFileSync(resolve(site, "corpus.json"), "utf8"))
    assert.equal(corpus.pass, corpus.total)
    assert.equal(corpus.cases.length, corpus.pass)
    assert.ok(corpus.cases.length >= 660, `only ${corpus.cases.length} spec cases survived`)
    assert.equal(corpus.document, corpus.cases.join("\n\n"))
    assert.equal(corpus.pin, "marked@18.0.10")
  })

  it("does not print a speed claim the recorded run does not carry", () => {
    const results = JSON.parse(readFileSync(resolve(site, "results.json"), "utf8"))
    if (results.throughput.length === 0) return
    const official = results.throughput.find((row) => row.id === "parse")
    const lil = results.throughput.find((row) => row.id === "itslil")
    assert.ok(official && lil, "both lanes are measured")
    // Lanes that are the same program through different minifiers bound the
    // noise: no claim about LilScript is worth more than the disagreement
    // between rows that should be identical.
    const officialLanes = results.throughput.filter((row) => row.id.startsWith("parse"))
    for (const suite of ["documentMs", "specMs"]) {
      const times = officialLanes.map((row) => row[suite])
      const spread = (Math.max(...times) - Math.min(...times)) / Math.min(...times)
      const claim = (official[suite] - lil[suite]) / official[suite]
      if (claim > 0) {
        assert.ok(
          claim > spread,
          `${suite}: claiming ${(claim * 100).toFixed(1)}% faster while identical official lanes disagree by ${(spread * 100).toFixed(1)}%`,
        )
      }
    }
  })

  it("publishes a frozen compiler baseline with provenance", () => {
    const results = JSON.parse(readFileSync(resolve(site, "results.json"), "utf8"))
    const comparison = results.compilerComparison
    const before = comparison.runs.find((run) => run.role === "before")
    assert.equal(comparison.schemaVersion, 1)
    assert.equal(comparison.objective, "brotli11")
    assert.deepEqual(before.artifact.sizes, { raw: 35985, gzip9: 10766, brotli11: 9589 })
    assert.match(before.source.revision, /^[0-9a-f]{40}$/)
    assert.match(before.artifact.sha256, /^[0-9a-f]{64}$/)
    assert.deepEqual(before.timing.samples, [])
    assert.match(readFileSync(resolve(site, "index.html"), "utf8"), /id="compiler-comparison"/)
    assert.match(readFileSync(resolve(root, "scripts/write-results.mjs"), "utf8"), /compilerComparison/)
    const checked = spawnSync(process.execPath, ["--check", resolve(site, "compiler-comparison.js")], { encoding: "utf8" })
    assert.equal(checked.status, 0, checked.stderr)
  })
})
