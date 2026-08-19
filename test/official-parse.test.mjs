import assert from "node:assert/strict"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { describe, it } from "node:test"
import { marked as officialMarked } from "marked"
import { bundleOfficialParseOnly } from "../scripts/official-parse-bundle.mjs"
import { loadSpecCases, resolveParse } from "../scripts/spec.mjs"

describe("parse-only marked@18.0.10", () => {
  it("matches published marked HTML on the spec corpus", async () => {
    const code = await bundleOfficialParseOnly()
    const file = join(mkdtempSync(join(tmpdir(), "marked-parse-only-")), "entry.mjs")
    writeFileSync(file, code)
    const mod = await import(pathToFileURL(file).href)
    const parse = resolveParse(mod)
    const cases = loadSpecCases()
    const fail = []
    for (const test of cases) {
      const official = officialMarked.parse(test.markdown)
      let html
      try {
        html = parse(test.markdown)
      } catch (error) {
        fail.push({ ...test, error: String(error) })
        continue
      }
      if (official !== html) fail.push(test)
    }
    assert.equal(fail.length, 0, fail.slice(0, 8).map((row) => `${row.file}#${row.example}`).join(", "))
    assert.equal(cases.length, 660)
  })
})
