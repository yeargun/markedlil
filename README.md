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

## Comparison with the original

See [COMPARISON.md](COMPARISON.md) for current raw-, gzip- and Brotli-objective builds, minified upstream comparisons, build times and validation.

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
