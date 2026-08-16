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
  | 'flame-fandango' | 'tempo-twist' | 'mirror-lindy';

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
