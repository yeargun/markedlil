import { marked as officialMarked } from "./marked-official.js"
import { marked as lilMarked } from "./marked.js"

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
| official | — | — |
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

function ms(value) {
  return `${value.toFixed(2)} ms`
}

function renderHero() {
  const oxc =
    data.size.find((lane) => lane.id === "parse-oxc-mangle") ??
    data.size.find((lane) => lane.baseline)
  const parseRaw = data.size.find((lane) => lane.id === "parse")
  const itslil = data.size.find((lane) => lane.primary)
  if (!oxc || !itslil) return
  const ratio = itslil.brotli11 / oxc.brotli11
  document.querySelector("#hero-ratio").innerHTML = `${ratio.toFixed(2)}<span>×</span>`
  document.querySelector("#hero-bytes").textContent =
    `${formatter.format(oxc.brotli11)} B → ${formatter.format(itslil.brotli11)} B`
  if (parseRaw) {
    document.querySelector("#hero-vs-raw").textContent = times(itslil.brotli11 / parseRaw.brotli11)
  }
  if (data.spec) {
    document.querySelector("#hero-spec").textContent = `${data.spec.pass}/${data.spec.total}`
  }
  const suites = data.throughput ?? []
  const lil = suites.find((row) => row.id === "itslil")
  if (lil) document.querySelector("#hero-parse").textContent = times(lil.documentRatio)
}

function renderSize() {
  const oxc =
    data.size.find((lane) => lane.id === "parse-oxc-mangle") ??
    data.size.find((lane) => lane.baseline)
  if (!oxc) return
  document.querySelector("#results-body").innerHTML = data.size
    .map(
      (lane) => `
    <tr>
      <th scope="row">${lane.name}</th>
      <td>${formatter.format(lane.raw)}</td>
      <td>${formatter.format(lane.gzip9)}</td>
      <td>${formatter.format(lane.brotli11)}</td>
      <td><strong>${(lane.brotli11 / oxc.brotli11).toFixed(2)}×</strong></td>
    </tr>
  `,
    )
    .join("")

  const max = Math.max(...data.size.map((lane) => lane.brotli11))
  document.querySelector("#total-bar").innerHTML = data.size
    .map((lane) => {
      const width = Math.max(18, (lane.brotli11 / max) * 100)
      const cls = lane.primary ? "bar-lil" : "bar-official"
      return `<div class="${cls}" style="width:${width}%"><span>${lane.name}</span><strong>${formatter.format(lane.brotli11)} B</strong></div>`
    })
    .join("")
}

function renderPerf() {
  const suites = data.throughput ?? []
  if (suites.length === 0) return
  const lil = suites.find((row) => row.id === "itslil")
  const faster = suites.filter((row) => row.documentRatio < 1).length
  const cards = [
    {
      label: "spec HTML match",
      value: data.spec ? `${data.spec.pass}/${data.spec.total}` : "—",
      geo: true,
    },
    {
      label: "parse vs official",
      value: lil ? times(lil.documentRatio) : "—",
      win: lil ? lil.documentRatio <= 1.05 : false,
    },
    { label: "lanes faster", value: String(faster) },
    {
      label: "worst document ratio",
      value: times(Math.max(...suites.map((row) => row.documentRatio))),
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
    .map(
      (row) => `
    <tr>
      <th scope="row">${row.name}</th>
      <td>${ms(row.documentMs)}</td>
      <td>${ms(row.specMs ?? row.inlineMs ?? 0)}</td>
      <td><strong>${times(row.documentRatio)}</strong></td>
    </tr>
  `,
    )
    .join("")
  document.querySelector("#perf-note").textContent =
    `${data.browser ?? "Playwright Chromium"}. ${data.codec}. Quiet median after discarding the first ${data.warmupDiscard} samples.`
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
    const loops = 10
    const run = (parse) => {
      parse(src)
      const start = performance.now()
      for (let i = 0; i < loops; i++) parse(src)
      return performance.now() - start
    }
    const lilMs = run((value) => lilMarked.parse(value))
    const officialMs = run((value) => officialMarked.parse(value))
    document.querySelector("#race-out").textContent =
      `lil ${lilMs.toFixed(1)}ms · official ${officialMs.toFixed(1)}ms · ${(lilMs / officialMs).toFixed(2)}×`
  })
  renderPreview()
}

renderHero()
renderPerf()
renderSize()
bindCopy()
bindProgress()
bindPlayground()
