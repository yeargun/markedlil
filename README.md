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

Every size and speed number on this page is the **same surface**: official `marked@18.0.10` Lexer, Parser, Tokenizer, Renderer, and helpers — the parse-only sources in `official/marked-18.0.10/` — bundled, then run through **Oxc** and **Terser** with mangling on and off.

`@itslil/marked` is the LilScript compiler's own ESM: not bundled, not post-minified, license banner included.

The published npm `marked.esm.js` still contains `use()`, Hooks, `walkTokens`, and the `Marked` class. It is not a lane. Comparing this port to that file would be a different product against a subset.

LilScript scores a different artifact for each `javascript.cost_model`. Official Oxc/Terser rows are one file measured three ways. The LilScript **library** numbers below take raw from the raw compile, gzip from the gzip compile, and Brotli from the Brotli compile. The npm file is the Brotli compile.

- **JS library** (`[mangle] extern_fields = true`). `extern class MarkedOptions` / `MarkedApi` pin `gfm`, `breaks`, `pedantic`, `silent`, `async`, `parse`, `parseInline`, `setOptions`, `options`, `getDefaults`, and `defaults`.
- **Closed LilScript** (`lilscript.closed.toml`, `extern_fields = false`, Brotli compile). Not published. Host members such as `string.length` stay exact.

Measured with `lilscript-codec` gzip-9 / Brotli-11. LilScript lanes include the same license banner.

| Lane | Raw | gzip-9 | Brotli-11 | vs Oxc on that codec |
| --- | ---: | ---: | ---: | ---: |
| Official parse path | 67,247 | 14,064 | 12,684 | — |
| Official parse path · Oxc mangle on | 37,022 | 10,930 | 10,092 | baseline |
| Official parse path · Oxc mangle off | 47,547 | 12,153 | 11,279 | — |
| Official parse path · Terser mangle on | 37,725 | 11,045 | 10,138 | — |
| Official parse path · Terser mangle off | 48,444 | 12,302 | 11,339 | — |
| **`@itslil/marked` · matched compiles** | **33,632** | **10,727** | **9,589** | **0.91× / 0.98× / 0.95×** |
| `@itslil/marked` · cost_model brotli (npm) | 35,985 | 10,766 | 9,589 | 0.95× Brotli |
| `@itslil/marked` · cost_model gzip | 36,304 | 10,727 | 9,603 | 0.98× gzip |
| `@itslil/marked` · cost_model raw | 33,632 | 10,605 | 9,504 | 0.91× raw |
| `@itslil/marked` · closed LilScript | 35,705 | 10,730 | 9,533 | 0.94× Brotli |

Against official parse path · Oxc mangle on, the matched library compiles are **5.0% smaller on Brotli-11**, **1.9% smaller on gzip-9**, and **9.2% smaller raw**. Same 660-case HTML.

The closed Brotli compile is **56 Brotli bytes** smaller than the npm file: the tax of keeping a JavaScript options object. A program written entirely in LilScript would not pay it.

## Performance

Run it yourself: **<https://yeargun.github.io/markedlil/#verify>** runs this benchmark in your own
browser, on the same corpus with the same statistics, and prints the numbers your machine produces.
Nothing below has to be taken on trust.

Playwright Chromium ([`e2e/run.mjs`](e2e/run.mjs)). HTML checksummed against the official parse path
and against published `marked@18.0.10` on the spec corpus. Quiet median of 10 samples after
discarding the first 3, lanes sampled round-robin with the order alternating each round.

The four official rows are the same program through different minifiers. However far apart *they*
land is the noise floor, and no other row is called faster until it clears its own sample range.

| Lane | 32× document | range | document | 660-case ×40 | range | spec loop |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Official parse path | 125.7 ms | 121.6 – 144.7 | baseline | 173.3 ms | 171.3 – 182.7 | baseline |
| Official parse path · Oxc mangle on | 129.5 ms | 122.0 – 135.7 | within noise | 172.8 ms | 170.1 – 176.6 | within noise |
| Official parse path · Oxc mangle off | 127.5 ms | 122.9 – 133.0 | within noise | 171.7 ms | 169.1 – 172.9 | within noise |
| Official parse path · Terser mangle on | 126.7 ms | 122.2 – 147.9 | within noise | 173.8 ms | 171.7 – 175.2 | within noise |
| Official parse path · Terser mangle off | 130.6 ms | 125.7 – 154.6 | within noise | 177.0 ms | 175.6 – 182.7 | within noise |
| **`@itslil/marked`** | **137.3 ms** | **129.0 – 154.9** | **within noise** | **159.0 ms** | **156.3 – 160.4** | **8.3% faster** |

The document suite is the joined GFM+CommonMark markdown repeated 32 times (~537 kB); the loop suite
parses all 660 spec cases forty times.

**Spec loop: a real win.** `@itslil/marked` is **8.3% faster**, and its sample range does not touch
the baseline's. Two consecutive runs put it at 7.8% and 8.3%.

**Single large document: no win, and possibly a small loss.** The median is ~9% *slower* in both
runs — reproducible, not a fluke — but the baseline's own spread covers it, so the ranges overlap and
neither lane can claim the suite. The table says "within noise" rather than picking a side. If you
want the answer for your machine, press the button on the page.

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

The closed LilScript lane turns `[mangle] extern_fields` off. Those keys mangle. It is not the npm file.

- ESM, CJS, and UMD artifacts
- GFM on by default (`breaks: false`, `pedantic: false`)
- Nested links match published `marked@18.0.10`, not git master
- Spec fixtures live in `test/specs/`
- Official parse-path sources used for the comparison live in `official/marked-18.0.10/`

## License

MIT. See [LICENSE](./LICENSE) and [NOTICE.md](./NOTICE.md). marked is copyright Christopher Jeffrey / MarkedJS.
