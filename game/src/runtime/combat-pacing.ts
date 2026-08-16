export type CombatPacingPhase = 'terminal' | 'objective-clear' | 'wave-transition'
  | 'exploration' | 'engaged' | 'escalating';

export interface CombatPacingFrame {
  readonly tick: number;
  readonly victory: boolean;
  readonly defeat: boolean;
  readonly player: {
    readonly x: number;
    readonly z: number;
    readonly health: number;
    readonly maxHealth: number;
  };
  readonly robots: readonly {
    readonly x: number;
    readonly z: number;
    readonly active: boolean;
    readonly combatState: 'patrol' | 'telegraph' | 'recover';
    readonly bossPhase: 0 | 1 | 2 | 3;
  }[];
  readonly projectiles: readonly unknown[];
  readonly level: {
    readonly objectiveComplete: boolean;
    readonly encounter: { readonly pendingTicks: number };
  };
}

export interface CombatPacingReading {
  readonly phase: CombatPacingPhase;
  readonly targetIntensity: number;
  readonly intensity: number;
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export function combatPacingTarget(frame: CombatPacingFrame): Omit<CombatPacingReading, 'intensity'> {
  if (frame.victory || frame.defeat) return { phase: 'terminal', targetIntensity: 0 };
  const pendingTicks = Math.max(0, frame.level.encounter.pendingTicks);
  if (pendingTicks > 0) {
    const urgency = 1 - Math.min(1, pendingTicks / 90);
    return { phase: 'wave-transition', targetIntensity: 0.52 + urgency * 0.34 };
  }
  const active = frame.robots.filter((robot) => robot.active);
  if (active.length === 0 || frame.level.objectiveComplete) {
    return { phase: 'objective-clear', targetIntensity: 0.08 };
  }
  const nearestDistance = Math.min(...active.map((robot) => (
    Math.hypot(robot.x - frame.player.x, robot.z - frame.player.z)
  )));
  const proximity = 1 - clamp01((nearestDistance - 2.5) / 15.5);
  const telegraphPressure = Math.min(0.2,
    active.filter((robot) => robot.combatState === 'telegraph').length * 0.1);
  const projectilePressure = Math.min(0.2, frame.projectiles.length * 0.035);
  const healthDanger = 1 - clamp01(frame.player.health / Math.max(1, frame.player.maxHealth));
  const bossPhase = active.reduce((maximum, robot) => Math.max(maximum, robot.bossPhase), 0);
  const bossPressure = bossPhase === 0 ? 0 : 0.1 + bossPhase * 0.045;
  const targetIntensity = clamp01(
    0.14 + proximity * 0.42 + telegraphPressure + projectilePressure + healthDanger * 0.13 + bossPressure,
  );
  const phase: CombatPacingPhase = targetIntensity >= 0.72 ? 'escalating'
    : targetIntensity >= 0.4 ? 'engaged' : 'exploration';
  return { phase, targetIntensity };
}

export class CombatPacingTracker {
  private intensity = 0.14;
  private lastTick: number | null = null;

  sample(frame: CombatPacingFrame): CombatPacingReading {
    const target = combatPacingTarget(frame);
    if (this.lastTick === null || frame.tick < this.lastTick || frame.tick - this.lastTick > 120) {
      this.intensity = target.targetIntensity;
    } else {
      const elapsed = Math.max(1, frame.tick - this.lastTick);
      const maximumChange = elapsed * (target.targetIntensity > this.intensity ? 0.025 : 0.008);
      this.intensity += Math.max(-maximumChange, Math.min(maximumChange, target.targetIntensity - this.intensity));
    }
    this.lastTick = frame.tick;
    return { ...target, intensity: this.intensity };
  }

  reset(): void {
    this.intensity = 0.14;
    this.lastTick = null;
  }
}
