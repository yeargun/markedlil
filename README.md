# @itslil/marked

A [LilScript](https://github.com/yeargun/lilscript) implementation of the synchronous parsing API of [`marked@18.0.10`](https://github.com/markedjs/marked): `parse`, `parseInline`, `marked()`, and option handling. It matches the original's HTML on the 660-case GFM and CommonMark corpus.

**[Website and live benchmark](https://yeargun.github.io/markedlil/)** · **[Full comparison and methodology](COMPARISON.md)**

## Current build versus original minified Marked

Each size row uses a separate LilScript compilation targeting that compression objective. The original is the smallest measured output for that metric among Terser, esbuild and Oxc. Sizes are bytes.

| Objective | LilScript | Original minified | Smaller |
|---|---:|---:|---:|
| Raw | 31,834 | 42,650 | 25.4% |
| Gzip-9 | 9,834 | 12,530 | 21.5% |
| Brotli-11 | 8,851 | 11,488 | 23.0% |

Parsing a 537,310-character document with the Brotli-objective ESM, compared with original minified Marked:

| Browser | Original minified | @itslil/marked | Less parse time |
|---|---:|---:|---:|
| Chromium 139 | 125.20 ms | 92.80 ms | 25.9% |
| Firefox 144 | 160.00 ms | 147.00 ms | 8.1% |

These are medians of three fresh-page medians on a shared machine, with alternating parser order and warmup samples discarded. Individual runs vary. [COMPARISON.md](COMPARISON.md) includes the independent README workload, longer warmup, all codec sizes, build times, and links to every timing sample.

The website and measurements use the current repository artifacts. npm releases are published separately; download the measured [Brotli-objective ESM](site/comparison-artifacts/lilscript-brotli.mjs), [gzip-objective ESM](site/comparison-artifacts/lilscript-gzip.mjs), or [raw-objective ESM](site/comparison-artifacts/lilscript-raw.mjs).

## Usage

```sh
npm install @itslil/marked
```

```js
import { marked } from "@itslil/marked"

document.body.innerHTML = marked.parse("# hello")
```

Marked does not sanitize HTML. Run a sanitizer on the output when the Markdown is untrusted.

## Supported API

| Name | Behavior |
|---|---|
| `parse(src, opt?)` | Block Markdown to HTML |
| `parseInline(src, opt?)` | Inline Markdown to HTML |
| `marked(src, opt?)` | Same as `parse`; rejects non-string input |
| `marked.parse` | The `marked` function |
| `marked.parseInline` | Same as `parseInline` |
| `setOptions(opt)` / `options(opt)` | Mutate live defaults; return `marked` |
| `marked.setOptions` / `marked.options` | The same option setters |
| `getDefaults()` | A fresh factory object: `gfm: true`, other options false |
| `defaults` / `marked.defaults` | The live options object |

Public option names stay exact in ESM, CommonJS and UMD: `gfm`, `breaks`, `pedantic`, `silent`, and `async`. Parsing is synchronous; `async` remains false. Pedantic grammar takes precedence over GFM and breaks. The original's extension API, `use()`, Hooks, `walkTokens`, Renderer/Tokenizer subclassing and `Marked` class are outside this port's supported API.

## Validation and builds

The three objective artifacts pass 38,127 scoped parity checks. Package tests cover ESM, CommonJS and UMD, all eight gfm/breaks/pedantic combinations, escaping, Unicode edges, nested markup and repeated parses. This does not establish complete upstream API equivalence.

```sh
npm ci
npm test
npm run check:site
npm run check:pack
```

To rebuild package artifacts, set `LILSCRIPT_COMPILER` to a compatible compiler executable and run `npm run build`. The project uses one worker and an explicit 2-billion-unit logical-work budget. All runtime files are compiler outputs; no JavaScript post-minifier is used. [Build receipts and compiler identity](site/comparison-builds.json) describe the independently measured objective builds.

To repeat runtime measurements, install Playwright's browsers and run:

```sh
npx playwright install chromium firefox
npm run bench
ENGINE=firefox npm run bench
DOCUMENT=node_modules/marked/README.md BATCH=12 npm run bench
```

`npm run bench` uses the exact website artifacts and the shared browser harness. It writes samples and artifact hashes under `reports/`. Set `INCLUDE_SPEC=1` to also time the full 660-case workload. [All recorded runtime samples](site/runtime.json) are checked into the repository.

## License

MIT. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md). Marked is copyright Christopher Jeffrey / MarkedJS.
