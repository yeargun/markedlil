import { transform as esbuildTransform } from "esbuild"
import { minify as terserMinify } from "terser"
import { dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const lilscriptRoot = process.env.LILSCRIPT_ROOT ?? resolve(dirname(fileURLToPath(import.meta.url)), "../..", "lilscript")

async function viteOxcMinify(filename, source, options) {
  const popularVite = resolve(lilscriptRoot, "benchmarks/popular/node_modules/vite/dist/node/index.js")
  try {
    const lab = await import(pathToFileURL(popularVite).href)
    if (typeof lab.minify === "function") {
      return lab.minify(filename, source, options)
    }
  } catch {
    // fall through to the local Vite 8 install
  }
  const vite = await import("vite")
  if (typeof vite.minify !== "function") {
    throw new Error("Vite/Oxc minify needs Vite 8. Use the lilscript popular lab or upgrade vite.")
  }
  return vite.minify(filename, source, options)
}

function requireCode(label, code) {
  if (typeof code !== "string" || code.length === 0) {
    throw new Error(`${label} did not produce JavaScript`)
  }
  return code
}

function formatOxcErrors(errors) {
  return errors
    .map((error) => [error.severity, error.message, error.codeframe].filter(Boolean).join(": "))
    .join("\n")
}

async function oxcLane(source, filename, mangle) {
  const result = await viteOxcMinify(filename, source, {
    module: true,
    compress: true,
    mangle,
    codegen: {
      removeWhitespace: true,
      legalComments: "none",
    },
    sourcemap: false,
  })
  if (result.errors?.length > 0) {
    throw new Error(`Vite/Oxc minification failed:\n${formatOxcErrors(result.errors)}`)
  }
  return requireCode("Vite/Oxc", result.code)
}

async function terserLane(source, mangle) {
  const result = await terserMinify(source, {
    module: true,
    compress: { passes: 3 },
    mangle,
    format: { comments: false },
  })
  return requireCode("Terser", result.code)
}

export async function minifyLanes(source, filename) {
  const [oxcOn, oxcOff, terserOn, terserOff, esbuildResult] = await Promise.all([
    oxcLane(source, filename, true),
    oxcLane(source, filename, false),
    terserLane(source, true),
    terserLane(source, false),
    esbuildTransform(source, {
      sourcefile: filename,
      loader: "js",
      format: "esm",
      target: "esnext",
      minify: true,
      legalComments: "none",
    }),
  ])
  return {
    "oxc-mangle": oxcOn,
    "oxc-nomangle": oxcOff,
    "terser-mangle": terserOn,
    "terser-nomangle": terserOff,
    esbuild: requireCode("esbuild", esbuildResult.code),
  }
}
