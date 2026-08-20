import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { createContext, runInContext } from "node:vm"
import { describe, it } from "node:test"
import { marked as officialMarked } from "marked"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const optionKeys = ["async", "breaks", "gfm", "pedantic", "silent"]
const apiNames = ["parse", "parseInline", "setOptions", "options", "getDefaults", "defaults"]
const source = readFileSync(resolve(root, "dist/marked.esm.js"), "utf8")

function loadUmd() {
  const context = createContext({ globalThis: {} })
  context.globalThis = context
  runInContext(readFileSync(resolve(root, "dist/marked.umd.js"), "utf8"), context)
  return context.marked
}

function optionRecord(value) {
  return {
    gfm: value.gfm,
    breaks: value.breaks,
    pedantic: value.pedantic,
    silent: value.silent,
    async: value.async,
  }
}

function assertLibrarySurface(mod, label) {
  assert.equal(typeof mod.parse, "function", `${label}.parse`)
  assert.equal(typeof mod.parseInline, "function", `${label}.parseInline`)
  assert.equal(typeof mod.setOptions, "function", `${label}.setOptions`)
  assert.equal(typeof mod.options, "function", `${label}.options`)
  assert.equal(typeof mod.getDefaults, "function", `${label}.getDefaults`)
  assert.equal(typeof mod.marked, "function", `${label}.marked`)
  assert.equal(mod.default, mod.marked, `${label}.default`)
  assert.equal(mod.marked.parse, mod.marked, `${label}.marked.parse`)
  assert.equal(typeof mod.marked.parseInline, "function", `${label}.marked.parseInline`)
  assert.equal(typeof mod.marked.setOptions, "function", `${label}.marked.setOptions`)
  assert.equal(mod.marked.options, mod.marked.setOptions, `${label}.marked.options`)
  assert.equal(typeof mod.marked.getDefaults, "function", `${label}.marked.getDefaults`)
  assert.deepEqual(Object.keys(mod.getDefaults()).sort(), optionKeys, `${label}.getDefaults keys`)
  assert.deepEqual(Object.keys(mod.marked.defaults).sort(), optionKeys, `${label}.marked.defaults keys`)
  assert.equal(mod.defaults, mod.marked.defaults, `${label}.defaults`)
  assert.deepEqual(optionRecord(mod.getDefaults()), {
    gfm: true,
    breaks: false,
    pedantic: false,
    silent: false,
    async: false,
  })
}

function restore(mod) {
  mod.marked.setOptions({ gfm: true, breaks: false, pedantic: false, silent: false })
}

const esm = await import(new URL("../dist/marked.esm.js", import.meta.url))
const cjs = createRequire(import.meta.url)(resolve(root, "dist/marked.cjs"))
const umd = loadUmd()

describe("@itslil/marked JS library API", () => {
  it("keeps every public parse-path name exact in the compiler output", () => {
    const exports = source.match(/export\{[^}]+\}/)?.[0] ?? ""
    for (const name of ["parse", "parseInline", "setOptions", "options", "getDefaults", "defaults", "marked"]) {
      assert.match(exports, new RegExp(` as ${name}[},]`), `export ${name}`)
    }
    for (const name of ["gfm", "breaks", "pedantic", "silent", "async", ...apiNames]) {
      assert.match(source, new RegExp(`\\.${name}\\s*=`), `.${name} must stay a real member`)
    }
  })

  it("exposes the same parse-path surface on ESM, CJS, and UMD", () => {
    assertLibrarySurface(esm, "esm")
    assertLibrarySurface(cjs, "cjs")
    assert.equal(typeof umd, "function", "umd.marked")
    assert.equal(umd.parse, umd)
    assert.equal(typeof umd.parseInline, "function")
    assert.equal(umd.options, umd.setOptions)
    assert.deepEqual(Object.keys(umd.defaults).sort(), optionKeys)
  })

  it("reads per-call option objects under their real names, including null", () => {
    const samples = [
      [null, "a\nb"],
      [{}, "a\nb"],
      [{ breaks: true }, "a\nb"],
      [{ pedantic: true }, "(c)"],
      [{ gfm: false }, "~~x~~"],
      [{ silent: true }, "# hi"],
    ]
    for (const [options, src] of samples) {
      assert.equal(esm.parse(src, options), officialMarked.parse(src, options), `parse ${JSON.stringify(options)}`)
      assert.equal(esm.marked(src, options), officialMarked.parse(src, options), `marked() ${JSON.stringify(options)}`)
      assert.equal(
        esm.marked.parseInline("**x**", options),
        officialMarked.parseInline("**x**", options),
        `marked.parseInline ${JSON.stringify(options)}`,
      )
    }
  })

  it("lets named and marked.setOptions / options mutate live defaults", () => {
    try {
      assert.equal(esm.setOptions({ breaks: true }), esm.marked)
      assert.equal(esm.marked.defaults.breaks, true)
      assert.equal(esm.defaults.breaks, true)
      assert.equal(esm.parse("a\nb"), officialMarked.parse("a\nb", { breaks: true }))
      assert.equal(esm.options({ breaks: false }), esm.marked)
      assert.equal(esm.marked.defaults.breaks, false)
      assert.equal(cjs.marked.setOptions({ pedantic: true }), cjs.marked)
      assert.equal(cjs.marked.defaults.pedantic, true)
      assert.equal(cjs.parse("(c)"), officialMarked.parse("(c)", { pedantic: true }))
      assert.equal(umd.options({ gfm: false }), umd)
      assert.equal(umd.defaults.gfm, false)
      assert.equal(umd.parseInline("~~x~~"), officialMarked.parseInline("~~x~~", { gfm: false }))
    } finally {
      restore(esm)
      restore(cjs)
      umd.setOptions({ gfm: true, breaks: false, pedantic: false, silent: false })
    }
    assert.equal(esm.parse("a\nb"), officialMarked.parse("a\nb"))
    assert.equal(esm.getDefaults().breaks, false)
    assert.notEqual(esm.getDefaults(), esm.marked.defaults)
  })

  it("rejects a non-string on every marked() entry", () => {
    assert.throws(() => esm.marked(1), /marked\(\): input must be a string/)
    assert.throws(() => cjs.marked(1), /marked\(\): input must be a string/)
    assert.throws(() => umd(1), /marked\(\): input must be a string/)
  })
})
