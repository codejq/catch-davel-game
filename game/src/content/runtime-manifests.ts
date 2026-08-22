export interface HazardRuntimeProfile {
  readonly kind: 'conveyor' | 'ice' | 'timed-door';
  readonly activation?: 'periodic' | 'before-key' | 'after-key' | 'after-tick' | 'until-bomb' | 'until-bomb-optional'
    | 'until-key-1' | 'until-key-2' | 'until-key-3';
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
  'ticket-gate-west-v1': {
    kind: 'timed-door', column: 6, row: 7, halfWidth: 1.45, halfDepth: 1.45,
    directionX: 0, directionZ: 0, phaseOffsetTicks: 0,
  },
  'ticket-gate-east-v1': {
    kind: 'timed-door', column: 10, row: 7, halfWidth: 1.45, halfDepth: 1.45,
    directionX: 0, directionZ: 0, phaseOffsetTicks: 90,
  },
  'sideshow-slide-north-v1': {
    kind: 'conveyor', column: 8, row: 5, halfWidth: 4.25, halfDepth: 1.15,
    directionX: 1, directionZ: 0, phaseOffsetTicks: 0,
  },
  'sideshow-slide-south-v1': {
    kind: 'conveyor', column: 8, row: 9, halfWidth: 4.25, halfDepth: 1.15,
    directionX: -1, directionZ: 0, phaseOffsetTicks: 80,
  },
  'roundabout-gate-west-v1': {
    kind: 'timed-door', column: 6, row: 7, halfWidth: 1.35, halfDepth: 1.35,
    directionX: 0, directionZ: 0, phaseOffsetTicks: 0,
  },
  'roundabout-gate-center-v1': {
    kind: 'timed-door', column: 8, row: 7, halfWidth: 1.35, halfDepth: 1.35,
    directionX: 0, directionZ: 0, phaseOffsetTicks: 60,
  },
  'roundabout-gate-east-v1': {
    kind: 'timed-door', column: 10, row: 7, halfWidth: 1.35, halfDepth: 1.35,
    directionX: 0, directionZ: 0, phaseOffsetTicks: 120,
  },
  'fire-belt-west-v1': {
    kind: 'conveyor', column: 5, row: 7, halfWidth: 1.15, halfDepth: 4.25,
    directionX: 0, directionZ: 1, phaseOffsetTicks: 0,
  },
  'fire-belt-east-v1': {
    kind: 'conveyor', column: 11, row: 7, halfWidth: 1.15, halfDepth: 4.25,
    directionX: 0, directionZ: -1, phaseOffsetTicks: 90,
  },
  'fire-ring-gate-v1': {
    kind: 'timed-door', column: 8, row: 10, halfWidth: 1.4, halfDepth: 1.4,
    directionX: 0, directionZ: 0, phaseOffsetTicks: 45,
  },
  'tempo-gate-north-v1': {
    kind: 'timed-door', column: 6, row: 4, halfWidth: 1.35, halfDepth: 1.35,
    directionX: 0, directionZ: 0, phaseOffsetTicks: 0,
  },
  'tempo-gate-west-v1': {
    kind: 'timed-door', column: 8, row: 6, halfWidth: 1.35, halfDepth: 1.35,
    directionX: 0, directionZ: 0, phaseOffsetTicks: 45,
  },
  'tempo-gate-east-v1': {
    kind: 'timed-door', column: 12, row: 8, halfWidth: 1.35, halfDepth: 1.35,
    directionX: 0, directionZ: 0, phaseOffsetTicks: 90,
  },
  'tempo-gate-south-v1': {
    kind: 'timed-door', column: 8, row: 10, halfWidth: 1.35, halfDepth: 1.35,
    directionX: 0, directionZ: 0, phaseOffsetTicks: 135,
  },
  'mirror-shutter-left-v1': {
    kind: 'timed-door', column: 6, row: 7, halfWidth: 1.3, halfDepth: 1.3,
    directionX: 0, directionZ: 0, phaseOffsetTicks: 0,
  },
  'mirror-shutter-center-v1': {
    kind: 'timed-door', column: 8, row: 6, halfWidth: 1.3, halfDepth: 1.3,
    directionX: 0, directionZ: 0, phaseOffsetTicks: 70,
  },
  'mirror-shutter-right-v1': {
    kind: 'timed-door', column: 8, row: 10, halfWidth: 1.3, halfDepth: 1.3,
    directionX: 0, directionZ: 0, phaseOffsetTicks: 140,
  },
  'backtrack-gate-forward-v1': {
    kind: 'timed-door', activation: 'after-key', column: 10, row: 7,
    halfWidth: 1.3, halfDepth: 1.3, directionX: 0, directionZ: 0, phaseOffsetTicks: 0,
  },
  'backtrack-gate-return-v1': {
    kind: 'timed-door', activation: 'before-key', column: 6, row: 7,
    halfWidth: 1.3, halfDepth: 1.3, directionX: 0, directionZ: 0, phaseOffsetTicks: 0,
  },
  'matinee-slide-west-v1': {
    kind: 'conveyor', column: 5, row: 7, halfWidth: 1.15, halfDepth: 4.25,
    directionX: 0, directionZ: 1, phaseOffsetTicks: 0,
  },
  'matinee-slide-east-v1': {
    kind: 'conveyor', column: 11, row: 7, halfWidth: 1.15, halfDepth: 4.25,
    directionX: 0, directionZ: -1, phaseOffsetTicks: 45,
  },
  'matinee-curtain-north-v1': {
    kind: 'timed-door', column: 8, row: 6, halfWidth: 1.3, halfDepth: 1.3,
    directionX: 0, directionZ: 0, phaseOffsetTicks: 0,
  },
  'matinee-curtain-south-v1': {
    kind: 'timed-door', column: 8, row: 10, halfWidth: 1.3, halfDepth: 1.3,
    directionX: 0, directionZ: 0, phaseOffsetTicks: 80,
  },
  'ringmaster-curtain-west-v1': {
    kind: 'timed-door', column: 6, row: 7, halfWidth: 1.3, halfDepth: 1.3,
    directionX: 0, directionZ: 0, phaseOffsetTicks: 0,
  },
  'ringmaster-curtain-east-v1': {
    kind: 'timed-door', column: 10, row: 7, halfWidth: 1.3, halfDepth: 1.3,
    directionX: 0, directionZ: 0, phaseOffsetTicks: 45,
  },
  'ringmaster-curtain-north-v1': {
    kind: 'timed-door', column: 6, row: 11, halfWidth: 1.3, halfDepth: 1.3,
    directionX: 0, directionZ: 0, phaseOffsetTicks: 90,
  },
  'ringmaster-curtain-south-v1': {
    kind: 'timed-door', column: 13, row: 11, halfWidth: 1.3, halfDepth: 1.3,
    directionX: 0, directionZ: 0, phaseOffsetTicks: 135,
  },
  'promenade-bomb-seal-v1': {
    kind: 'timed-door', activation: 'until-bomb', column: 8, row: 6,
    halfWidth: 1.3, halfDepth: 1.3, directionX: 0, directionZ: 0, phaseOffsetTicks: 0,
  },
  'promenade-steam-west-v1': {
    kind: 'conveyor', column: 5, row: 7, halfWidth: 1.15, halfDepth: 3.4,
    directionX: 0, directionZ: 1, phaseOffsetTicks: 0,
  },
  'promenade-steam-east-v1': {
    kind: 'conveyor', column: 11, row: 7, halfWidth: 1.15, halfDepth: 3.4,
    directionX: 0, directionZ: -1, phaseOffsetTicks: 60,
  },
  'green-steam-north-v1': {
    kind: 'conveyor', column: 7, row: 5, halfWidth: 3.4, halfDepth: 1.15,
    directionX: 1, directionZ: 0, phaseOffsetTicks: 0,
  },
  'green-steam-south-v1': {
    kind: 'conveyor', column: 9, row: 9, halfWidth: 3.4, halfDepth: 1.15,
    directionX: -1, directionZ: 0, phaseOffsetTicks: 60,
  },
  'green-steam-spine-v1': {
    kind: 'conveyor', column: 8, row: 7, halfWidth: 1.15, halfDepth: 2.4,
    directionX: 0, directionZ: -1, phaseOffsetTicks: 120,
  },
  'fiesta-flame-west-v1': {
    kind: 'timed-door', column: 6, row: 8, halfWidth: 1.3, halfDepth: 1.3,
    directionX: 0, directionZ: 0, phaseOffsetTicks: 0,
  },
  'fiesta-flame-east-v1': {
    kind: 'timed-door', column: 10, row: 8, halfWidth: 1.3, halfDepth: 1.3,
    directionX: 0, directionZ: 0, phaseOffsetTicks: 70,
  },
  'fiesta-hot-draft-v1': {
    kind: 'conveyor', column: 8, row: 7, halfWidth: 3.6, halfDepth: 1.15,
    directionX: 1, directionZ: 0, phaseOffsetTicks: 35,
  },
  'velocity-valve-west-v1': {
    kind: 'timed-door', column: 4, row: 6, halfWidth: 1.25, halfDepth: 1.25,
    directionX: 0, directionZ: 0, phaseOffsetTicks: 0,
  },
  'velocity-valve-center-v1': {
    kind: 'timed-door', column: 8, row: 6, halfWidth: 1.25, halfDepth: 1.25,
    directionX: 0, directionZ: 0, phaseOffsetTicks: 80,
  },
  'velocity-valve-east-v1': {
    kind: 'timed-door', column: 12, row: 6, halfWidth: 1.25, halfDepth: 1.25,
    directionX: 0, directionZ: 0, phaseOffsetTicks: 160,
  },
  'crimson-gate-left-v1': {
    kind: 'timed-door', column: 6, row: 8, halfWidth: 1.25, halfDepth: 1.25,
    directionX: 0, directionZ: 0, phaseOffsetTicks: 0,
  },
  'crimson-gate-right-v1': {
    kind: 'timed-door', column: 10, row: 8, halfWidth: 1.25, halfDepth: 1.25,
    directionX: 0, directionZ: 0, phaseOffsetTicks: 90,
  },
  'crimson-steam-left-v1': {
    kind: 'conveyor', column: 5, row: 7, halfWidth: 1.1, halfDepth: 3.2,
    directionX: 0, directionZ: 1, phaseOffsetTicks: 30,
  },
  'crimson-steam-right-v1': {
    kind: 'conveyor', column: 11, row: 7, halfWidth: 1.1, halfDepth: 3.2,
    directionX: 0, directionZ: -1, phaseOffsetTicks: 120,
  },
  'ballroom-bomb-seal-center-v1': {
    kind: 'timed-door', activation: 'until-bomb', column: 8, row: 6,
    halfWidth: 1.25, halfDepth: 1.25, directionX: 0, directionZ: 0, phaseOffsetTicks: 0,
  },
  'ballroom-bomb-shortcut-left-v1': {
    kind: 'timed-door', activation: 'until-bomb-optional', column: 4, row: 8,
    halfWidth: 1.25, halfDepth: 1.25, directionX: 0, directionZ: 0, phaseOffsetTicks: 0,
  },
  'ballroom-bomb-shortcut-right-v1': {
    kind: 'timed-door', activation: 'until-bomb-optional', column: 12, row: 8,
    halfWidth: 1.25, halfDepth: 1.25, directionX: 0, directionZ: 0, phaseOffsetTicks: 0,
  },
  'ballroom-blast-draft-v1': {
    kind: 'conveyor', column: 8, row: 9, halfWidth: 3.5, halfDepth: 1.1,
    directionX: 1, directionZ: 0, phaseOffsetTicks: 45,
  },
  'magenta-drain-lower-v1': {
    kind: 'timed-door', activation: 'after-tick', column: 4, row: 6,
    halfWidth: 1.25, halfDepth: 1.25, directionX: 0, directionZ: 0, phaseOffsetTicks: 1500,
  },
  'magenta-drain-middle-v1': {
    kind: 'timed-door', activation: 'after-tick', column: 8, row: 8,
    halfWidth: 1.25, halfDepth: 1.25, directionX: 0, directionZ: 0, phaseOffsetTicks: 2700,
  },
  'magenta-drain-upper-v1': {
    kind: 'timed-door', activation: 'after-tick', column: 10, row: 12,
    halfWidth: 1.25, halfDepth: 1.25, directionX: 0, directionZ: 0, phaseOffsetTicks: 3900,
  },
  'three-key-brass-lock-v1': {
    kind: 'timed-door', activation: 'until-key-1', column: 6, row: 5,
    halfWidth: 1.25, halfDepth: 1.25, directionX: 0, directionZ: 0, phaseOffsetTicks: 0,
  },
  'three-key-cyan-lock-v1': {
    kind: 'timed-door', activation: 'until-key-2', column: 7, row: 8,
    halfWidth: 1.25, halfDepth: 1.25, directionX: 0, directionZ: 0, phaseOffsetTicks: 0,
  },
  'fever-flame-west-v1': {
    kind: 'timed-door', column: 5, row: 6, halfWidth: 1.25, halfDepth: 1.25,
    directionX: 0, directionZ: 0, phaseOffsetTicks: 0,
  },
  'fever-flame-east-v1': {
    kind: 'timed-door', column: 11, row: 8, halfWidth: 1.25, halfDepth: 1.25,
    directionX: 0, directionZ: 0, phaseOffsetTicks: 90,
  },
  'fever-poison-north-v1': {
    kind: 'conveyor', column: 8, row: 5, halfWidth: 4.2, halfDepth: 1.1,
    directionX: 1, directionZ: 0, phaseOffsetTicks: 30,
  },
  'fever-poison-south-v1': {
    kind: 'conveyor', column: 8, row: 9, halfWidth: 4.2, halfDepth: 1.1,
    directionX: -1, directionZ: 0, phaseOffsetTicks: 150,
  },
  'furnace-jaw-west-v1': {
    kind: 'timed-door', column: 6, row: 7, halfWidth: 1.3, halfDepth: 1.3,
    directionX: 0, directionZ: 0, phaseOffsetTicks: 0,
  },
  'furnace-jaw-east-v1': {
    kind: 'timed-door', column: 10, row: 7, halfWidth: 1.3, halfDepth: 1.3,
    directionX: 0, directionZ: 0, phaseOffsetTicks: 40,
  },
  'furnace-jaw-north-v1': {
    kind: 'timed-door', column: 8, row: 6, halfWidth: 1.3, halfDepth: 1.3,
    directionX: 0, directionZ: 0, phaseOffsetTicks: 80,
  },
  'furnace-jaw-south-v1': {
    kind: 'timed-door', column: 8, row: 12, halfWidth: 1.3, halfDepth: 1.3,
    directionX: 0, directionZ: 0, phaseOffsetTicks: 120,
  },
  'cold-reception-ice-east-v1': {
    kind: 'ice', column: 5, row: 6, halfWidth: 4.1, halfDepth: 1.15,
    directionX: 1, directionZ: 0, phaseOffsetTicks: 0,
  },
  'cold-reception-ice-west-v1': {
    kind: 'ice', column: 9, row: 8, halfWidth: 4.1, halfDepth: 1.15,
    directionX: -1, directionZ: 0, phaseOffsetTicks: 0,
  },
  'cold-reception-ice-north-v1': {
    kind: 'ice', column: 11, row: 10, halfWidth: 1.15, halfDepth: 3.25,
    directionX: 0, directionZ: -1, phaseOffsetTicks: 0,
  },
  'slippery-smiles-ice-south-v1': {
    kind: 'ice', column: 4, row: 6, halfWidth: 1.15, halfDepth: 3.25,
    directionX: 0, directionZ: 1, phaseOffsetTicks: 0,
  },
  'slippery-smiles-ice-east-v1': {
    kind: 'ice', column: 7, row: 8, halfWidth: 3.2, halfDepth: 1.15,
    directionX: 1, directionZ: 0, phaseOffsetTicks: 0,
  },
  'slippery-smiles-ice-west-v1': {
    kind: 'ice', column: 11, row: 8, halfWidth: 3.2, halfDepth: 1.15,
    directionX: -1, directionZ: 0, phaseOffsetTicks: 0,
  },
  'slippery-smiles-ice-north-v1': {
    kind: 'ice', column: 12, row: 10, halfWidth: 1.15, halfDepth: 3.25,
    directionX: 0, directionZ: -1, phaseOffsetTicks: 0,
  },
  'violet-wall-ice-west-v1': {
    kind: 'ice', column: 6, row: 6, halfWidth: 4, halfDepth: 1.15,
    directionX: -1, directionZ: 0, phaseOffsetTicks: 0,
  },
  'violet-wall-ice-south-v1': {
    kind: 'ice', column: 10, row: 8, halfWidth: 1.15, halfDepth: 3.3,
    directionX: 0, directionZ: 1, phaseOffsetTicks: 0,
  },
  'violet-wall-ice-east-v1': {
    kind: 'ice', column: 6, row: 10, halfWidth: 3.3, halfDepth: 1.15,
    directionX: 1, directionZ: 0, phaseOffsetTicks: 0,
  },
  'frosted-crossroads-west-v1': {
    kind: 'ice', column: 4, row: 6, halfWidth: 3.35, halfDepth: 1.15,
    directionX: 1, directionZ: 0, phaseOffsetTicks: 0,
  },
  'frosted-crossroads-north-v1': {
    kind: 'ice', column: 6, row: 8, halfWidth: 1.15, halfDepth: 3.35,
    directionX: 0, directionZ: -1, phaseOffsetTicks: 0,
  },
  'frosted-crossroads-south-v1': {
    kind: 'ice', column: 8, row: 10, halfWidth: 1.15, halfDepth: 3.35,
    directionX: 0, directionZ: 1, phaseOffsetTicks: 0,
  },
  'frosted-crossroads-east-v1': {
    kind: 'ice', column: 10, row: 12, halfWidth: 3.35, halfDepth: 1.15,
    directionX: -1, directionZ: 0, phaseOffsetTicks: 0,
  },
  'zero-duel-west-v1': {
    kind: 'ice', column: 2, row: 6, halfWidth: 3.3, halfDepth: 1.15,
    directionX: 1, directionZ: 0, phaseOffsetTicks: 0,
  },
  'zero-duel-north-v1': {
    kind: 'ice', column: 4, row: 8, halfWidth: 1.15, halfDepth: 3.3,
    directionX: 0, directionZ: -1, phaseOffsetTicks: 0,
  },
  'zero-duel-south-v1': {
    kind: 'ice', column: 12, row: 8, halfWidth: 1.15, halfDepth: 3.3,
    directionX: 0, directionZ: 1, phaseOffsetTicks: 0,
  },
  'zero-duel-east-v1': {
    kind: 'ice', column: 12, row: 12, halfWidth: 3.3, halfDepth: 1.15,
    directionX: -1, directionZ: 0, phaseOffsetTicks: 0,
  },
  'refrigerator-west-v1': {
    kind: 'ice', column: 2, row: 6, halfWidth: 3.4, halfDepth: 1.15,
    directionX: 1, directionZ: 0, phaseOffsetTicks: 0,
  },
  'refrigerator-north-v1': {
    kind: 'ice', column: 6, row: 8, halfWidth: 1.15, halfDepth: 3.4,
    directionX: 0, directionZ: -1, phaseOffsetTicks: 0,
  },
  'refrigerator-south-v1': {
    kind: 'ice', column: 12, row: 8, halfWidth: 1.15, halfDepth: 3.4,
    directionX: 0, directionZ: 1, phaseOffsetTicks: 0,
  },
  'refrigerator-east-v1': {
    kind: 'ice', column: 10, row: 12, halfWidth: 3.4, halfDepth: 1.15,
    directionX: -1, directionZ: 0, phaseOffsetTicks: 0,
  },
};

