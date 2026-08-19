import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")

const specFiles = ["gfm.0.29.json", "commonmark.0.31.2.json"]

export function loadSpecCases() {
  const cases = []
  for (const file of specFiles) {
    const path = resolve(root, "test", "specs", file)
    for (const test of JSON.parse(readFileSync(path, "utf8"))) {
      if (test.shouldFail) continue
      cases.push({
        file,
        example: test.example,
        section: test.section,
        markdown: test.markdown,
        html: test.html,
      })
    }
  }
  return cases
}

export function corpusMarkdown(cases = loadSpecCases()) {
  return cases.map((test) => test.markdown).join("\n\n")
}

export function resolveParse(mod) {
  if (typeof mod.parse === "function") return (src, opt) => mod.parse(src, opt)
  if (typeof mod.marked === "function") {
    return (src, opt) => (mod.marked.parse ? mod.marked.parse(src, opt) : mod.marked(src, opt))
  }
  const def = mod.default
  if (typeof def === "function") {
    return (src, opt) => (def.parse ? def.parse(src, opt) : def(src, opt))
  }
  if (def && typeof def.parse === "function") return (src, opt) => def.parse(src, opt)
  throw new Error("module has no parse export")
}
