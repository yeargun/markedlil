import {
  accessSync,
  constants,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"
import { build as esbuild } from "esbuild"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const lilscriptRoot = process.env.LILSCRIPT_ROOT ?? resolve(root, "..", "lilscript")
const dist = resolve(root, "dist")
const banner =
  "/*! @itslil/marked 18.0.10 | LilScript reimplementation of marked 18.0.10 | MIT */\n"

function compilerPath() {
  const candidates = [
    process.env.LILSCRIPT_COMPILER,
    resolve(lilscriptRoot, "target", "release", "lilscript"),
    resolve(lilscriptRoot, "target", "debug", "lilscript"),
  ].filter(Boolean)
  for (const candidate of candidates) {
    try {
      accessSync(candidate, constants.X_OK)
      return candidate
    } catch {
      // try next
    }
  }
  return null
}

function run(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: root, stdio: "inherit" })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function compileIfRequested() {
  if (!process.argv.includes("--compile") && existsSync(resolve(dist, "marked.raw.js"))) {
    return
  }
  const compiler = compilerPath()
  if (!compiler) {
    throw new Error("LilScript compiler not found. Set LILSCRIPT_COMPILER or build lilscript.")
  }
  mkdirSync(dist, { recursive: true })
  run(compiler, [
    resolve(root, "src", "entry.lil"),
    "--target",
    "js-module",
    "--config",
    resolve(root, "lilscript.toml"),
    "-o",
    resolve(dist, "marked.raw.js"),
  ])
}

const apiWrap = `
function marked(src, opt) {
  if (typeof src !== "string") {
    throw new TypeError("marked(): input must be a string")
  }
  return parse(src, opt)
}
marked.parse = marked
marked.parseInline = parseInline
marked.setOptions = function setMarkedOptions(opt) {
  setOptions(opt)
  marked.defaults = options()
  return marked
}
marked.options = marked.setOptions
marked.getDefaults = getDefaults
marked.defaults = options()
export { marked, parse, parseInline, setOptions, getDefaults, options }
export default marked
`

compileIfRequested()
mkdirSync(dist, { recursive: true })

const rawPath = resolve(dist, "marked.raw.js")
if (!existsSync(rawPath)) {
  throw new Error("dist/marked.raw.js is missing. Run with --compile after building LilScript.")
}

const corePath = resolve(dist, "marked.core.js")
writeFileSync(
  corePath,
  readFileSync(rawPath, "utf8").replace(/from"\.\/host\.ts"/, 'from "../src/host.ts"'),
)

const wrapPath = resolve(dist, "marked.wrap.js")
writeFileSync(
  wrapPath,
  `import { parse, parseInline, setOptions, getDefaults, options } from "./marked.core.js"\n${apiWrap}\n`,
)

await esbuild({
  absWorkingDir: dist,
  entryPoints: [wrapPath],
  outfile: resolve(dist, "marked.esm.js"),
  bundle: true,
  format: "esm",
  platform: "neutral",
  legalComments: "none",
  minifyWhitespace: true,
  minifyIdentifiers: false,
  minifySyntax: false,
  banner: { js: banner },
  logLevel: "error",
})

await esbuild({
  absWorkingDir: dist,
  entryPoints: [resolve(dist, "marked.esm.js")],
  outfile: resolve(dist, "marked.cjs"),
  bundle: true,
  format: "cjs",
  platform: "neutral",
  legalComments: "none",
  minifyWhitespace: true,
  minifyIdentifiers: false,
  minifySyntax: false,
  banner: { js: banner },
  logLevel: "error",
})

await esbuild({
  absWorkingDir: dist,
  entryPoints: [resolve(dist, "marked.esm.js")],
  outfile: resolve(dist, "marked.umd.js"),
  bundle: true,
  format: "iife",
  globalName: "marked",
  footer: {
    js: "globalThis.marked=marked.default||marked.marked||marked;",
  },
  legalComments: "none",
  minifyWhitespace: true,
  minifyIdentifiers: false,
  minifySyntax: false,
  banner: { js: banner },
  logLevel: "error",
})

copyFileSync(resolve(root, "types", "marked.d.ts"), resolve(dist, "marked.d.ts"))
console.log("wrote dist/marked.esm.js, dist/marked.cjs, dist/marked.umd.js")
