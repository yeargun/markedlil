# Current build versus original minified Marked

The comparison uses portable main-entry ESM with matching shared named exports and no external runtime imports. The port supports synchronous parsing and options; Marked's extension/tokenizer ABI and full API are outside its supported boundary. Original version: `marked@18.0.10`.

## Download size and build time

Each row is a separate LilScript compilation targeting the named compression objective. The original baseline is the smallest measured output for that metric among Terser, esbuild and Oxc.

| Objective | LilScript bytes | Original minified bytes | Original minifier | Smaller | LilScript build | Original bundle + minify |
|---|---:|---:|---|---:|---:|---:|
| Raw | 31,834 | 42,650 | Oxc | 25.36% | 14.790 s | 0.221 s |
| Gzip | 9,834 | 12,530 | Oxc | 21.52% | 13.189 s | 0.221 s |
| Brotli | 8,851 | 11,488 | Terser | 22.95% | 29.871 s | 0.565 s |

All measured transport sizes:

| Artifact | Raw | Gzip-9 | Brotli-11 |
|---|---:|---:|---:|
| LilScript, raw objective | 31,834 | 10,303 | 9,177 |
| LilScript, gzip objective | 36,044 | 9,834 | 8,815 |
| LilScript, Brotli objective | 35,908 | 9,903 | 8,851 |
| Original, Oxc | 42,650 | 12,530 | 11,518 |
| Original, esbuild | 42,912 | 12,831 | 11,791 |
| Original, Terser | 43,010 | 12,573 | 11,488 |

Gzip uses stock zlib 1.3.1 at level 9 with mtime 0; Brotli uses the official 1.1.0 encoder at quality 11/window 22. A codec objective guides a bounded search; the table reports each independently targeted result, even when another objective's artifact happens to compress smaller with that codec.

Build times are one sequential, cache-disabled output build per objective, with one worker, effort 15 and a logical-work ceiling of 2 billion. Original timings were recorded earlier on the same date and host, from installed ESM through bundling/minification; they do not include original-repository TypeScript compilation. Dependency installation, tests and final file compression are excluded. LilScript compilation takes longer than the measured original bundle/minify jobs.

[Artifacts, hashes and settings](site/comparison.json) · [Exact commands, source identities and timings](site/comparison-builds.json) · [Checked source inputs](site/comparison-artifacts/sources.tar.gz).

## Parsing time

The measured LilScript runtime is the Brotli-objective ESM, identical to `dist/marked.esm.js` and the website's `marked.js`. Original Marked is minified with Terser. Runtime is measured separately from compilation.

Each value is the median of three fresh-page medians. Every page verifies all 660 spec cases and exact timed-document output first. The standard run uses ten alternating rounds and discards the first three. The README workload batches 12 parses per sample and normalizes time to one parse.

| Workload | Browser | Original minified | @itslil/marked | Less parse time |
|---|---|---:|---:|---:|
| 32× document, 537,310 characters | Chromium 139 | 125.20 ms | 92.80 ms | 25.9% |
| Same document | Firefox 144 | 160.00 ms | 147.00 ms | 8.1% |
| 32× upstream README, 103,102 characters | Chromium 139 | 6.292 ms | 5.050 ms | 19.7% |
| Same README | Firefox 144 | 7.750 ms | 5.750 ms | 25.8% |

With longer warmup: 24 additional alternating rounds per page, discarding eight, with the same three-page aggregation:

| Workload | Browser | Original minified | @itslil/marked | Less parse time |
|---|---|---:|---:|---:|
| 32× document | Chromium 139 | 122.80 ms | 89.45 ms | 27.2% |
| Same document | Firefox 144 | 162.00 ms | 147.00 ms | 9.3% |
| 32× upstream README | Chromium 139 | 6.192 ms | 4.825 ms | 22.1% |
| Same README | Firefox 144 | 6.708 ms | 5.375 ms | 19.9% |

These are observations on a shared AMD EPYC 7763 host. Individual runs vary; the Firefox standard-document samples overlap, and one fresh-page median favored the original. The aggregate reduction is not a guarantee for every browser, input or device. [All per-run samples and artifact hashes](site/runtime.json) make that variation visible. The [website](https://yeargun.github.io/markedlil/#verify) also runs both parsers on the reader's machine.

## Validation and artifact boundary

The independent raw, gzip and Brotli artifacts each pass 12,709 scoped checks, 38,127 in total: the 660-case corpus through parse and parseInline with defaults and all eight gfm/breaks/pedantic combinations; large and independent documents; seeded mixed documents; and live options. All 44 package tests pass, including ESM/CommonJS/UMD regression coverage. These checks do not establish complete upstream compatibility.

The package's multi-format raw-objective delivery is a separate artifact at `dist/marked.bytes.js` (31,702 raw bytes), validated with another 12,709 checks. The comparison above uses the standalone raw-objective build and its own timing receipt. The main package ESM and gzip delivery exactly match their corresponding independent comparison artifacts.

Measurements describe the current repository build. npm releases are published separately; the measured ESM files can be downloaded directly from the website's comparison tables.