export function hazardRuntimeProfile(profileId: string): HazardRuntimeProfile {
  const profile = HAZARD_RUNTIME_PROFILES[profileId];
  if (profile === undefined) throw new Error(`Unknown hazard runtime profile ${profileId}`);
  return profile;
}

export interface RuntimeGridCell {
  readonly column: number;
  readonly row: number;
  readonly amount?: number;
}

export interface DefenseTargetRuntimeProfile extends RuntimeGridCell {
  readonly maxHealth: number;
  readonly attackRadius: number;
  readonly damagePerStrike: number;
  readonly attackIntervalTicks: number;
}

export interface LevelInteractionRuntimeProfile {
  readonly health: RuntimeGridCell;
  readonly key: RuntimeGridCell;
  readonly additionalKeys?: readonly RuntimeGridCell[];
  readonly energy: RuntimeGridCell;
  readonly door: RuntimeGridCell;
  readonly checkpoint: RuntimeGridCell;
  readonly coin?: RuntimeGridCell;
  readonly secretCoin?: RuntimeGridCell;
  readonly defense?: DefenseTargetRuntimeProfile;
}

export interface MazeRuntimeProfile {
  readonly openings: readonly RuntimeGridCell[];
  readonly interactions: LevelInteractionRuntimeProfile;
}

