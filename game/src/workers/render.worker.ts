/// <reference lib="webworker" />

import { WorldRenderer } from '../render/world-renderer';
import type { RenderWorkerRequest, RenderWorkerResponse } from './render-worker-protocol';

const scope = self as DedicatedWorkerGlobalScope;
let renderer: WorldRenderer | null = null;

function post(message: RenderWorkerResponse): void { scope.postMessage(message); }

scope.onmessage = (event: MessageEvent<RenderWorkerRequest>) => {
  const request = event.data;
  try {
    if (request.type === 'initialize') {
      if (renderer !== null) throw new Error('Render Worker was initialized more than once');
      const context = request.canvas.getContext('webgl2', { alpha: false, antialias: true });
      if (context === null) throw new Error('OffscreenCanvas WebGL2 is unavailable');
      renderer = new WorldRenderer(context, request.canvas);
      renderer.resize(request.cssWidth, request.cssHeight, request.pixelRatio);
      post({ type: 'ready' });
      return;
    }
    if (renderer === null) throw new Error('Render Worker received a request before initialization');
    if (request.type === 'resize') {
      renderer.resize(request.cssWidth, request.cssHeight, request.pixelRatio);
      return;
    }
    renderer.render(request.state);
    post({ type: 'frame-presented', sequence: request.sequence, tick: request.state.tick });
  } catch (error) {
    post({ type: 'failure', message: error instanceof Error ? error.message : String(error) });
  }
};
