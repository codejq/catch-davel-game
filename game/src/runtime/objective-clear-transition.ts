export const OBJECTIVE_CLEAR_BANNER_TICKS = 180;

export interface ObjectiveClearFrame {
  readonly levelId: string;
  readonly tick: number;
  readonly victory: boolean;
  readonly defeat: boolean;
  readonly level: { readonly objectiveComplete: boolean };
}

export interface ObjectiveClearTransition {
  readonly transitionKey: string;
  readonly ageTicks: number;
  readonly remainingRatio: number;
}

export class ObjectiveClearTransitionTracker {
  private levelId: string | null = null;
  private lastTick: number | null = null;
  private complete = false;
  private startTick: number | null = null;

  sample(frame: ObjectiveClearFrame): ObjectiveClearTransition | null {
    const discontinuity = this.levelId !== frame.levelId || this.lastTick === null
      || frame.tick < this.lastTick || (frame.tick - this.lastTick > 8 && this.startTick === null);
    if (discontinuity) {
      this.levelId = frame.levelId;
      this.lastTick = frame.tick;
      this.complete = frame.level.objectiveComplete;
      this.startTick = null;
      return null;
    }
    if (!this.complete && frame.level.objectiveComplete && !frame.victory && !frame.defeat) {
      this.startTick = frame.tick;
    }
    this.complete = frame.level.objectiveComplete;
    this.lastTick = frame.tick;
    if (this.startTick === null || !this.complete || frame.victory || frame.defeat) return null;
    const ageTicks = frame.tick - this.startTick;
    if (ageTicks < 0 || ageTicks >= OBJECTIVE_CLEAR_BANNER_TICKS) {
      this.startTick = null;
      return null;
    }
    return {
      transitionKey: `${frame.levelId}:${this.startTick}`,
      ageTicks,
      remainingRatio: 1 - ageTicks / OBJECTIVE_CLEAR_BANNER_TICKS,
    };
  }

  reset(): void {
    this.levelId = null;
    this.lastTick = null;
    this.complete = false;
    this.startTick = null;
  }
}
