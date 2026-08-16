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

export interface RuntimeGridCell {
  readonly column: number;
  readonly row: number;
  readonly amount?: number;
}

export interface LevelInteractionRuntimeProfile {
  readonly health: RuntimeGridCell;
  readonly key: RuntimeGridCell;
  readonly energy: RuntimeGridCell;
  readonly door: RuntimeGridCell;
  readonly checkpoint: RuntimeGridCell;
  readonly coin?: RuntimeGridCell;
  readonly secretCoin?: RuntimeGridCell;
}

export interface MazeRuntimeProfile {
  readonly openings: readonly RuntimeGridCell[];
  readonly interactions: LevelInteractionRuntimeProfile;
}

export const MAZE_RUNTIME_PROFILES: Readonly<Record<string, MazeRuntimeProfile>> = {
  'workshop-basic': {
    openings: [],
    interactions: { health: { column: 5, row: 3, amount: 25 }, key: { column: 7, row: 5 }, energy: { column: 9, row: 7, amount: 35 }, door: { column: 7, row: 8 }, checkpoint: { column: 11, row: 9 } },
  },
  'workshop-grinning-hall': {
    openings: [{ column: 6, row: 1 }, { column: 6, row: 7 }],
    interactions: { health: { column: 3, row: 3, amount: 24 }, key: { column: 3, row: 7 }, energy: { column: 11, row: 5, amount: 34 }, door: { column: 5, row: 8 }, checkpoint: { column: 9, row: 9 }, coin: { column: 8, row: 1, amount: 4 } },
  },
  'workshop-coin-circuit': {
    openings: [{ column: 4, row: 2 }, { column: 10, row: 2 }, { column: 8, row: 10 }],
    interactions: { health: { column: 11, row: 3, amount: 23 }, key: { column: 11, row: 5 }, energy: { column: 7, row: 7, amount: 33 }, door: { column: 3, row: 10 }, checkpoint: { column: 7, row: 11 }, coin: { column: 8, row: 3, amount: 5 } },
  },
  'workshop-wrong-turn-boogie': {
    openings: [{ column: 4, row: 4 }, { column: 12, row: 4 }, { column: 2, row: 8 }, { column: 12, row: 10 }],
    interactions: { health: { column: 1, row: 5, amount: 22 }, key: { column: 5, row: 9 }, energy: { column: 1, row: 7, amount: 32 }, door: { column: 7, row: 12 }, checkpoint: { column: 11, row: 11 }, coin: { column: 11, row: 3, amount: 6 }, secretCoin: { column: 13, row: 7, amount: 12 } },
  },
  'workshop-foremans-two-step': {
    openings: [{ column: 6, row: 4 }, { column: 10, row: 4 }, { column: 6, row: 12 }],
    interactions: { health: { column: 9, row: 5, amount: 22 }, key: { column: 9, row: 11 }, energy: { column: 11, row: 7, amount: 31 }, door: { column: 9, row: 12 }, checkpoint: { column: 5, row: 11 }, coin: { column: 7, row: 5, amount: 7 } },
  },
  'workshop-conveyor-conga': {
    openings: [{ column: 2, row: 6 }, { column: 6, row: 6 }, { column: 10, row: 6 }, { column: 12, row: 6 }],
    interactions: { health: { column: 5, row: 7, amount: 21 }, key: { column: 3, row: 11 }, energy: { column: 3, row: 9, amount: 30 }, door: { column: 1, row: 10 }, checkpoint: { column: 7, row: 13 }, coin: { column: 11, row: 5, amount: 8 } },
  },
  'workshop-lights-out-smiles-on': {
    openings: [{ column: 6, row: 2 }, { column: 4, row: 10 }, { column: 10, row: 12 }],
    interactions: { health: { column: 13, row: 7, amount: 20 }, key: { column: 11, row: 7 }, energy: { column: 9, row: 9, amount: 29 }, door: { column: 13, row: 10 }, checkpoint: { column: 3, row: 11 }, coin: { column: 13, row: 5, amount: 9 }, secretCoin: { column: 1, row: 11, amount: 15 } },
  },
  'workshop-shift-change': {
    openings: [{ column: 12, row: 2 }, { column: 6, row: 8 }, { column: 10, row: 8 }, { column: 12, row: 8 }],
    interactions: { health: { column: 3, row: 9, amount: 20 }, key: { column: 7, row: 11 }, energy: { column: 5, row: 11, amount: 28 }, door: { column: 11, row: 10 }, checkpoint: { column: 9, row: 13 }, coin: { column: 13, row: 3, amount: 10 } },
  },
  'workshop-workshop-rush': {
    openings: [{ column: 4, row: 2 }, { column: 10, row: 4 }, { column: 2, row: 6 }, { column: 6, row: 8 }, { column: 12, row: 10 }],
    interactions: { health: { column: 11, row: 9, amount: 19 }, key: { column: 5, row: 13 }, energy: { column: 11, row: 11, amount: 27 }, door: { column: 1, row: 12 }, checkpoint: { column: 3, row: 13 }, coin: { column: 7, row: 7, amount: 12 }, secretCoin: { column: 13, row: 11, amount: 18 } },
  },
  'workshop-chief-wobble': {
    openings: [{ column: 6, row: 1 }, { column: 4, row: 4 }, { column: 10, row: 4 }, { column: 2, row: 8 }, { column: 8, row: 10 }, { column: 10, row: 12 }],
    interactions: { health: { column: 7, row: 9, amount: 30 }, key: { column: 9, row: 13 }, energy: { column: 3, row: 13, amount: 40 }, door: { column: 13, row: 12 }, checkpoint: { column: 11, row: 13 } },
  },
};

export function mazeRuntimeProfile(templateSetId: string): MazeRuntimeProfile {
  const profile = MAZE_RUNTIME_PROFILES[templateSetId];
  if (profile === undefined) throw new Error(`Unknown maze runtime profile ${templateSetId}`);
  return profile;
}

export type DanceRuntimeMotif = 'wobble-march' | 'side-shuffle' | 'robot-pop' | 'corner-peek'
  | 'heavy-two-step' | 'conveyor-conga' | 'freeze-dance' | 'clockwork-charleston'
  | 'turbo-shuffle' | 'giant-breakdown';

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
};

export function danceGameplayRuntimeProfile(presetId: string): DanceGameplayRuntimeProfile {
  const profile = DANCE_GAMEPLAY_RUNTIME_PROFILES[presetId];
  if (profile === undefined) throw new Error(`Unknown dance gameplay runtime preset ${presetId}`);
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
};

export function paletteRuntimeProfile(presetId: string): PaletteRuntimeProfile {
  const profile = PALETTE_RUNTIME_PROFILES[presetId];
  if (profile === undefined) throw new Error(`Unknown palette runtime preset ${presetId}`);
  return profile;
}

export const CHAPTER_01_RUNTIME_MANIFEST = {
  schemaVersion: 1,
  manifestId: 'chapter-01-runtime-v1',
  hazardProfiles: HAZARD_RUNTIME_PROFILES,
  mazeProfiles: MAZE_RUNTIME_PROFILES,
  danceMotifs: DANCE_RUNTIME_MOTIFS,
  danceGameplayProfiles: DANCE_GAMEPLAY_RUNTIME_PROFILES,
  paletteProfiles: PALETTE_RUNTIME_PROFILES,
} as const;
