import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { test } from "node:test"
import { fileURLToPath, pathToFileURL } from "node:url"
import { createContext, runInContext } from "node:vm"
import { marked as original } from "marked"

const artifact = process.env.MARKED_TEST_ARTIFACT ?? fileURLToPath(new URL("../dist/marked.esm.js", import.meta.url))
const current = await import(pathToFileURL(artifact).href)
const implementations = [["esm", current]]
if (!process.env.MARKED_TEST_ARTIFACT) {
  implementations.push(["cjs", createRequire(import.meta.url)("../dist/marked.cjs")])
  const browser = createContext({})
  runInContext(readFileSync(new URL("../dist/marked.umd.js", import.meta.url), "utf8"), browser)
  implementations.push(["umd", browser.marked])
}
const optionSets = [{}]
for (const gfm of [false, true]) {
  for (const breaks of [false, true]) {
    for (const pedantic of [false, true]) optionSets.push({ gfm, breaks, pedantic })
  }
}

function compare(source, options) {
  const label = `${JSON.stringify(options)} ${JSON.stringify(source).slice(0, 240)}`
  const inline = original.parseInline(source, options)
  const block = original.parse(source, options)
  for (const [name, implementation] of implementations) {
    assert.equal(implementation.parseInline(source, options), inline, `${name} inline ${label}`)
    assert.equal(implementation.parse(source, options), block, `${name} block ${label}`)
  }
}

const entities = "&amp; &copy; &unknown; &under_score; &#0; &#1234567; &#12345678; &#xabcdef; &#xabcdef0; &#X00FFFF; &; &#; &#x; && < > \" ' "

test("HTML escaping distinguishes entities from literal ampersands", () => {
  for (const options of optionSets) {
    for (const source of [entities, `**${entities}**`, `[label](url "${entities.replaceAll('"', "&quot;")}")`]) {
      compare(source, options)
    }
  }
})

test("code escaping preserves sparse and dense text, including UTF-16 edges", () => {
  for (const source of [
    "plain 🧪 text ".repeat(2000) + "<&>\"'\ud800\udfff",
    "<&>\"'🧪".repeat(2000),
    entities.repeat(200),
  ]) {
    const markdown = `~~~text\n${source}\n~~~\n`
    const expected = original.parse(markdown)
    for (const [name, implementation] of implementations) assert.equal(implementation.parse(markdown), expected, name)
  }
})

test("inline dispatch preserves matches after every ASCII leading character", () => {
  const tails = ["word", "*em*", "[link](https://example.com)", "<a@b.example>", "`code`", "~del~", "\\\nnext", "  \nnext"]
  for (const options of optionSets) {
    for (let code = 0; code < 128; code++) {
      for (const tail of tails) compare(String.fromCharCode(code) + tail, options)
    }
  }
})

test("inline dispatch preserves nested, incomplete, and Unicode constructs", () => {
  const sources = [
    "", "\\*text*", "\\", "\\\nnext", " \nnext", "  \nnext", "\nnext", "\t\nnext",
    "[link](url \"title\")", "![*alt*](image.png)", "[ref][id]\n\n[id]: /path",
    "[ref]", "![ref]", "[unclosed", "[a [b](url)](url)", "![`alt`](url)",
    "<https://example.com>", "<user@example.com>", "<!-- *comment* -->", "<span>*text*</span>",
    "<code>&amp; *raw*</code>", "<a href='/'>https://example.com</a>", "<unclosed",
    "***strong and em***", "__strong__", "a_b_c", "~~~unclosed", "~one~ ~~two~~",
    "`one`", "`` `two` ``", "``unclosed", "www.example.com &copy;",
    "🧪*em*", "中_文_", "\ud800*em*\udfff", "\u2028*em*", "\u00a0\nnext",
  ]
  for (const options of optionSets) {
    for (const source of sources) {
      compare(source, options)
      compare(`before ${source} after`, options)
    }
  }
})

test("successive parses isolate child storage and regular-expression state", () => {
  const sources = [
    entities, "plain text", "~~~\n<&>\n~~~", "&amp;", "", '"quote"',
    "- [ ] first\n- [x] second\n  - **nested**", "- loose\n\n  second paragraph\n\n- final",
    "| a | b |\n| :- | -: |\n| *x* | `y` |", "[link](url) ![alt](image.png)",
    "> quoted\n>\n> - child", "# Heading\n\n**strong** and _emphasis_",
  ]
  for (let round = 0; round < 20; round++) {
    for (const source of sources) compare(source, optionSets[round % optionSets.length])
  }
})
