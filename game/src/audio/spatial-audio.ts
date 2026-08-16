export const WORLD_AUDIO_INNER_RADIUS = 1.5;
export const WORLD_AUDIO_MAX_DISTANCE = 18;
export const WORLD_AUDIO_MIN_GAIN = 0.08;
export const WORLD_AUDIO_OCCLUDED_GAIN_SCALE = 0.58;
export const WORLD_AUDIO_OCCLUDED_LOW_PASS_HZ = 920;
export const WORLD_AUDIO_OCCLUSION_SAMPLE_STEP = 0.15;

export interface SpatialAudioPoint {
  readonly x: number;
  readonly z: number;
}

export interface SpatialAudioListener extends SpatialAudioPoint {
  readonly yaw: number;
}

export interface SpatialAudioMix {
  readonly pan: number;
  readonly gainScale: number;
  readonly distance: number;
}

export interface SpatialAudioObstruction {
  readonly occluded: boolean;
  readonly gainScale: number;
  readonly lowPassHz: number | null;
}

/** Camera-relative stereo direction plus a bounded, non-zero critical-cue tail. */
export function spatialAudioMix(
  listener: SpatialAudioListener,
  source: SpatialAudioPoint,
  maximumDistance = WORLD_AUDIO_MAX_DISTANCE,
): SpatialAudioMix {
  const values = [listener.x, listener.z, listener.yaw, source.x, source.z, maximumDistance];
  if (!values.every(Number.isFinite) || maximumDistance <= WORLD_AUDIO_INNER_RADIUS) {
    throw new Error('Spatial audio transform must contain finite coordinates and a valid maximum distance');
  }
  const deltaX = source.x - listener.x;
  const deltaZ = source.z - listener.z;
  const distance = Math.hypot(deltaX, deltaZ);
  const inverseDistance = distance <= 0.0001 ? 0 : 1 / distance;
  const rightDot = deltaX * Math.cos(listener.yaw) + deltaZ * Math.sin(listener.yaw);
  const pan = Math.max(-1, Math.min(1, rightDot * inverseDistance));
  const normalized = Math.max(0, Math.min(1,
    (distance - WORLD_AUDIO_INNER_RADIUS) / (maximumDistance - WORLD_AUDIO_INNER_RADIUS),
  ));
  const gainScale = WORLD_AUDIO_MIN_GAIN
    + (1 - WORLD_AUDIO_MIN_GAIN) * Math.pow(1 - normalized, 1.35);
  return { pan, gainScale, distance };
}

/** Samples only the open segment so a source or listener touching a blocker does not self-occlude. */
export function spatialAudioObstruction(
  listener: SpatialAudioPoint,
  source: SpatialAudioPoint,
  blockedAt: (x: number, z: number) => boolean,
  sampleStep = WORLD_AUDIO_OCCLUSION_SAMPLE_STEP,
): SpatialAudioObstruction {
  const values = [listener.x, listener.z, source.x, source.z, sampleStep];
  if (!values.every(Number.isFinite) || sampleStep <= 0) {
    throw new Error('Spatial audio obstruction requires finite coordinates and a positive sample step');
  }
  const deltaX = source.x - listener.x;
  const deltaZ = source.z - listener.z;
  const distance = Math.hypot(deltaX, deltaZ);
  const steps = Math.max(1, Math.ceil(distance / sampleStep));
  for (let step = 1; step < steps; step += 1) {
    const amount = step / steps;
    if (blockedAt(listener.x + deltaX * amount, listener.z + deltaZ * amount)) {
      return {
        occluded: true,
        gainScale: WORLD_AUDIO_OCCLUDED_GAIN_SCALE,
        lowPassHz: WORLD_AUDIO_OCCLUDED_LOW_PASS_HZ,
      };
    }
  }
  return { occluded: false, gainScale: 1, lowPassHz: null };
}
