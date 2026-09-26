import type { RuntimeRgb } from '../content/runtime-manifests';

export interface SkyGradient {
  readonly horizon: RuntimeRgb;
  readonly zenith: RuntimeRgb;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

// Derives a natural atmospheric gradient from a level's flat palette sky: a pale, hazy horizon and a
// deeper, more saturated zenith, so every palette keeps its identity while reading as a real sky.
export function skyGradient(sky: RuntimeRgb): SkyGradient {
  const luminance = sky[0] * 0.2126 + sky[1] * 0.7152 + sky[2] * 0.0722;
  const horizon: RuntimeRgb = [
    clamp01(sky[0] * 0.6 + 0.4 * (0.82 + luminance * 0.18)),
    clamp01(sky[1] * 0.6 + 0.4 * (0.84 + luminance * 0.16)),
    clamp01(sky[2] * 0.6 + 0.4 * (0.88 + luminance * 0.12)),
  ];
  const zenith: RuntimeRgb = [
    clamp01(sky[0] * 0.42 + 0.02),
    clamp01(sky[1] * 0.58 + 0.04),
    clamp01(sky[2] * 0.86 + 0.08),
  ];
  return { horizon, zenith };
}
