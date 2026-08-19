# @itslil/marked

[marked](https://github.com/markedjs/marked) 18.0.10, reimplemented in [LilScript](https://github.com/yeargun/lilscript) and published as a dependency-free drop-in for `parse` / `parseInline`.

This is **not** the official `marked` package. It is an independent runtime that matches `marked@18.0.10` HTML on the GFM + CommonMark spec corpus (**660 / 660**), in fewer bytes and less time than the official parse path minified by Oxc or Terser.

**Site:** [yeargun.github.io/markedlil](https://yeargun.github.io/markedlil/)

```sh
npm install @itslil/marked
```

```js
import { marked } from "@itslil/marked"

document.body.innerHTML = marked.parse("# hello")
```

Official marked does not sanitize HTML. Neither does this port. Run a sanitizer on the output if the markdown is untrusted.

## Current snapshot

`parse`, `parseInline`, `setOptions`, `getDefaults`. No `use()`, Renderer subclassing, or Tokenizer hooks — LilScript cannot override methods.

## Size

This port does not include marked's extension ABI (`use()`, Hooks, `walkTokens`, the `Marked` class). Comparing it to the published npm `marked.esm.js` is not a same-surface fight: that file still contains the plugin system.

The fair official artifact is the **parse path only** from tagged `v18.0.10` (Lexer, Parser, Tokenizer, Renderer, helpers), bundled, then run through **Oxc** and **Terser** with **mangling on and off**. `@itslil/marked` is the LilScript compiler's own ESM: not bundled, not post-minified, and carrying its license banner. The full npm file is listed last as a diagnostic.

Measured with `lilscript-codec` gzip-9 / Brotli-11.

| Lane | Raw | gzip-9 | Brotli-11 | vs parse-only Oxc |
| --- | ---: | ---: | ---: | ---: |
| Parse-only official | 67,247 | 14,064 | 12,684 | 1.26× |
| Parse-only · Oxc mangle on | 37,022 | 10,930 | 10,092 | 1.00× |
| Parse-only · Oxc mangle off | 47,547 | 12,153 | 11,279 | 1.12× |
| Parse-only · Terser mangle on | 37,725 | 11,045 | 10,138 | 1.00× |
| Parse-only · Terser mangle off | 48,444 | 12,302 | 11,339 | 1.12× |
| **`@itslil/marked`** | **34,015** | **10,347** | **9,318** | **0.92×** |
| npm `marked.esm.js` (full, diagnostic) | 43,018 | 12,992 | 11,907 | 1.18× |

Against the smallest minified official lane, `@itslil/marked` is **7.7% smaller on Brotli-11**, **5.3% smaller on gzip-9**, and **8.1% smaller raw**. Same 660-case HTML, fewer transfer bytes — the compiler ranks whole artifacts under the configured codec rather than shortening statements one at a time.

## Performance

Playwright Chromium. HTML checksummed against parse-only `marked@18.0.10` and against npm `marked@18.0.10` on the spec corpus. Quiet median of 10 samples after discarding the first 3. Ratio is lane / parse-only official (lower is faster).

| Lane | 32× document | 660-case ×40 | vs parse-only |
| --- | ---: | ---: | ---: |
| Parse-only official | 52.5 ms | 67.4 ms | 1.00× |
| Parse-only · Oxc mangle on | 52.7 ms | 67.9 ms | 1.00× |
| Parse-only · Oxc mangle off | 52.5 ms | 67.1 ms | 1.00× |
| Parse-only · Terser mangle on | 52.4 ms | 67.6 ms | 1.00× |
| Parse-only · Terser mangle off | 52.3 ms | 68.0 ms | 1.00× |
| **`@itslil/marked`** | **45.7 ms** | **62.1 ms** | **0.87×** |
| npm `marked.esm.js` (full) | 51.8 ms | 67.5 ms | 0.99× |

The document suite is the joined GFM+CommonMark markdown repeated 32 times (~537 kB); the loop suite parses all 660 spec cases forty times. `@itslil/marked` is the fastest lane in both — **13% faster** than the official parse path on documents and **8% faster** on the spec loop.

```sh
npm test
npm run measure
npx playwright install chromium
npm run bench
```

Oxc minify uses Vite 8 and needs Node `^20.19 || >=22.12`.

## Compatibility

- ESM, CJS, and UMD artifacts
- GFM on by default (`breaks: false`, `pedantic: false`)
- Nested links match published `marked@18.0.10`, not git master
- Spec fixtures live in `test/specs/`
- Parse-only official sources used for the size fight live in `official/marked-18.0.10/`

## License

MIT. See [LICENSE](./LICENSE) and [NOTICE.md](./NOTICE.md). marked is copyright Christopher Jeffrey / MarkedJS.