export const MAZE_RUNTIME_PROFILES: Readonly<Record<string, MazeRuntimeProfile>> = {
  'workshop-basic': {
    openings: [],
    interactions: { health: { column: 5, row: 3, amount: 25 }, key: { column: 7, row: 5 }, energy: { column: 9, row: 7, amount: 35 }, door: { column: 7, row: 8 }, checkpoint: { column: 11, row: 9 }, secretCoin: { column: 7, row: 1, amount: 12 } },
  },
  'workshop-grinning-hall': {
    openings: [{ column: 6, row: 1 }, { column: 6, row: 7 }],
    interactions: { health: { column: 3, row: 3, amount: 24 }, key: { column: 3, row: 7 }, energy: { column: 11, row: 5, amount: 34 }, door: { column: 5, row: 8 }, checkpoint: { column: 9, row: 9 }, coin: { column: 8, row: 1, amount: 4 }, secretCoin: { column: 9, row: 13, amount: 12 } },
  },
  'workshop-coin-circuit': {
    openings: [{ column: 4, row: 2 }, { column: 10, row: 2 }, { column: 8, row: 10 }],
    interactions: { health: { column: 11, row: 3, amount: 23 }, key: { column: 11, row: 5 }, energy: { column: 7, row: 7, amount: 33 }, door: { column: 3, row: 10 }, checkpoint: { column: 7, row: 11 }, coin: { column: 8, row: 3, amount: 5 }, secretCoin: { column: 7, row: 1, amount: 12 } },
  },
  'workshop-wrong-turn-boogie': {
    openings: [{ column: 4, row: 4 }, { column: 12, row: 4 }, { column: 2, row: 8 }, { column: 12, row: 10 }],
    interactions: { health: { column: 1, row: 5, amount: 22 }, key: { column: 3, row: 1 }, energy: { column: 1, row: 7, amount: 32 }, door: { column: 7, row: 12 }, checkpoint: { column: 11, row: 11 }, coin: { column: 11, row: 3, amount: 6 }, secretCoin: { column: 13, row: 7, amount: 12 } },
  },
  'workshop-foremans-two-step': {
    openings: [{ column: 6, row: 4 }, { column: 10, row: 4 }, { column: 6, row: 12 }],
    interactions: { health: { column: 9, row: 5, amount: 22 }, key: { column: 9, row: 11 }, energy: { column: 11, row: 7, amount: 31 }, door: { column: 9, row: 12 }, checkpoint: { column: 5, row: 11 }, coin: { column: 7, row: 5, amount: 7 }, secretCoin: { column: 7, row: 1, amount: 12 } },
  },
  'workshop-conveyor-conga': {
    openings: [{ column: 2, row: 6 }, { column: 6, row: 6 }, { column: 10, row: 6 }, { column: 12, row: 6 }],
    interactions: { health: { column: 5, row: 7, amount: 21 }, key: { column: 3, row: 11 }, energy: { column: 3, row: 9, amount: 30 }, door: { column: 1, row: 10 }, checkpoint: { column: 7, row: 13 }, coin: { column: 11, row: 5, amount: 8 }, secretCoin: { column: 9, row: 13, amount: 12 } },
  },
  'workshop-lights-out-smiles-on': {
    openings: [{ column: 6, row: 2 }, { column: 4, row: 10 }, { column: 10, row: 12 }],
    interactions: { health: { column: 13, row: 7, amount: 20 }, key: { column: 11, row: 7 }, energy: { column: 9, row: 9, amount: 29 }, door: { column: 13, row: 10 }, checkpoint: { column: 3, row: 11 }, coin: { column: 13, row: 5, amount: 9 }, secretCoin: { column: 1, row: 11, amount: 12 } },
  },
  'workshop-shift-change': {
    openings: [{ column: 12, row: 2 }, { column: 6, row: 8 }, { column: 10, row: 8 }, { column: 12, row: 8 }],
    interactions: { health: { column: 3, row: 9, amount: 20 }, key: { column: 7, row: 11 }, energy: { column: 5, row: 11, amount: 28 }, door: { column: 11, row: 10 }, checkpoint: { column: 9, row: 13 }, coin: { column: 13, row: 3, amount: 10 }, secretCoin: { column: 7, row: 1, amount: 12 } },
  },
  'workshop-workshop-rush': {
    openings: [{ column: 4, row: 2 }, { column: 10, row: 4 }, { column: 2, row: 6 }, { column: 6, row: 8 }, { column: 12, row: 10 }],
    interactions: { health: { column: 11, row: 9, amount: 19 }, key: { column: 5, row: 13 }, energy: { column: 11, row: 11, amount: 27 }, door: { column: 1, row: 12 }, checkpoint: { column: 3, row: 13 }, coin: { column: 7, row: 7, amount: 12 }, secretCoin: { column: 13, row: 11, amount: 12 } },
  },
  'workshop-chief-wobble': {
    openings: [{ column: 6, row: 1 }, { column: 4, row: 4 }, { column: 10, row: 4 }, { column: 2, row: 8 }, { column: 8, row: 10 }, { column: 10, row: 12 }],
    interactions: { health: { column: 7, row: 9, amount: 30 }, key: { column: 9, row: 13 }, energy: { column: 3, row: 13, amount: 40 }, door: { column: 13, row: 12 }, checkpoint: { column: 11, row: 13 }, secretCoin: { column: 10, row: 13, amount: 12 } },
  },
  'carnival-ticket-trouble': {
    openings: [
      { column: 4, row: 2 }, { column: 10, row: 4 }, { column: 2, row: 6 },
      { column: 6, row: 7 }, { column: 10, row: 7 }, { column: 6, row: 8 },
      { column: 12, row: 10 }, { column: 10, row: 12 },
    ],
    interactions: {
      health: { column: 3, row: 3, amount: 19 },
      key: { column: 9, row: 5 },
      energy: { column: 7, row: 7, amount: 27 },
      door: { column: 5, row: 8 },
      checkpoint: { column: 11, row: 9 },
      coin: { column: 13, row: 5, amount: 13 },
      secretCoin: { column: 9, row: 1, amount: 16 },
    },
  },
  'carnival-sliding-sideshow': {
    openings: [
      { column: 6, row: 2 }, { column: 4, row: 4 }, { column: 10, row: 4 },
      { column: 2, row: 6 }, { column: 8, row: 6 }, { column: 6, row: 8 },
      { column: 12, row: 8 }, { column: 8, row: 10 }, { column: 10, row: 12 },
    ],
    interactions: {
      health: { column: 3, row: 3, amount: 18 },
      key: { column: 3, row: 7 },
      energy: { column: 7, row: 9, amount: 26 },
      door: { column: 6, row: 8 },
      checkpoint: { column: 9, row: 11 },
      coin: { column: 9, row: 5, amount: 14 },
      secretCoin: { column: 11, row: 13, amount: 16 },
    },
  },
  'carnival-spinners-midway': {
    openings: [
      { column: 4, row: 2 }, { column: 10, row: 2 }, { column: 6, row: 4 },
      { column: 12, row: 4 }, { column: 6, row: 7 }, { column: 10, row: 7 },
      { column: 10, row: 8 }, { column: 4, row: 10 }, { column: 12, row: 10 },
      { column: 6, row: 12 },
    ],
    interactions: {
      health: { column: 3, row: 3, amount: 18 },
      key: { column: 11, row: 5 },
      energy: { column: 5, row: 9, amount: 25 },
      door: { column: 10, row: 8 },
      checkpoint: { column: 11, row: 11 },
      coin: { column: 7, row: 5, amount: 15 },
      secretCoin: { column: 11, row: 13, amount: 16 },
    },
  },
  'carnival-firebreather-funhouse': {
    openings: [
      { column: 6, row: 2 }, { column: 4, row: 4 }, { column: 10, row: 4 },
      { column: 2, row: 6 }, { column: 12, row: 6 }, { column: 6, row: 8 },
      { column: 10, row: 8 }, { column: 4, row: 10 }, { column: 8, row: 10 },
      { column: 12, row: 12 },
    ],
    interactions: {
      health: { column: 3, row: 3, amount: 17 },
      key: { column: 3, row: 7 },
      energy: { column: 9, row: 9, amount: 24 },
      door: { column: 6, row: 8 },
      checkpoint: { column: 11, row: 11 },
      coin: { column: 9, row: 5, amount: 16 },
      secretCoin: { column: 10, row: 13, amount: 16 },
    },
  },
  'carnival-tempo-tent': {
    openings: [
      { column: 4, row: 2 }, { column: 10, row: 2 }, { column: 6, row: 4 },
      { column: 12, row: 4 }, { column: 2, row: 6 }, { column: 8, row: 6 },
      { column: 6, row: 8 }, { column: 12, row: 8 }, { column: 8, row: 10 },
      { column: 10, row: 12 },
    ],
    interactions: {
      health: { column: 11, row: 3, amount: 17 },
      key: { column: 11, row: 5 },
      energy: { column: 3, row: 9, amount: 23 },
      door: { column: 12, row: 8 },
      checkpoint: { column: 9, row: 11 },
      coin: { column: 5, row: 5, amount: 17 },
      secretCoin: { column: 7, row: 1, amount: 16 },
    },
  },
  'carnival-laughing-mirrors': {
    openings: [
      { column: 4, row: 2 }, { column: 10, row: 2 }, { column: 6, row: 4 },
      { column: 12, row: 4 }, { column: 2, row: 6 }, { column: 8, row: 6 },
      { column: 6, row: 7 }, { column: 10, row: 7 }, { column: 6, row: 8 },
      { column: 10, row: 8 }, { column: 12, row: 8 }, { column: 4, row: 10 },
      { column: 8, row: 10 }, { column: 12, row: 10 }, { column: 6, row: 12 },
      { column: 10, row: 12 },
    ],
    interactions: {
      health: { column: 11, row: 3, amount: 18 },
      key: { column: 3, row: 7 },
      energy: { column: 3, row: 9, amount: 24 },
      door: { column: 10, row: 8 },
      checkpoint: { column: 11, row: 11 },
      coin: { column: 9, row: 5, amount: 18 },
      secretCoin: { column: 7, row: 1, amount: 16 },
    },
  },
  'carnival-prize-booth-panic': {
    openings: [
      { column: 4, row: 2 }, { column: 10, row: 2 }, { column: 6, row: 4 },
      { column: 12, row: 4 }, { column: 2, row: 6 }, { column: 8, row: 6 },
      { column: 6, row: 7 }, { column: 10, row: 7 }, { column: 6, row: 8 },
      { column: 10, row: 8 }, { column: 12, row: 8 }, { column: 4, row: 10 },
      { column: 8, row: 10 }, { column: 12, row: 10 }, { column: 6, row: 12 },
      { column: 10, row: 12 },
    ],
    interactions: {
      health: { column: 11, row: 3, amount: 18 },
      key: { column: 3, row: 7 },
      energy: { column: 3, row: 9, amount: 24 },
      door: { column: 10, row: 8 },
      checkpoint: { column: 11, row: 11 },
      coin: { column: 9, row: 5, amount: 19 },
      secretCoin: { column: 7, row: 1, amount: 16 },
      defense: {
        column: 8, row: 9, maxHealth: 360, attackRadius: 1.65,
        damagePerStrike: 9, attackIntervalTicks: 54,
      },
    },
  },
  'carnival-big-top-backtrack': {
    openings: [
      { column: 4, row: 2 }, { column: 10, row: 2 }, { column: 6, row: 4 },
      { column: 12, row: 4 }, { column: 2, row: 6 }, { column: 8, row: 6 },
      { column: 6, row: 7 }, { column: 10, row: 7 }, { column: 6, row: 8 },
      { column: 10, row: 8 }, { column: 12, row: 8 }, { column: 4, row: 10 },
      { column: 8, row: 10 }, { column: 12, row: 10 }, { column: 6, row: 12 },
      { column: 10, row: 12 },
    ],
    interactions: {
      health: { column: 11, row: 3, amount: 17 },
      key: { column: 11, row: 7 },
      energy: { column: 3, row: 9, amount: 23 },
      door: { column: 8, row: 10 },
      checkpoint: { column: 11, row: 11 },
      coin: { column: 5, row: 5, amount: 20 },
      secretCoin: { column: 7, row: 1, amount: 16 },
    },
  },
  'carnival-midnight-matinee': {
    openings: [
      { column: 4, row: 2 }, { column: 10, row: 2 }, { column: 6, row: 4 },
      { column: 12, row: 4 }, { column: 2, row: 6 }, { column: 8, row: 6 },
      { column: 6, row: 7 }, { column: 10, row: 7 }, { column: 6, row: 8 },
      { column: 10, row: 8 }, { column: 12, row: 8 }, { column: 4, row: 10 },
      { column: 8, row: 10 }, { column: 12, row: 10 }, { column: 6, row: 12 },
      { column: 10, row: 12 },
    ],
    interactions: {
      health: { column: 11, row: 3, amount: 17 },
      key: { column: 3, row: 7 },
      energy: { column: 3, row: 9, amount: 23 },
      door: { column: 10, row: 8 },
      checkpoint: { column: 11, row: 11 },
      coin: { column: 9, row: 5, amount: 21 },
      secretCoin: { column: 7, row: 1, amount: 16 },
    },
  },
  'carnival-ringmaster-davel': {
    openings: [
      { column: 4, row: 2 }, { column: 10, row: 2 }, { column: 6, row: 4 },
      { column: 12, row: 4 }, { column: 2, row: 6 }, { column: 8, row: 6 },
      { column: 6, row: 7 }, { column: 10, row: 7 }, { column: 6, row: 8 },
      { column: 10, row: 8 }, { column: 12, row: 8 }, { column: 4, row: 10 },
      { column: 8, row: 10 }, { column: 12, row: 10 }, { column: 6, row: 12 },
      { column: 10, row: 12 },
    ],
    interactions: {
      health: { column: 11, row: 3, amount: 20 },
      key: { column: 3, row: 7 },
      energy: { column: 3, row: 9, amount: 26 },
      door: { column: 10, row: 8 },
      checkpoint: { column: 11, row: 11 },
      coin: { column: 5, row: 5, amount: 22 },
      secretCoin: { column: 7, row: 1, amount: 16 },
    },
  },
  'boiler-pipework-promenade': {
    openings: [
      { column: 4, row: 2 }, { column: 10, row: 2 }, { column: 6, row: 4 },
      { column: 12, row: 4 }, { column: 2, row: 6 }, { column: 8, row: 6 },
      { column: 6, row: 7 }, { column: 10, row: 7 }, { column: 6, row: 8 },
      { column: 10, row: 8 }, { column: 12, row: 8 }, { column: 4, row: 10 },
      { column: 8, row: 10 }, { column: 12, row: 10 }, { column: 6, row: 12 },
      { column: 10, row: 12 },
    ],
    interactions: {
      health: { column: 11, row: 3, amount: 18 },
      key: { column: 3, row: 7 },
      energy: { column: 3, row: 9, amount: 24 },
      door: { column: 10, row: 8 },
      checkpoint: { column: 11, row: 11 },
      coin: { column: 5, row: 5, amount: 23 },
      secretCoin: { column: 7, row: 1, amount: 20 },
    },
  },
  'boiler-green-steam': {
    openings: [
      { column: 2, row: 2 }, { column: 8, row: 2 }, { column: 12, row: 2 },
      { column: 4, row: 4 }, { column: 8, row: 4 }, { column: 12, row: 4 },
      { column: 4, row: 6 }, { column: 8, row: 6 }, { column: 12, row: 6 },
      { column: 6, row: 7 }, { column: 10, row: 7 }, { column: 4, row: 8 },
      { column: 8, row: 8 }, { column: 10, row: 8 }, { column: 12, row: 8 },
      { column: 4, row: 10 }, { column: 8, row: 10 }, { column: 12, row: 10 },
      { column: 4, row: 12 }, { column: 8, row: 12 }, { column: 12, row: 12 },
    ],
    interactions: {
      health: { column: 13, row: 3, amount: 19 },
      key: { column: 3, row: 5 },
      energy: { column: 3, row: 11, amount: 25 },
      door: { column: 10, row: 8 },
      checkpoint: { column: 11, row: 11 },
      coin: { column: 7, row: 3, amount: 24 },
      secretCoin: { column: 11, row: 13, amount: 20 },
    },
  },
  'boiler-firemouth-fiesta': {
    openings: [
      { column: 3, row: 2 }, { column: 6, row: 2 }, { column: 11, row: 2 },
      { column: 2, row: 4 }, { column: 7, row: 4 }, { column: 10, row: 4 },
      { column: 3, row: 6 }, { column: 6, row: 6 }, { column: 12, row: 6 },
      { column: 6, row: 7 }, { column: 10, row: 7 }, { column: 3, row: 8 },
      { column: 6, row: 8 }, { column: 10, row: 8 }, { column: 5, row: 10 },
      { column: 9, row: 10 }, { column: 12, row: 10 }, { column: 5, row: 12 },
      { column: 10, row: 12 },
    ],
    interactions: {
      health: { column: 11, row: 3, amount: 20 },
      key: { column: 3, row: 7 },
      energy: { column: 5, row: 11, amount: 26 },
      door: { column: 10, row: 8 },
      checkpoint: { column: 11, row: 11 },
      coin: { column: 9, row: 5, amount: 25 },
      secretCoin: { column: 12, row: 13, amount: 20 },
    },
  },
  'boiler-valve-velocity': {
    openings: [
      { column: 4, row: 2 }, { column: 9, row: 2 }, { column: 12, row: 2 },
      { column: 2, row: 4 }, { column: 7, row: 4 }, { column: 10, row: 4 },
      { column: 4, row: 6 }, { column: 8, row: 6 }, { column: 12, row: 6 },
      { column: 6, row: 7 }, { column: 10, row: 7 },
      { column: 4, row: 8 }, { column: 8, row: 8 }, { column: 12, row: 8 },
      { column: 2, row: 10 }, { column: 8, row: 10 }, { column: 12, row: 10 },
      { column: 4, row: 12 }, { column: 10, row: 12 }, { column: 12, row: 12 },
    ],
    interactions: {
      health: { column: 13, row: 3, amount: 21 },
      key: { column: 3, row: 5 },
      energy: { column: 3, row: 11, amount: 27 },
      door: { column: 12, row: 8 },
      checkpoint: { column: 11, row: 11 },
      coin: { column: 7, row: 9, amount: 26 },
      secretCoin: { column: 12, row: 13, amount: 20 },
    },
  },
  'boiler-crimson-pair': {
    openings: [
      { column: 2, row: 2 }, { column: 6, row: 2 }, { column: 10, row: 2 },
      { column: 2, row: 4 }, { column: 6, row: 4 }, { column: 10, row: 4 },
      { column: 2, row: 6 }, { column: 5, row: 6 }, { column: 8, row: 6 }, { column: 12, row: 6 },
      { column: 6, row: 7 }, { column: 10, row: 7 },
      { column: 3, row: 8 }, { column: 6, row: 8 }, { column: 10, row: 8 }, { column: 12, row: 8 },
      { column: 2, row: 10 }, { column: 6, row: 10 }, { column: 10, row: 10 }, { column: 12, row: 10 },
      { column: 3, row: 12 }, { column: 6, row: 12 }, { column: 10, row: 12 },
    ],
    interactions: {
      health: { column: 13, row: 5, amount: 22 },
      key: { column: 3, row: 3 },
      energy: { column: 3, row: 11, amount: 28 },
      door: { column: 10, row: 8 },
      checkpoint: { column: 11, row: 11 },
      coin: { column: 7, row: 5, amount: 27 },
      secretCoin: { column: 12, row: 13, amount: 20 },
    },
  },
  'boiler-bombs-ballroom': {
    openings: [
      { column: 3, row: 2 }, { column: 8, row: 2 }, { column: 12, row: 2 },
      { column: 2, row: 4 }, { column: 6, row: 4 }, { column: 10, row: 4 },
      { column: 4, row: 6 }, { column: 8, row: 6 }, { column: 12, row: 6 },
      { column: 4, row: 8 }, { column: 6, row: 8 }, { column: 10, row: 8 }, { column: 12, row: 8 },
      { column: 12, row: 9 },
      { column: 2, row: 10 }, { column: 6, row: 10 }, { column: 10, row: 10 },
      { column: 4, row: 12 }, { column: 8, row: 12 }, { column: 12, row: 12 },
    ],
    interactions: {
      health: { column: 13, row: 3, amount: 22 },
      key: { column: 3, row: 5 },
      energy: { column: 3, row: 11, amount: 29 },
      door: { column: 10, row: 8 },
      checkpoint: { column: 11, row: 11 },
      coin: { column: 7, row: 5, amount: 28 },
      secretCoin: { column: 9, row: 1, amount: 20 },
    },
  },
  'boiler-magenta-drain': {
    openings: [
      { column: 2, row: 2 }, { column: 6, row: 2 }, { column: 11, row: 2 },
      { column: 4, row: 4 }, { column: 8, row: 4 }, { column: 12, row: 4 },
      { column: 4, row: 6 }, { column: 8, row: 6 }, { column: 12, row: 6 },
      { column: 6, row: 7 }, { column: 10, row: 7 },
      { column: 4, row: 8 }, { column: 8, row: 8 }, { column: 10, row: 8 }, { column: 12, row: 8 },
      { column: 2, row: 10 }, { column: 6, row: 10 }, { column: 10, row: 10 },
      { column: 4, row: 12 }, { column: 8, row: 12 }, { column: 10, row: 12 },
    ],
    interactions: {
      health: { column: 13, row: 5, amount: 23 },
      key: { column: 3, row: 3 },
      energy: { column: 3, row: 11, amount: 30 },
      door: { column: 10, row: 8 },
      checkpoint: { column: 11, row: 11 },
      coin: { column: 7, row: 5, amount: 29 },
      secretCoin: { column: 12, row: 13, amount: 20 },
    },
  },
  'boiler-three-key-tango': {
    openings: [{ column: 4, row: 4 }, { column: 8, row: 6 }, { column: 10, row: 10 }],
    interactions: {
      health: { column: 1, row: 3, amount: 23 },
      key: { column: 3, row: 3 },
      additionalKeys: [{ column: 9, row: 7 }, { column: 11, row: 11 }],
      energy: { column: 5, row: 7, amount: 31 },
      door: { column: 9, row: 12 },
      checkpoint: { column: 11, row: 13 },
      coin: { column: 13, row: 7, amount: 30 },
      secretCoin: { column: 7, row: 1, amount: 20 },
    },
  },
  'boiler-fever-tunnels': {
    openings: [
      { column: 4, row: 2 }, { column: 10, row: 2 },
      { column: 2, row: 4 }, { column: 6, row: 4 }, { column: 12, row: 4 },
      { column: 5, row: 6 }, { column: 8, row: 6 }, { column: 12, row: 6 },
      { column: 4, row: 8 }, { column: 8, row: 8 }, { column: 11, row: 8 },
      { column: 2, row: 10 }, { column: 6, row: 10 }, { column: 10, row: 10 },
      { column: 4, row: 12 }, { column: 8, row: 12 }, { column: 12, row: 12 },
    ],
    interactions: {
      health: { column: 13, row: 3, amount: 24 },
      key: { column: 3, row: 5 },
      energy: { column: 3, row: 11, amount: 32 },
      door: { column: 11, row: 8 },
      checkpoint: { column: 11, row: 11 },
      coin: { column: 9, row: 5, amount: 31 },
      secretCoin: { column: 7, row: 1, amount: 20 },
    },
  },
  'boiler-furnace-mouth': {
    openings: [
      { column: 6, row: 2 }, { column: 10, row: 2 },
      { column: 4, row: 4 }, { column: 8, row: 4 }, { column: 12, row: 4 },
      { column: 6, row: 7 }, { column: 8, row: 6 }, { column: 10, row: 7 },
      { column: 4, row: 8 }, { column: 8, row: 8 }, { column: 12, row: 8 },
      { column: 2, row: 10 }, { column: 12, row: 10 },
      { column: 4, row: 12 }, { column: 8, row: 12 }, { column: 12, row: 12 },
    ],
    interactions: {
      health: { column: 13, row: 3, amount: 30 },
      key: { column: 3, row: 5 },
      energy: { column: 3, row: 11, amount: 40 },
      door: { column: 8, row: 8 },
      checkpoint: { column: 11, row: 11 },
      coin: { column: 9, row: 3, amount: 32 },
      secretCoin: { column: 11, row: 13, amount: 20 },
    },
  },
  'cold-storage-reception': {
    openings: [
      { column: 4, row: 2 }, { column: 10, row: 2 },
      { column: 2, row: 4 }, { column: 8, row: 4 }, { column: 12, row: 4 },
      { column: 5, row: 6 }, { column: 8, row: 6 }, { column: 12, row: 6 },
      { column: 4, row: 8 }, { column: 9, row: 8 }, { column: 12, row: 8 },
      { column: 2, row: 10 }, { column: 8, row: 10 },
      { column: 4, row: 12 }, { column: 8, row: 12 }, { column: 12, row: 12 },
    ],
    interactions: {
      health: { column: 13, row: 3, amount: 24 },
      key: { column: 3, row: 5 },
      energy: { column: 3, row: 11, amount: 32 },
      door: { column: 9, row: 8 },
      checkpoint: { column: 11, row: 11 },
      coin: { column: 9, row: 5, amount: 33 },
      secretCoin: { column: 13, row: 12, amount: 24 },
    },
  },
  'cold-storage-slippery-smiles': {
    openings: [
      { column: 6, row: 2 }, { column: 12, row: 2 },
      { column: 2, row: 4 }, { column: 6, row: 4 }, { column: 10, row: 4 },
      { column: 4, row: 6 }, { column: 8, row: 6 }, { column: 12, row: 6 },
      { column: 2, row: 8 }, { column: 8, row: 8 }, { column: 11, row: 8 },
      { column: 4, row: 10 }, { column: 8, row: 10 }, { column: 12, row: 10 },
      { column: 2, row: 12 }, { column: 6, row: 12 }, { column: 10, row: 12 },
    ],
    interactions: {
      health: { column: 13, row: 3, amount: 25 },
      key: { column: 3, row: 3 },
      energy: { column: 3, row: 11, amount: 33 },
      door: { column: 8, row: 6 },
      checkpoint: { column: 11, row: 11 },
      coin: { column: 13, row: 5, amount: 34 },
      secretCoin: { column: 12, row: 13, amount: 24 },
    },
  },
  'cold-storage-violet-wall': {
    openings: [
      { column: 3, row: 2 }, { column: 9, row: 2 },
      { column: 2, row: 4 }, { column: 10, row: 4 }, { column: 12, row: 4 },
      { column: 6, row: 6 }, { column: 10, row: 6 }, { column: 12, row: 6 },
      { column: 4, row: 8 }, { column: 8, row: 8 }, { column: 10, row: 8 },
      { column: 2, row: 10 }, { column: 6, row: 10 }, { column: 10, row: 10 },
      { column: 4, row: 12 }, { column: 8, row: 12 }, { column: 12, row: 12 },
    ],
    interactions: {
      health: { column: 13, row: 3, amount: 26 },
      key: { column: 3, row: 5 },
      energy: { column: 1, row: 11, amount: 34 },
      door: { column: 10, row: 8 },
      checkpoint: { column: 11, row: 11 },
      coin: { column: 5, row: 9, amount: 35 },
      secretCoin: { column: 12, row: 13, amount: 24 },
    },
  },
  'cold-storage-frosted-crossroads': {
    openings: [
      { column: 4, row: 2 }, { column: 8, row: 2 },
      { column: 2, row: 4 }, { column: 6, row: 4 }, { column: 12, row: 4 },
      { column: 4, row: 6 }, { column: 10, row: 6 }, { column: 12, row: 6 },
      { column: 2, row: 8 }, { column: 6, row: 8 }, { column: 12, row: 8 },
      { column: 4, row: 10 }, { column: 8, row: 10 }, { column: 12, row: 10 },
      { column: 6, row: 12 }, { column: 10, row: 12 },
    ],
    interactions: {
      health: { column: 13, row: 3, amount: 27 },
      key: { column: 3, row: 5 },
      energy: { column: 5, row: 7, amount: 35 },
      door: { column: 6, row: 8 },
      checkpoint: { column: 9, row: 11 },
      coin: { column: 11, row: 9, amount: 36 },
      secretCoin: { column: 11, row: 13, amount: 24 },
    },
  },
  'cold-storage-zero-degree-duel': {
    openings: [
      { column: 2, row: 2 }, { column: 10, row: 2 },
      { column: 4, row: 4 }, { column: 8, row: 4 }, { column: 12, row: 4 },
      { column: 2, row: 6 }, { column: 6, row: 6 }, { column: 10, row: 6 },
      { column: 4, row: 8 }, { column: 8, row: 8 }, { column: 12, row: 8 },
      { column: 2, row: 10 }, { column: 6, row: 10 }, { column: 10, row: 10 },
      { column: 4, row: 12 }, { column: 8, row: 12 }, { column: 12, row: 12 },
    ],
    interactions: {
      health: { column: 13, row: 3, amount: 28 },
      key: { column: 3, row: 7 },
      energy: { column: 7, row: 5, amount: 36 },
      door: { column: 8, row: 8 },
      checkpoint: { column: 11, row: 11 },
      coin: { column: 9, row: 9, amount: 37 },
      secretCoin: { column: 11, row: 13, amount: 24 },
    },
  },
  'cold-storage-refrigerator-finale': {
    openings: [
      { column: 2, row: 2 }, { column: 8, row: 2 },
      { column: 4, row: 4 }, { column: 10, row: 4 }, { column: 12, row: 4 },
      { column: 2, row: 6 }, { column: 6, row: 6 }, { column: 12, row: 6 },
      { column: 4, row: 8 }, { column: 6, row: 8 }, { column: 10, row: 8 }, { column: 12, row: 8 },
      { column: 2, row: 10 }, { column: 8, row: 10 }, { column: 12, row: 10 },
      { column: 4, row: 12 }, { column: 10, row: 12 },
    ],
    interactions: {
      health: { column: 13, row: 3, amount: 12 },
      key: { column: 3, row: 7 },
      energy: { column: 1, row: 11, amount: 38 },
      door: { column: 6, row: 8 },
      checkpoint: { column: 13, row: 11 },
      coin: { column: 7, row: 9, amount: 38 },
      secretCoin: { column: 7, row: 1, amount: 24 },
    },
  },
};

