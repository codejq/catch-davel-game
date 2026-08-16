import { describe, expect, it } from 'vitest';
import {
  DEFEAT_COLLAPSE_DURATION_TICKS, DEFEAT_COLLAPSE_MAX_TRANSITION_GAP_TICKS,
  DefeatCollapseTracker, defeatCollapsePose, type DefeatCollapseSnapshot,
} from '../src/render/defeat-collapse';
import { BODY_POINT_COUNT } from '../src/sim/xpbd';

const positions = Array.from({ length: BODY_POINT_COUNT * 3 }, (_, index) => (
  index % 3 === 0 ? 5 + index * 0.01 : index % 3 === 1 ? 0.25 + index * 0.07 : 7 - index * 0.01
));
const robot = (active: boolean, health = active ? 100 : 0) => ({
  id: 3, x: 5, z: 7, health, active, body: { positions },
});
const snapshot = (tick: number, active: boolean, health?: number): DefeatCollapseSnapshot => ({
  levelId: 'level-001', tick, robots: [robot(active, health)],
});

describe('bounded snapshot-derived Davel defeat collapse', () => {
  it('captures the final XPBD pose once for a safely correlated defeat', () => {
    const tracker = new DefeatCollapseTracker();
    expect(tracker.update(snapshot(10, true))).toEqual([]);
    const [effect] = tracker.update(snapshot(11, false));
    expect(effect?.robotId).toBe(3);
    expect(effect?.startTick).toBe(11);
    expect(effect?.positions).toEqual(positions);
    positions[0] = 999;
    expect(effect?.positions[0]).not.toBe(999);
    positions[0] = 5;
    expect(tracker.update(snapshot(11 + DEFEAT_COLLAPSE_DURATION_TICKS, false))).toEqual([]);
  });

  it('ignores spawns, non-fatal deactivation, coalesced transitions, rewinds, and level changes', () => {
    const tracker = new DefeatCollapseTracker();
    tracker.update(snapshot(1, false));
    expect(tracker.update(snapshot(2, true))).toEqual([]);
    expect(tracker.update(snapshot(3, false, 25))).toEqual([]);
    tracker.update(snapshot(4, true));
    expect(tracker.update(snapshot(5 + DEFEAT_COLLAPSE_MAX_TRANSITION_GAP_TICKS, false))).toEqual([]);
    tracker.update(snapshot(20, true));
    expect(tracker.update(snapshot(19, false))).toEqual([]);
    tracker.update(snapshot(20, true));
    expect(tracker.update({ ...snapshot(21, false), levelId: 'level-002' })).toEqual([]);
  });

  it('deterministically topples every finite joint toward the floor', () => {
    const effect = { robotId: 2, startTick: 100, x: 5, z: 7, positions: [...positions] };
    const initial = defeatCollapsePose(effect, 100, 1)!;
    const fallen = defeatCollapsePose(effect, 128, 1)!;
    expect(fallen).toEqual(defeatCollapsePose(effect, 128, 1));
    expect(fallen.progress).toBeGreaterThan(initial.progress);
    expect(Math.max(...fallen.positions.filter((_, index) => index % 3 === 1)))
      .toBeLessThan(Math.max(...initial.positions.filter((_, index) => index % 3 === 1)));
    expect(fallen.positions.every(Number.isFinite)).toBe(true);
    expect(Math.min(...fallen.positions.filter((_, index) => index % 3 === 1))).toBeGreaterThanOrEqual(0.12);
  });

  it('uses an immediate stable toppled cue at zero motion and expires on tick time', () => {
    const effect = { robotId: 1, startTick: 40, x: 5, z: 7, positions: [...positions] };
    expect(defeatCollapsePose(effect, 40, 0)?.progress).toBe(1);
    expect(defeatCollapsePose(effect, 48, 0)).toEqual(defeatCollapsePose(effect, 40, 0));
    expect(defeatCollapsePose(effect, 40 + DEFEAT_COLLAPSE_DURATION_TICKS, 1)).toBeNull();
  });
});
