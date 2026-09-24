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

function compileLil(compiler, configName, outputName) {
  run(compiler, [
    resolve(root, "src", "entry.lil"),
    "--target",
    "js-module",
    "--config",
    resolve(root, configName),
    "-o",
    resolve(dist, outputName),
  ])
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
  compileLil(compiler, "lilscript.toml", "marked.raw.js")
  compileLil(compiler, "lilscript.closed.toml", "marked.closed.js")
  compileLil(compiler, "lilscript.gzip.toml", "marked.gzip.js")
  compileLil(compiler, "lilscript.bytes.toml", "marked.bytes.js")
}


compileIfRequested()
mkdirSync(dist, { recursive: true })

const rawPath = resolve(dist, "marked.raw.js")
if (!existsSync(rawPath)) {
  throw new Error("dist/marked.raw.js is missing. Run with --compile after building LilScript.")
}

// Every delivered file is the compiler's own artifact. No minifier or bundler
// runs after the compiler: the ESM is its output under the license banner, and
// the CommonJS and browser files are that same output with only the trailing
// export clause swapped for `exports` getters or a `marked` global.
const raw = readFileSync(rawPath, "utf8").trimEnd()
const { body, bindings } = splitExportClause(raw)

writeFileSync(resolve(dist, "marked.esm.js"), `${banner}${raw}\n`)
writeFileSync(resolve(dist, "marked.cjs"), `${banner}${commonJs(body, bindings)}\n`)
writeFileSync(resolve(dist, "marked.umd.js"), `${banner}${browserGlobal(body, bindings)}\n`)

copyFileSync(resolve(root, "types", "marked.d.ts"), resolve(dist, "marked.d.ts"))
console.log("wrote dist/marked.esm.js, dist/marked.cjs, dist/marked.umd.js from the compiler's output")

/// The compiler ends a module with one `export{local as name,...}` clause and
/// imports nothing. Anything else is a shape these wrappers do not understand,
/// so the build stops rather than guess.
function splitExportClause(source) {
  if (/^\s*import[\s{*"']/.test(source)) {
    throw new Error("compiler artifact imports a module; the CJS and browser wrappers cannot carry it")
  }
  const match = source.match(/;?export\s*\{([^}]*)\}\s*;?$/)
  if (!match) throw new Error("compiler artifact does not end with a named export clause")
  const bindings = match[1].split(",").map((entry) => {
    const [local, exported = local] = entry.trim().split(/\s+as\s+/)
    return { local, exported }
  })
  const body = source.slice(0, match.index)
  return { body: body.endsWith(";") ? body : `${body};`, bindings }
}

/// Getters keep ES module live-binding semantics, as a bundler's CJS would.
function commonJs(body, bindings) {
  const getters = bindings.map(({ local, exported }) => `${exported}:()=>${local}`).join(",")
  return `"use strict";${body}Object.defineProperty(exports,"__esModule",{value:!0});for(let[k,g]of Object.entries({${getters}}))Object.defineProperty(exports,k,{enumerable:!0,get:g});`
}

/// A strict-mode function scope keeps the module's top-level names off the page.
function browserGlobal(body, bindings) {
  const marked = bindings.find(({ exported }) => exported === "default") ?? bindings.find(({ exported }) => exported === "marked")
  if (!marked) throw new Error("compiler artifact exports neither `default` nor `marked`")
  return `(()=>{"use strict";${body}globalThis.marked=${marked.local}})();`
}
