/// The speed claim on this page is a recorded Playwright run of e2e/run.mjs.
/// This module is that harness re-expressed for the browser: the same corpus,
/// the same two suites, the same warmup-discard median, run on the reader's own
/// machine. The point is that the claim can be checked instead of believed.
///
/// Harness: https://github.com/yeargun/markedlil/blob/main/e2e/run.mjs
/// Corpus:  https://github.com/yeargun/markedlil/blob/main/scripts/spec.mjs

export const HARNESS = {
  loops: 10,
  warmupDiscard: 3,
  documentRepeat: 32,
  specRounds: 40,
  runner: "https://github.com/yeargun/markedlil/blob/main/e2e/run.mjs",
  corpus: "https://github.com/yeargun/markedlil/blob/main/scripts/spec.mjs",
  recorded: "https://github.com/yeargun/markedlil/blob/main/reports/bench.json",
  browser: "https://github.com/yeargun/markedlil/blob/main/site/bench.js",
}

const yieldToPaint = () => new Promise((resolve) => setTimeout(resolve, 0))

export async function loadCorpus(url = "./corpus.json") {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`corpus.json responded ${response.status}`)
  const corpus = await response.json()
  return {
    ...corpus,
    heavy: Array.from({ length: HARNESS.documentRepeat }, () => corpus.document).join("\n\n"),
  }
}

export function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/// Nothing is timed until both engines have emitted the same bytes on every
/// spec case. A parser that is faster because it produces different HTML is not
/// a faster parser, and the run is refused rather than reported.
export function verify(lanes, corpus) {
  const [baseline, ...rest] = lanes
  const mismatches = []
  let pass = 0
  for (let index = 0; index < corpus.cases.length; index++) {
    const source = corpus.cases[index]
    let expected
    try {
      expected = baseline.parse(source)
    } catch (error) {
      mismatches.push({ lane: baseline.id, index, reason: String(error) })
      continue
    }
    let identical = true
    for (const lane of rest) {
      let actual
      try {
        actual = lane.parse(source)
      } catch (error) {
        actual = `threw ${error}`
      }
      if (actual !== expected) {
        identical = false
        if (mismatches.length < 5) mismatches.push({ lane: lane.id, index, source })
      }
    }
    if (identical) pass++
  }
  return { pass, total: corpus.cases.length, mismatches, ok: mismatches.length === 0 }
}

function suiteWork(kind, corpus, parse) {
  if (kind === "spec") {
    return () => {
      for (let round = 0; round < HARNESS.specRounds; round++) {
        for (const source of corpus.cases) parse(source)
      }
    }
  }
  return () => parse(corpus.heavy)
}

/// Every lane is warmed before any sample counts, the lane order alternates so a
/// first-mover advantage cannot survive the median, and the loop yields between
/// samples so the page can paint its progress. The measured region itself stays
/// synchronous, exactly as it is under Playwright.
export async function runSuite({ lanes, kind, corpus, onProgress }) {
  const runners = lanes.map((lane) => ({
    lane,
    run: suiteWork(kind, corpus, lane.parse),
    samples: [],
  }))
  for (const runner of runners) runner.run()
  for (let index = 0; index < HARNESS.loops; index++) {
    const order = index % 2 === 0 ? runners : [...runners].reverse()
    for (const runner of order) {
      await yieldToPaint()
      const start = performance.now()
      runner.run()
      runner.samples.push(performance.now() - start)
    }
    onProgress?.({ kind, sample: index + 1, loops: HARNESS.loops })
  }
  return runners.map(({ lane, samples }) => {
    const counted = samples.slice(HARNESS.warmupDiscard)
    return {
      id: lane.id,
      name: lane.name,
      ms: median(counted),
      min: Math.min(...counted),
      max: Math.max(...counted),
      samples: counted,
    }
  })
}

/// The whole run, in the order the harness performs it: verify first, then the
/// 32x document, then the 660 spec cases forty times over.
export async function runBenchmark({ lanes, corpus, onProgress }) {
  onProgress?.({ phase: "verify" })
  const spec = verify(lanes, corpus)
  if (!spec.ok) return { spec, suites: null }
  onProgress?.({ phase: "document" })
  const document = await runSuite({ lanes, kind: "document", corpus, onProgress })
  onProgress?.({ phase: "spec" })
  const specLoop = await runSuite({ lanes, kind: "spec", corpus, onProgress })
  return {
    spec,
    suites: { document, spec: specLoop },
    corpus: {
      documentChars: corpus.document.length,
      heavyChars: corpus.heavy.length,
      specCases: corpus.cases.length,
    },
  }
}
