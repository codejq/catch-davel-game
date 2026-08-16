import { describe, expect, it } from 'vitest';
import {
  GREEN_STEAM_VISIBILITY_PERIOD_TICKS, visibilityPulseFog,
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
});
