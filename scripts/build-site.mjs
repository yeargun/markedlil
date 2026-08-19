import { bundleOfficialParseOnly } from "./official-parse-bundle.mjs"
import { cp, mkdir, rm, writeFile } from "node:fs/promises"
import { existsSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const output = join(root, "_site")

if (!existsSync(join(root, "dist", "marked.esm.js"))) {
  const built = spawnSync(process.execPath, [join(root, "scripts", "build.mjs"), "--compile"], {
    cwd: root,
    stdio: "inherit",
  })
  if (built.status !== 0) process.exit(built.status ?? 1)
}

if (!existsSync(join(root, "site", "results.json"))) {
  writeFileSync(
    join(root, "site", "results.json"),
    `${JSON.stringify(
      {
        pin: "marked@18.0.10",
        package: "@itslil/marked",
        codec: "lilscript-codec gzip-9 / brotli-11",
        size: [],
        throughput: [],
      },
      null,
      2,
    )}\n`,
  )
}

await rm(output, { recursive: true, force: true })
await mkdir(output, { recursive: true })
await cp(join(root, "site"), output, { recursive: true })
await cp(join(root, "dist", "marked.esm.js"), join(output, "marked.js"))
await writeFile(join(output, "marked-official.js"), await bundleOfficialParseOnly(root))
await writeFile(join(output, ".nojekyll"), "")
console.log(`Built GitHub Pages site at ${output}`)