export function mazeRuntimeProfile(templateSetId: string): MazeRuntimeProfile {
  const profile = MAZE_RUNTIME_PROFILES[templateSetId];
  if (profile === undefined) throw new Error(`Unknown maze runtime profile ${templateSetId}`);
  return profile;
}

export type DanceRuntimeMotif = 'wobble-march' | 'side-shuffle' | 'robot-pop' | 'corner-peek'
  | 'heavy-two-step' | 'conveyor-conga' | 'freeze-dance' | 'clockwork-charleston'
  | 'turbo-shuffle' | 'giant-breakdown' | 'ticket-swing' | 'soft-shoe' | 'carousel-kick'
  | 'flame-fandango' | 'tempo-twist' | 'mirror-lindy' | 'jackpot-jitter' | 'reverse-strut'
  | 'moonlit-swing' | 'ringmaster-revue' | 'pipe-tap' | 'toxic-toe' | 'flame-lick' | 'pressure-step'
  | 'duelling-tango' | 'detonator-danzon' | 'drainpipe-rumba' | 'triple-key-cha-cha' | 'feverish-salsa'
  | 'inferno-flamenco-finale' | 'chilly-funk-walk' | 'ice-slide-moonwalk' | 'shield-pose-popping'
  | 'crystal-locking' | 'freeze-frame-face-off' | 'refrigerator-robot-rumble';

