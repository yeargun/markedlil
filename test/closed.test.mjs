import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { describe, it } from "node:test"
import { marked as officialMarked } from "marked"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const closedPath = resolve(root, "dist/marked.closed.js")
const gzipPath = resolve(root, "dist/marked.gzip.js")
const bytesPath = resolve(root, "dist/marked.bytes.js")

describe("@itslil/marked closed LilScript lane", () => {
  it("is compiled next to the library artifact", () => {
    assert.equal(existsSync(closedPath), true, "dist/marked.closed.js")
  })

  it("mangles the JS option keys and keeps default parse working", async () => {
    const source = readFileSync(closedPath, "utf8")
    assert.doesNotMatch(source, /\.gfm\s*=/)
    assert.doesNotMatch(source, /\.breaks\s*=/)
    const closed = await import(pathToFileURL(closedPath).href)
    assert.equal(closed.parse("# hi"), officialMarked.parse("# hi"))
    const keys = Object.keys(closed.getDefaults()).sort()
    assert.notDeepEqual(keys, ["async", "breaks", "gfm", "pedantic", "silent"])
  })
})

describe("@itslil/marked codec-specific compiles", () => {
  it("keeps the marked option keys on gzip and raw cost models", async () => {
    assert.equal(existsSync(gzipPath), true, "dist/marked.gzip.js")
    assert.equal(existsSync(bytesPath), true, "dist/marked.bytes.js")
    for (const path of [gzipPath, bytesPath]) {
      const source = readFileSync(path, "utf8")
      assert.match(source, /\.gfm\s*=/)
      assert.match(source, /\.breaks\s*=/)
      const artifact = await import(`${pathToFileURL(path).href}?v=${path}`)
      assert.equal(artifact.parse("# hi"), officialMarked.parse("# hi"))
      assert.deepEqual(Object.keys(artifact.getDefaults()).sort(), [
        "async",
        "breaks",
        "gfm",
        "pedantic",
        "silent",
      ])
    }
  })
})
