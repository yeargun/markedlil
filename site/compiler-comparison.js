const formatter = new Intl.NumberFormat("en-US")

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character])
}

function latestRun(runs, role) {
  return [...runs].reverse().find((run) => run.role === role)
}

function brotliBytes(run) {
  return run?.artifact?.sizes?.brotli11 ?? null
}

function formatBytes(value) {
  return value == null ? "verification pending" : `${formatter.format(value)} B`
}

function timingSummary(run) {
  const samples = (run?.timing?.samples ?? [])
    .map((sample) => sample.wallMs)
    .filter(Number.isFinite)
    .sort((left, right) => left - right)
  if (samples.length === 0) return run?.timing?.unavailableReason ?? "not recorded"
  const median = samples[Math.floor(samples.length / 2)] / 1000
  if (samples.length === 1) return `${median.toFixed(2)} s wall`
  return `${median.toFixed(2)} s median · ${samples.length} runs`
}

function deltaSummary(before, current) {
  const beforeBytes = brotliBytes(before)
  const currentBytes = brotliBytes(current)
  if (beforeBytes == null || currentBytes == null) {
    return { className: "pending", text: "awaiting final run" }
  }
  const delta = currentBytes - beforeBytes
  if (delta === 0) return { className: "even", text: "no change" }
  const magnitude = Math.abs(delta)
  const percent = Math.abs(delta / beforeBytes) * 100
  return {
    className: delta < 0 ? "win" : "loss",
    text: `${formatter.format(magnitude)} B ${delta < 0 ? "smaller" : "larger"} · ${percent.toFixed(2)}%`,
  }
}

function semanticSummary(run) {
  if (!run) return "verification pending"
  const status = run.semantic?.status ?? "not recorded"
  return run.semantic?.summary ? `${status} · ${run.semantic.summary}` : status
}

function valueRow(term, value) {
  return `<div><dt>${escapeHtml(term)}</dt><dd>${escapeHtml(value ?? "not recorded")}</dd></div>`
}

function provenance(run) {
  const source = run.source ?? {}
  const config = run.config ?? {}
  const compiler = run.compiler ?? {}
  const codec = run.codec ?? {}
  const artifact = run.artifact ?? {}
  return `
    <details class="compiler-provenance">
      <summary>${escapeHtml(run.label ?? run.id)} provenance</summary>
      <dl>
        ${valueRow("source revision", source.revision)}
        ${valueRow("source tree", source.tree)}
        ${valueRow("entry SHA-256", source.entrySha256)}
        ${valueRow("package-lock SHA-256", source.packageLockSha256)}
        ${valueRow("config", config.path)}
        ${valueRow("config SHA-256", config.sha256)}
        ${valueRow("config derivation", config.derivation ? JSON.stringify(config.derivation) : null)}
        ${valueRow("compiler revision", compiler.revision)}
        ${valueRow("compiler SHA-256", compiler.binarySha256)}
        ${valueRow("codec SHA-256", codec.binarySha256)}
        ${valueRow("artifact", artifact.path)}
        ${valueRow("artifact SHA-256", artifact.sha256)}
        ${valueRow("compile timing", timingSummary(run))}
        ${valueRow("semantic gate", semanticSummary(run))}
        ${valueRow("semantic command", run.semantic?.command)}
      </dl>
    </details>`
}

export function renderCompilerComparison(data, selector = "#compiler-comparison") {
  const root = document.querySelector(selector)
  if (!root) return
  const comparison = data.compilerComparison
  const runs = comparison?.runs ?? []
  const before = latestRun(runs, "before")
  const current = latestRun(runs, "current")
  if (!before) {
    root.textContent = "Compiler comparison data is not available."
    return
  }

  const delta = deltaSummary(before, current)
  root.innerHTML = `
    <div class="compiler-runline" aria-label="Brotli-11 compiler artifact comparison">
      <article>
        <span>Before · frozen published artifact</span>
        <strong>${formatBytes(brotliBytes(before))}</strong>
        <small>${escapeHtml(before.label ?? before.id)}</small>
      </article>
      <div class="compiler-arrow" aria-hidden="true">→</div>
      <article class="${current ? "current" : "pending"}">
        <span>Current · verified compiler</span>
        <strong>${formatBytes(brotliBytes(current))}</strong>
        <small>${escapeHtml(current?.label ?? "Final compiler run has not been published yet")}</small>
      </article>
    </div>
    <div class="compiler-facts">
      <article class="${delta.className}"><span>Brotli-11 delta</span><strong>${escapeHtml(delta.text)}</strong></article>
      <article><span>Current compile timing</span><strong>${escapeHtml(timingSummary(current))}</strong></article>
      <article><span>Current semantic gate</span><strong>${escapeHtml(semanticSummary(current))}</strong></article>
    </div>
    <div class="compiler-provenance-list">${runs.map(provenance).join("")}</div>`
}