export const DANCE_RUNTIME_MOTIFS: Readonly<Record<string, DanceRuntimeMotif>> = {
  'wobble-march': 'wobble-march',
  'side-to-side-shuffle': 'side-shuffle',
  'pocket-robot-pop': 'robot-pop',
  'corner-peek-groove': 'corner-peek',
  'heavy-boot-two-step': 'heavy-two-step',
  'conveyor-conga': 'conveyor-conga',
  'flashlight-freeze-dance': 'freeze-dance',
  'clockwork-charleston': 'clockwork-charleston',
  'turbo-tool-shuffle': 'turbo-shuffle',
  'giant-wobble-breakdown': 'giant-breakdown',
  'ticket-taker-swing': 'ticket-swing',
  'sideways-soft-shoe': 'soft-shoe',
  'carousel-kick': 'carousel-kick',
  'flame-fan-fandango': 'flame-fandango',
  'tempo-tent-twist': 'tempo-twist',
  'mirrorball-lindy': 'mirror-lindy',
  'jackpot-jitterbug': 'jackpot-jitter',
  'reverse-circus-strut': 'reverse-strut',
  'moonlit-swing-off': 'moonlit-swing',
  'evil-ringmaster-revue': 'ringmaster-revue',
  'pipe-tap-tango': 'pipe-tap',
  'toxic-toe-tango': 'toxic-toe',
  'flame-lick-flamenco': 'flame-lick',
  'pressure-step-paso': 'pressure-step',
  'duelling-tango': 'duelling-tango',
  'detonator-danzon': 'detonator-danzon',
  'drainpipe-rumba': 'drainpipe-rumba',
  'triple-key-cha-cha': 'triple-key-cha-cha',
  'feverish-salsa': 'feverish-salsa',
  'inferno-flamenco-finale': 'inferno-flamenco-finale',
  'chilly-funk-walk': 'chilly-funk-walk',
  'ice-slide-moonwalk': 'ice-slide-moonwalk',
  'shield-pose-popping': 'shield-pose-popping',
  'crystal-locking-dance': 'crystal-locking',
  'freeze-frame-face-off': 'freeze-frame-face-off',
  'refrigerator-robot-rumble': 'refrigerator-robot-rumble',
};

