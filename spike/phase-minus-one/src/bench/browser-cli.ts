import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { cpus, freemem, platform, release, totalmem } from 'node:os';
import { dirname, extname, isAbsolute, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import type { AudioVisualProbeResult } from '../browser/audio-probe';
import type { ContextRecoveryResult, RendererInfo, RenderStats } from '../render/renderer';
import {
  PHYSICS_SUBSTEPS,
  ROBOT_COUNT,
  SIMULATION_SCHEMA_VERSION,
  TICK_HZ,
  TRANSPORT_CONTRACT_VERSION,
  XPBD_ITERATIONS,
} from '../sim/constants';
import { Simulation, type TickTimings } from '../sim/simulation';
import type { TransportConsumerStats } from '../transport/consumer';
import { summarize, summarizeTimings } from './metrics';

interface BrowserSimulationSample {
  readonly tick: number;
  readonly timings: TickTimings;
  readonly transport: TransportConsumerStats;
  readonly checksum: string;
}

interface CapturedData {
  readonly mode: string;
  readonly rendererInfo: RendererInfo | null;
  readonly simulation: BrowserSimulationSample[];
  readonly render: RenderStats[];
  readonly runtimeErrors: string[];
  readonly viewport: { width: number; height: number; pixelRatio: number };
  readonly stallEvidence: readonly StallEvidence[];
  readonly contextRecovery: ContextRecoveryResult | null;
  readonly audioVisual: AudioVisualProbeResult | null;
  readonly memory: { readonly beforeBytes: number; readonly afterBytes: number; readonly growthBytes: number } | null;
}

interface StallEvidence {
  readonly target: 'main' | 'render';
  readonly milliseconds: number;
  readonly before: { readonly main: number; readonly render: number };
  readonly after: { readonly main: number; readonly render: number };
  readonly simulationContinued: boolean;
}

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const distDirectory = join(packageDirectory, 'dist');
const runRoot = join(packageDirectory, 'artifacts', 'runs');
const MIME_TYPES: Readonly<Record<string, string>> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

function positiveNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${name} must be a positive number`);
  return parsed;
}

function browserExecutable(): string {
  const candidates = [
    process.env.SPIKE_BROWSER_EXECUTABLE,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];
  const executable = candidates.find((candidate): candidate is string => candidate !== undefined && existsSync(candidate));
  if (executable === undefined) throw new Error('No Edge/Chrome executable found; set SPIKE_BROWSER_EXECUTABLE');
  return executable;
}

function git(command: string, fallback: string): string {
  try {
    return execFileSync('git', command.split(' '), { cwd: resolve(packageDirectory, '../..'), encoding: 'utf8' }).trim();
  } catch {
    return fallback;
  }
}

function startServer(): Promise<{ server: Server; url: string }> {
  if (!existsSync(join(distDirectory, 'index.html'))) throw new Error('Built artifact is missing; run npm run spike:build first');
  const server = createServer((request, response) => {
    const requestPath = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    const relativePath = requestPath === '/' ? 'index.html' : requestPath.slice(1);
    const filePath = resolve(distDirectory, normalize(relativePath));
    const relativeToDist = relative(distDirectory, filePath);
    if (relativeToDist.startsWith('..') || isAbsolute(relativeToDist)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const body = readFileSync(filePath);
      response.writeHead(200, {
        'Content-Type': MIME_TYPES[extname(filePath)] ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  return new Promise((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address === null || typeof address === 'string') {
        reject(new Error('Unable to resolve benchmark server port'));
        return;
      }
      resolvePromise({ server, url: `http://127.0.0.1:${address.port}/` });
    });
  });
}

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

