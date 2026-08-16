import {
  DEFAULT_RENDER_PRESENTATION_SETTINGS,
  type RenderGameState,
  type RenderPresentationSettings,
} from './render-model';
import { WorldRenderer } from './world-renderer';
import type { RenderWorkerRequest, RenderWorkerResponse } from '../workers/render-worker-protocol';
import { RENDER_QUALITY_PROFILES, type RenderQualityTier } from './quality';
import type { PulseEnergyCellEffect } from './presentation-particles';
import type { BombDetonationEffect } from './bomb-detonation';
import type { SwordArcEffect } from './sword-arc';
import type { PulseImpactEffect } from './pulse-impact';

export type RendererMode = 'offscreen-worker' | 'main-thread-fallback';

export interface RendererHost {
  readonly canvas: HTMLCanvasElement;
  readonly mode: RendererMode;
  resize(): void;
  setQuality(quality: RenderQualityTier): void;
  emitPulseEnergyCell(effect: PulseEnergyCellEffect): void;
  emitPulseImpact(effect: PulseImpactEffect): void;
  emitBombDetonation(effect: BombDetonationEffect): void;
  emitSwordArc(effect: SwordArcEffect): void;
  clearPresentationEffects(): void;
  present(state: RenderGameState, settings?: RenderPresentationSettings): void;
  dispose(): void;
}

export interface RendererHostOptions {
  readonly forceMainThread?: boolean;
  readonly onError?: (error: Error) => void;
  readonly onContextStatus?: (status: 'lost' | 'restored') => void;
}

function canvasSize(canvas: HTMLCanvasElement, quality: RenderQualityTier): { readonly cssWidth: number; readonly cssHeight: number; readonly pixelRatio: number } {
  return {
    cssWidth: Math.max(1, canvas.clientWidth),
    cssHeight: Math.max(1, canvas.clientHeight),
    pixelRatio: Math.min(devicePixelRatio, RENDER_QUALITY_PROFILES[quality].pixelRatioCap),
  };
}

function webGl2(canvas: HTMLCanvasElement): WebGL2RenderingContext {
  const context = canvas.getContext('webgl2', { alpha: false, antialias: true });
  if (context === null) throw new Error('Catch Davel requires WebGL2');
  return context;
}

class MainThreadRendererHost implements RendererHost {
  readonly mode = 'main-thread-fallback' as const;
  private renderer: WorldRenderer;
  private previousState: RenderGameState | null = null;
  private previousSettings: RenderPresentationSettings = DEFAULT_RENDER_PRESENTATION_SETTINGS;
  private contextLost = false;
  private quality: RenderQualityTier = 'high';

  constructor(readonly canvas: HTMLCanvasElement, private readonly onContextStatus?: (status: 'lost' | 'restored') => void) {
    this.renderer = new WorldRenderer(webGl2(canvas), canvas);
    canvas.addEventListener('webglcontextlost', this.handleContextLost);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
  }

  resize(): void { this.renderer.resize(undefined, undefined, RENDER_QUALITY_PROFILES[this.quality].pixelRatioCap); }

  setQuality(quality: RenderQualityTier): void {
    if (quality === this.quality) return;
    this.quality = quality;
    this.resize();
  }

  emitPulseEnergyCell(effect: PulseEnergyCellEffect): void {
    this.renderer.emitPulseEnergyCell(effect);
    if (this.previousState !== null && !this.contextLost) this.renderer.render(this.previousState, this.previousSettings);
  }

  emitPulseImpact(effect: PulseImpactEffect): void {
    this.renderer.emitPulseImpact(effect);
    if (this.previousState !== null && !this.contextLost) this.renderer.render(this.previousState, this.previousSettings);
  }

  emitBombDetonation(effect: BombDetonationEffect): void {
    this.renderer.emitBombDetonation(effect);
    if (this.previousState !== null && !this.contextLost) this.renderer.render(this.previousState, this.previousSettings);
  }

  emitSwordArc(effect: SwordArcEffect): void {
    this.renderer.emitSwordArc(effect);
    if (this.previousState !== null && !this.contextLost) this.renderer.render(this.previousState, this.previousSettings);
  }

  clearPresentationEffects(): void { this.renderer.clearPresentationEffects(); }

  present(state: RenderGameState, settings = DEFAULT_RENDER_PRESENTATION_SETTINGS): void {
    if (state === this.previousState && settings.motionScale === this.previousSettings.motionScale
      && settings.flashScale === this.previousSettings.flashScale
      && settings.qualityTier === this.previousSettings.qualityTier) return;
    this.previousState = state;
    this.previousSettings = settings;
    if (!this.contextLost) this.renderer.render(state, settings);
  }

  dispose(): void {
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
  }

  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault();
    this.contextLost = true;
    this.onContextStatus?.('lost');
  };

  private readonly handleContextRestored = (): void => {
    this.renderer = new WorldRenderer(webGl2(this.canvas), this.canvas);
    this.resize();
    this.contextLost = false;
    this.onContextStatus?.('restored');
    if (this.previousState !== null) this.renderer.render(this.previousState, this.previousSettings);
  };
}

