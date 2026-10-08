const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const ms = value => `${value.toFixed(value < 10 ? 3 : 2)} ms`
const difference = value => `${Math.abs(value).toFixed(1)}% ${value >= 0 ? 'less' : 'more'} time`

function table(rows, mode, caption) {
  return `<div class="table-wrap light objective-table"><table>
    <caption>${caption}</caption>
    <thead><tr><th>Workload</th><th>Browser</th><th>Original minified</th><th>@itslil/marked</th><th>Parse time</th></tr></thead>
    <tbody>${rows.map(row => `<tr data-runtime="${escape(row.workload)}-${escape(row.engine)}">
      <th scope="row">${escape(row.label)}</th><td>${escape(row.browser)}</td>
      <td>${ms(row[mode].originalMs)}</td><td>${ms(row[mode].lilscriptMs)}</td>
      <td>${difference(row[mode].timeReductionPercent)}</td>
    </tr>`).join('')}</tbody>
  </table></div>`
}

export function renderRuntime(data) {
  const root = document.querySelector('#recorded-runtime')
  if (!root) return
  root.innerHTML = table(data.rows, 'standard', 'Current repository build versus original minified Marked') + `
    <p class="objective-note">Each value is the median of three fresh-page medians: ten alternating rounds per page, with the first three discarded. Both parsers produce identical HTML on all 660 spec cases and the timed document before timing. The benchmark document contains 537,310 characters; the upstream README workload contains 103,102. README samples batch 12 parses and report time per parse.</p>
    <p class="objective-note">These are observations on a shared machine, measured ${escape(data.measuredAt.slice(0,10))}. Individual runs vary; results depend on the browser, device and input. The LilScript runtime is the Brotli-objective ESM; the original is minified with Terser. <a href="./runtime.json">All samples and artifact hashes ↗</a></p>
    <details class="objective-details"><summary>Results with longer warmup</summary>
      <p>24 additional alternating rounds per page, with the first eight discarded. The same three-page median calculation applies.</p>
      ${table(data.rows, 'extendedWarmup', 'Extended warmup: current build versus original minified Marked')}
    </details>`
}
