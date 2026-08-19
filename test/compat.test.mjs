import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { describe, it } from "node:test"
import { marked as officialMarked } from "marked"
import { loadSpecCases, resolveParse } from "../scripts/spec.mjs"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")

const esm = await import(pathToFileURL(resolve(root, "dist/marked.esm.js")).href)
const parse = resolveParse(esm)

describe("@itslil/marked vs marked@18.0.10", () => {
  it("exports parse, parseInline, and marked()", () => {
    assert.equal(typeof esm.parse, "function")
    assert.equal(typeof esm.parseInline, "function")
    assert.equal(typeof esm.marked, "function")
    assert.equal(esm.marked.parse, esm.marked)
    assert.equal(esm.default, esm.marked)
    assert.equal(parse("# hi"), officialMarked.parse("# hi"))
    assert.equal(esm.parseInline("**x**"), officialMarked.parseInline("**x**"))
    assert.equal(esm.marked("# hi"), officialMarked.parse("# hi"))
  })

  it("ships the compiler-selected compact ESM", () => {
    const source = readFileSync(resolve(root, "dist/marked.esm.js"), "utf8")
    assert.match(source, /@itslil\/marked 18\.0\.10/)
    assert.match(source, /export\s*\{/)
    assert.match(source, / as default/)
    assert.ok(source.split("\n").length <= 8, "ESM must stay compact compiler output plus host")
  })

  it("loads from CommonJS", () => {
    const requireCjs = createRequire(import.meta.url)
    const cjs = requireCjs(resolve(root, "dist/marked.cjs"))
    const cjsParse = resolveParse(cjs)
    assert.equal(cjsParse("# hi"), officialMarked.parse("# hi"))
  })

  it("matches official HTML on GFM and CommonMark spec cases", () => {
    const cases = loadSpecCases()
    const fail = []
    for (const test of cases) {
      const official = officialMarked.parse(test.markdown)
      let lil
      try {
        lil = parse(test.markdown)
      } catch (error) {
        fail.push({ ...test, error: String(error) })
        continue
      }
      if (official !== lil) fail.push(test)
    }
    assert.equal(fail.length, 0, fail.slice(0, 8).map((row) => `${row.file}#${row.example}`).join(", "))
    assert.equal(cases.length, 660)
    const joined = cases.map((test) => test.markdown).join("\n\n")
    assert.equal(parse(joined), officialMarked.parse(joined))
  })
})
