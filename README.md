# @itslil/marked

[marked](https://github.com/markedjs/marked) 18.0.10, reimplemented in [LilScript](https://github.com/yeargun/lilscript) and published as a dependency-free drop-in for `parse` / `parseInline`.

This is **not** the official `marked` package. It is an independent runtime that matches `marked@18.0.10` HTML on the GFM + CommonMark spec corpus (**660 / 660**).

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

Reusable package artifacts, measured with `lilscript-codec` gzip-9 / Brotli-11. Official JavaScript is the published `marked.esm.js`, then the same file through **Oxc** and **Terser**, each with **mangling on and off**. `@itslil/marked` is the LilScript compiler-selected ESM. It is not post-minified.

| Lane | Raw | gzip-9 | Brotli-11 | vs Oxc mangle |
| --- | ---: | ---: | ---: | ---: |
| Official `marked.esm.js` | 43,018 | 12,992 | 11,907 | 1.04× |
| Official · Oxc mangle on | 42,381 | 12,469 | 11,475 | 1.00× |
| Official · Oxc mangle off | 42,446 | 12,681 | 11,657 | 1.02× |
| Official · Terser mangle on | 42,757 | 12,505 | 11,437 | 1.00× |
| Official · Terser mangle off | 42,716 | 12,715 | 11,652 | 1.02× |
| **`@itslil/marked` ESM** | **41,832** | **12,451** | **11,147** | **0.97×** |

Brotli is **0.97×** official Oxc-with-mangle and **0.97×** Terser-with-mangle. Versus uncompressed official ESM it is **0.94×**.

## Performance

Playwright Chromium, HTML checksummed against `marked@18.0.10` on every lane. Quiet median of 10 samples after discarding the first 3. Ratio is lane / official unminified (lower is faster).

| Lane | 32× document | 660-case ×40 | vs official |
| --- | ---: | ---: | ---: |
| Official `marked.esm.js` | 55.20 ms | 69.50 ms | 1.00× |
| Official · Oxc mangle on | 55.90 ms | 72.50 ms | 1.01× |
| Official · Oxc mangle off | 54.00 ms | 69.90 ms | 0.98× |
| Official · Terser mangle on | 56.40 ms | 70.30 ms | 1.02× |
| Official · Terser mangle off | 57.00 ms | 70.40 ms | 1.03× |
| **`@itslil/marked`** | **49.90 ms** | **62.90 ms** | **0.90×** |

The document suite is the joined GFM+CommonMark markdown repeated 32 times (~537 kB). The loop suite parses all 660 spec cases forty times.

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

## License

MIT. See [LICENSE](./LICENSE) and [NOTICE.md](./NOTICE.md). marked is copyright Christopher Jeffrey / MarkedJS.
