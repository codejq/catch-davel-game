import type { PlayableLevelId } from '../content/level-ids';
import type { RenderRobotState } from './render-model';

export const COIN_BURST_DURATION_TICKS = 48;
export const COIN_BURST_MAX_TRANSITION_GAP_TICKS = 8;

type TrackedRobot = Pick<RenderRobotState, 'id' | 'x' | 'z' | 'health' | 'active'>;

export interface CoinBurstSnapshot {
  readonly levelId: PlayableLevelId;
  readonly tick: number;
  readonly robots: readonly TrackedRobot[];
}

export interface CoinBurstEffect {
  readonly robotId: number;
  readonly startTick: number;
  readonly x: number;
  readonly z: number;
}

export interface CoinBurstPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly scale: number;
}

export class CoinBurstTracker {
  private readonly activeByRobot = new Map<number, boolean>();
  private readonly effects = new Map<number, CoinBurstEffect>();
  private levelId: PlayableLevelId | null = null;
  private lastTick = -1;

  reset(): void {
    this.activeByRobot.clear();
    this.effects.clear();
    this.levelId = null;
    this.lastTick = -1;
  }

  update(state: CoinBurstSnapshot): readonly CoinBurstEffect[] {
    if (this.levelId !== state.levelId || state.tick < this.lastTick) this.reset();
    if (state.tick === this.lastTick) return this.currentEffects(state.tick);
    const transitionGap = this.lastTick < 0 ? Number.POSITIVE_INFINITY : state.tick - this.lastTick;
    const transitionSafe = transitionGap <= COIN_BURST_MAX_TRANSITION_GAP_TICKS;
    this.levelId = state.levelId;
    this.lastTick = state.tick;

    const present = new Set<number>();
    for (const robot of state.robots) {
      present.add(robot.id);
      const previousActive = this.activeByRobot.get(robot.id);
      if (transitionSafe && previousActive === true && !robot.active && robot.health <= 0) {
        this.effects.set(robot.id, { robotId: robot.id, startTick: state.tick, x: robot.x, z: robot.z });
      }
      if (robot.active) this.effects.delete(robot.id);
      this.activeByRobot.set(robot.id, robot.active);
    }
    for (const robotId of this.activeByRobot.keys()) {
      if (!present.has(robotId)) {
        this.activeByRobot.delete(robotId);
        this.effects.delete(robotId);
      }
    }
    return this.currentEffects(state.tick);
  }

  private currentEffects(tick: number): readonly CoinBurstEffect[] {
    for (const [robotId, effect] of this.effects) {
      if (tick - effect.startTick >= COIN_BURST_DURATION_TICKS) this.effects.delete(robotId);
    }
    return [...this.effects.values()].sort((left, right) => left.robotId - right.robotId);
  }
}

function smoothstep(value: number): number {
  const bounded = Math.max(0, Math.min(1, value));
  return bounded * bounded * (3 - 2 * bounded);
}

export function coinBurstPoint(
  effect: CoinBurstEffect,
  tick: number,
  coinIndex: number,
  player: { readonly x: number; readonly z: number },
  motionScale: number,
): CoinBurstPoint {
  const progress = Math.max(0, Math.min(1, (tick - effect.startTick) / COIN_BURST_DURATION_TICKS));
  const motion = Math.max(0, Math.min(1, motionScale));
  const magnet = smoothstep((progress - 0.28) / 0.72);
  const angle = effect.robotId * 2.399963 + coinIndex * 2.513274;
  const scatter = Math.sin(Math.min(1, progress / 0.32) * Math.PI * 0.5)
    * (1 - magnet) * (0.34 + coinIndex * 0.075) * motion;
  const scatteredX = effect.x + Math.cos(angle) * scatter;
  const scatteredZ = effect.z + Math.sin(angle) * scatter;
  const rise = Math.sin(progress * Math.PI) * (0.72 + (coinIndex % 3) * 0.13) * motion;
  return {
    x: scatteredX + (player.x - scatteredX) * magnet,
    y: 0.56 + rise - magnet * 0.2,
    z: scatteredZ + (player.z - scatteredZ) * magnet,
    scale: 0.065 * (1 - magnet * 0.45),
  };
}
