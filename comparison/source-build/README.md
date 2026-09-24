# Source-build measurements

Measured 2026-09-24T04:26:28Z using LilScript `aa2052f081ca8184666ca280ee9b91d476e46cfc` and the upstream Git revision recorded in `job.json`.

`result.json` records the commands, wall time, CPU time, machine and exit codes, and, for each LilScript build, the wall time of every compiler invocation. `esm.json` records the production ESM assembly and exact input graph. `compiler-invocations.jsonl` records the compiler invocations of the last LilScript build. The lockfiles record dependency resolution. The public page uses `source-build.json` for the final consolidated record.

Run the installation and setup commands from `job.json` in the corresponding pinned upstream checkout; they are excluded from build time. Run the recorded build command with Node v24.11.1. Clear the listed generated output directories between repetitions. Install the port dependencies and set `LILSCRIPT_COMPILER`, `LILSCRIPT_ROOT` and `LILSCRIPT_CODEC` to the recorded compiler and codec.

The original repository build and comparison ESM assembly are measured separately. Build output scope can differ between repositories; no build speedup is inferred. Both lanes ran on the same Azure Standard_B8als_v2 host, which also runs unrelated jobs.
