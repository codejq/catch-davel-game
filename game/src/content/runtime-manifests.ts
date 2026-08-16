export interface HazardRuntimeProfile {
  readonly kind: 'conveyor' | 'timed-door';
  readonly column: number;
  readonly row: number;
  readonly halfWidth: number;
  readonly halfDepth: number;
  readonly directionX: number;
  readonly directionZ: number;
  readonly phaseOffsetTicks: number;
}

export const HAZARD_RUNTIME_PROFILES: Readonly<Record<string, HazardRuntimeProfile>> = {
  'conveyor-lane-v1': {
    kind: 'conveyor', column: 9, row: 7, halfWidth: 1.15, halfDepth: 4.25,
    directionX: 0, directionZ: 1, phaseOffsetTicks: 0,
  },
  'clockwork-gate-west-v1': {
    kind: 'timed-door', column: 6, row: 8, halfWidth: 1.45, halfDepth: 1.45,
    directionX: 0, directionZ: 0, phaseOffsetTicks: 0,
  },
  'clockwork-gate-center-v1': {
    kind: 'timed-door', column: 10, row: 8, halfWidth: 1.45, halfDepth: 1.45,
    directionX: 0, directionZ: 0, phaseOffsetTicks: 60,
  },
  'clockwork-gate-east-v1': {
    kind: 'timed-door', column: 12, row: 8, halfWidth: 1.45, halfDepth: 1.45,
    directionX: 0, directionZ: 0, phaseOffsetTicks: 120,
  },
};

export function hazardRuntimeProfile(profileId: string): HazardRuntimeProfile {
  const profile = HAZARD_RUNTIME_PROFILES[profileId];
  if (profile === undefined) throw new Error(`Unknown hazard runtime profile ${profileId}`);
  return profile;
}
