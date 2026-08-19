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
    assert.doesNotMatch(html, /npm’s full/)
    assert.doesNotMatch(html, /listed last as a diagnostic/)
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