export function danceRuntimeMotif(presetId: string): DanceRuntimeMotif {
  const motif = DANCE_RUNTIME_MOTIFS[presetId];
  if (motif === undefined) throw new Error(`Unknown dance runtime preset ${presetId}`);
  return motif;
}

export interface DanceGameplayRuntimeProfile {
  readonly kind: 'ambient' | 'freeze-window';
  readonly periodTicks: number;
  readonly freezeTicks: number;
  readonly phaseOffsetTicks: number;
}

export const DANCE_GAMEPLAY_RUNTIME_PROFILES: Readonly<Record<string, DanceGameplayRuntimeProfile>> = {
  'wobble-march': { kind: 'ambient', periodTicks: 0, freezeTicks: 0, phaseOffsetTicks: 0 },
  'side-to-side-shuffle': { kind: 'ambient', periodTicks: 0, freezeTicks: 0, phaseOffsetTicks: 0 },
  'pocket-robot-pop': { kind: 'ambient', periodTicks: 0, freezeTicks: 0, phaseOffsetTicks: 0 },
  'corner-peek-groove': { kind: 'ambient', periodTicks: 0, freezeTicks: 0, phaseOffsetTicks: 0 },
  'heavy-boot-two-step': { kind: 'ambient', periodTicks: 0, freezeTicks: 0, phaseOffsetTicks: 0 },
  'conveyor-conga': { kind: 'ambient', periodTicks: 0, freezeTicks: 0, phaseOffsetTicks: 0 },
  'flashlight-freeze-dance': { kind: 'freeze-window', periodTicks: 180, freezeTicks: 60, phaseOffsetTicks: 0 },
  'clockwork-charleston': { kind: 'ambient', periodTicks: 0, freezeTicks: 0, phaseOffsetTicks: 0 },
  'turbo-tool-shuffle': { kind: 'ambient', periodTicks: 0, freezeTicks: 0, phaseOffsetTicks: 0 },
  'giant-wobble-breakdown': { kind: 'ambient', periodTicks: 0, freezeTicks: 0, phaseOffsetTicks: 0 },
  'ticket-taker-swing': { kind: 'ambient', periodTicks: 0, freezeTicks: 0, phaseOffsetTicks: 0 },
  'sideways-soft-shoe': { kind: 'ambient', periodTicks: 0, freezeTicks: 0, phaseOffsetTicks: 0 },
  'carousel-kick': { kind: 'ambient', periodTicks: 0, freezeTicks: 0, phaseOffsetTicks: 0 },
  'flame-fan-fandango': { kind: 'ambient', periodTicks: 0, freezeTicks: 0, phaseOffsetTicks: 0 },
  'tempo-tent-twist': { kind: 'freeze-window', periodTicks: 150, freezeTicks: 30, phaseOffsetTicks: 0 },
  'mirrorball-lindy': { kind: 'ambient', periodTicks: 0, freezeTicks: 0, phaseOffsetTicks: 0 },
  'jackpot-jitterbug': { kind: 'ambient', periodTicks: 0, freezeTicks: 0, phaseOffsetTicks: 0 },
  'reverse-circus-strut': { kind: 'ambient', periodTicks: 0, freezeTicks: 0, phaseOffsetTicks: 0 },
  'moonlit-swing-off': { kind: 'ambient', periodTicks: 0, freezeTicks: 0, phaseOffsetTicks: 0 },
  'evil-ringmaster-revue': { kind: 'ambient', periodTicks: 0, freezeTicks: 0, phaseOffsetTicks: 0 },
  'pipe-tap-tango': { kind: 'ambient', periodTicks: 0, freezeTicks: 0, phaseOffsetTicks: 0 },
  'toxic-toe-tango': { kind: 'ambient', periodTicks: 0, freezeTicks: 0, phaseOffsetTicks: 0 },
  'flame-lick-flamenco': { kind: 'ambient', periodTicks: 0, freezeTicks: 0, phaseOffsetTicks: 0 },
  'pressure-step-paso': { kind: 'ambient', periodTicks: 0, freezeTicks: 0, phaseOffsetTicks: 0 },
  'duelling-tango': { kind: 'ambient', periodTicks: 0, freezeTicks: 0, phaseOffsetTicks: 0 },
  'detonator-danzon': { kind: 'ambient', periodTicks: 0, freezeTicks: 0, phaseOffsetTicks: 0 },
  'drainpipe-rumba': { kind: 'ambient', periodTicks: 0, freezeTicks: 0, phaseOffsetTicks: 0 },
  'triple-key-cha-cha': { kind: 'ambient', periodTicks: 0, freezeTicks: 0, phaseOffsetTicks: 0 },
  'feverish-salsa': { kind: 'ambient', periodTicks: 0, freezeTicks: 0, phaseOffsetTicks: 0 },
  'inferno-flamenco-finale': { kind: 'ambient', periodTicks: 0, freezeTicks: 0, phaseOffsetTicks: 0 },
  'chilly-funk-walk': { kind: 'ambient', periodTicks: 0, freezeTicks: 0, phaseOffsetTicks: 0 },
  'ice-slide-moonwalk': { kind: 'ambient', periodTicks: 0, freezeTicks: 0, phaseOffsetTicks: 0 },
  'shield-pose-popping': { kind: 'ambient', periodTicks: 0, freezeTicks: 0, phaseOffsetTicks: 0 },
  'crystal-locking-dance': { kind: 'ambient', periodTicks: 0, freezeTicks: 0, phaseOffsetTicks: 0 },
  'freeze-frame-face-off': { kind: 'ambient', periodTicks: 0, freezeTicks: 0, phaseOffsetTicks: 0 },
  'refrigerator-robot-rumble': { kind: 'ambient', periodTicks: 0, freezeTicks: 0, phaseOffsetTicks: 0 },
};

export function danceGameplayRuntimeProfile(presetId: string): DanceGameplayRuntimeProfile {
  const profile = DANCE_GAMEPLAY_RUNTIME_PROFILES[presetId];
  if (profile === undefined) throw new Error(`Unknown dance gameplay runtime preset ${presetId}`);
  return profile;
}

export interface AudioRuntimeProfile {
  readonly roomSize: number;
  readonly decaySeconds: number;
  readonly dampingHz: number;
  readonly wetMix: number;
  readonly pitchScale: number;
}

export const AUDIO_RUNTIME_PROFILES: Readonly<Record<string, AudioRuntimeProfile>> = {
  'audio-neon-workshop-001': { roomSize: 0.42, decaySeconds: 0.34, dampingHz: 4200, wetMix: 0.16, pitchScale: 1 },
  'audio-neon-workshop-002': { roomSize: 0.56, decaySeconds: 0.43, dampingHz: 3800, wetMix: 0.2, pitchScale: 1.025 },
  'audio-neon-workshop-003': { roomSize: 0.48, decaySeconds: 0.38, dampingHz: 4600, wetMix: 0.18, pitchScale: 1.05 },
  'audio-neon-workshop-004': { roomSize: 0.68, decaySeconds: 0.56, dampingHz: 3200, wetMix: 0.25, pitchScale: 0.96 },
  'audio-neon-workshop-005': { roomSize: 0.72, decaySeconds: 0.61, dampingHz: 2800, wetMix: 0.27, pitchScale: 0.93 },
  'audio-neon-workshop-006': { roomSize: 0.6, decaySeconds: 0.48, dampingHz: 5000, wetMix: 0.21, pitchScale: 1.02 },
  'audio-neon-workshop-007': { roomSize: 0.78, decaySeconds: 0.66, dampingHz: 3500, wetMix: 0.3, pitchScale: 1.07 },
  'audio-neon-workshop-008': { roomSize: 0.52, decaySeconds: 0.4, dampingHz: 5400, wetMix: 0.19, pitchScale: 1.04 },
  'audio-neon-workshop-009': { roomSize: 0.64, decaySeconds: 0.5, dampingHz: 4400, wetMix: 0.23, pitchScale: 1.09 },
  'audio-neon-workshop-010': { roomSize: 0.86, decaySeconds: 0.74, dampingHz: 2400, wetMix: 0.33, pitchScale: 0.88 },
  'audio-copper-carnival-011': { roomSize: 0.7, decaySeconds: 0.58, dampingHz: 3600, wetMix: 0.26, pitchScale: 0.98 },
  'audio-copper-carnival-012': { roomSize: 0.62, decaySeconds: 0.46, dampingHz: 4400, wetMix: 0.22, pitchScale: 1.04 },
  'audio-copper-carnival-013': { roomSize: 0.76, decaySeconds: 0.63, dampingHz: 3900, wetMix: 0.28, pitchScale: 1.06 },
  'audio-copper-carnival-014': { roomSize: 0.82, decaySeconds: 0.7, dampingHz: 3100, wetMix: 0.31, pitchScale: 0.95 },
  'audio-copper-carnival-015': { roomSize: 0.9, decaySeconds: 0.78, dampingHz: 4700, wetMix: 0.34, pitchScale: 1.08 },
  'audio-copper-carnival-016': { roomSize: 0.94, decaySeconds: 0.82, dampingHz: 5200, wetMix: 0.36, pitchScale: 1.12 },
  'audio-copper-carnival-017': { roomSize: 0.88, decaySeconds: 0.72, dampingHz: 4900, wetMix: 0.33, pitchScale: 1.06 },
  'audio-copper-carnival-018': { roomSize: 0.84, decaySeconds: 0.68, dampingHz: 4400, wetMix: 0.31, pitchScale: 1.03 },
  'audio-copper-carnival-019': { roomSize: 0.96, decaySeconds: 0.86, dampingHz: 4000, wetMix: 0.37, pitchScale: 0.98 },
  'audio-copper-carnival-020': { roomSize: 0.98, decaySeconds: 0.9, dampingHz: 3600, wetMix: 0.39, pitchScale: 0.91 },
  'audio-toxic-boiler-021': { roomSize: 0.74, decaySeconds: 0.62, dampingHz: 3300, wetMix: 0.29, pitchScale: 0.94 },
  'audio-toxic-boiler-022': { roomSize: 0.8, decaySeconds: 0.72, dampingHz: 2900, wetMix: 0.34, pitchScale: 0.97 },
  'audio-toxic-boiler-023': { roomSize: 0.86, decaySeconds: 0.76, dampingHz: 2600, wetMix: 0.35, pitchScale: 1.04 },
  'audio-toxic-boiler-024': { roomSize: 0.9, decaySeconds: 0.8, dampingHz: 2450, wetMix: 0.37, pitchScale: 1.08 },
  'audio-toxic-boiler-025': { roomSize: 0.92, decaySeconds: 0.84, dampingHz: 2350, wetMix: 0.38, pitchScale: 0.96 },
  'audio-toxic-boiler-026': { roomSize: 0.96, decaySeconds: 0.88, dampingHz: 2250, wetMix: 0.4, pitchScale: 1.02 },
  'audio-toxic-boiler-027': { roomSize: 0.88, decaySeconds: 0.78, dampingHz: 2500, wetMix: 0.36, pitchScale: 1.06 },
  'audio-toxic-boiler-028': { roomSize: 0.93, decaySeconds: 0.83, dampingHz: 2380, wetMix: 0.39, pitchScale: 1.09 },
  'audio-toxic-boiler-029': { roomSize: 0.98, decaySeconds: 0.9, dampingHz: 2180, wetMix: 0.42, pitchScale: 1.12 },
  'audio-toxic-boiler-030': { roomSize: 1, decaySeconds: 0.96, dampingHz: 1950, wetMix: 0.44, pitchScale: 0.9 },
  'audio-cold-storage-031': { roomSize: 0.88, decaySeconds: 0.98, dampingHz: 6100, wetMix: 0.46, pitchScale: 1.08 },
  'audio-cold-storage-032': { roomSize: 0.94, decaySeconds: 0.99, dampingHz: 6600, wetMix: 0.48, pitchScale: 1.12 },
  'audio-cold-storage-033': { roomSize: 0.9, decaySeconds: 0.96, dampingHz: 5750, wetMix: 0.45, pitchScale: 0.96 },
  'audio-cold-storage-034': { roomSize: 0.98, decaySeconds: 0.99, dampingHz: 6900, wetMix: 0.49, pitchScale: 1.04 },
  'audio-cold-storage-035': { roomSize: 0.92, decaySeconds: 0.97, dampingHz: 6400, wetMix: 0.47, pitchScale: 0.99 },
  'audio-cold-storage-036': { roomSize: 1, decaySeconds: 1, dampingHz: 7200, wetMix: 0.5, pitchScale: 0.92 },
};

