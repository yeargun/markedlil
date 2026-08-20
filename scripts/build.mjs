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

// The shipped ESM is the compiler's own artifact. Re-bundling it costs bytes for
// nothing: a bundler re-prints the compiler's chosen declaration layout as one
// `var` per binding and cannot improve on names it must preserve.
writeFileSync(
  resolve(dist, "marked.esm.js"),
  `${banner}${readFileSync(rawPath, "utf8").trimEnd()}\n`,
)

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
