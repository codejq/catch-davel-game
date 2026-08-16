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

type RenderWorkerMessage = InitializeRenderMessage | ResizeMessage | StallMessage;

const scope = self as DedicatedWorkerGlobalScope;
let renderer: RawWebGL2Renderer | null = null;
let latestTransportStats: TransportConsumerStats | null = null;
let presentedEvents = 0;
const pendingRenderSamples: RenderStats[] = [];

scope.onmessage = (event: MessageEvent<RenderWorkerMessage>) => {
  const message = event.data;
  if (message.type === 'resize') {
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
