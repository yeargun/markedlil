import { accessSync, constants } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const lilscriptRoot = process.env.LILSCRIPT_ROOT ?? resolve(root, "..", "lilscript")

export function codecPath() {
  const candidates = [
    process.env.LILSCRIPT_CODEC,
    resolve(lilscriptRoot, "target", "release", "lilscript-codec"),
  ].filter(Boolean)
  for (const candidate of candidates) {
    try {
      accessSync(candidate, constants.X_OK)
      return candidate
    } catch {
      // try next
    }
  }
  throw new Error("lilscript-codec not found. Set LILSCRIPT_CODEC or build lilscript.")
}

export function measureFile(path) {
  const result = spawnSync(codecPath(), ["--json", path], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  })
  if (result.status !== 0) {
    throw new Error(`lilscript-codec failed for ${path}\n${result.stderr || result.stdout}`)
  }
  const parsed = JSON.parse(result.stdout)
  const artifact = parsed.artifacts?.[0] ?? parsed
  return {
    raw: artifact.raw,
    gzip9: artifact.gzip9 ?? artifact.gzip,
    brotli11: artifact.brotli11 ?? artifact.brotli,
  }
}
