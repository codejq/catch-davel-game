import { describe, expect, it } from 'vitest';
import {
  OBJECTIVE_CLEAR_BANNER_TICKS, ObjectiveClearTransitionTracker, type ObjectiveClearFrame,
} from '../src/runtime/objective-clear-transition';

function frame(tick: number, complete = false): ObjectiveClearFrame {
  return { levelId: 'level-001', tick, victory: false, defeat: false, level: { objectiveComplete: complete } };
}

describe('objective-clear route transition', () => {
  it('shows one tick-derived route banner only for a correlated false-to-true transition', () => {
    const tracker = new ObjectiveClearTransitionTracker();
    expect(tracker.sample(frame(10))).toBeNull();
    expect(tracker.sample(frame(11, true))).toEqual({
      transitionKey: 'level-001:11', ageTicks: 0, remainingRatio: 1,
    });
    const sustained = tracker.sample(frame(71, true));
    expect(sustained).toMatchObject({ transitionKey: 'level-001:11', ageTicks: 60 });
    expect(sustained?.remainingRatio).toBeCloseTo(2 / 3);
    expect(tracker.sample(frame(11 + OBJECTIVE_CLEAR_BANNER_TICKS, true))).toBeNull();
  });

  it('does not synthesize a banner after load, coalesced gaps, rewind, resync, or terminal state', () => {
    const tracker = new ObjectiveClearTransitionTracker();
    expect(tracker.sample(frame(100, true))).toBeNull();
    tracker.reset();
    expect(tracker.sample(frame(10))).toBeNull();
    expect(tracker.sample(frame(20, true))).toBeNull();
    expect(tracker.sample(frame(19, true))).toBeNull();
    tracker.reset();
    expect(tracker.sample(frame(1))).toBeNull();
    expect(tracker.sample({ ...frame(2, true), victory: true })).toBeNull();
  });

  it('clears across level changes and can recognize a later legitimate transition', () => {
    const tracker = new ObjectiveClearTransitionTracker();
    tracker.sample(frame(1));
    expect(tracker.sample(frame(2, true))).not.toBeNull();
    expect(tracker.sample({ ...frame(3), levelId: 'level-002' })).toBeNull();
    expect(tracker.sample({ ...frame(4, true), levelId: 'level-002' })?.transitionKey).toBe('level-002:4');
  });
});