async function run(): Promise<void> {
  const warmupSeconds = positiveNumber('SPIKE_BROWSER_WARMUP_SECONDS', 2);
  const measuredSeconds = positiveNumber('SPIKE_BROWSER_MEASURED_SECONDS', 10);
  const rendererPreference = process.env.SPIKE_RENDERER_MODE === 'main' ? 'main' : 'worker';
  const executablePath = browserExecutable();
  const { server, url } = await startServer();
  const errors: Array<{ source: string; message: string }> = [];
  let browserVersion = 'unknown';
  let captured: CapturedData | null = null;
  const startedAt = new Date().toISOString();
  try {
    const browser = await chromium.launch({
      executablePath,
      headless: process.env.SPIKE_BROWSER_HEADFUL !== '1',
      args: ['--enable-webgl', '--ignore-gpu-blocklist'],
    });
    browserVersion = browser.version();
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const devtools = await page.context().newCDPSession(page);
    await devtools.send('Performance.enable');
    const measureHeap = async (): Promise<number> => {
      await devtools.send('HeapProfiler.collectGarbage');
      const response = await devtools.send('Performance.getMetrics') as {
        metrics: readonly { name: string; value: number }[];
      };
      return response.metrics.find((metric) => metric.name === 'JSHeapUsedSize')?.value ?? 0;
    };
    page.on('pageerror', (error) => errors.push({ source: 'pageerror', message: error.message }));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push({ source: 'console', message: message.text() });
    });
    const pageUrl = rendererPreference === 'main' ? `${url}?renderer=main` : url;
    await page.goto(pageUrl, { waitUntil: 'load' });
    await page.waitForFunction(() => {
      const capture = (globalThis as typeof globalThis & { __CATCH_DAVEL_SPIKE__?: { rendererInfo: () => unknown } }).__CATCH_DAVEL_SPIKE__;
      return capture?.rendererInfo() !== null;
    }, undefined, { timeout: 15_000 });
    await page.waitForTimeout(warmupSeconds * 1_000);
    const memoryBeforeBytes = await measureHeap();
    await page.evaluate(() => {
      const capture = (globalThis as typeof globalThis & { __CATCH_DAVEL_SPIKE__: {
        drainSimulationSamples: () => unknown;
        drainRenderSamples: () => unknown;
        drainErrors: () => unknown;
      } }).__CATCH_DAVEL_SPIKE__;
      capture.drainSimulationSamples();
      capture.drainRenderSamples();
      capture.drainErrors();
    });
    await page.waitForTimeout(measuredSeconds * 1_000);
    captured = await page.evaluate(() => {
      const capture = (globalThis as typeof globalThis & { __CATCH_DAVEL_SPIKE__: {
        mode: () => string;
        rendererInfo: () => RendererInfo | null;
        drainSimulationSamples: () => BrowserSimulationSample[];
        drainRenderSamples: () => RenderStats[];
        drainErrors: () => string[];
      } }).__CATCH_DAVEL_SPIKE__;
      return {
        mode: capture.mode(),
        rendererInfo: capture.rendererInfo(),
        simulation: capture.drainSimulationSamples(),
        render: capture.drainRenderSamples(),
        runtimeErrors: capture.drainErrors(),
        viewport: { width: innerWidth, height: innerHeight, pixelRatio: devicePixelRatio },
        stallEvidence: [],
        contextRecovery: null,
        audioVisual: null,
        memory: null,
      };
    });
    const contextRecovery = await page.evaluate(async () => {
      const capture = (globalThis as typeof globalThis & { __CATCH_DAVEL_SPIKE__: {
        probeContextRecovery: () => Promise<ContextRecoveryResult>;
      } }).__CATCH_DAVEL_SPIKE__;
      return capture.probeContextRecovery();
    });
    captured = { ...captured, contextRecovery };
    if (contextRecovery.supported && (!contextRecovery.lost || !contextRecovery.restored)) {
      errors.push({ source: 'webgl-context', message: 'WebGL context did not complete loss/restoration' });
    }
    await page.waitForTimeout(500);
    await page.locator('#game').click({ position: { x: 10, y: 10 } });
    const audioVisual = await page.evaluate(async () => {
      const capture = (globalThis as typeof globalThis & { __CATCH_DAVEL_SPIKE__: {
        probeAudioVisual: () => Promise<AudioVisualProbeResult>;
      } }).__CATCH_DAVEL_SPIKE__;
      return capture.probeAudioVisual();
    });
    captured = { ...captured, audioVisual };
    if (!audioVisual.supported || audioVisual.contextState !== 'running' || audioVisual.samples.length === 0) {
      errors.push({ source: 'audio-visual', message: 'Instrumented Web Audio probe was unavailable or produced no samples' });
    }
    const stallEvidence: StallEvidence[] = [];
    const targets: readonly ('main' | 'render')[] = captured.mode.includes('OffscreenCanvas') ? ['main', 'render'] : ['main'];
    for (const target of targets) {
      for (const milliseconds of [50, 250, 1_000, 5_000]) {
        const before = await page.evaluate(() => {
          const capture = (globalThis as typeof globalThis & { __CATCH_DAVEL_SPIKE__: {
            latestTicks: () => { main: number; render: number };
          } }).__CATCH_DAVEL_SPIKE__;
          return capture.latestTicks();
        });
        await page.evaluate(async ({ target: stallTarget, milliseconds: duration }) => {
          const capture = (globalThis as typeof globalThis & { __CATCH_DAVEL_SPIKE__: {
            stallMain: (value: number) => void;
            stallRender: (value: number) => Promise<void>;
          } }).__CATCH_DAVEL_SPIKE__;
          if (stallTarget === 'main') capture.stallMain(duration);
          else await capture.stallRender(duration);
        }, { target, milliseconds });
        await page.waitForTimeout(target === 'render' ? 1_100 : 150);
        const after = await page.evaluate(() => {
          const capture = (globalThis as typeof globalThis & { __CATCH_DAVEL_SPIKE__: {
            latestTicks: () => { main: number; render: number };
          } }).__CATCH_DAVEL_SPIKE__;
          return capture.latestTicks();
        });
        const monitoredTickDelta = target === 'main' ? after.render - before.render : after.main - before.main;
        const simulationContinued = milliseconds < 1_000 || monitoredTickDelta >= Math.floor(milliseconds * 0.03);
        stallEvidence.push({ target, milliseconds, before, after, simulationContinued });
        if (!simulationContinued) {
          errors.push({ source: 'transport-stall', message: `${target} ${milliseconds} ms stall stopped simulation progress` });
        }
      }
    }
    const postProbe = await page.evaluate(() => {
      const capture = (globalThis as typeof globalThis & { __CATCH_DAVEL_SPIKE__: {
        drainSimulationSamples: () => unknown;
        drainRenderSamples: () => unknown;
        drainErrors: () => string[];
      } }).__CATCH_DAVEL_SPIKE__;
      capture.drainSimulationSamples();
      capture.drainRenderSamples();
      return { errors: capture.drainErrors() };
    });
    const memoryAfterBytes = await measureHeap();
    captured = {
      ...captured,
      runtimeErrors: [...captured.runtimeErrors, ...postProbe.errors],
      stallEvidence,
      memory: {
        beforeBytes: memoryBeforeBytes,
        afterBytes: memoryAfterBytes,
        growthBytes: memoryAfterBytes - memoryBeforeBytes,
      },
    };
    await browser.close();
  } finally {
    await new Promise<void>((resolvePromise) => server.close(() => resolvePromise()));
  }
  if (captured === null) throw new Error('Browser capture did not complete');
  for (const message of captured.runtimeErrors) errors.push({ source: 'runtime', message });
  const lastTick = captured.simulation.at(-1)?.tick ?? 0;
  const nodeReference = new Simulation('catch-davel-phase-minus-one-v1');
  for (let tick = 0; tick < lastTick; tick += 1) nodeReference.step();
  const nodeReferenceChecksum = nodeReference.checksum();
  const workerChecksum = captured.simulation.at(-1)?.checksum ?? null;
  const nodeWorkerChecksumMatches = workerChecksum === nodeReferenceChecksum;
  if (!nodeWorkerChecksumMatches) {
    errors.push({ source: 'determinism', message: `Node ${nodeReferenceChecksum} != Worker ${workerChecksum ?? 'missing'}` });
  }

  const runId = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
  const runDirectory = join(runRoot, `perf-browser-${runId}`);
  mkdirSync(runDirectory, { recursive: true });
  const dirty = git('status --porcelain', 'unknown');
  const runManifest = {
    label: 'development-only',
    scenario: 'perf:browser',
    scenarioVersion: 1,
    seed: 'catch-davel-phase-minus-one-v1',
    gitCommit: git('rev-parse HEAD', 'unknown'),
    dirty: dirty === 'unknown' ? 'unknown' : dirty.length > 0,
    startedAt,
    endedAt: new Date().toISOString(),
    configuration: {
      simulationSchemaVersion: SIMULATION_SCHEMA_VERSION,
      transportContractVersion: TRANSPORT_CONTRACT_VERSION,
      tickHz: TICK_HZ,
      substeps: PHYSICS_SUBSTEPS,
      iterations: XPBD_ITERATIONS,
      robots: ROBOT_COUNT,
      warmupSeconds,
      measuredSeconds,
      rendererPreference,
    },
    runtime: {
      browserVersion,
      browserExecutable: executablePath,
      node: process.version,
      platform: platform(),
      osRelease: release(),
      architecture: process.arch,
      cpu: cpus()[0]?.model ?? 'unknown',
      logicalCpuCount: cpus().length,
      totalMemoryBytes: totalmem(),
      freeMemoryBytesAtReport: freemem(),
      viewport: captured.viewport,
      rendererMode: captured.mode,
      renderer: captured.rendererInfo,
      powerPolicy: 'not exposed by browser harness',
    },
  };
  const summary = {
    label: 'development-only',
    passedHarness: captured.simulation.length > 0 && captured.render.length > 0 && errors.length === 0,
    sampleCounts: { simulation: captured.simulation.length, render: captured.render.length },
    simulation: summarizeTimings(captured.simulation.map((sample) => sample.timings)),
    snapshotLatencyMs: summarize(captured.simulation.map((sample) => sample.transport.snapshotLatencyMs)),
    queuedEvents: summarize(captured.simulation.map((sample) => sample.transport.queuedEvents)),
    renderCpuMs: summarize(captured.render.map((sample) => sample.cpuMs)),
    renderGpuMs: summarize(captured.render.flatMap((sample) => sample.gpuMs === null ? [] : [sample.gpuMs])),
    drawCalls: summarize(captured.render.map((sample) => sample.drawCalls)),
    instances: summarize(captured.render.map((sample) => sample.instances)),
    firstTick: captured.simulation[0]?.tick ?? null,
    lastTick: lastTick || null,
    finalChecksum: workerChecksum,
    determinism: { nodeReferenceChecksum, workerChecksum, matches: nodeWorkerChecksumMatches },
    transportStalls: captured.stallEvidence,
    contextRecovery: captured.contextRecovery,
    audioVisual: captured.audioVisual === null ? null : {
      supported: captured.audioVisual.supported,
      contextState: captured.audioVisual.contextState,
      baseLatencySeconds: captured.audioVisual.baseLatencySeconds,
      outputLatencySeconds: captured.audioVisual.outputLatencySeconds,
      audioMappingErrorMs: summarize(captured.audioVisual.samples.map((sample) => sample.audioMappingErrorMs)),
      audioVisualSeparationMs: summarize(captured.audioVisual.samples.map((sample) => sample.audioVisualSeparationMs)),
      limitation: captured.audioVisual.limitation,
    },
    memory: captured.memory,
    errors: errors.length,
    certification: 'incomplete: development VMware host is not an approved baseline device',
  };
  const runPath = join(runDirectory, 'run.json');
  const samplesPath = join(runDirectory, 'samples.jsonl');
  const summaryPath = join(runDirectory, 'summary.json');
  const errorsPath = join(runDirectory, 'errors.jsonl');
  writeFileSync(runPath, `${JSON.stringify(runManifest, null, 2)}\n`);
  writeFileSync(samplesPath, [
    ...captured.simulation.map((sample) => JSON.stringify({ type: 'simulation', ...sample })),
    ...captured.render.map((sample) => JSON.stringify({ type: 'render', ...sample })),
    ...(captured.audioVisual?.samples ?? []).map((sample) => JSON.stringify({ type: 'audio-visual', ...sample })),
  ].join('\n') + '\n');
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  writeFileSync(errorsPath, errors.map((error) => JSON.stringify(error)).join('\n') + (errors.length > 0 ? '\n' : ''));
  const result = {
    ...summary,
    artifactDirectory: runDirectory,
    hashes: {
      run: sha256(runPath),
      samples: sha256(samplesPath),
      summary: sha256(summaryPath),
      errors: sha256(errorsPath),
    },
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!summary.passedHarness) process.exitCode = 1;
}

await run();
