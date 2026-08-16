import {
  RawWebGL2Renderer,
  type ContextRecoveryResult,
  type RendererInfo,
  type RenderStats,
} from '../render/renderer';
import type { TickTimings } from '../sim/simulation';
import { TransportConsumer, type TransportConsumerStats } from '../transport/consumer';
import { runAudioVisualProbe, type AudioVisualProbeResult } from './audio-probe';
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

interface StallCompleteMessage {
  readonly type: 'stall-complete';
  readonly requestId: number;
}

interface ContextProbeCompleteMessage {
  readonly type: 'context-probe-complete';
  readonly requestId: number;
  readonly result: ContextRecoveryResult;
}

type RenderWorkerMessage = RenderWorkerStatsBatch | RendererInfoMessage | StallCompleteMessage | ContextProbeCompleteMessage;

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
  readonly latestTicks: () => { readonly main: number; readonly render: number };
  readonly stallMain: (milliseconds: number) => void;
  readonly stallRender: (milliseconds: number) => Promise<void>;
  readonly probeContextRecovery: () => Promise<ContextRecoveryResult>;
  readonly probeAudioVisual: () => Promise<AudioVisualProbeResult>;
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
let latestRenderTick = 0;
let rendererInfo: RendererInfo | null = null;
const simulationSamples: BrowserSimulationSample[] = [];
const renderSamples: RenderStats[] = [];
const runtimeErrors: string[] = [];
const CAPTURE_CAPACITY = 12_000;
let stallRenderImplementation = (_milliseconds: number): Promise<void> => Promise.reject(new Error('Render stall probe is unavailable'));
let contextProbeImplementation = (): Promise<ContextRecoveryResult> => Promise.resolve({ supported: false, lost: false, restored: false });

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
  latestTicks: () => ({ main: latestMainTransport?.snapshotTick ?? 0, render: latestRenderTick }),
  stallMain: (milliseconds) => {
    const deadline = performance.now() + milliseconds;
    while (performance.now() < deadline) {
      // Intentional Phase -1 consumer stall.
    }
  },
  stallRender: (milliseconds) => stallRenderImplementation(milliseconds),
  probeContextRecovery: () => contextProbeImplementation(),
  probeAudioVisual: () => runAudioVisualProbe(),
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
  let nextStallRequest = 1;
  const pendingStalls = new Map<number, () => void>();
  const pendingContextProbes = new Map<number, (result: ContextRecoveryResult) => void>();
  stallRenderImplementation = (milliseconds) => new Promise<void>((resolve) => {
    const requestId = nextStallRequest++;
    pendingStalls.set(requestId, resolve);
    renderWorker.postMessage({ type: 'stall', milliseconds, requestId });
  });
  contextProbeImplementation = () => new Promise<ContextRecoveryResult>((resolve) => {
    const requestId = nextStallRequest++;
    pendingContextProbes.set(requestId, resolve);
    renderWorker.postMessage({ type: 'probe-context', requestId });
  });
  renderWorker.onmessage = (event: MessageEvent<RenderWorkerMessage>) => {
    if (event.data.type === 'context-probe-complete') {
      pendingContextProbes.get(event.data.requestId)?.(event.data.result);
      pendingContextProbes.delete(event.data.requestId);
      return;
    }
    if (event.data.type === 'stall-complete') {
      pendingStalls.get(event.data.requestId)?.();
      pendingStalls.delete(event.data.requestId);
      return;
    }
    if (event.data.type === 'renderer-info') {
      rendererInfo = event.data.info;
      return;
    }
    const latest = event.data.samples.at(-1);
    if (latest !== undefined) {
      latestRenderStats = latest;
      latestRenderTick = latest.tick;
    }
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
  let renderer = new RawWebGL2Renderer(canvas);
  let contextProbeActive = false;
  rendererInfo = renderer.describe();
  contextProbeImplementation = async () => {
    contextProbeActive = true;
    const result = await renderer.probeContextLoss();
    if (result.restored) {
      renderer = new RawWebGL2Renderer(canvas);
      renderer.resize(canvas.clientWidth, canvas.clientHeight, Math.min(devicePixelRatio, 2));
    }
    contextProbeActive = false;
    return result;
  };
  resizeRenderer((width, height, pixelRatio) => renderer.resize(width, height, pixelRatio));
  new TransportConsumer(renderSnapshotChannel.port1, renderEventChannel.port1, {
    onEvent: () => {
      renderPresentedEvents += 1;
    },
    onSnapshot: (snapshot) => {
      if (contextProbeActive) return;
      latestRenderStats = renderer.render(snapshot.current);
      latestRenderTick = latestRenderStats.tick;
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
