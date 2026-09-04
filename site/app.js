import { marked as officialMarked } from "./marked-official.js"
import { marked as lilMarked } from "./marked.js"
import { renderCompilerComparison } from "./compiler-comparison.js"
import { HARNESS, loadCorpus, median, runBenchmark } from "./bench.js"

const data = await fetch("./results.json").then((response) => {
  if (!response.ok) throw new Error(`Unable to load results: ${response.status}`)
  return response.json()
})

const formatter = new Intl.NumberFormat("en-US")
const sample = `# @itslil/marked

A [marked](https://github.com/markedjs/marked) 18.0.10 port in **LilScript**.

## GFM

- [x] task lists
- [ ] tables

| Lane | Tool | Mangle |
| --- | --- | --- |
| official parse path | — | — |
| oxc | Vite 8 | on / off |
| terser | Terser | on / off |

\`\`\`js
import { marked } from "@itslil/marked"
marked.parse("# hello")
\`\`\`

Autolink: https://yeargun.github.io/markedlil/

> CommonMark + GFM HTML is checksummed against \`marked@18.0.10\`.
`

function times(value) {
  return `${value.toFixed(2)}×`
}

/// Ratios read the same whether they mean bytes or milliseconds, and a reader
/// should not have to remember which direction is good. Every comparison on this
/// page is spelled out instead: how much smaller, how much faster, or "baseline".
function percentAgainst(value, baseline, better, worse) {
  if (!baseline || value === baseline) {
    return { text: "baseline", amount: "—", word: "baseline", state: "even" }
  }
  const change = (baseline - value) / baseline
  const magnitude = Math.abs(change * 100)
  const digits = magnitude < 10 ? 1 : 0
  const word = change > 0 ? better : worse
  return {
    text: `${magnitude.toFixed(digits)}% ${word}`,
    amount: `${magnitude.toFixed(digits)}%`,
    word,
    state: change > 0 ? "win" : "loss",
  }
}

function smallerThan(value, baseline) {
  return percentAgainst(value, baseline, "smaller", "larger")
}

function fasterThan(value, baseline) {
  return percentAgainst(value, baseline, "faster", "slower")
}

function parsePathLanes(rows) {
  return (rows ?? []).filter((row) => !row.diagnostic && row.id !== "full")
}

function ms(value) {
  return `${value.toFixed(2)} ms`
}

const OFFICIAL_SIZE_IDS = [
  "parse",
  "parse-oxc-nomangle",
  "parse-terser-nomangle",
  "parse-terser-mangle",
  "parse-oxc-mangle",
]

function laneById(id) {
  return data.size.find((lane) => lane.id === id)
}

function barClass(id) {
  if (id === "itslil" || id === "itslil-gzip" || id === "itslil-bytes") return "bar-lil"
  if (id === "itslil-closed") return "bar-closed"
  return "bar-official"
}

function renderCodec(metric, lilId, extras, barId, bodyId) {
  const oxc = laneById("parse-oxc-mangle")
  if (!oxc) return
  const lanes = [...OFFICIAL_SIZE_IDS, lilId, ...extras]
    .map(laneById)
    .filter(Boolean)
  const max = Math.max(...lanes.map((lane) => lane[metric]))
  document.querySelector(barId).innerHTML = lanes
    .map((lane) => {
      const width = Math.max(18, (lane[metric] / max) * 100)
      return `<div class="${barClass(lane.id)}" style="width:${width}%"><span>${lane.name}</span><strong>${formatter.format(lane[metric])} B</strong></div>`
    })
    .join("")
  document.querySelector(bodyId).innerHTML = lanes
    .map((lane) => {
      const verdict = smallerThan(lane[metric], oxc[metric])
      return `
    <tr>
      <th scope="row">${lane.name}</th>
      <td>${formatter.format(lane[metric])}</td>
      <td class="verdict ${verdict.state}"><strong>${verdict.text}</strong></td>
    </tr>`
    })
    .join("")
}

