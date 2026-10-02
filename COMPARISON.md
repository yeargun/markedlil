# Current comparison with the original

Portable main-entry ESM with matching shared named exports and external imports. The original uses production/default package conditions, keeping data-based entity decoding rather than relying on the DOM. Marked extension-only exports are outside this port’s named API; no complete Marked API equivalence is claimed.

Each compression row uses a separate LilScript compilation targeting that objective. Original results are the smallest of Terser, esbuild and Oxc for the named codec.

| Objective | LilScript bytes | Original minified bytes | Original minifier | LilScript build (s) | Original bundle + minify (s) |
|---|---:|---:|---|---:|---:|
| raw | 32,063 | 42,650 | Oxc | 14.892 | 0.221 |
| gzip | 9,945 | 12,530 | Oxc | 13.288 | 0.221 |
| brotli | 8,969 | 11,488 | Terser | 33.330 | 0.565 |

Original version: `marked@18.0.10`. gzip level 9; Brotli quality 11/window 22. Each time is one sequential fresh-output build on the recorded shared machine. Original timing starts from installed ESM and does not include the original repository’s TypeScript compilation. Dependency installation, tests and final file compression are excluded.

Validation: 7,923 checks across raw, gzip and Brotli main entries. This does not cover every package format or establish complete upstream API equivalence.

[Artifacts, hashes and settings](site/comparison.json) · [Commands, source identities and timings](site/comparison-builds.json) · [Exact checked source inputs](site/comparison-artifacts/sources.tar.gz).
