import {
  RawWebGL2Renderer,
  type RendererInfo,
  type RenderStats,
} from '../render/renderer';
import type { TickTimings } from '../sim/simulation';
import { TransportConsumer, type TransportConsumerStats } from '../transport/consumer';
import './style.css';

interface RenderWorkerStatsBatch {
  readonly type: 'render-stats-batch';
  readonly samples: readonly RenderStats[];
  readonly presentedEvents: number;
  readonly snapshotLatencyMs: number;
  readonly simulationTimings: TickTimings;
  readonly checksum: string;
}

interface RendererInfoMessage {
  readonly type: 'renderer-info';
  readonly info: RendererInfo;
}

type RenderWorkerMessage = RenderWorkerStatsBatch | RendererInfoMessage;

interface BrowserSimulationSample {
  readonly tick: number;
  readonly timings: TickTimings;
  readonly transport: TransportConsumerStats;
  readonly checksum: string;
}

interface BrowserCapture {
  readonly schemaVersion: 1;
  readonly mode: () => string;
  readonly rendererInfo: () => RendererInfo | null;
  readonly drainSimulationSamples: () => BrowserSimulationSample[];
  readonly drainRenderSamples: () => RenderStats[];
  readonly drainErrors: () => string[];
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (element === null) throw new Error(`Phase -1 page is missing ${selector}`);
  return element;
}

const status = requireElement<HTMLParagraphElement>('#runtime-status');
const metrics = requireElement<HTMLPreElement>('#metrics');
const canvas = requireElement<HTMLCanvasElement>('#game');

const simulationWorker = new Worker(new URL('../workers/simulation.worker.ts', import.meta.url), { type: 'module' });
const mainSnapshotChannel = new MessageChannel();
const mainEventChannel = new MessageChannel();
const renderSnapshotChannel = new MessageChannel();
const renderEventChannel = new MessageChannel();

let latestMainTransport: TransportConsumerStats | null = null;
let latestSimulationTimings: TickTimings | null = null;
let latestRenderStats: RenderStats | null = null;
let latestChecksum = '--------';
let mainPresentedEvents = 0;
let renderPresentedEvents = 0;
let rendererMode = 'main-thread WebGL2 fallback';
let rendererInfo: RendererInfo | null = null;
const simulationSamples: BrowserSimulationSample[] = [];
const renderSamples: RenderStats[] = [];
const runtimeErrors: string[] = [];
const CAPTURE_CAPACITY = 12_000;

function appendBounded<T>(target: T[], values: readonly T[]): void {
  const excess = target.length + values.length - CAPTURE_CAPACITY;
  if (excess > 0) target.splice(0, excess);
  target.push(...values);
}

const capture: BrowserCapture = {
  schemaVersion: 1,
  mode: () => rendererMode,
  rendererInfo: () => rendererInfo,
  drainSimulationSamples: () => simulationSamples.splice(0, simulationSamples.length),
  drainRenderSamples: () => renderSamples.splice(0, renderSamples.length),
  drainErrors: () => runtimeErrors.splice(0, runtimeErrors.length),
};
(globalThis as typeof globalThis & { __CATCH_DAVEL_SPIKE__?: BrowserCapture }).__CATCH_DAVEL_SPIKE__ = capture;
addEventListener('error', (event) => runtimeErrors.push(event.message));
addEventListener('unhandledrejection', (event) => runtimeErrors.push(String(event.reason)));

function formatMilliseconds(value: number | undefined): string {
  return value === undefined ? '--' : value.toFixed(3);
}

function updateMetrics(): void {
  metrics.textContent = [
    'Decisions 16–20: approved',
    `Topology: simulation Worker + ${rendererMode}`,
    'Simulation: 60 Hz / 2 substeps / 8 XPBD iterations',
    'Workload: 24 robots / 360 particles / 336 links',
    `Tick: ${latestMainTransport?.snapshotTick ?? 0}`,
    `Simulation whole/physics/navigation: ${formatMilliseconds(latestSimulationTimings?.wholeTickMs)} / ${formatMilliseconds(latestSimulationTimings?.physicsMs)} / ${formatMilliseconds(latestSimulationTimings?.navigationMs)} ms`,
    `Render CPU: ${formatMilliseconds(latestRenderStats?.cpuMs)} ms (${latestRenderStats?.drawCalls ?? 0} draw calls)`,
    `Snapshot latency: ${formatMilliseconds(latestMainTransport?.snapshotLatencyMs)} ms`,
    `Queued events / drops: ${latestMainTransport?.queuedEvents ?? 0} / ${latestMainTransport?.presentationDrops ?? 0}`,
    `Presented events main/render: ${mainPresentedEvents} / ${renderPresentedEvents}`,
    `Checksum: ${latestChecksum}`,
    'Certification: development-only until baseline devices run the frozen artifact',
  ].join('\n');
}