function matchedLibraryRow() {
  const brotli = laneById("itslil")
  const gzip = laneById("itslil-gzip")
  const bytes = laneById("itslil-bytes")
  if (!brotli || !gzip || !bytes) return null
  return {
    id: "itslil-matched",
    name: "@itslil/marked · matched compiles",
    raw: bytes.raw,
    gzip9: gzip.gzip9,
    brotli11: brotli.brotli11,
  }
}

function renderHero() {
  const oxc = laneById("parse-oxc-mangle")
  const itslil = laneById("itslil")
  const gzip = laneById("itslil-gzip")
  const bytes = laneById("itslil-bytes")
  if (!oxc || !itslil) return
  const smaller = smallerThan(itslil.brotli11, oxc.brotli11)
  document.querySelector("#hero-ratio").innerHTML =
    `${smaller.amount}<span>${smaller.word}</span>`
  document.querySelector("#hero-bytes").textContent =
    `${formatter.format(oxc.brotli11)} B → ${formatter.format(itslil.brotli11)} B Brotli-11`
  document.querySelector("#hero-shipped").textContent = smallerThan(
    itslil.brotli11,
    oxc.brotli11,
  ).text
  if (gzip) {
    document.querySelector("#hero-gzip").textContent = smallerThan(gzip.gzip9, oxc.gzip9).text
  }
  if (bytes) {
    document.querySelector("#hero-raw").textContent = smallerThan(bytes.raw, oxc.raw).text
  }
  if (data.spec) {
    document.querySelector("#hero-spec").textContent = `${data.spec.pass}/${data.spec.total}`
  }
}

function renderSize() {
  const oxc = laneById("parse-oxc-mangle")
  if (!oxc) return
  renderCodec("brotli11", "itslil", ["itslil-closed"], "#bar-brotli", "#body-brotli")
  renderCodec("gzip9", "itslil-gzip", [], "#bar-gzip", "#body-gzip")
  renderCodec("raw", "itslil-bytes", [], "#bar-raw", "#body-raw")

  const matched = matchedLibraryRow()
  const rows = [
    ...OFFICIAL_SIZE_IDS.map(laneById),
    matched,
    laneById("itslil"),
    laneById("itslil-gzip"),
    laneById("itslil-bytes"),
    laneById("itslil-closed"),
  ].filter(Boolean)
  document.querySelector("#body-matched").innerHTML = rows
    .map((lane) => {
      const verdict = smallerThan(lane.brotli11, oxc.brotli11)
      return `
    <tr>
      <th scope="row">${lane.name}</th>
      <td>${formatter.format(lane.raw)}</td>
      <td>${formatter.format(lane.gzip9)}</td>
      <td>${formatter.format(lane.brotli11)}</td>
      <td class="verdict ${verdict.state}"><strong>${verdict.text}</strong></td>
    </tr>`
    })
    .join("")
}

function recordedVerdict(row, baseline, suite) {
  if (!row || !baseline) return null
  const range = row[`${suite}Range`]
  const baseRange = baseline[`${suite}Range`]
  if (range && baseRange && range[0] <= baseRange[1] && baseRange[0] <= range[1]) {
    return { text: "within the noise", state: "even" }
  }
  return fasterThan(row[`${suite}Ms`], baseline[`${suite}Ms`])
}

