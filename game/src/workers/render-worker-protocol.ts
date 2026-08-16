import type { RenderGameState, RenderPresentationSettings } from '../render/render-model';
import type { PulseEnergyCellEffect } from '../render/presentation-particles';
import type { BombDetonationEffect } from '../render/bomb-detonation';

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
  readonly settings: RenderPresentationSettings;
} | {
  readonly type: 'pulse-energy-cell';
  readonly effect: PulseEnergyCellEffect;
} | {
  readonly type: 'bomb-detonation';
  readonly effect: BombDetonationEffect;
} | {
  readonly type: 'clear-presentation-effects';
};

export type RenderWorkerResponse = {
  readonly type: 'ready';
} | {
  readonly type: 'context-lost' | 'context-restored';
} | {
  readonly type: 'frame-presented';
  readonly sequence: number;
  readonly tick: number;
} | {
  readonly type: 'failure';
  readonly message: string;
};
