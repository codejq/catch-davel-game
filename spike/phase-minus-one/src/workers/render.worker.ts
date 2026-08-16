/// <reference lib="webworker" />

import { RawWebGL2Renderer, type RenderStats } from '../render/renderer';
import { TransportConsumer, type TransportConsumerStats } from '../transport/consumer';

interface InitializeRenderMessage {
  readonly type: 'initialize-renderer';
  readonly canvas: OffscreenCanvas;
  readonly snapshotPort: MessagePort;
  readonly eventPort: MessagePort;
  readonly width: number;
  readonly height: number;
  readonly pixelRatio: number;
}

interface ResizeMessage {
  readonly type: 'resize';
  readonly width: number;
  readonly height: number;
  readonly pixelRatio: number;
}

interface StallMessage {
  readonly type: 'stall';
  readonly milliseconds: number;
  readonly requestId: number;
}

interface ContextProbeMessage {
  readonly type: 'probe-context';
  readonly requestId: number;
}

type RenderWorkerMessage = InitializeRenderMessage | ResizeMessage | StallMessage | ContextProbeMessage;

const scope = self as DedicatedWorkerGlobalScope;
let renderer: RawWebGL2Renderer | null = null;
let latestTransportStats: TransportConsumerStats | null = null;
let presentedEvents = 0;
const pendingRenderSamples: RenderStats[] = [];
let renderCanvas: OffscreenCanvas | null = null;
let renderWidth = 1;
let renderHeight = 1;
let renderPixelRatio = 1;
let contextProbeActive = false;

scope.onmessage = (event: MessageEvent<RenderWorkerMessage>) => {
  const message = event.data;
  if (message.type === 'resize') {
    renderWidth = message.width;
    renderHeight = message.height;
    renderPixelRatio = message.pixelRatio;
    renderer?.resize(message.width, message.height, message.pixelRatio);
    return;
  }
  if (message.type === 'stall') {
    const deadline = performance.now() + Math.max(0, message.milliseconds);
    while (performance.now() < deadline) {
      // Intentional Phase -1 consumer stall.
    }
    scope.postMessage({ type: 'stall-complete', requestId: message.requestId });
    return;
  }
  if (message.type === 'probe-context') {
    if (renderer === null || renderCanvas === null || contextProbeActive) return;
    contextProbeActive = true;
    void renderer.probeContextLoss().then((result) => {
      if (result.restored) {
        renderer = new RawWebGL2Renderer(renderCanvas!);
        renderer.resize(renderWidth, renderHeight, renderPixelRatio);
      }
      contextProbeActive = false;
      scope.postMessage({ type: 'context-probe-complete', requestId: message.requestId, result });
    });
    return;
  }

  renderCanvas = message.canvas;
  renderWidth = message.width;
  renderHeight = message.height;
  renderPixelRatio = message.pixelRatio;
  renderer = new RawWebGL2Renderer(message.canvas);
  renderer.resize(message.width, message.height, message.pixelRatio);
  scope.postMessage({ type: 'renderer-info', info: renderer.describe() });
  new TransportConsumer(message.snapshotPort, message.eventPort, {
    onEvent: () => {
      presentedEvents += 1;
    },
    onTransportStats: (stats) => {
      latestTransportStats = stats;
    },
    onSnapshot: (snapshot, snapshotMessage) => {
      if (contextProbeActive) return;
      const renderStats = renderer!.render(snapshot.current);
      pendingRenderSamples.push(renderStats);
      if (pendingRenderSamples.length >= 60) {
        scope.postMessage({
          type: 'render-stats-batch',
          samples: pendingRenderSamples.splice(0, pendingRenderSamples.length),
          presentedEvents,
          snapshotLatencyMs: latestTransportStats?.snapshotLatencyMs ?? 0,
          simulationTimings: snapshotMessage.timings,
          checksum: snapshotMessage.checksum,
        });
      }
    },
  });
};
