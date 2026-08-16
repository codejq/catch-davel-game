import type { RenderGameState } from '../render/render-model';

export type RenderWorkerRequest = {
  readonly type: 'initialize';
  readonly canvas: OffscreenCanvas;
  readonly cssWidth: number;
  readonly cssHeight: number;
  readonly pixelRatio: number;
} | {
  readonly type: 'resize';
  readonly cssWidth: number;
  readonly cssHeight: number;
  readonly pixelRatio: number;
} | {
  readonly type: 'render';
  readonly sequence: number;
  readonly state: RenderGameState;
};

export type RenderWorkerResponse = {
  readonly type: 'ready';
} | {
  readonly type: 'frame-presented';
  readonly sequence: number;
  readonly tick: number;
} | {
  readonly type: 'failure';
  readonly message: string;
};
