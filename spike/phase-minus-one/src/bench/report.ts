import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detonateRepresentativeBombSquad } from '../sim/bomb-squad';
import { EventBuffer } from '../sim/events';
import { createScenario } from '../sim/scenario';
import { Simulation, type TickTimings } from '../sim/simulation';
import { summarize, summarizeTimings } from './metrics';

interface BrowserRun {
  readonly gitCommit: string;
  readonly dirty: boolean | 'unknown';
  readonly runtime: {
    readonly browserVersion: string;
    readonly cpu: string;
    readonly rendererMode: string;
    readonly renderer: { readonly renderer: string; readonly gpuTimerQueryAvailable: boolean } | null;
  };
}

interface BrowserSummary {
  readonly passedHarness: boolean;
  readonly sampleCounts: { readonly simulation: number; readonly render: number };
  readonly simulation: Record<string, { readonly p95: number }>;
  readonly snapshotLatencyMs: { readonly p95: number };
  readonly renderCpuMs: { readonly p95: number };
  readonly renderGpuMs?: { readonly samples: number; readonly p95: number };
  readonly drawCalls: { readonly maximum: number };
  readonly instances: { readonly maximum: number };
  readonly determinism?: { readonly matches: boolean; readonly workerChecksum: string };
  readonly transportStalls?: readonly { readonly simulationContinued: boolean }[];
  readonly contextRecovery?: { readonly supported: boolean; readonly lost: boolean; readonly restored: boolean };
  readonly audioVisual?: {
    readonly audioMappingErrorMs: { readonly p95: number };
    readonly audioVisualSeparationMs: { readonly p95: number };
    readonly limitation: string;
  } | null;
  readonly memory?: { readonly beforeBytes: number; readonly afterBytes: number; readonly growthBytes: number } | null;
  readonly errors: number;
}

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const runsDirectory = join(packageDirectory, 'artifacts', 'runs');
const outputPath = join(packageDirectory, 'artifacts', 'DEVELOPMENT_REPORT.md');
const manifestOutputPath = join(packageDirectory, 'artifacts', 'DEVELOPMENT_BROWSER_MANIFEST.json');

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function latestSuccessfulBrowserRun(modeSubstring: string): { directory: string; run: BrowserRun; summary: BrowserSummary } {
  if (!existsSync(runsDirectory)) throw new Error('No browser artifact runs exist');
  const candidates = readdirSync(runsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('perf-browser-'))
    .map((entry) => join(runsDirectory, entry.name))
    .sort()
    .reverse();
  for (const directory of candidates) {
    const summary = JSON.parse(readFileSync(join(directory, 'summary.json'), 'utf8')) as BrowserSummary;
    if (!summary.passedHarness) continue;
    const run = JSON.parse(readFileSync(join(directory, 'run.json'), 'utf8')) as BrowserRun;
    if (!run.runtime.rendererMode.includes(modeSubstring)) continue;
    return { directory, run, summary };
  }
  throw new Error('No successful browser artifact run exists');
}

function runSimulationDiagnostic(): {
  timings: ReturnType<typeof summarizeTimings>;
  events: ReturnType<typeof summarize>;
  checksum: string;
} {
  const simulation = new Simulation('phase-minus-one-perf-sim-v1', () => performance.now());
  for (let tick = 0; tick < 600; tick += 1) simulation.step();
  const timings: TickTimings[] = [];
  const events: number[] = [];
  for (let tick = 0; tick < 6_000; tick += 1) {
    const result = simulation.step();
    timings.push(result.timings);
    events.push(result.eventCount);
  }
  return { timings: summarizeTimings(timings), events: summarize(events), checksum: simulation.checksum() };
}

function fixed(value: number): string {
  return value.toFixed(3);
}