class OffscreenRendererHost implements RendererHost {
  readonly mode = 'offscreen-worker' as const;
  private readonly worker = new Worker(new URL('../workers/render.worker.ts', import.meta.url), { type: 'module' });
  private nextSequence = 1;
  private inFlight = false;
  private pending: { readonly state: RenderGameState; readonly settings: RenderPresentationSettings } | null = null;
  private previousState: RenderGameState | null = null;
  private previousSettings: RenderPresentationSettings = DEFAULT_RENDER_PRESENTATION_SETTINGS;
  private latest: { readonly state: RenderGameState; readonly settings: RenderPresentationSettings } | null = null;
  private disposed = false;
  private quality: RenderQualityTier = 'high';
  private resolveReady!: () => void;
  private rejectReady!: (error: Error) => void;
  private readonly ready: Promise<void>;

  constructor(
    readonly canvas: HTMLCanvasElement,
    offscreen: OffscreenCanvas,
    private readonly onError?: (error: Error) => void,
    private readonly onContextStatus?: (status: 'lost' | 'restored') => void,
  ) {
    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.worker.onmessage = (event: MessageEvent<RenderWorkerResponse>) => this.receive(event.data);
    this.worker.onerror = (event) => this.fail(new Error(event.message || 'Render Worker failed'));
    this.worker.postMessage({ type: 'initialize', canvas: offscreen, ...canvasSize(canvas, this.quality) } satisfies RenderWorkerRequest, [offscreen]);
  }

  initialized(): Promise<void> { return this.ready; }

  resize(): void {
    if (this.disposed) return;
    this.worker.postMessage({ type: 'resize', ...canvasSize(this.canvas, this.quality) } satisfies RenderWorkerRequest);
  }

  setQuality(quality: RenderQualityTier): void {
    if (quality === this.quality) return;
    this.quality = quality;
    this.resize();
  }

  emitPulseEnergyCell(effect: PulseEnergyCellEffect): void {
    if (this.disposed) return;
    this.worker.postMessage({ type: 'pulse-energy-cell', effect } satisfies RenderWorkerRequest);
    this.pending = this.latest;
    this.flush();
  }

  emitPulseImpact(effect: PulseImpactEffect): void {
    if (this.disposed) return;
    this.worker.postMessage({ type: 'pulse-impact', effect } satisfies RenderWorkerRequest);
    this.pending = this.latest;
    this.flush();
  }

  emitBombDetonation(effect: BombDetonationEffect): void {
    if (this.disposed) return;
    this.worker.postMessage({ type: 'bomb-detonation', effect } satisfies RenderWorkerRequest);
    this.pending = this.latest;
    this.flush();
  }

  emitSwordArc(effect: SwordArcEffect): void {
    if (this.disposed) return;
    this.worker.postMessage({ type: 'sword-arc', effect } satisfies RenderWorkerRequest);
    this.pending = this.latest;
    this.flush();
  }

  clearPresentationEffects(): void {
    if (this.disposed) return;
    this.worker.postMessage({ type: 'clear-presentation-effects' } satisfies RenderWorkerRequest);
  }

  present(state: RenderGameState, settings = DEFAULT_RENDER_PRESENTATION_SETTINGS): void {
    if (this.disposed || (state === this.previousState && settings.motionScale === this.previousSettings.motionScale
      && settings.flashScale === this.previousSettings.flashScale
      && settings.qualityTier === this.previousSettings.qualityTier)) return;
    this.previousState = state;
    this.previousSettings = settings;
    this.latest = { state, settings };
    this.pending = this.latest;
    this.flush();
  }

  dispose(): void {
    this.disposed = true;
    this.pending = null;
    this.worker.terminate();
  }

  private receive(response: RenderWorkerResponse): void {
    if (response.type === 'ready') {
      this.resolveReady();
      return;
    }
    if (response.type === 'failure') {
      this.fail(new Error(response.message));
      return;
    }
    if (response.type === 'context-lost') {
      this.onContextStatus?.('lost');
      return;
    }
    if (response.type === 'context-restored') {
      this.previousState = null;
      this.pending = this.latest;
      this.onContextStatus?.('restored');
      this.flush();
      return;
    }
    this.inFlight = false;
    this.flush();
  }

  private flush(): void {
    if (this.inFlight || this.pending === null || this.disposed) return;
    const { state, settings } = this.pending;
    this.pending = null;
    this.inFlight = true;
    this.worker.postMessage({ type: 'render', sequence: this.nextSequence++, state, settings } satisfies RenderWorkerRequest);
  }

  private fail(error: Error): void {
    if (this.disposed) return;
    this.rejectReady(error);
    this.onError?.(error);
  }
}

function replacementCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const replacement = canvas.cloneNode(false) as HTMLCanvasElement;
  canvas.replaceWith(replacement);
  return replacement;
}

export async function createRendererHost(canvas: HTMLCanvasElement, options: RendererHostOptions = {}): Promise<RendererHost> {
  const supportsOffscreen = typeof canvas.transferControlToOffscreen === 'function' && typeof Worker === 'function';
  if (options.forceMainThread === true || !supportsOffscreen) return new MainThreadRendererHost(canvas, options.onContextStatus);
  let host: OffscreenRendererHost | null = null;
  try {
    const offscreen = canvas.transferControlToOffscreen();
    host = new OffscreenRendererHost(canvas, offscreen, options.onError, options.onContextStatus);
    await Promise.race([
      host.initialized(),
      new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('Render Worker initialization timed out')), 5_000)),
    ]);
    return host;
  } catch (error) {
    host?.dispose();
    options.onError?.(error instanceof Error ? error : new Error(String(error)));
    return new MainThreadRendererHost(replacementCanvas(canvas), options.onContextStatus);
  }
}
