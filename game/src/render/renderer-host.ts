import type { RenderGameState } from './render-model';
import { WorldRenderer } from './world-renderer';
import type { RenderWorkerRequest, RenderWorkerResponse } from '../workers/render-worker-protocol';

export type RendererMode = 'offscreen-worker' | 'main-thread-fallback';

export interface RendererHost {
  readonly canvas: HTMLCanvasElement;
  readonly mode: RendererMode;
  resize(): void;
  present(state: RenderGameState): void;
  dispose(): void;
}

export interface RendererHostOptions {
  readonly forceMainThread?: boolean;
  readonly onError?: (error: Error) => void;
}

function canvasSize(canvas: HTMLCanvasElement): { readonly cssWidth: number; readonly cssHeight: number; readonly pixelRatio: number } {
  return {
    cssWidth: Math.max(1, canvas.clientWidth),
    cssHeight: Math.max(1, canvas.clientHeight),
    pixelRatio: Math.min(devicePixelRatio, 2),
  };
}

function webGl2(canvas: HTMLCanvasElement): WebGL2RenderingContext {
  const context = canvas.getContext('webgl2', { alpha: false, antialias: true });
  if (context === null) throw new Error('Catch Davel requires WebGL2');
  return context;
}

class MainThreadRendererHost implements RendererHost {
  readonly mode = 'main-thread-fallback' as const;
  private readonly renderer: WorldRenderer;
  private previousState: RenderGameState | null = null;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new WorldRenderer(webGl2(canvas), canvas);
  }

  resize(): void { this.renderer.resize(); }

  present(state: RenderGameState): void {
    if (state === this.previousState) return;
    this.previousState = state;
    this.renderer.render(state);
  }

  dispose(): void {}
}

class OffscreenRendererHost implements RendererHost {
  readonly mode = 'offscreen-worker' as const;
  private readonly worker = new Worker(new URL('../workers/render.worker.ts', import.meta.url), { type: 'module' });
  private nextSequence = 1;
  private inFlight = false;
  private pending: RenderGameState | null = null;
  private previousState: RenderGameState | null = null;
  private disposed = false;
  private resolveReady!: () => void;
  private rejectReady!: (error: Error) => void;
  private readonly ready: Promise<void>;

  constructor(readonly canvas: HTMLCanvasElement, offscreen: OffscreenCanvas, private readonly onError?: (error: Error) => void) {
    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.worker.onmessage = (event: MessageEvent<RenderWorkerResponse>) => this.receive(event.data);
    this.worker.onerror = (event) => this.fail(new Error(event.message || 'Render Worker failed'));
    this.worker.postMessage({ type: 'initialize', canvas: offscreen, ...canvasSize(canvas) } satisfies RenderWorkerRequest, [offscreen]);
  }

  initialized(): Promise<void> { return this.ready; }

  resize(): void {
    if (this.disposed) return;
    this.worker.postMessage({ type: 'resize', ...canvasSize(this.canvas) } satisfies RenderWorkerRequest);
  }

  present(state: RenderGameState): void {
    if (this.disposed || state === this.previousState) return;
    this.previousState = state;
    this.pending = state;
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
    this.inFlight = false;
    this.flush();
  }

  private flush(): void {
    if (this.inFlight || this.pending === null || this.disposed) return;
    const state = this.pending;
    this.pending = null;
    this.inFlight = true;
    this.worker.postMessage({ type: 'render', sequence: this.nextSequence++, state } satisfies RenderWorkerRequest);
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
  if (options.forceMainThread === true || !supportsOffscreen) return new MainThreadRendererHost(canvas);
  let host: OffscreenRendererHost | null = null;
  try {
    const offscreen = canvas.transferControlToOffscreen();
    host = new OffscreenRendererHost(canvas, offscreen, options.onError);
    await Promise.race([
      host.initialized(),
      new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('Render Worker initialization timed out')), 5_000)),
    ]);
    return host;
  } catch (error) {
    host?.dispose();
    options.onError?.(error instanceof Error ? error : new Error(String(error)));
    return new MainThreadRendererHost(replacementCanvas(canvas));
  }
}
