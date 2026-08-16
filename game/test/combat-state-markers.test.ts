import { describe, expect, it } from 'vitest';
import {
  MAX_COMBAT_STATE_MARKERS_PER_ROBOT, combatStateMarkers,
} from '../src/render/combat-state-markers';

const robot = {
  id: 4, x: 3, z: -2, heading: 0.7, combatState: 'patrol' as const, combatTicks: 0,
};

describe('shape-coded Davel combat-state markers', () => {
  it('uses a three-point attack chevron and two-point recovery brackets', () => {
    const attack = combatStateMarkers({ ...robot, combatState: 'telegraph', combatTicks: 24 }, 1, 1);
    const recovery = combatStateMarkers({ ...robot, combatState: 'recover', combatTicks: 18 }, 1, 1);
    expect(attack).toHaveLength(3);
    expect(attack.every((marker) => marker.role === 'attack-chevron')).toBe(true);
    expect(recovery).toHaveLength(2);
    expect(recovery.every((marker) => marker.role === 'recovery-bracket')).toBe(true);
    expect(combatStateMarkers(robot, 1, 1)).toEqual([]);
  });

  it('is finite, body-bound, and never exceeds its per-robot sphere budget', () => {
    for (const state of ['telegraph', 'recover'] as const) {
      const markers = combatStateMarkers({ ...robot, combatState: state, combatTicks: 8 }, 2.5, 1);
      expect(markers.length).toBeLessThanOrEqual(MAX_COMBAT_STATE_MARKERS_PER_ROBOT);
      for (const marker of markers) {
        expect([marker.x, marker.y, marker.z, marker.radius, marker.yScale, marker.zScale, marker.emission, ...marker.color]
          .every(Number.isFinite)).toBe(true);
        expect(marker.y).toBeGreaterThan(0.4);
        expect(marker.y).toBeLessThan(6.3);
        expect(marker.radius).toBeGreaterThan(0);
        expect(marker.emission).toBeGreaterThan(0.7);
        expect(marker.emission).toBeLessThanOrEqual(1);
      }
    }
  });

  it('keeps zero-motion silhouettes stable while animated telegraphs retain tick response', () => {
    const earlier = { ...robot, combatState: 'telegraph' as const, combatTicks: 20 };
    const later = { ...earlier, combatTicks: 19 };
    expect(combatStateMarkers(earlier, 1.2, 0)).not.toEqual(combatStateMarkers(later, 1.2, 0));
    expect(combatStateMarkers(earlier, 1.2, 0)).toEqual(combatStateMarkers(earlier, 1.2, 0));
    expect(combatStateMarkers(earlier, 1.2, 1)).not.toEqual(combatStateMarkers(earlier, 1.2, 0));
  });
});
