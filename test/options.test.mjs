import assert from "node:assert/strict"
import { dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { describe, it } from "node:test"
import { marked as officialMarked } from "marked"
import { loadSpecCases } from "../scripts/spec.mjs"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const esm = await import(pathToFileURL(resolve(root, "dist/marked.esm.js")).href)
const cases = loadSpecCases()

// The 660-case corpus in compat.test.mjs only ever calls `parse(markdown)`.
// Every option therefore went unmeasured, and `gfm`, `breaks`, and `pedantic`
// each select different tokenizer rules — they are most of the parser's surface,
// not a fringe. Each option is run over the whole corpus against official marked
// under the same option, so a divergence names the first spec case that broke.
describe("@itslil/marked options", () => {
  for (const options of [{}, { breaks: true }, { pedantic: true }, { gfm: false }]) {
    it(`matches official HTML with ${JSON.stringify(options)}`, () => {
      const fail = []
      for (const test of cases) {
        let html
        try {
          html = esm.parse(test.markdown, options)
        } catch (error) {
          fail.push(`${test.file}#${test.example} threw ${error}`)
          continue
        }
        if (html !== officialMarked.parse(test.markdown, options)) {
          fail.push(`${test.file}#${test.example}`)
        }
      }
      assert.equal(fail.length, 0, `${fail.length} of ${cases.length}: ${fail.slice(0, 6).join(", ")}`)
    })
  }

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
})

// `getDefaults` and `setOptions` are the public contract a caller reads and
// writes. Their key names are part of that contract: a consumer inspecting
// `marked.defaults.gfm` is doing something the published package supports.
describe("@itslil/marked option API", () => {
  it("reports defaults under their real names", () => {
    const defaults = esm.getDefaults()
    assert.deepEqual(Object.keys(defaults).sort(), ["async", "breaks", "gfm", "pedantic", "silent"])
    assert.equal(defaults.gfm, true)
    assert.equal(defaults.breaks, false)
  })

  it("setOptions changes later parses and refreshes marked.defaults", () => {
    const previous = esm.getDefaults()
    try {
      const returned = esm.marked.setOptions({ breaks: true })
      assert.equal(returned, esm.marked, "setOptions returns marked for chaining")
      assert.equal(esm.marked.defaults.breaks, true)
      assert.equal(esm.parse("a\nb"), officialMarked.parse("a\nb", { breaks: true }))
      assert.equal(esm.marked.options, esm.marked.setOptions)
    } finally {
      esm.marked.setOptions({ ...previous, breaks: false })
    }
    assert.equal(esm.parse("a\nb"), officialMarked.parse("a\nb"))
  })
})
