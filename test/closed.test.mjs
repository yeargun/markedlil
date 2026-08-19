import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { describe, it } from "node:test"
import { marked as officialMarked } from "marked"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const closedPath = resolve(root, "dist/marked.closed.js")

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