export function audioRuntimeProfile(presetId: string): AudioRuntimeProfile {
  const profile = AUDIO_RUNTIME_PROFILES[presetId];
  if (profile === undefined) throw new Error(`Unknown audio runtime preset ${presetId}`);
  return profile;
}

export interface MusicRuntimeProfile {
  readonly rootMidi: number;
  readonly scale: readonly number[];
  readonly leadPattern: readonly number[];
  readonly bassPattern: readonly number[];
  readonly swing: number;
}

export const MUSIC_RUNTIME_PROFILES: Readonly<Record<string, MusicRuntimeProfile>> = {
  'wobble-march': { rootMidi: 48, scale: [0, 3, 5, 7, 10], leadPattern: [0, 2, 1, 3, 0, 4, 2, 1], bassPattern: [0, 0, 3, 2], swing: 0.08 },
  'side-to-side-shuffle': { rootMidi: 50, scale: [0, 2, 3, 7, 9], leadPattern: [0, 1, 3, 1, 4, 3, 1, 2], bassPattern: [0, 2, 0, 3], swing: 0.18 },
  'pocket-robot-pop': { rootMidi: 53, scale: [0, 2, 5, 7, 9], leadPattern: [0, 4, 2, 3, 1, 4, 3, 2], bassPattern: [0, 3, 1, 4], swing: 0.04 },
  'corner-peek-groove': { rootMidi: 46, scale: [0, 3, 5, 6, 10], leadPattern: [0, 3, 1, 4, 0, 2, 4, 1], bassPattern: [0, 0, 4, 1], swing: 0.14 },
  'heavy-boot-two-step': { rootMidi: 43, scale: [0, 3, 5, 7, 10], leadPattern: [0, 2, 0, 3, 1, 2, 4, 2], bassPattern: [0, 2, 0, 4], swing: 0.02 },
  'conveyor-conga': { rootMidi: 52, scale: [0, 2, 4, 7, 9], leadPattern: [0, 2, 4, 3, 1, 3, 4, 2], bassPattern: [0, 3, 2, 4], swing: 0.12 },
  'flashlight-freeze-dance': { rootMidi: 45, scale: [0, 3, 6, 7, 10], leadPattern: [0, 4, 1, 3, 0, 2, 4, 1], bassPattern: [0, 1, 0, 4], swing: 0 },
  'clockwork-charleston': { rootMidi: 55, scale: [0, 2, 4, 6, 9], leadPattern: [0, 3, 1, 4, 2, 4, 1, 3], bassPattern: [0, 4, 2, 3], swing: 0.22 },
  'turbo-tool-shuffle': { rootMidi: 49, scale: [0, 2, 3, 7, 10], leadPattern: [0, 2, 4, 1, 3, 4, 2, 1], bassPattern: [0, 3, 4, 2], swing: 0.1 },
  'giant-wobble-breakdown': { rootMidi: 38, scale: [0, 3, 5, 8, 10], leadPattern: [0, 1, 3, 4, 0, 2, 1, 4], bassPattern: [0, 0, 3, 4], swing: 0.06 },
  'ticket-taker-swing': { rootMidi: 51, scale: [0, 2, 4, 7, 9], leadPattern: [0, 3, 1, 4, 2, 0, 4, 1], bassPattern: [0, 3, 0, 4], swing: 0.2 },
  'sideways-soft-shoe': { rootMidi: 54, scale: [0, 2, 5, 7, 10], leadPattern: [0, 2, 4, 1, 3, 1, 4, 2], bassPattern: [0, 3, 1, 4], swing: 0.24 },
  'carousel-kick': { rootMidi: 57, scale: [0, 3, 5, 7, 10], leadPattern: [0, 4, 1, 3, 2, 4, 0, 3], bassPattern: [0, 2, 4, 1], swing: 0.16 },
  'flame-fan-fandango': { rootMidi: 44, scale: [0, 1, 5, 7, 8], leadPattern: [0, 3, 1, 4, 2, 4, 1, 3], bassPattern: [0, 4, 2, 3], swing: 0.12 },
  'tempo-tent-twist': { rootMidi: 58, scale: [0, 2, 4, 7, 11], leadPattern: [0, 4, 2, 1, 3, 4, 1, 2], bassPattern: [0, 3, 4, 2], swing: 0.08 },
  'mirrorball-lindy': { rootMidi: 61, scale: [0, 2, 3, 7, 9], leadPattern: [0, 3, 4, 1, 2, 4, 0, 3], bassPattern: [0, 4, 1, 3], swing: 0.25 },
  'jackpot-jitterbug': { rootMidi: 63, scale: [0, 2, 4, 7, 10], leadPattern: [0, 4, 2, 3, 1, 4, 0, 2], bassPattern: [0, 3, 1, 4], swing: 0.23 },
  'reverse-circus-strut': { rootMidi: 55, scale: [0, 2, 5, 7, 9], leadPattern: [4, 2, 3, 1, 4, 0, 2, 1], bassPattern: [4, 2, 0, 3], swing: 0.2 },
  'moonlit-swing-off': { rootMidi: 50, scale: [0, 3, 5, 7, 10], leadPattern: [0, 3, 1, 4, 2, 3, 0, 4], bassPattern: [0, 2, 4, 1], swing: 0.24 },
  'evil-ringmaster-revue': { rootMidi: 41, scale: [0, 3, 6, 7, 10], leadPattern: [0, 4, 1, 3, 2, 4, 1, 0], bassPattern: [0, 0, 4, 2], swing: 0.14 },
  'pipe-tap-tango': { rootMidi: 47, scale: [0, 2, 3, 7, 9], leadPattern: [0, 2, 1, 4, 3, 1, 4, 2], bassPattern: [0, 3, 1, 4], swing: 0.18 },
  'toxic-toe-tango': { rootMidi: 45, scale: [0, 1, 5, 7, 8], leadPattern: [0, 4, 1, 3, 2, 4, 0, 2], bassPattern: [0, 1, 4, 2], swing: 0.22 },
  'flame-lick-flamenco': { rootMidi: 52, scale: [0, 1, 4, 5, 7, 8], leadPattern: [0, 3, 1, 5, 4, 2, 5, 1], bassPattern: [0, 3, 4, 1], swing: 0.12 },
  'pressure-step-paso': { rootMidi: 48, scale: [0, 2, 3, 6, 7, 10], leadPattern: [0, 4, 2, 5, 1, 3, 5, 2], bassPattern: [0, 2, 5, 3], swing: 0.16 },
  'duelling-tango': { rootMidi: 43, scale: [0, 1, 4, 6, 7, 10], leadPattern: [0, 5, 1, 4, 2, 5, 3, 1], bassPattern: [0, 4, 1, 5], swing: 0.2 },
  'detonator-danzon': { rootMidi: 46, scale: [0, 2, 3, 6, 7, 9], leadPattern: [0, 4, 1, 5, 2, 3, 5, 1], bassPattern: [0, 3, 5, 2], swing: 0.18 },
  'drainpipe-rumba': { rootMidi: 49, scale: [0, 2, 3, 5, 7, 10], leadPattern: [0, 3, 1, 5, 2, 4, 1, 3], bassPattern: [0, 4, 2, 5], swing: 0.22 },
  'triple-key-cha-cha': { rootMidi: 54, scale: [0, 2, 3, 5, 7, 9], leadPattern: [0, 4, 1, 5, 2, 4, 3, 1], bassPattern: [0, 3, 5, 2], swing: 0.25 },
  'feverish-salsa': { rootMidi: 56, scale: [0, 1, 3, 5, 7, 8, 10], leadPattern: [0, 5, 2, 6, 1, 4, 3, 5], bassPattern: [0, 4, 6, 2], swing: 0.25 },
  'inferno-flamenco-finale': { rootMidi: 40, scale: [0, 1, 4, 5, 7, 8, 11], leadPattern: [0, 6, 1, 5, 2, 4, 6, 3], bassPattern: [0, 0, 5, 6], swing: 0.14 },
  'chilly-funk-walk': { rootMidi: 58, scale: [0, 2, 5, 7, 10], leadPattern: [0, 3, 1, 4, 2, 0, 4, 1], bassPattern: [0, 2, 4, 1], swing: 0.2 },
  'ice-slide-moonwalk': { rootMidi: 61, scale: [0, 2, 3, 7, 10], leadPattern: [4, 2, 0, 3, 1, 4, 2, 0], bassPattern: [0, 4, 1, 3], swing: 0.24 },
  'shield-pose-popping': { rootMidi: 55, scale: [0, 3, 5, 6, 10], leadPattern: [0, 4, 1, 3, 0, 2, 4, 1], bassPattern: [0, 0, 3, 4], swing: 0.08 },
  'crystal-locking-dance': { rootMidi: 60, scale: [0, 2, 5, 6, 9, 11], leadPattern: [0, 5, 2, 4, 1, 3, 5, 2], bassPattern: [0, 3, 1, 5], swing: 0.06 },
  'freeze-frame-face-off': { rootMidi: 57, scale: [0, 1, 5, 6, 8, 11], leadPattern: [0, 5, 1, 4, 2, 5, 3, 1], bassPattern: [0, 4, 1, 5], swing: 0.04 },
  'refrigerator-robot-rumble': { rootMidi: 39, scale: [0, 1, 3, 6, 7, 10], leadPattern: [0, 5, 1, 4, 2, 5, 3, 0], bassPattern: [0, 0, 4, 5], swing: 0.1 },
};

export function musicRuntimeProfile(presetId: string): MusicRuntimeProfile {
  const profile = MUSIC_RUNTIME_PROFILES[presetId];
  if (profile === undefined) throw new Error(`Unknown music runtime preset ${presetId}`);
  return profile;
}

