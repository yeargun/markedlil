# @itslil/marked



This is **not** the official [`marked`](https://github.com/markedjs/marked) package. It is the **parse path** of `marked@18.0.10` — `parse`, `parseInline`, `setOptions` / `options`, `getDefaults`, `defaults`, and `marked()` — rewritten in [LilScript](https://github.com/yeargun/lilscript).

It matches `marked@18.0.10` HTML on the GFM + CommonMark corpus (**660 / 660**). It does **not** have `use()`, Hooks, `walkTokens`, Renderer/Tokenizer subclassing, or the `Marked` class.

**Site:** [yeargun.github.io/markedlil](https://yeargun.github.io/markedlil/)

```sh
npm install @itslil/marked
```

```js
import { marked } from "@itslil/marked"

document.body.innerHTML = marked.parse("# hello")
```

Official marked does not sanitize HTML. Neither does this port. Run a sanitizer on the output if the markdown is untrusted.

## Why the extension system is gone

LilScript is not JavaScript and is not trying to become JavaScript. It compiles *to* JS. Classes do not override methods. There is no `any`. A plugin ABI that installs user objects onto Lexer/Parser/Renderer cannot be expressed without lying about those rules.

The extension system was not stripped to win a size fight. It is absent because the language cannot host it. There is no plan to grow LilScript until every JavaScript pattern ports.

## What is compared

Every size and speed number on this page is the **same surface**: official `marked@18.0.10` Lexer, Parser, Tokenizer, Renderer, and helpers — the parse-only sources in `official/marked-18.0.10/` — bundled, then run through **Oxc** and **Terser** with mangling on and off, and through **esbuild**'s minifier.

`@itslil/marked` is the LilScript compiler's own ESM: not bundled, not post-minified, license banner included. `dist/marked.cjs` and `dist/marked.umd.js` are the same compiler output with only the trailing export clause swapped (for `exports` getters, or a `globalThis.marked` inside a strict function scope); no minifier or bundler runs after the compiler.

The published npm `marked.esm.js` still contains `use()`, Hooks, `walkTokens`, and the `Marked` class. It is not a lane. Comparing this port to that file would be a different product against a subset.

LilScript scores a different artifact for each `javascript.cost_model`. Official Oxc/Terser rows are one file measured three ways. The LilScript **library** numbers below take raw from the raw compile, gzip from the gzip compile, and Brotli from the Brotli compile. The npm file is the Brotli compile.

- **JS library**. `extern class MarkedOptions` / `MarkedApi` pin `gfm`, `breaks`, `pedantic`, `silent`, `async`, `parse`, `parseInline`, `setOptions`, `options`, `getDefaults`, and `defaults`.
- **Closed LilScript** (`lilscript.closed.toml`, Brotli compile). Not published. It is the lane for a program with no JavaScript options object, whose property names could mangle. The current compiler renames no properties (the old `extern_fields` switch has no effect), so today this file is the npm compile byte for byte.

Measured with `lilscript-codec` gzip-9 / Brotli-11. LilScript lanes include the same license banner.

| Lane | Raw | gzip-9 | Brotli-11 | vs Oxc on that codec |
| --- | ---: | ---: | ---: | ---: |
| Official parse path | 67,247 | 14,064 | 12,684 | — |
| Official parse path · Oxc mangle on | 37,022 | 10,930 | 10,092 | baseline |
| Official parse path · Oxc mangle off | 47,547 | 12,153 | 11,279 | — |
| Official parse path · Terser mangle on | 37,725 | 11,045 | 10,138 | — |
| Official parse path · Terser mangle off | 48,444 | 12,302 | 11,339 | — |
| Official parse path · esbuild minify | 37,572 | 11,256 | 10,362 | — |
| **`@itslil/marked` · matched compiles** | **35,166** | **10,314** | **9,287** | **0.95× / 0.94× / 0.92×** |
| `@itslil/marked` · cost_model brotli (npm) | 36,633 | 10,314 | 9,287 | 0.92× Brotli |
| `@itslil/marked` · cost_model gzip | 36,616 | 10,314 | 9,277 | 0.94× gzip |
| `@itslil/marked` · cost_model raw | 35,166 | 10,648 | 9,577 | 0.95× raw |
| `@itslil/marked` · closed LilScript | 36,633 | 10,314 | 9,287 | 0.92× Brotli |

Against official parse path · Oxc mangle on, the strongest bar on every codec, the matched library compiles are **8.0% smaller on Brotli-11** (805 B), **5.6% smaller on gzip-9** (616 B), and **5.0% smaller raw** (1,856 B). Same 660-case HTML.

The files you install, measured as shipped:

| File | Raw | gzip-9 | Brotli-11 | How it is written |
| --- | ---: | ---: | ---: | --- |
| `dist/marked.esm.js` | 36,633 | 10,314 | 9,287 | compiler output + license banner |
| `dist/marked.cjs` | 36,853 | 10,419 | 9,375 | the same, export clause swapped for `exports` getters |
| `dist/marked.umd.js` | 36,578 | 10,304 | 9,254 | the same, export clause swapped for `globalThis.marked` |

The previous release (compiled by the deleted old compiler route) shipped a 9,263 B Brotli ESM, a 10,277 B gzip compile and a 33,501 B raw compile: 24 B, 37 B and 1,665 B smaller than these. Its CJS and UMD files were esbuild re-prints of about 10,070 B Brotli each.

## Build and compile time

Measured by building both repositories from pinned Git sources on the same host (Azure Standard_B8als_v2, 8 vCPUs, Node 24.11.1), three clean builds each, alternating order; dependency installation excluded. Records: [`comparison/source-build/`](comparison/source-build/).

| Build | Median | Range |
| --- | ---: | ---: |
| `@itslil/marked` package (`node scripts/build.mjs --compile --force`) | 2.68 s | 2.32 – 4.10 s |
| its 4 compiler invocations (Brotli, closed, gzip and raw lanes) | 2.40 s | 2.08 – 3.73 s |
| the compile of the published ESM (`lilscript.toml`) | 1.13 s | 0.79 – 1.31 s |
| marked 18.0.10 repository (`npm run build`) | 6.03 s | 5.83 – 13.42 s |

The two builds produce different outputs, so this is context, not a speedup claim. The previous compiler took 20–24 s per compile.

## Performance

Run it yourself: **<https://yeargun.github.io/markedlil/#verify>** runs this benchmark in your own
browser, on the same corpus with the same statistics, and prints the numbers your machine produces.
Nothing below has to be taken on trust.

Playwright Chromium ([`e2e/run.mjs`](e2e/run.mjs)). HTML checksummed against the official parse path
and against published `marked@18.0.10` on the spec corpus. Quiet median of 10 samples after
discarding the first 3, lanes sampled round-robin with the order alternating each round.

The official rows are the same program through different minifiers. However far apart *they*
land is the noise floor, and no other row is called faster until it clears its own sample range.

| Lane | 32× document | range | document | 660-case ×40 | range | spec loop |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Official parse path | 122.8 ms | 119.1 – 142.3 | baseline | 175.2 ms | 170.1 – 231.4 | baseline |
| Official parse path · Oxc mangle on | 124.8 ms | 120.5 – 134.1 | within noise | 174.1 ms | 169.2 – 232.1 | within noise |
| Official parse path · Oxc mangle off | 123.6 ms | 121.4 – 134.7 | within noise | 172.6 ms | 170.3 – 252.7 | within noise |
| Official parse path · Terser mangle on | 127.0 ms | 123.4 – 140.4 | within noise | 176.4 ms | 173.4 – 235.4 | within noise |
| Official parse path · Terser mangle off | 126.3 ms | 122.2 – 135.8 | within noise | 176.5 ms | 171.1 – 179.4 | within noise |
| Official parse path · esbuild minify | 129.0 ms | 121.5 – 175.5 | within noise | 171.0 ms | 168.8 – 174.0 | within noise |
| **`@itslil/marked`** | **129.9 ms** | **120.3 – 179.6** | **within noise** | **153.4 ms** | **150.3 – 157.4** | **12.4% faster** |

The document suite is the joined GFM+CommonMark markdown repeated 32 times (~537 kB); the loop suite
parses all 660 spec cases forty times. Recorded 2026-09-24 on the current build.

**Spec loop: a real win.** `@itslil/marked` is **12.4% faster**, and its sample range does not touch
the baseline's. (The previous build measured 8.3% on 2026-09-04.)

**Single large document: no win.** The median is ~6% *slower*, but the baseline's own spread covers
it, so the ranges overlap and neither lane can claim the suite. The table says "within noise" rather
than picking a side. If you want the answer for your machine, press the button on the page.

> Earlier releases reported 13% *faster* on the document suite. That number came from a harness that
> measured each lane in its own block, minutes apart, on a burstable host, so drift in the machine
> landed on whichever lane held the floor. The tell was that official lanes which are the *same
> program through different minifiers* disagreed with each other by up to 30% — more than the result
> being claimed. `e2e/run.mjs` now samples the lanes round-robin with the order alternating, the
> official rows agree to within 4%, and the document win does not survive it. The loop-suite win
> does, and is now outside the noise instead of inside it.

```sh
npm test
npm run measure
npx playwright install chromium
npm run bench
```

Oxc minify uses Vite 8 and needs Node `^20.19 || >=22.12`. Numbers move with the machine — the
absolute milliseconds above are from a burstable Azure VM and mean nothing on their own; the
distance between lanes is the result.

## Compatibility

The **JS library** (the npm file) is the only artifact that must keep these names readable after mangling. `test/api.test.mjs` locks the spellings in the compiler output and calls every entry on ESM, CJS, and UMD.

| Name | What it is |
| --- | --- |
| `parse(src, opt?)` | block markdown → HTML |
| `parseInline(src, opt?)` | inline markdown → HTML |
| `marked(src, opt?)` | same as `parse`; throws if `src` is not a string |
| `marked.parse` | the `marked` function |
| `marked.parseInline` | same as `parseInline` |
| `setOptions(opt)` / `options(opt)` | mutate live defaults; return `marked` |
| `marked.setOptions` / `marked.options` | the same pair |
| `getDefaults()` | a fresh factory object (`gfm: true`, others false) |
| `defaults` / `marked.defaults` | the live options object |

Option keys stay exact: `gfm`, `breaks`, `pedantic`, `silent`, `async`. `async` is present and always `false` — this port does not return a Promise. `silent` is accepted; on a thrown parse it matches official's error HTML.

The closed LilScript lane is where these keys would mangle once the compiler renames properties; today it keeps them. It is not the npm file.

- ESM, CJS, and UMD artifacts, all compiler-written
- GFM on by default (`breaks: false`, `pedantic: false`)
- Nested links match published `marked@18.0.10`, not git master
- Spec fixtures live in `test/specs/`
- Official parse-path sources used for the comparison live in `official/marked-18.0.10/`

## License

MIT. See [LICENSE](./LICENSE) and [NOTICE.md](./NOTICE.md). marked is copyright Christopher Jeffrey / MarkedJS.
