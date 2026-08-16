import { describe, expect, it } from 'vitest';
import {
  CombatPacingTracker, combatPacingTarget, type CombatPacingFrame,
} from '../src/runtime/combat-pacing';

function frame(changes: Partial<CombatPacingFrame> = {}): CombatPacingFrame {
  return {
    tick: 0,
    victory: false,
    defeat: false,
    player: { x: 0, z: 0, health: 100, maxHealth: 100 },
    robots: [{ x: 18, z: 0, active: true, combatState: 'patrol', bossPhase: 0 }],
    projectiles: [],
    level: { objectiveComplete: false, encounter: { pendingTicks: 0 } },
    ...changes,
  };
}

describe('snapshot-derived combat pacing', () => {
  it('keeps distant exploration sparse and escalates readable combat pressure', () => {
    const exploration = combatPacingTarget(frame());
    const engaged = combatPacingTarget(frame({
      robots: [{ x: 5, z: 0, active: true, combatState: 'telegraph', bossPhase: 0 }],
      projectiles: [{}, {}, {}],
    }));
    const boss = combatPacingTarget(frame({
      player: { x: 0, z: 0, health: 25, maxHealth: 100 },
      robots: [{ x: 3, z: 0, active: true, combatState: 'telegraph', bossPhase: 3 }],
      projectiles: [{}, {}, {}, {}],
    }));
    expect(exploration.phase).toBe('exploration');
    expect(exploration.targetIntensity).toBeCloseTo(0.14);
    expect(engaged.phase).toBe('engaged');
    expect(engaged.targetIntensity).toBeGreaterThan(exploration.targetIntensity);
    expect(boss.phase).toBe('escalating');
    expect(boss.targetIntensity).toBeGreaterThan(engaged.targetIntensity);
    expect(boss.targetIntensity).toBeLessThanOrEqual(1);
  });

  it('builds through a wave transition then releases after objective completion', () => {
    const earlyWave = combatPacingTarget(frame({
      robots: [], level: { objectiveComplete: false, encounter: { pendingTicks: 90 } },
    }));
    const lateWave = combatPacingTarget(frame({
      robots: [], level: { objectiveComplete: false, encounter: { pendingTicks: 5 } },
    }));
    const clear = combatPacingTarget(frame({
      robots: [], level: { objectiveComplete: true, encounter: { pendingTicks: 0 } },
    }));
    const terminal = combatPacingTarget(frame({ victory: true, robots: [] }));
    expect(earlyWave).toEqual({ phase: 'wave-transition', targetIntensity: 0.52 });
    expect(lateWave.phase).toBe('wave-transition');
    expect(lateWave.targetIntensity).toBeGreaterThan(earlyWave.targetIntensity);
    expect(clear).toEqual({ phase: 'objective-clear', targetIntensity: 0.08 });
    expect(terminal).toEqual({ phase: 'terminal', targetIntensity: 0 });
  });

  it('smooths attack and release by authoritative elapsed ticks and resets across discontinuities', () => {
    const tracker = new CombatPacingTracker();
    const calm = tracker.sample(frame({ tick: 10 }));
    const pressureFrame = frame({
      tick: 11,
      player: { x: 0, z: 0, health: 30, maxHealth: 100 },
      robots: [{ x: 3, z: 0, active: true, combatState: 'telegraph', bossPhase: 2 }],
      projectiles: [{}, {}, {}],
    });
    const firstRise = tracker.sample(pressureFrame);
    const laterRise = tracker.sample({ ...pressureFrame, tick: 21 });
    const release = tracker.sample(frame({
      tick: 22, robots: [], level: { objectiveComplete: true, encounter: { pendingTicks: 0 } },
    }));
    expect(firstRise.intensity - calm.intensity).toBeCloseTo(0.025);
    expect(laterRise.intensity).toBeGreaterThan(firstRise.intensity);
    expect(laterRise.intensity - release.intensity).toBeCloseTo(0.008);
    tracker.reset();
    expect(tracker.sample(pressureFrame).intensity).toBe(combatPacingTarget(pressureFrame).targetIntensity);
  });
});
