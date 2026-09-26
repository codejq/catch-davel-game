export type Rgb = readonly [number, number, number];

export type TreeKind = 'pine' | 'oak' | 'birch' | 'palm' | 'cactus' | 'snow-pine' | 'dead';
export type BuildingStyle = 'village' | 'adobe' | 'bunker';

export interface WorldTheme {
  readonly id: string;
  readonly name: string;
  readonly tagline: string;
  readonly seed: string;
  readonly size: number;
  readonly hills: number;
  readonly mountainRim: number;
  readonly waterLevel: number | null;
  readonly ground: { readonly low: Rgb; readonly mid: Rgb; readonly high: Rgb; readonly slope: Rgb; readonly path: Rgb };
  readonly sun: { readonly elevation: number; readonly azimuth: number; readonly color: Rgb; readonly intensity: number };
  readonly sky: { readonly turbidity: number; readonly rayleigh: number; readonly ambient: Rgb; readonly groundAmbient: Rgb };
  readonly fog: { readonly color: Rgb; readonly density: number };
  readonly trees: readonly TreeKind[];
  readonly treeCount: number;
  readonly bushCount: number;
  readonly grassDensity: number;
  readonly grassColor: Rgb;
  readonly rockCount: number;
  readonly buildingStyle: BuildingStyle;
  readonly buildingCount: number;
  readonly sentries: number;
  readonly snow: boolean;
}

export const WORLDS: readonly WorldTheme[] = [
  {
    id: 'green-valley', name: 'Green Valley', tagline: 'A quiet farming village. The robots took it last night.',
    seed: 'green-valley-v1', size: 360, hills: 14, mountainRim: 55, waterLevel: 1.2,
    ground: { low: [0.29, 0.36, 0.16], mid: [0.33, 0.42, 0.18], high: [0.4, 0.42, 0.26], slope: [0.36, 0.33, 0.28], path: [0.42, 0.36, 0.27] },
    sun: { elevation: 38, azimuth: 205, color: [1, 0.95, 0.86], intensity: 3.2 },
    sky: { turbidity: 6, rayleigh: 1.4, ambient: [0.6, 0.72, 0.95], groundAmbient: [0.32, 0.3, 0.22] },
    fog: { color: [0.72, 0.8, 0.9], density: 0.0038 },
    trees: ['oak', 'pine', 'birch', 'oak'], treeCount: 900, bushCount: 520, grassDensity: 1, grassColor: [0.34, 0.46, 0.17],
    rockCount: 120, buildingStyle: 'village', buildingCount: 9, sentries: 7, snow: false,
  },
  {
    id: 'dust-ridge', name: 'Dust Ridge', tagline: 'A desert outpost baking under a hard sun.',
    seed: 'dust-ridge-v1', size: 380, hills: 22, mountainRim: 70, waterLevel: null,
    ground: { low: [0.72, 0.58, 0.4], mid: [0.76, 0.62, 0.43], high: [0.66, 0.5, 0.36], slope: [0.58, 0.42, 0.31], path: [0.62, 0.52, 0.4] },
    sun: { elevation: 55, azimuth: 160, color: [1, 0.93, 0.8], intensity: 3.8 },
    sky: { turbidity: 9, rayleigh: 1.1, ambient: [0.72, 0.74, 0.86], groundAmbient: [0.55, 0.44, 0.32] },
    fog: { color: [0.86, 0.8, 0.7], density: 0.003 },
    trees: ['palm', 'cactus', 'dead', 'cactus'], treeCount: 260, bushCount: 260, grassDensity: 0.18, grassColor: [0.62, 0.56, 0.3],
    rockCount: 320, buildingStyle: 'adobe', buildingCount: 10, sentries: 9, snow: false,
  },
  {
    id: 'frost-pass', name: 'Frost Pass', tagline: 'A mountain base in the snow. The robots guard the last portal.',
    seed: 'frost-pass-v1', size: 380, hills: 26, mountainRim: 90, waterLevel: null,
    ground: { low: [0.86, 0.89, 0.93], mid: [0.9, 0.92, 0.95], high: [0.95, 0.96, 0.98], slope: [0.44, 0.44, 0.46], path: [0.62, 0.62, 0.64] },
    sun: { elevation: 22, azimuth: 230, color: [1, 0.9, 0.82], intensity: 2.6 },
    sky: { turbidity: 3, rayleigh: 2.4, ambient: [0.62, 0.7, 0.9], groundAmbient: [0.7, 0.72, 0.78] },
    fog: { color: [0.8, 0.84, 0.9], density: 0.0065 },
    trees: ['snow-pine', 'snow-pine', 'pine', 'dead'], treeCount: 820, bushCount: 200, grassDensity: 0, grassColor: [0.5, 0.52, 0.4],
    rockCount: 220, buildingStyle: 'bunker', buildingCount: 8, sentries: 11, snow: true,
  },
];
