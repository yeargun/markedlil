import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { describe, it } from "node:test"
import { marked as officialMarked } from "marked"
import { loadSpecCases } from "../scripts/spec.mjs"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const esm = await import(pathToFileURL(resolve(root, "dist/marked.esm.js")).href)
const requireCjs = createRequire(import.meta.url)
const cjs = requireCjs(resolve(root, "dist/marked.cjs"))
const cases = loadSpecCases()
const optionSets = [{}, { breaks: true }, { pedantic: true }, { gfm: false }]

function parseAll(parse, options) {
  const fail = []
  for (const test of cases) {
    let html
    try {
      html = parse(test.markdown, options)
    } catch (error) {
      fail.push(`${test.file}#${test.example} threw ${error}`)
      continue
    }
    if (html !== officialMarked.parse(test.markdown, options)) {
      fail.push(`${test.file}#${test.example}`)
    }
  }
  return fail
}

describe("@itslil/marked options", () => {
  for (const options of optionSets) {
    it(`matches official HTML with ${JSON.stringify(options)}`, () => {
      const fail = parseAll(esm.parse, options)
      assert.equal(fail.length, 0, `${fail.length} of ${cases.length}: ${fail.slice(0, 6).join(", ")}`)
    })
  }

  it("marked() reads the same option object as parse()", () => {
    const fail = parseAll(esm.marked, { breaks: true })
    assert.equal(fail.length, 0, `${fail.length} of ${cases.length}: ${fail.slice(0, 6).join(", ")}`)
  })

  it("matches official parseInline across the corpus", () => {
    const fail = []
    for (const test of cases) {
      const source = test.markdown.replace(/\n{2,}/gu, " ").trim()
      if (source.length === 0 || source.length > 400) continue
      if (esm.parseInline(source) !== officialMarked.parseInline(source)) {
        fail.push(`${test.file}#${test.example}`)
      }
    }
    assert.equal(fail.length, 0, fail.slice(0, 6).join(", "))
  })

  for (const options of optionSets) {
    it(`matches official parseInline with ${JSON.stringify(options)}`, () => {
      const fail = []
      for (const test of cases) {
        const source = test.markdown.replace(/\n{2,}/gu, " ").trim()
        if (source.length === 0 || source.length > 400) continue
        if (esm.parseInline(source, options) !== officialMarked.parseInline(source, options)) {
          fail.push(`${test.file}#${test.example}`)
        }
      }
      assert.equal(fail.length, 0, fail.slice(0, 6).join(", "))
    })
  }
})

describe("@itslil/marked option API", () => {
  it("emits the public option keys, not mangled names", () => {
    const source = readFileSync(resolve(root, "dist/marked.esm.js"), "utf8")
    assert.match(source, /\.gfm\s*=/)
    assert.match(source, /\.breaks\s*=/)
    assert.match(source, /\.pedantic\s*=/)
    assert.match(source, /\.silent\s*=/)
    assert.doesNotMatch(source, /\{n:!0,p:!1,t:!1,u:!1\}/)
  })

  it("reports defaults under their real names", () => {
    const defaults = esm.getDefaults()
    assert.deepEqual(Object.keys(defaults).sort(), ["async", "breaks", "gfm", "pedantic", "silent"])
    assert.equal(defaults.gfm, true)
    assert.equal(defaults.breaks, false)
    assert.equal(defaults.pedantic, false)
    assert.equal(defaults.silent, false)
    assert.equal(defaults.async, false)
  })

  it("CJS getDefaults uses the same keys", () => {
    const defaults = cjs.getDefaults()
    assert.deepEqual(Object.keys(defaults).sort(), ["async", "breaks", "gfm", "pedantic", "silent"])
    assert.equal(defaults.gfm, true)
  })

  it("getDefaults stays the factory after setOptions", () => {
    esm.marked.setOptions({ breaks: true })
    try {
      const factory = esm.getDefaults()
      assert.equal(factory.breaks, false)
      assert.equal(esm.marked.defaults.breaks, true)
    } finally {
      esm.marked.setOptions({ breaks: false })
    }
  })

  it("setOptions changes later parses and refreshes marked.defaults", () => {
    const previous = esm.getDefaults()
    try {
      const returned = esm.marked.setOptions({ breaks: true })
      assert.equal(returned, esm.marked, "setOptions returns marked for chaining")
      assert.equal(esm.marked.defaults.breaks, true)
      assert.equal(esm.parse("a\nb"), officialMarked.parse("a\nb", { breaks: true }))
      assert.equal(esm.marked("a\nb"), officialMarked.parse("a\nb", { breaks: true }))
      assert.equal(esm.marked.options, esm.marked.setOptions)
    } finally {
      esm.marked.setOptions({ ...previous, breaks: false })
    }
    assert.equal(esm.parse("a\nb"), officialMarked.parse("a\nb"))
  })

  it("marked() rejects a non-string", () => {
    assert.throws(() => esm.marked(1), /marked\(\): input must be a string/)
  })
})
