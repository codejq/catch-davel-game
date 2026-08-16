import type { Chapter01LevelId } from '../content/level-ids';

export const PLAYER_STEP_PHASE_INTERVAL = Math.PI;
export const PLAYER_SPRINT_PHASE_RATE = 0.285;

export interface PlayerMovementAudioSnapshot {
  readonly levelId: Chapter01LevelId;
  readonly tick: number;
  readonly player: {
    readonly x: number;
    readonly z: number;
    readonly bobPhase: number;
  };
  readonly victory: boolean;
  readonly defeat: boolean;
}

export interface PlayerMovementAudioRequest {
  readonly cue: 'player-step';
  readonly gainScale: number;
  readonly pitchScale: number;
  readonly sprinting: boolean;
}

/**
 * Turns authoritative travelled-distance phase into bounded first-person steps.
 * Coalesced snapshots emit at most one current cue; disabled intervals consume
 * their phase so visibility changes and resyncs cannot replay a footstep burst.
 */
export class PlayerMovementAudioSequencer {
  private levelId: Chapter01LevelId | null = null;
  private lastTick = -1;
  private lastPhase = 0;
  private lastX = 0;
  private lastZ = 0;

  reset(): void {
    this.levelId = null;
    this.lastTick = -1;
    this.lastPhase = 0;
    this.lastX = 0;
    this.lastZ = 0;
  }

  sample(state: PlayerMovementAudioSnapshot, enabled = true): PlayerMovementAudioRequest | null {
    if (this.levelId !== state.levelId || state.tick < this.lastTick || state.player.bobPhase < this.lastPhase) {
      this.reset();
    }
    if (state.tick === this.lastTick) return null;

    const previousTick = this.lastTick;
    const previousPhase = this.lastPhase;
    const previousX = this.lastX;
    const previousZ = this.lastZ;
    this.levelId = state.levelId;
    this.lastTick = state.tick;
    this.lastPhase = state.player.bobPhase;
    this.lastX = state.player.x;
    this.lastZ = state.player.z;

    if (previousTick < 0 || !enabled || state.victory || state.defeat) return null;
    const moved = Math.hypot(state.player.x - previousX, state.player.z - previousZ);
    const previousStep = Math.floor(previousPhase / PLAYER_STEP_PHASE_INTERVAL);
    const currentStep = Math.floor(state.player.bobPhase / PLAYER_STEP_PHASE_INTERVAL);
    if (moved <= 0.0001 || currentStep <= previousStep) return null;

    const phaseRate = (state.player.bobPhase - previousPhase) / Math.max(1, state.tick - previousTick);
    const sprinting = phaseRate >= PLAYER_SPRINT_PHASE_RATE;
    const alternate = currentStep % 2 === 0 ? 0.965 : 1.035;
    return {
      cue: 'player-step',
      gainScale: sprinting ? 0.5 : 0.4,
      pitchScale: alternate * (sprinting ? 1.06 : 1),
      sprinting,
    };
  }
}