function renderPerf() {
  const suites = parsePathLanes(data.throughput)
  if (suites.length === 0) return
  const lil = suites.find((row) => row.id === "itslil")
  const official = suites.find((row) => row.id === "parse")
  const document32 = recordedVerdict(lil, official, "document")
  const specLoop = recordedVerdict(lil, official, "spec")
  const cards = [
    {
      label: "parsing one big document, against the official parse path",
      value: document32 ? document32.text : "—",
      win: document32 ? document32.state === "win" : false,
    },
    {
      label: "parsing all 660 spec cases, against the official parse path",
      value: specLoop ? specLoop.text : "—",
      win: specLoop ? specLoop.state === "win" : false,
    },
    {
      label: "spec cases where the HTML is byte-identical",
      value: data.spec ? `${data.spec.pass}/${data.spec.total}` : "—",
      geo: true,
    },
    {
      label: "median time to parse the 32× document",
      value: lil ? ms(lil.documentMs) : "—",
    },
  ]
  document.querySelector("#perf-cards").innerHTML = cards
    .map(
      (card) => `
    <article class="perf-card${card.win ? " win" : ""}${card.geo ? " geo" : ""}">
      <strong>${card.value}</strong>
      <span>${card.label}</span>
    </article>
  `,
    )
    .join("")
  document.querySelector("#perf-body").innerHTML = suites
    .map((row) => {
      const cells = ["document", "spec"].map((suite) => {
        const verdict = row === official ? null : recordedVerdict(row, official, suite)
        const range = row[`${suite}Range`]
        return `
      <td>${ms(row[`${suite}Ms`] ?? 0)}</td>
      <td>${range ? `${ms(range[0])} – ${ms(range[1])}` : "—"}</td>
      <td class="verdict ${verdict ? verdict.state : "even"}"><strong>${verdict ? verdict.text : "baseline"}</strong></td>`
      })
      return `
    <tr>
      <th scope="row">${row.name}</th>${cells.join("")}
    </tr>
  `
    })
    .join("")
  document.querySelector("#perf-note").textContent =
    `${data.browser ?? "Playwright Chromium"}. Quiet median of ${data.loops ?? 10} samples after discarding the first ${data.warmupDiscard}. Lanes are sampled round-robin, alternating order, so drift in the machine cannot settle on one of them. The official rows are the same program through different minifiers: how far apart they land is the noise floor for every other row.`
}

/// A median is worth nothing next to a spread it sits inside. Two lanes whose
/// samples overlap are reported as a tie, however far apart their medians land,
/// because on a laptop that is all the machine can honestly say.
function verdictBetween(lane, baseline) {
  const overlap = lane.min <= baseline.max && baseline.min <= lane.max
  if (overlap) {
    return { text: "too close to call on this machine", state: "even" }
  }
  return fasterThan(lane.ms, baseline.ms)
}

function renderVerifyResult(result) {
  const out = document.querySelector("#verify-out")
  if (!result.spec.ok) {
    const first = result.spec.mismatches[0]
    out.innerHTML = `
      <p class="verify-fail">
        <strong>Refused to time this.</strong> ${result.spec.total - result.spec.pass} of
        ${result.spec.total} spec cases produced different HTML, so a speed number would be
        comparing two different programs. Offending lane: <code>${first.lane}</code>, case
        ${first.index}. Please
        <a href="https://github.com/yeargun/markedlil/issues">open an issue</a> with your browser
        and version — this should not happen.
      </p>`
    return
  }
  const suites = [
    { key: "document", label: `${HARNESS.documentRepeat}× document` },
    { key: "spec", label: `${result.spec.total}-case ×${HARNESS.specRounds}` },
  ]
  const table = suites
    .map((suite) => {
      const rows = result.suites[suite.key]
      const baseline = rows.find((row) => row.id === "parse")
      return rows
        .map((row) => {
          const verdict = row === baseline ? null : verdictBetween(row, baseline)
          return `
      <tr>
        <th scope="row">${row.name}</th>
        <td>${suite.label}</td>
        <td>${ms(row.ms)}</td>
        <td>${ms(row.min)} – ${ms(row.max)}</td>
        <td class="verdict ${verdict ? verdict.state : "even"}"><strong>${verdict ? verdict.text : "baseline"}</strong></td>
      </tr>`
        })
        .join("")
    })
    .join("")
  out.innerHTML = `
    <p class="verify-pass">
      <strong>${result.spec.pass}/${result.spec.total}</strong> spec cases produced byte-identical
      HTML in this browser. Only then were these timed.
    </p>
    <div class="table-wrap light">
      <table>
        <thead>
          <tr><th>Lane</th><th>Suite</th><th>Median</th><th>Range over ${HARNESS.loops - HARNESS.warmupDiscard} samples</th><th>vs official parse path</th></tr>
        </thead>
        <tbody>${table}</tbody>
      </table>
    </div>
    <p class="verify-foot">
      ${navigator.hardwareConcurrency ?? "?"} logical cores · ${result.corpus.heavyChars.toLocaleString("en-US")} characters per document sample ·
      lanes alternate order every sample so drift in your machine's clock speed cannot settle on one of them.
    </p>`
}

