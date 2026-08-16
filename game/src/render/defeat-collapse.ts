import type { Chapter01LevelId } from '../content/level-ids';
import { BODY_POINT_COUNT } from '../sim/xpbd';
import type { RenderRobotState } from './render-model';

export const DEFEAT_COLLAPSE_DURATION_TICKS = 36;
export const DEFEAT_COLLAPSE_MAX_TRANSITION_GAP_TICKS = 8;

type TrackedRobot = Pick<RenderRobotState, 'id' | 'x' | 'z' | 'health' | 'active' | 'body'>;

export interface DefeatCollapseSnapshot {
  readonly levelId: Chapter01LevelId;
  readonly tick: number;
  readonly robots: readonly TrackedRobot[];
}

export interface DefeatCollapseEffect {
  readonly robotId: number;
  readonly startTick: number;
  readonly x: number;
  readonly z: number;
  readonly positions: readonly number[];
}

export interface DefeatCollapsePose {
  readonly progress: number;
  readonly positions: readonly number[];
}

export class DefeatCollapseTracker {
  private readonly activeByRobot = new Map<number, boolean>();
  private readonly effects = new Map<number, DefeatCollapseEffect>();
  private levelId: Chapter01LevelId | null = null;
  private lastTick = -1;

  reset(): void {
    this.activeByRobot.clear();
    this.effects.clear();
    this.levelId = null;
    this.lastTick = -1;
  }

  update(state: DefeatCollapseSnapshot): readonly DefeatCollapseEffect[] {
    if (this.levelId !== state.levelId || state.tick < this.lastTick) this.reset();
    if (state.tick === this.lastTick) return this.currentEffects(state.tick);
    const transitionGap = this.lastTick < 0 ? Number.POSITIVE_INFINITY : state.tick - this.lastTick;
    const transitionSafe = transitionGap <= DEFEAT_COLLAPSE_MAX_TRANSITION_GAP_TICKS;
    this.levelId = state.levelId;
    this.lastTick = state.tick;

    const present = new Set<number>();
    for (const robot of state.robots) {
      present.add(robot.id);
      const previousActive = this.activeByRobot.get(robot.id);
      if (transitionSafe && previousActive === true && !robot.active && robot.health <= 0) {
        this.effects.set(robot.id, {
          robotId: robot.id,
          startTick: state.tick,
          x: robot.x,
          z: robot.z,
          positions: Array.from(robot.body.positions),
        });
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

  private currentEffects(tick: number): readonly DefeatCollapseEffect[] {
    for (const [robotId, effect] of this.effects) {
      if (tick - effect.startTick >= DEFEAT_COLLAPSE_DURATION_TICKS) this.effects.delete(robotId);
    }
    return [...this.effects.values()].sort((left, right) => left.robotId - right.robotId);
  }
}

export function defeatCollapsePose(
  effect: DefeatCollapseEffect, tick: number, motionScale: number,
): DefeatCollapsePose | null {
  const age = tick - effect.startTick;
  if (age < 0 || age >= DEFEAT_COLLAPSE_DURATION_TICKS
    || effect.positions.length !== BODY_POINT_COUNT * 3) return null;
  const motion = Math.max(0, Math.min(1, motionScale));
  const normalized = Math.max(0, Math.min(1, age / Math.max(1, DEFEAT_COLLAPSE_DURATION_TICKS - 8)));
  const progress = motion === 0 ? 1 : 1 - Math.pow(1 - normalized, 3);
  const angle = progress * Math.PI * 0.46;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const directionAngle = effect.robotId * 2.399963;
  const directionX = Math.cos(directionAngle);
  const directionZ = Math.sin(directionAngle);
  const groundY = 0.1;
  const positions: number[] = [];
  for (let index = 0; index < BODY_POINT_COUNT; index += 1) {
    const offset = index * 3;
    const deltaX = effect.positions[offset]! - effect.x;
    const deltaZ = effect.positions[offset + 2]! - effect.z;
    const vertical = effect.positions[offset + 1]! - groundY;
    const along = deltaX * directionX + deltaZ * directionZ;
    const perpendicularX = deltaX - directionX * along;
    const perpendicularZ = deltaZ - directionZ * along;
    const rotatedAlong = along * cosine + vertical * sine;
    const rotatedVertical = vertical * cosine - along * sine;
    positions.push(
      effect.x + perpendicularX + directionX * rotatedAlong,
      groundY + Math.max(0.02, rotatedVertical),
      effect.z + perpendicularZ + directionZ * rotatedAlong,
    );
  }
  return { progress, positions };
}
