import { describe, expect, it } from 'vitest';
import {
  FEVER_TUNNELS_VISIBILITY_PERIOD_TICKS, GREEN_STEAM_VISIBILITY_PERIOD_TICKS, visibilityPulseFog,
} from '../src/render/visibility-pulse';

describe('Green Steam visibility pulse', () => {
  it('uses snapshot ticks for a bounded smooth cycle without changing other levels', () => {
    expect(visibilityPulseFog('level-021', 90)).toEqual({ near: 25, far: 48, greenMix: 0 });
    const clear = visibilityPulseFog('level-022', 0);
    const dense = visibilityPulseFog('level-022', GREEN_STEAM_VISIBILITY_PERIOD_TICKS / 2);
    expect(dense.near).toBeLessThan(clear.near);
    expect(dense.far).toBeLessThan(clear.far);
    expect(dense.greenMix).toBeGreaterThan(clear.greenMix);
    expect(visibilityPulseFog('level-022', GREEN_STEAM_VISIBILITY_PERIOD_TICKS)).toEqual(clear);
  });

  it('becomes a stable mild haze when flash intensity is zero', () => {
    expect(visibilityPulseFog('level-022', 0, 0)).toEqual(visibilityPulseFog('level-022', 90, 0));
    expect(visibilityPulseFog('level-022', 90, 0).greenMix).toBeGreaterThan(0);
  });

  it('gives Fever Tunnels a faster, stronger but still periodic presentation pulse', () => {
    const start = visibilityPulseFog('level-029', -25);
    const dense = visibilityPulseFog('level-029', 50);
    expect(dense.near).toBeLessThan(start.near);
    expect(dense.far).toBeLessThan(start.far);
    expect(dense.greenMix).toBeGreaterThan(start.greenMix);
    expect(visibilityPulseFog('level-029', FEVER_TUNNELS_VISIBILITY_PERIOD_TICKS - 25)).toEqual(start);
    expect(dense.greenMix).toBeGreaterThan(visibilityPulseFog('level-022', 90).greenMix);
  });
});
