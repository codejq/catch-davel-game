import { describe, expect, it } from 'vitest';
import {
  COIN_BURST_DURATION_TICKS, COIN_BURST_MAX_TRANSITION_GAP_TICKS,
  CoinBurstTracker, coinBurstPoint, type CoinBurstSnapshot,
} from '../src/render/coin-burst';

const robot = (active: boolean, health = active ? 100 : 0) => ({ id: 3, x: 5, z: 7, health, active });
const snapshot = (tick: number, active: boolean, health?: number): CoinBurstSnapshot => ({
  levelId: 'level-001', tick, robots: [robot(active, health)],
});

describe('bounded snapshot-derived coin burst', () => {
  it('emits once for a safe active-to-defeated transition and expires on tick time', () => {
    const tracker = new CoinBurstTracker();
    expect(tracker.update(snapshot(10, true))).toEqual([]);
    const effects = tracker.update(snapshot(11, false));
    expect(effects).toEqual([{ robotId: 3, startTick: 11, x: 5, z: 7 }]);
    expect(tracker.update(snapshot(11, false))).toEqual(effects);
    expect(tracker.update(snapshot(11 + COIN_BURST_DURATION_TICKS - 1, false))).toHaveLength(1);
    expect(tracker.update(snapshot(11 + COIN_BURST_DURATION_TICKS, false))).toEqual([]);
  });

  it('does not mistake spawn, deactivation without defeat, or a coalesced jump for a reward', () => {
    const tracker = new CoinBurstTracker();
    tracker.update(snapshot(1, false));
    expect(tracker.update(snapshot(2, true))).toEqual([]);
    expect(tracker.update(snapshot(3, false, 25))).toEqual([]);
    tracker.update(snapshot(4, true));
    expect(tracker.update(snapshot(5 + COIN_BURST_MAX_TRANSITION_GAP_TICKS, false))).toEqual([]);
  });

  it('reprimes without a burst after a rewind or level change', () => {
    const tracker = new CoinBurstTracker();
    tracker.update(snapshot(10, true));
    expect(tracker.update(snapshot(9, false))).toEqual([]);
    tracker.update(snapshot(10, true));
    expect(tracker.update({ ...snapshot(11, false), levelId: 'level-002' })).toEqual([]);
  });

  it('creates deterministic finite scatter that converges on the player and honors zero motion', () => {
    const effect = { robotId: 3, startTick: 20, x: 5, z: 7 };
    const player = { x: 1, z: 2 };
    const middle = coinBurstPoint(effect, 36, 2, player, 1);
    expect(middle).toEqual(coinBurstPoint(effect, 36, 2, player, 1));
    expect(Object.values(middle).every(Number.isFinite)).toBe(true);
    const settled = coinBurstPoint(effect, 20 + COIN_BURST_DURATION_TICKS, 2, player, 1);
    expect(settled.x).toBe(player.x);
    expect(settled.y).toBeCloseTo(0.36);
    expect(settled.z).toBe(player.z);
    const reduced = coinBurstPoint(effect, 28, 2, player, 0);
    expect(reduced.y).toBe(0.56);
  });
});