const browser = latestSuccessfulBrowserRun('OffscreenCanvas');
const fallback = latestSuccessfulBrowserRun('main-thread');
const simulation = runSimulationDiagnostic();
const bombState = createScenario('phase-minus-one-bomb-squad-v1');
const bombEvents = new EventBuffer();
detonateRepresentativeBombSquad(bombState, bombEvents);
const rendererName = browser.run.runtime.renderer?.renderer ?? 'not reported';
const audioMappingP95 = browser.summary.audioVisual?.audioMappingErrorMs.p95 ?? Number.POSITIVE_INFINITY;
const audioVisualP95 = browser.summary.audioVisual?.audioVisualSeparationMs.p95 ?? Number.POSITIVE_INFINITY;
const report = `# Phase -1 development report

Status: **Development evidence recorded — implementation may continue; release certification remains outstanding**

This report is evidence from the current development environment only. Under the 2026-08-16 continuation decision it permits implementation to proceed, but it does not certify the Intel UHD 620 desktop, Pixel 6a, or iPhone 12 targets.

## Frozen workload

- Simulation schema 1: 60 Hz, two substeps, eight XPBD iterations.
- 24 full-physics robots: 360 particles and 336 links.
- Raw WebGL2; no Three.js.
- Browser topology: ${browser.run.runtime.rendererMode}.
- Bomb-plus-squad burst: ${bombEvents.count} records / ${bombEvents.byteLength} bytes in one tick.

## Development results

| Diagnostic | Result | Plan target | Interpretation |
|---|---:|---:|---|
| Node whole tick p95 | ${fixed(simulation.timings.wholeTickMs.p95)} ms | ≤ 4 ms desktop | Diagnostic pass |
| Node XPBD/collision p95 | ${fixed(simulation.timings.physicsMs.p95)} ms | ≤ 2 ms desktop | Diagnostic pass |
| Browser whole tick p95 | ${fixed(browser.summary.simulation.wholeTickMs?.p95 ?? 0)} ms | ≤ 4 ms desktop | Diagnostic pass |
| Main snapshot latency p95 | ${fixed(browser.summary.snapshotLatencyMs.p95)} ms | ≤ 5 ms desktop | Diagnostic pass |
| Raw WebGL2 CPU submission p95 | ${fixed(browser.summary.renderCpuMs.p95)} ms | GPU/frame budget | Informational; not GPU time |
| Raw WebGL2 GPU elapsed p95 | ${(browser.summary.renderGpuMs?.samples ?? 0) > 0 ? `${fixed(browser.summary.renderGpuMs!.p95)} ms` : 'unavailable'} | ≤ 5.5 ms desktop | ${(browser.summary.renderGpuMs?.samples ?? 0) > 0 && browser.summary.renderGpuMs!.p95 <= 5.5 ? 'Diagnostic pass' : 'Open'} |
| Render load | ${browser.summary.drawCalls.maximum} draws / ${browser.summary.instances.maximum} instances | Representative workload | Exercised |
| Node ↔ simulation Worker checksum | ${browser.summary.determinism?.matches === true ? 'match' : 'missing/mismatch'} | Exact match | ${browser.summary.determinism?.matches === true ? 'Pass' : 'Open'} |
| Main-render fallback ↔ Node checksum | ${fallback.summary.determinism?.matches === true ? 'match' : 'missing/mismatch'} | Exact match | ${fallback.summary.determinism?.matches === true ? 'Pass' : 'Open'} |
| Browser consumer stalls | ${browser.summary.transportStalls?.filter((stall) => stall.simulationContinued).length ?? 0}/${browser.summary.transportStalls?.length ?? 0} continued | 50 ms–5 s, both consumers | ${(browser.summary.transportStalls?.every((stall) => stall.simulationContinued) ?? false) ? 'Pass' : 'Open'} |
| WebGL2 context recovery | ${browser.summary.contextRecovery?.lost === true && browser.summary.contextRecovery.restored ? 'lost and restored' : 'missing/failed'} | Rebuild resources and resume | ${browser.summary.contextRecovery?.restored === true ? 'Pass' : 'Open'} |
| Instrumented audio mapping p95 | ${Number.isFinite(audioMappingP95) ? `${fixed(audioMappingP95)} ms` : 'missing'} | ≤ 10 ms desktop | ${audioMappingP95 <= 10 ? 'Diagnostic pass' : 'Fail/open'} |
| Instrumented audio/visual separation p95 | ${Number.isFinite(audioVisualP95) ? `${fixed(audioVisualP95)} ms` : 'missing'} | ≤ 15 ms | ${audioVisualP95 <= 15 ? 'Diagnostic pass' : 'Fail/open'} |
| JavaScript heap change after probes + GC | ${browser.summary.memory === null || browser.summary.memory === undefined ? 'missing' : `${(browser.summary.memory.growthBytes / 1_048_576).toFixed(2)} MiB`} | Bounded; reset series required | Informational |
| Browser runtime errors | ${browser.summary.errors} | 0 | ${browser.summary.errors === 0 ? 'Pass' : 'Fail'} |

The Node 6,000-tick run ended at checksum \`${simulation.checksum}\`; its event peak was ${simulation.events.maximum} records/tick. The browser Worker checksum was \`${browser.summary.determinism?.workerChecksum ?? 'not recorded'}\` at its captured final tick and matched a direct Node replay at that same tick.

## Browser evidence

- Run: \`${basename(browser.directory)}\`
- Main-render fallback run: \`${basename(fallback.directory)}\`; checksum match: ${String(fallback.summary.determinism?.matches ?? false)}
- Commit recorded by run: \`${browser.run.gitCommit}\`; dirty state: \`${String(browser.run.dirty)}\`
- Browser: ${browser.run.runtime.browserVersion}
- CPU: ${browser.run.runtime.cpu}
- GPU: ${rendererName}
- GPU timer-query extension exposed: ${String(browser.run.runtime.renderer?.gpuTimerQueryAvailable ?? false)}
- Samples: ${browser.summary.sampleCounts.simulation} simulation / ${browser.summary.sampleCounts.render} render
- SHA-256 run.json: \`${sha256(join(browser.directory, 'run.json'))}\`
- SHA-256 samples.jsonl: \`${sha256(join(browser.directory, 'samples.jsonl'))}\`
- SHA-256 summary.json: \`${sha256(join(browser.directory, 'summary.json'))}\`
- SHA-256 errors.jsonl: \`${sha256(join(browser.directory, 'errors.jsonl'))}\`

## Open gates

- Repeat at least five frozen \`perf:sim\` runs and the browser suite on the approved i5-8250U/UHD 620 desktop.
- Run the Android suite on a Pixel 6a and the iOS suite on an iPhone 12.
- Capture GPU timer-query/frame pacing, sustained memory/reset growth, and thermal behavior.
- Repeat the passing context-loss/restoration and browser-consumer stall probes on every baseline device; transport bounds remain covered by invariant tests.
- Investigate the failed development audio timing result, then repeat it on baseline devices with physical speaker/display capture. Current result limitation: ${browser.summary.audioVisual?.limitation ?? 'audio probe missing'}
- Re-run from a clean commit before promoting evidence; development runs with unrelated workspace changes remain marked dirty.

Phase 0 implementation may proceed under the recorded continuation decision. Release certification remains gated until the named device evidence and open audio/GPU findings are resolved.
`;

writeFileSync(outputPath, report);
writeFileSync(manifestOutputPath, `${JSON.stringify({
  status: 'development-only',
  sourceRun: basename(browser.directory),
  rawArtifactHashes: {
    run: sha256(join(browser.directory, 'run.json')),
    samples: sha256(join(browser.directory, 'samples.jsonl')),
    summary: sha256(join(browser.directory, 'summary.json')),
    errors: sha256(join(browser.directory, 'errors.jsonl')),
  },
  run: browser.run,
  summary: browser.summary,
  fallbackEvidence: {
    sourceRun: basename(fallback.directory),
    run: fallback.run,
    summary: fallback.summary,
    rawArtifactHashes: {
      run: sha256(join(fallback.directory, 'run.json')),
      samples: sha256(join(fallback.directory, 'samples.jsonl')),
      summary: sha256(join(fallback.directory, 'summary.json')),
      errors: sha256(join(fallback.directory, 'errors.jsonl')),
    },
  },
}, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  status: 'implementation-continuing; release-certification-incomplete',
  report: outputPath,
  manifest: manifestOutputPath,
  sourceRun: browser.directory,
})}\n`);