export type RuntimeRgb = readonly [number, number, number];
export interface PaletteRuntimeProfile {
  readonly sky: RuntimeRgb;
  readonly floor: RuntimeRgb;
  readonly walls: readonly [RuntimeRgb, RuntimeRgb, RuntimeRgb, RuntimeRgb];
}

export const PALETTE_RUNTIME_PROFILES: Readonly<Record<string, PaletteRuntimeProfile>> = {
  'neon-workshop-01': { sky: [0.32, 0.83, 1], floor: [0.72, 0.86, 0.2], walls: [[1, 0.24, 0.44], [0.12, 0.9, 0.72], [0.48, 0.3, 0.98], [1, 0.55, 0.12]] },
  'neon-workshop-02': { sky: [0.42, 0.88, 1], floor: [0.45, 0.94, 0.48], walls: [[0.1, 0.5, 1], [1, 0.28, 0.7], [0.65, 0.94, 0.18], [1, 0.62, 0.12]] },
  'neon-workshop-03': { sky: [0.62, 0.9, 1], floor: [1, 0.83, 0.22], walls: [[1, 0.46, 0.1], [0.04, 0.78, 0.92], [0.86, 0.22, 0.95], [0.2, 0.45, 1]] },
  'neon-workshop-04': { sky: [0.4, 0.78, 1], floor: [0.86, 0.48, 0.95], walls: [[0.58, 0.24, 1], [0.08, 0.88, 0.72], [1, 0.55, 0.1], [1, 0.25, 0.5]] },
  'neon-workshop-05': { sky: [0.55, 0.8, 0.95], floor: [0.95, 0.55, 0.25], walls: [[0.9, 0.12, 0.16], [0.18, 0.68, 1], [1, 0.74, 0.12], [0.48, 0.24, 0.92]] },
  'neon-workshop-06': { sky: [0.25, 0.86, 0.96], floor: [0.35, 0.88, 0.76], walls: [[1, 0.82, 0.08], [0.06, 0.72, 0.98], [0.72, 0.22, 1], [1, 0.32, 0.2]] },
  'neon-workshop-07': { sky: [0.42, 0.52, 0.92], floor: [0.62, 0.7, 0.84], walls: [[0.24, 0.9, 1], [1, 0.32, 0.78], [0.76, 0.54, 1], [1, 0.78, 0.16]] },
  'neon-workshop-08': { sky: [0.3, 0.82, 0.95], floor: [0.9, 0.82, 0.42], walls: [[0.85, 0.55, 0.1], [0.05, 0.78, 0.9], [0.9, 0.3, 0.72], [0.42, 0.34, 1]] },
  'neon-workshop-09': { sky: [0.65, 0.82, 1], floor: [0.98, 0.55, 0.42], walls: [[1, 0.18, 0.4], [0.1, 0.9, 0.72], [0.32, 0.45, 1], [1, 0.76, 0.08]] },
  'neon-workshop-10': { sky: [0.76, 0.45, 0.72], floor: [0.85, 0.68, 0.32], walls: [[0.35, 0.18, 0.5], [1, 0.22, 0.38], [0.12, 0.72, 0.85], [1, 0.68, 0.08]] },
  'copper-carnival-11': { sky: [0.28, 0.82, 0.86], floor: [0.88, 0.5, 0.2], walls: [[0.96, 0.42, 0.12], [0.04, 0.72, 0.68], [1, 0.72, 0.16], [0.48, 0.18, 0.58]] },
  'copper-carnival-12': { sky: [0.42, 0.78, 1], floor: [0.96, 0.68, 0.18], walls: [[0.08, 0.5, 1], [1, 0.28, 0.48], [0.12, 0.84, 0.72], [0.94, 0.45, 0.12]] },
  'copper-carnival-13': { sky: [0.58, 0.84, 1], floor: [0.9, 0.78, 0.22], walls: [[0.98, 0.24, 0.3], [0.18, 0.42, 1], [0.14, 0.86, 0.58], [0.72, 0.26, 0.94]] },
  'copper-carnival-14': { sky: [0.9, 0.48, 0.28], floor: [0.98, 0.72, 0.18], walls: [[1, 0.16, 0.12], [0.96, 0.42, 0.08], [0.16, 0.62, 0.94], [0.68, 0.16, 0.72]] },
  'copper-carnival-15': { sky: [0.34, 0.72, 0.98], floor: [0.66, 0.9, 0.3], walls: [[0.08, 0.9, 0.92], [0.94, 0.18, 0.82], [0.44, 0.22, 1], [1, 0.76, 0.1]] },
  'copper-carnival-16': { sky: [0.72, 0.88, 1], floor: [0.84, 0.9, 0.96], walls: [[0.18, 0.72, 1], [1, 0.3, 0.76], [0.5, 0.28, 0.98], [1, 0.74, 0.16]] },
  'copper-carnival-17': { sky: [0.42, 0.9, 0.92], floor: [0.96, 0.76, 0.2], walls: [[0.05, 0.74, 0.68], [1, 0.48, 0.08], [0.86, 0.16, 0.58], [0.32, 0.24, 0.94]] },
  'copper-carnival-18': { sky: [0.56, 0.86, 1], floor: [0.98, 0.66, 0.2], walls: [[0.92, 0.2, 0.38], [0.12, 0.68, 0.92], [0.98, 0.72, 0.12], [0.44, 0.22, 0.86]] },
  'copper-carnival-19': { sky: [0.28, 0.4, 0.76], floor: [0.76, 0.84, 0.96], walls: [[0.18, 0.62, 1], [0.86, 0.28, 0.92], [1, 0.68, 0.16], [0.18, 0.82, 0.72]] },
  'copper-carnival-20': { sky: [0.88, 0.48, 0.7], floor: [0.92, 0.72, 0.28], walls: [[0.38, 0.12, 0.58], [1, 0.22, 0.34], [0.08, 0.72, 0.84], [1, 0.72, 0.08]] },
  'toxic-boiler-21': { sky: [0.48, 0.88, 0.72], floor: [0.86, 0.9, 0.38], walls: [[0.1, 0.58, 0.46], [1, 0.46, 0.12], [0.18, 0.82, 0.9], [0.72, 0.24, 0.86]] },
  'toxic-boiler-22': { sky: [0.62, 0.92, 0.38], floor: [0.84, 0.88, 0.46], walls: [[0.08, 0.5, 0.28], [0.68, 0.12, 0.74], [0.08, 0.74, 0.84], [0.98, 0.58, 0.08]] },
  'toxic-boiler-23': { sky: [0.96, 0.58, 0.3], floor: [0.9, 0.84, 0.48], walls: [[0.82, 0.08, 0.12], [1, 0.42, 0.06], [0.18, 0.7, 0.72], [0.74, 0.18, 0.62]] },
  'toxic-boiler-24': { sky: [0.36, 0.9, 0.84], floor: [0.94, 0.86, 0.34], walls: [[0.02, 0.66, 0.62], [0.98, 0.36, 0.56], [0.96, 0.66, 0.08], [0.34, 0.2, 0.88]] },
  'toxic-boiler-25': { sky: [0.94, 0.52, 0.62], floor: [0.96, 0.86, 0.52], walls: [[0.74, 0.04, 0.12], [1, 0.24, 0.38], [0.1, 0.72, 0.78], [0.48, 0.16, 0.76]] },
  'toxic-boiler-26': { sky: [0.38, 0.82, 1], floor: [0.92, 0.88, 0.58], walls: [[1, 0.34, 0.08], [0.12, 0.72, 0.92], [0.92, 0.16, 0.48], [0.5, 0.22, 0.9]] },
  'toxic-boiler-27': { sky: [0.82, 0.5, 0.94], floor: [0.88, 0.9, 0.66], walls: [[0.92, 0.08, 0.62], [0.18, 0.7, 0.9], [0.98, 0.48, 0.12], [0.38, 0.18, 0.78]] },
  'toxic-boiler-28': { sky: [0.54, 0.84, 0.96], floor: [0.94, 0.87, 0.5], walls: [[0.95, 0.56, 0.08], [0.04, 0.76, 0.9], [0.94, 0.12, 0.66], [0.34, 0.18, 0.82]] },
  'toxic-boiler-29': { sky: [0.78, 0.94, 0.34], floor: [0.96, 0.84, 0.56], walls: [[0.96, 0.18, 0.08], [0.24, 0.88, 0.18], [0.02, 0.72, 0.86], [0.86, 0.12, 0.64]] },
  'toxic-boiler-30': { sky: [0.98, 0.44, 0.28], floor: [0.92, 0.86, 0.6], walls: [[0.54, 0.05, 0.08], [1, 0.28, 0.04], [0.08, 0.66, 0.78], [0.82, 0.12, 0.5]] },
  'cold-storage-31': { sky: [0.62, 0.91, 1], floor: [0.84, 0.96, 1], walls: [[0.08, 0.56, 0.96], [0.22, 0.88, 1], [0.72, 0.28, 1], [1, 0.46, 0.78]] },
  'cold-storage-32': { sky: [0.7, 0.86, 1], floor: [0.9, 0.98, 1], walls: [[0.1, 0.34, 0.94], [0.12, 0.86, 0.96], [0.88, 0.22, 0.94], [0.66, 0.92, 0.18]] },
  'cold-storage-33': { sky: [0.72, 0.74, 1], floor: [0.9, 0.94, 1], walls: [[0.42, 0.08, 0.82], [0.78, 0.22, 1], [0.08, 0.78, 0.96], [1, 0.62, 0.16]] },
  'cold-storage-34': { sky: [0.76, 0.94, 1], floor: [0.86, 0.98, 1], walls: [[0.04, 0.76, 1], [0.96, 0.24, 0.86], [0.28, 0.96, 0.88], [0.72, 0.34, 1]] },
  'cold-storage-35': { sky: [0.68, 0.88, 1], floor: [0.94, 0.98, 1], walls: [[0.3, 0.08, 0.88], [0.08, 0.84, 1], [1, 0.34, 0.68], [0.92, 0.78, 0.12]] },
  'cold-storage-36': { sky: [0.82, 0.96, 1], floor: [0.9, 0.98, 0.96], walls: [[0.04, 0.44, 0.92], [0.1, 0.94, 0.82], [0.94, 0.18, 0.54], [1, 0.76, 0.08]] },
};

export function paletteRuntimeProfile(presetId: string): PaletteRuntimeProfile {
  const profile = PALETTE_RUNTIME_PROFILES[presetId];
  if (profile === undefined) throw new Error(`Unknown palette runtime preset ${presetId}`);
  return profile;
}

export const CAMPAIGN_RUNTIME_MANIFEST = {
  schemaVersion: 1,
  manifestId: 'campaign-runtime-v1',
  hazardProfiles: HAZARD_RUNTIME_PROFILES,
  mazeProfiles: MAZE_RUNTIME_PROFILES,
  danceMotifs: DANCE_RUNTIME_MOTIFS,
  danceGameplayProfiles: DANCE_GAMEPLAY_RUNTIME_PROFILES,
  audioProfiles: AUDIO_RUNTIME_PROFILES,
  musicProfiles: MUSIC_RUNTIME_PROFILES,
  paletteProfiles: PALETTE_RUNTIME_PROFILES,
} as const;
