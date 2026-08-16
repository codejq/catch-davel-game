export const LASER_AUDIO_EVENT_INTERVAL_TICKS = 4;
export const LASER_AUDIO_MAX_CORRELATION_LAG_TICKS = 4;
export const LASER_AUDIO_MIN_PITCH_SCALE = 0.88;
export const LASER_AUDIO_MAX_PITCH_SCALE = 1.58;

export interface LaserAudioState {
  readonly tick: number;
  readonly heat: number;
  readonly overheated: boolean;
}

export interface LaserAudioRequest {
  readonly tick: number;
  readonly pitchScale: number;
}

export function laserPitchScale(heat: number, overheated: boolean): number {
  const boundedHeat = Number.isFinite(heat) ? Math.max(0, Math.min(100, heat)) : 0;
  const heatScale = LASER_AUDIO_MIN_PITCH_SCALE
    + (LASER_AUDIO_MAX_PITCH_SCALE - LASER_AUDIO_MIN_PITCH_SCALE) * (boundedHeat / 100);
  return overheated ? LASER_AUDIO_MAX_PITCH_SCALE : heatScale;
}

export class LaserAudioSequencer {
  private pendingTick: number | null = null;
  private lastEmittedTick = -1;

  queue(eventTick: number, state: LaserAudioState | null): LaserAudioRequest | null {
    if (!Number.isSafeInteger(eventTick) || eventTick < 0
      || eventTick % LASER_AUDIO_EVENT_INTERVAL_TICKS !== 0 || eventTick <= this.lastEmittedTick) return null;
    if (state !== null && state.tick >= eventTick) return this.resolve(eventTick, state);
    this.pendingTick = this.pendingTick === null ? eventTick : Math.max(this.pendingTick, eventTick);
    return null;
  }

  sample(state: LaserAudioState): LaserAudioRequest | null {
    if (this.pendingTick === null || this.pendingTick > state.tick) return null;
    const tick = this.pendingTick;
    this.pendingTick = null;
    return this.resolve(tick, state);
  }

  reset(): void {
    this.pendingTick = null;
    this.lastEmittedTick = -1;
  }

  private resolve(tick: number, state: LaserAudioState): LaserAudioRequest | null {
    this.lastEmittedTick = Math.max(this.lastEmittedTick, tick);
    if (state.tick - tick > LASER_AUDIO_MAX_CORRELATION_LAG_TICKS) return null;
    return { tick, pitchScale: laserPitchScale(state.heat, state.overheated) };
  }
}