new TransportConsumer(mainSnapshotChannel.port1, mainEventChannel.port1, {
  onEvent: () => {
    mainPresentedEvents += 1;
  },
  onSnapshot: (_snapshot, message) => {
    latestSimulationTimings = message.timings;
    latestChecksum = message.checksum;
  },
  onTransportStats: (transportStats) => {
    latestMainTransport = transportStats;
    if (latestSimulationTimings !== null) {
      appendBounded(simulationSamples, [{
        tick: transportStats.snapshotTick,
        timings: latestSimulationTimings,
        transport: transportStats,
        checksum: latestChecksum,
      }]);
    }
    if (transportStats.snapshotTick % 15 === 0) updateMetrics();
  },
});

const resizeRenderer = (send: (width: number, height: number, pixelRatio: number) => void): void => {
  const resize = (): void => send(canvas.clientWidth, canvas.clientHeight, Math.min(devicePixelRatio, 2));
  new ResizeObserver(resize).observe(canvas);
  resize();
};

if (typeof canvas.transferControlToOffscreen === 'function') {
  rendererMode = 'OffscreenCanvas render Worker';
  const renderWorker = new Worker(new URL('../workers/render.worker.ts', import.meta.url), { type: 'module' });
  renderWorker.onmessage = (event: MessageEvent<RenderWorkerMessage>) => {
    if (event.data.type === 'renderer-info') {
      rendererInfo = event.data.info;
      return;
    }
    const latest = event.data.samples.at(-1);
    if (latest !== undefined) latestRenderStats = latest;
    appendBounded(renderSamples, event.data.samples);
    renderPresentedEvents = event.data.presentedEvents;
  };
  renderWorker.onerror = (event) => {
    status.textContent = `Render Worker failed: ${event.message}`;
  };
  const offscreen = canvas.transferControlToOffscreen();
  renderWorker.postMessage(
    {
      type: 'initialize-renderer',
      canvas: offscreen,
      snapshotPort: renderSnapshotChannel.port1,
      eventPort: renderEventChannel.port1,
      width: canvas.clientWidth,
      height: canvas.clientHeight,
      pixelRatio: Math.min(devicePixelRatio, 2),
    },
    [offscreen, renderSnapshotChannel.port1, renderEventChannel.port1],
  );
  resizeRenderer((width, height, pixelRatio) => {
    renderWorker.postMessage({ type: 'resize', width, height, pixelRatio });
  });
} else {
  const renderer = new RawWebGL2Renderer(canvas);
  rendererInfo = renderer.describe();
  resizeRenderer((width, height, pixelRatio) => renderer.resize(width, height, pixelRatio));
  new TransportConsumer(renderSnapshotChannel.port1, renderEventChannel.port1, {
    onEvent: () => {
      renderPresentedEvents += 1;
    },
    onSnapshot: (snapshot) => {
      latestRenderStats = renderer.render(snapshot.current);
      appendBounded(renderSamples, [latestRenderStats]);
    },
  });
}

simulationWorker.onerror = (event) => {
  status.textContent = `Simulation Worker failed: ${event.message}`;
};
simulationWorker.postMessage(
  {
    type: 'initialize',
    seed: 'catch-davel-phase-minus-one-v1',
    renderSnapshotPort: renderSnapshotChannel.port2,
    renderEventPort: renderEventChannel.port2,
    mainSnapshotPort: mainSnapshotChannel.port2,
    mainEventPort: mainEventChannel.port2,
  },
  [
    renderSnapshotChannel.port2,
    renderEventChannel.port2,
    mainSnapshotChannel.port2,
    mainEventChannel.port2,
  ],
);

status.textContent = 'Running deterministic 24-robot feasibility workload.';
updateMetrics();
