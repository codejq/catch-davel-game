/// <reference lib="webworker" />

import { WorldRenderer } from '../render/world-renderer';
import type { RenderWorkerRequest, RenderWorkerResponse } from './render-worker-protocol';

const scope = self as DedicatedWorkerGlobalScope;
let renderer: WorldRenderer | null = null;
let context: WebGL2RenderingContext | null = null;
let canvas: OffscreenCanvas | null = null;
let contextLost = false;
let cssWidth = 1;
let cssHeight = 1;
let pixelRatio = 1;

function post(message: RenderWorkerResponse): void { scope.postMessage(message); }

scope.onmessage = (event: MessageEvent<RenderWorkerRequest>) => {
  const request = event.data;
  try {
    if (request.type === 'initialize') {
      if (renderer !== null) throw new Error('Render Worker was initialized more than once');
      const webGl = request.canvas.getContext('webgl2', { alpha: false, antialias: true });
      if (webGl === null) throw new Error('OffscreenCanvas WebGL2 is unavailable');
      context = webGl;
      canvas = request.canvas;
      cssWidth = request.cssWidth; cssHeight = request.cssHeight; pixelRatio = request.pixelRatio;
      request.canvas.addEventListener('contextlost', (lostEvent) => {
        lostEvent.preventDefault();
        contextLost = true;
        post({ type: 'context-lost' });
      });
      request.canvas.addEventListener('contextrestored', () => {
        if (context === null || canvas === null) return;
        renderer = new WorldRenderer(context, canvas);
        renderer.resize(cssWidth, cssHeight, pixelRatio);
        contextLost = false;
        post({ type: 'context-restored' });
      });
      renderer = new WorldRenderer(webGl, request.canvas);
      renderer.resize(cssWidth, cssHeight, pixelRatio);
      post({ type: 'ready' });
      return;
    }
    if (renderer === null) throw new Error('Render Worker received a request before initialization');
    if (request.type === 'resize') {
      cssWidth = request.cssWidth; cssHeight = request.cssHeight; pixelRatio = request.pixelRatio;
      if (!contextLost) renderer.resize(cssWidth, cssHeight, pixelRatio);
      return;
    }
    if (request.type === 'pulse-energy-cell') {
      if (!contextLost) renderer.emitPulseEnergyCell(request.effect);
      return;
    }
    if (request.type === 'pulse-impact') {
      if (!contextLost) renderer.emitPulseImpact(request.effect);
      return;
    }
    if (request.type === 'bomb-detonation') {
      if (!contextLost) renderer.emitBombDetonation(request.effect);
      return;
    }
    if (request.type === 'sword-arc') {
      if (!contextLost) renderer.emitSwordArc(request.effect);
      return;
    }
    if (request.type === 'clear-presentation-effects') {
      renderer.clearPresentationEffects();
      return;
    }
    if (!contextLost) renderer.render(request.state, request.settings);
    post({ type: 'frame-presented', sequence: request.sequence, tick: request.state.tick });
  } catch (error) {
    post({ type: 'failure', message: error instanceof Error ? error.message : String(error) });
  }
};
