export const BOMB_FUSE_MILESTONES = Object.freeze([75, 60, 45, 30, 24, 18, 12, 6] as const);

export interface BombFuseState {
  readonly id: number;
  readonly x: number;
  readonly z: number;
  readonly fuseTicks: number;
}

export interface BombFuseAudioRequest {
  readonly bombId: number;
  readonly milestone: number;
  readonly x: number;
  readonly z: number;
  readonly gainScale: number;
  readonly pitchScale: number;
}

export class BombFuseAudioSequencer {
  private readonly previousFuseTicks = new Map<number, number>();
  private lastTick: number | null = null;

  sample(tick: number, bombs: readonly BombFuseState[], enabled: boolean): readonly BombFuseAudioRequest[] {
    if (this.lastTick !== null && tick < this.lastTick) this.previousFuseTicks.clear();
    this.lastTick = tick;
    const activeIds = new Set(bombs.map((bomb) => bomb.id));
    for (const id of this.previousFuseTicks.keys()) {
      if (!activeIds.has(id)) this.previousFuseTicks.delete(id);
    }
    const requests: BombFuseAudioRequest[] = [];
    for (const bomb of [...bombs].sort((first, second) => first.id - second.id)) {
      const previous = this.previousFuseTicks.get(bomb.id);
      this.previousFuseTicks.set(bomb.id, bomb.fuseTicks);
      if (!enabled || previous === undefined || bomb.fuseTicks >= previous) continue;
      const crossed = BOMB_FUSE_MILESTONES.filter((milestone) => (
        previous > milestone && bomb.fuseTicks <= milestone
      ));
      if (crossed.length === 0) continue;
      const milestone = Math.min(...crossed);
      const urgency = 1 - milestone / 90;
      requests.push({
        bombId: bomb.id,
        milestone,
        x: bomb.x,
        z: bomb.z,
        gainScale: 0.48 + urgency * 0.2,
        pitchScale: 0.88 + urgency * 0.58,
      });
    }
    return requests;
  }

  reset(): void {
    this.previousFuseTicks.clear();
    this.lastTick = null;
  }
}
