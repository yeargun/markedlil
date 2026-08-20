import assert from "node:assert/strict"
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
      "results.json",
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
    assert.ok(closed.brotli11 < library.brotli11)
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
})