function bindVerify() {
  const button = document.querySelector("#verify-run")
  const status = document.querySelector("#verify-status")
  if (!button) return
  let corpus = null
  button.addEventListener("click", async () => {
    button.disabled = true
    const started = performance.now()
    try {
      if (!corpus) {
        status.textContent = "loading the spec corpus…"
        corpus = await loadCorpus()
      }
      const lanes = [
        { id: "parse", name: "Official parse path", parse: (src) => officialMarked.parse(src) },
        { id: "itslil", name: "@itslil/marked", parse: (src) => lilMarked.parse(src) },
      ]
      const result = await runBenchmark({
        lanes,
        corpus,
        onProgress: ({ phase, kind, sample, loops }) => {
          if (phase === "verify") status.textContent = `checking ${corpus.cases.length} spec cases for identical HTML…`
          else if (sample) status.textContent = `${kind} suite · sample ${sample} of ${loops}`
          else status.textContent = `${phase} suite · warming up`
        },
      })
      renderVerifyResult(result)
      status.textContent = `done in ${((performance.now() - started) / 1000).toFixed(1)}s. Run it again — the spread tells you how much to trust it.`
    } catch (error) {
      status.textContent = `could not run: ${error}`
    } finally {
      button.disabled = false
    }
  })
}

function bindCopy() {
  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-copy]")
    if (!button) return
    await navigator.clipboard.writeText(button.dataset.copy)
    button.textContent = "copied"
    window.setTimeout(() => {
      button.textContent = "copy"
    }, 1200)
  })
}

function bindProgress() {
  const bar = document.querySelector(".progress")
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight
    bar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`
  }
  window.addEventListener("scroll", update, { passive: true })
  update()
}

function currentEngine() {
  const value = document.querySelector("input[name=engine]:checked")?.value
  return value === "official" ? officialMarked : lilMarked
}

function renderPreview() {
  const src = document.querySelector("#source").value
  const html = currentEngine().parse(src)
  const frame = document.querySelector("#preview")
  const doc = frame.contentDocument
  doc.open()
  doc.write(`<!doctype html><html><head><style>
    body { margin: 0; padding: 22px 24px; font: 16px/1.55 Manrope, system-ui, sans-serif; color: #1c1814; }
    a { color: #8a5a12; }
    pre { overflow: auto; padding: 12px; background: #f4efe4; }
    code { font-family: "DM Mono", ui-monospace, monospace; font-size: 13px; }
    table { border-collapse: collapse; }
    th, td { border: 1px solid #e0d4c0; padding: 6px 10px; }
  </style></head><body>${html}</body></html>`)
  doc.close()
}

function bindPlayground() {
  const source = document.querySelector("#source")
  source.value = sample
  source.addEventListener("input", renderPreview)
  for (const input of document.querySelectorAll("input[name=engine]")) {
    input.addEventListener("change", renderPreview)
  }
  document.querySelector("#race").addEventListener("click", () => {
    const src = source.value
    const engines = [
      { key: "lil", parse: (value) => lilMarked.parse(value), samples: [] },
      { key: "official", parse: (value) => officialMarked.parse(value), samples: [] },
    ]
    for (const engine of engines) engine.parse(src)
    for (let round = 0; round < 10; round++) {
      for (const engine of round % 2 === 0 ? engines : [...engines].reverse()) {
        const start = performance.now()
        for (let i = 0; i < 20; i++) engine.parse(src)
        engine.samples.push(performance.now() - start)
      }
    }
    const [lil, official] = engines.map((engine) => median(engine.samples.slice(3)))
    document.querySelector("#race-out").textContent =
      `@itslil/marked ${lil.toFixed(1)} ms · official parse path ${official.toFixed(1)} ms · ${fasterThan(lil, official).text} on your text`
  })
  renderPreview()
}

renderHero()
renderPerf()
renderSize()
renderCompilerComparison(data)
bindCopy()
bindProgress()
bindPlayground()
bindVerify()
