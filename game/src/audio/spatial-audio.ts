export const WORLD_AUDIO_INNER_RADIUS = 1.5;
export const WORLD_AUDIO_MAX_DISTANCE = 18;
export const WORLD_AUDIO_MIN_GAIN = 0.08;

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
