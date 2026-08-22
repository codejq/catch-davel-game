import type { PlayableLevelId } from '../content/level-ids';
import { campaignLevel } from '../content/levels/catalog';
import { paletteRuntimeProfile, type RuntimeRgb } from '../content/runtime-manifests';
import { CELL_SIZE } from '../sim/constants';
import { cellAt, cellCenter, LEVEL_HEIGHT, LEVEL_WIDTH, wallCells, worldCell } from '../sim/level';

export interface EnvironmentBox {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly sizeX: number;
  readonly sizeY: number;
  readonly sizeZ: number;
  readonly color: RuntimeRgb;
  readonly emission: number;
}

export interface CampaignLandmarkLayout {
  readonly motif: LandmarkMotif;
  readonly anchorCells: readonly { readonly column: number; readonly row: number }[];
  readonly boxes: readonly EnvironmentBox[];
}

export interface WallArtPlacement {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly facesX: boolean;
  readonly outwardSign: number;
  readonly imageIndex: number;
}

export type LandmarkMotif =
  | 'signal-prongs'
  | 'grinning-marquee'
  | 'coin-circuit'
  | 'wrong-way-arrows'
  | 'foreman-gantry'
  | 'conveyor-drums'
  | 'blackout-lamps'
  | 'shift-clock'
  | 'rush-stacks'
  | 'invoice-crown'
  | 'ticket-booth'
  | 'slider-canopy'
  | 'carousel-sign'
  | 'flame-marquee'
  | 'speaker-tent'
  | 'mirror-gallery'
  | 'prize-vault'
  | 'backtrack-arrows'
  | 'moonlit-marquee'
  | 'ringmaster-crown'
  | 'pipe-valves'
  | 'steam-canisters'
  | 'fiesta-braziers'
  | 'pressure-valves'
  | 'crimson-duel'
  | 'bomb-chandeliers'
  | 'drain-risers'
  | 'triple-key-totems'
  | 'fever-thermometers'
  | 'furnace-jaws'
  | 'ice-crystals'
  | 'ice-skate-arches'
  | 'violet-shield-pylons'
  | 'crystal-glass-crossroads'
  | 'zero-degree-scoreboards'
  | 'refrigerator-crown';

const LANDMARK_MOTIFS: Readonly<Record<PlayableLevelId, LandmarkMotif>> = {
  'level-001': 'signal-prongs',
  'level-002': 'grinning-marquee',
  'level-003': 'coin-circuit',
  'level-004': 'wrong-way-arrows',
  'level-005': 'foreman-gantry',
  'level-006': 'conveyor-drums',
  'level-007': 'blackout-lamps',
  'level-008': 'shift-clock',
  'level-009': 'rush-stacks',
  'level-010': 'invoice-crown',
  'level-011': 'ticket-booth',
  'level-012': 'slider-canopy',
  'level-013': 'carousel-sign',
  'level-014': 'flame-marquee',
  'level-015': 'speaker-tent',
  'level-016': 'mirror-gallery',
  'level-017': 'prize-vault',
  'level-018': 'backtrack-arrows',
  'level-019': 'moonlit-marquee',
  'level-020': 'ringmaster-crown',
  'level-021': 'pipe-valves',
  'level-022': 'steam-canisters',
  'level-023': 'fiesta-braziers',
  'level-024': 'pressure-valves',
  'level-025': 'crimson-duel',
  'level-026': 'bomb-chandeliers',
  'level-027': 'drain-risers',
  'level-028': 'triple-key-totems',
  'level-029': 'fever-thermometers',
  'level-030': 'furnace-jaws',
  'level-031': 'ice-crystals',
  'level-032': 'ice-skate-arches',
  'level-033': 'violet-shield-pylons',
  'level-034': 'crystal-glass-crossroads',
  'level-035': 'zero-degree-scoreboards',
  'level-036': 'refrigerator-crown',
};

const LANDMARKS_PER_LEVEL = 5;
const CARDINAL_OFFSETS = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;
export const MAX_CAMPAIGN_LANDMARK_BOXES = 72;
export const MAX_EXIT_BEACON_BOXES = 13;
export const WALL_ART_IMAGE_COUNT = 57;

function box(
  x: number, y: number, z: number,
  sizeX: number, sizeY: number, sizeZ: number,
  color: RuntimeRgb,
  emission = 0,
): EnvironmentBox {
  return { x, y, z, sizeX, sizeY, sizeZ, color, emission };
}

function selectVisibleWallAnchors(levelId: PlayableLevelId): readonly { column: number; row: number }[] {
  const candidates = wallCells(levelId).filter(({ column, row }) => {
    if (column === 0 || row === 0 || column === LEVEL_WIDTH - 1 || row === LEVEL_HEIGHT - 1) return false;
    const visibleSides = CARDINAL_OFFSETS.filter(
      ([columnOffset, rowOffset]) => cellAt(column + columnOffset, row + rowOffset, levelId) !== '#',
    ).length;
    return visibleSides >= 2;
  });
  if (candidates.length < LANDMARKS_PER_LEVEL) throw new Error(`Level ${levelId} has too few visible landmark anchors`);
  const levelNumber = campaignLevel(levelId).number;
  const selected: { column: number; row: number }[] = [];
  for (let index = 0; index < LANDMARKS_PER_LEVEL; index += 1) {
    const target = Math.floor(((index + 0.5) * candidates.length) / LANDMARKS_PER_LEVEL);
    selected.push(candidates[(target + levelNumber * 3) % candidates.length]!);
  }
  return selected;
}

function pictureFrameBoxes(
  levelId: PlayableLevelId,
  anchor: { readonly column: number; readonly row: number },
  primary: RuntimeRgb,
  accent: RuntimeRgb,
  variation: number,
): readonly EnvironmentBox[] {
  const center = cellCenter(anchor.column, anchor.row);
  const openSide = CARDINAL_OFFSETS.find(
    ([columnOffset, rowOffset]) => cellAt(anchor.column + columnOffset, anchor.row + rowOffset, levelId) !== '#',
  );
  if (openSide === undefined) return [];
  const [columnOffset, rowOffset] = openSide;
  const faceX = center.x + columnOffset * (CELL_SIZE * 0.5 + 0.07);
  const faceZ = center.z + rowOffset * (CELL_SIZE * 0.5 + 0.07);
  const facesX = columnOffset !== 0;
  const frame: RuntimeRgb = variation % 2 === 0 ? [0.13, 0.08, 0.05] : [0.72, 0.48, 0.16];
  const width = (value: number): readonly [number, number] => facesX ? [0.12, value] : [value, 0.12];
  const offset = (across: number, outward = 0): readonly [number, number] => facesX
    ? [columnOffset * outward, across]
    : [across, rowOffset * outward];
  const make = (across: number, y: number, wide: number, high: number, depth: number, color: RuntimeRgb, emission = 0) => {
    const [offsetX, offsetZ] = offset(across, depth);
    const [sizeX, sizeZ] = width(wide);
    return box(faceX + offsetX, y, faceZ + offsetZ, sizeX, high, sizeZ, color, emission);
  };
  return [
    make(0, 1.55, 1.3, 2.12, 0, [0.025, 0.025, 0.03]),
    make(-0.74, 1.55, 0.16, 2.4, 0.04, frame),
    make(0.74, 1.55, 0.16, 2.4, 0.04, frame),
    make(0, 0.28, 1.64, 0.16, 0.04, frame),
    make(0, 2.82, 1.64, 0.16, 0.04, frame),
  ];
}

export function wallArtPlacements(levelId: PlayableLevelId): readonly WallArtPlacement[] {
  const levelNumber = campaignLevel(levelId).number;
  return selectVisibleWallAnchors(levelId).map((anchor, index) => {
    const center = cellCenter(anchor.column, anchor.row);
    const [columnOffset, rowOffset] = CARDINAL_OFFSETS.find(
      ([columnStep, rowStep]) => cellAt(anchor.column + columnStep, anchor.row + rowStep, levelId) !== '#',
    )!;
    return {
      x: center.x + columnOffset * (CELL_SIZE * 0.5 + 0.145),
      y: 1.55,
      z: center.z + rowOffset * (CELL_SIZE * 0.5 + 0.145),
      facesX: columnOffset !== 0,
      outwardSign: columnOffset || rowOffset,
      imageIndex: (((levelNumber - 1) * LANDMARKS_PER_LEVEL + index) * 23) % WALL_ART_IMAGE_COUNT,
    };
  });
}

function motifBoxes(
  motif: LandmarkMotif,
  anchorX: number,
  anchorZ: number,
  primary: RuntimeRgb,
  accent: RuntimeRgb,
  variation: number,
): readonly EnvironmentBox[] {
  const y = 3.2;
  const shift = (variation - 1) * 0.12;
  switch (motif) {
    case 'signal-prongs':
      return [
        box(anchorX, y + 0.6, anchorZ, 0.18, 1.2, 0.18, primary),
        box(anchorX - 0.48, y + 1.05, anchorZ, 0.18, 0.72, 0.18, accent),
        box(anchorX + 0.48, y + 1.05, anchorZ, 0.18, 0.72, 0.18, accent),
        box(anchorX, y + 1.38, anchorZ, 1.14, 0.14, 0.18, primary),
      ];
    case 'grinning-marquee':
      return [
        box(anchorX - 0.5, y + 0.72, anchorZ, 0.3, 0.3, 0.22, accent),
        box(anchorX + 0.5, y + 0.72, anchorZ, 0.3, 0.3, 0.22, accent),
        box(anchorX, y + 0.3, anchorZ, 1.35, 0.16, 0.22, primary),
        box(anchorX - 0.5, y + 0.43, anchorZ, 0.16, 0.35, 0.22, primary),
        box(anchorX + 0.5, y + 0.43, anchorZ, 0.16, 0.35, 0.22, primary),
      ];
    case 'coin-circuit':
      return [0, 1, 2, 3].map((step) => box(
        anchorX - 0.72 + step * 0.48,
        y + 0.2 + step % 2 * 0.32,
        anchorZ,
        0.3, 0.3 + step % 2 * 0.42, 0.22,
        step % 2 === 0 ? primary : accent,
      ));
    case 'wrong-way-arrows':
      return [
        box(anchorX - 0.38, y + 0.35, anchorZ, 0.9, 0.16, 0.22, primary),
        box(anchorX + 0.2, y + 0.65, anchorZ, 0.16, 0.72, 0.22, primary),
        box(anchorX + 0.58, y + 0.95, anchorZ, 0.58, 0.16, 0.22, accent),
        box(anchorX + 0.78, y + 1.15, anchorZ, 0.16, 0.55, 0.22, accent),
      ];
    case 'foreman-gantry':
      return [
        box(anchorX - 0.7, y + 0.62, anchorZ, 0.2, 1.25, 0.24, primary),
        box(anchorX + 0.7, y + 0.62, anchorZ, 0.2, 1.25, 0.24, primary),
        box(anchorX, y + 1.2, anchorZ, 1.6, 0.18, 0.28, accent),
        box(anchorX + shift, y + 0.92, anchorZ, 0.18, 0.5, 0.2, accent),
      ];
    case 'conveyor-drums':
      return [-0.72, -0.24, 0.24, 0.72].map((offset, index) => box(
        anchorX + offset, y + 0.38 + (index % 2) * 0.28, anchorZ,
        0.3, 0.72, 0.3, index % 2 === 0 ? primary : accent,
      ));
    case 'blackout-lamps':
      return [
        box(anchorX - 0.62, y + 0.58, anchorZ, 0.14, 1.16, 0.14, primary),
        box(anchorX + 0.62, y + 0.58, anchorZ, 0.14, 1.16, 0.14, primary),
        box(anchorX - 0.62, y + 1.18, anchorZ, 0.52, 0.18, 0.46, accent),
        box(anchorX + 0.62, y + 1.18, anchorZ, 0.52, 0.18, 0.46, accent),
      ];
    case 'shift-clock':
      return [
        box(anchorX, y + 0.7, anchorZ, 1.25, 1.25, 0.2, primary),
        box(anchorX, y + 0.7, anchorZ - 0.12, 0.12, 0.92, 0.12, accent),
        box(anchorX + 0.28, y + 0.7, anchorZ - 0.12, 0.62, 0.12, 0.12, accent),
      ];
    case 'rush-stacks':
      return [-0.62, 0, 0.62].flatMap((offset, index) => [
        box(anchorX + offset, y + 0.35 + index * 0.16, anchorZ, 0.34, 0.7 + index * 0.32, 0.34, primary),
        box(anchorX + offset, y + 0.78 + index * 0.32, anchorZ, 0.52, 0.14, 0.52, accent),
      ]);
    case 'invoice-crown':
      return [
        box(anchorX, y + 0.3, anchorZ, 1.7, 0.34, 0.28, primary),
        box(anchorX - 0.65, y + 0.82, anchorZ, 0.22, 1.05, 0.24, accent),
        box(anchorX, y + 1.02, anchorZ, 0.24, 1.45, 0.24, accent),
        box(anchorX + 0.65, y + 0.82, anchorZ, 0.22, 1.05, 0.24, accent),
      ];
    case 'ticket-booth':
      return [
        box(anchorX - 0.68, y + 0.62, anchorZ, 0.18, 1.25, 0.24, primary, 0.22),
        box(anchorX + 0.68, y + 0.62, anchorZ, 0.18, 1.25, 0.24, primary, 0.22),
        box(anchorX, y + 1.2, anchorZ, 1.55, 0.2, 0.28, accent, 0.42),
        box(anchorX, y + 0.62, anchorZ, 0.62, 0.42, 0.24, primary, 0.18),
        box(anchorX + shift, y + 0.62, anchorZ - 0.14, 0.18, 0.72, 0.12, accent, 0.55),
      ];
    case 'slider-canopy':
      return [
        box(anchorX - 0.72, y + 0.58, anchorZ, 0.18, 1.18, 0.24, primary, 0.2),
        box(anchorX + 0.72, y + 0.58, anchorZ, 0.18, 1.18, 0.24, accent, 0.2),
        box(anchorX - 0.48, y + 1.18, anchorZ, 0.48, 0.18, 0.32, primary, 0.42),
        box(anchorX, y + 1.18, anchorZ, 0.48, 0.18, 0.32, accent, 0.42),
        box(anchorX + 0.48, y + 1.18, anchorZ, 0.48, 0.18, 0.32, primary, 0.42),
        box(anchorX + shift, y + 0.28, anchorZ - 0.14, 1.05, 0.12, 0.18, accent, 0.55),
      ];
    case 'carousel-sign':
      return [
        box(anchorX, y + 0.72, anchorZ, 1.45, 1.45, 0.18, primary, 0.28),
        box(anchorX, y + 0.72, anchorZ - 0.12, 0.18, 1.05, 0.12, accent, 0.65),
        box(anchorX, y + 0.72, anchorZ - 0.12, 1.05, 0.18, 0.12, accent, 0.65),
        box(anchorX - 0.58, y + 1.3, anchorZ, 0.22, 0.46, 0.22, accent, 0.5),
        box(anchorX + 0.58, y + 1.3, anchorZ, 0.22, 0.46, 0.22, accent, 0.5),
      ];
    case 'flame-marquee':
      return [
        box(anchorX, y + 0.32, anchorZ, 1.55, 0.22, 0.28, primary, 0.45),
        box(anchorX - 0.58, y + 0.82, anchorZ, 0.24, 1.0, 0.24, accent, 0.65),
        box(anchorX, y + 0.98, anchorZ, 0.3, 1.34, 0.26, primary, 0.72),
        box(anchorX + 0.58, y + 0.82, anchorZ, 0.24, 1.0, 0.24, accent, 0.65),
        box(anchorX + shift, y + 1.62, anchorZ, 0.82, 0.18, 0.24, accent, 0.78),
      ];
    case 'speaker-tent':
      return [
        box(anchorX - 0.62, y + 0.62, anchorZ, 0.5, 1.25, 0.3, primary, 0.38),
        box(anchorX + 0.62, y + 0.62, anchorZ, 0.5, 1.25, 0.3, primary, 0.38),
        box(anchorX - 0.62, y + 0.82, anchorZ - 0.18, 0.24, 0.24, 0.16, accent, 0.82),
        box(anchorX + 0.62, y + 0.82, anchorZ - 0.18, 0.24, 0.24, 0.16, accent, 0.82),
        box(anchorX, y + 1.42, anchorZ, 1.62, 0.18, 0.28, accent, 0.62),
      ];
    case 'mirror-gallery':
      return [
        box(anchorX, y + 0.84, anchorZ, 1.5, 1.55, 0.14, primary, 0.48),
        box(anchorX - 0.78, y + 0.84, anchorZ - 0.05, 0.16, 1.7, 0.2, accent, 0.74),
        box(anchorX + 0.78, y + 0.84, anchorZ - 0.05, 0.16, 1.7, 0.2, accent, 0.74),
        box(anchorX, y + 1.68, anchorZ - 0.05, 1.72, 0.16, 0.2, accent, 0.82),
        box(anchorX - 0.4 + shift, y + 0.92, anchorZ - 0.14, 0.18, 0.18, 0.1, accent, 0.9),
        box(anchorX + 0.4 + shift, y + 0.92, anchorZ - 0.14, 0.18, 0.18, 0.1, accent, 0.9),
      ];
    case 'prize-vault':
      return [
        box(anchorX, y + 0.58, anchorZ, 1.55, 1.12, 0.28, primary, 0.34),
        box(anchorX, y + 0.58, anchorZ - 0.18, 0.9, 0.72, 0.1, accent, 0.7),
        box(anchorX, y + 0.58, anchorZ - 0.26, 0.18, 0.18, 0.08, primary, 0.9),
        box(anchorX - 0.48, y + 1.32, anchorZ, 0.34, 0.34, 0.2, accent, 0.82),
        box(anchorX + shift, y + 1.55, anchorZ, 0.34, 0.34, 0.2, accent, 0.82),
        box(anchorX + 0.48, y + 1.32, anchorZ, 0.34, 0.34, 0.2, accent, 0.82),
      ];
    case 'backtrack-arrows':
      return [
        box(anchorX, y + 0.7, anchorZ, 1.62, 1.34, 0.18, primary, 0.3),
        box(anchorX - 0.35, y + 0.82, anchorZ - 0.14, 0.72, 0.16, 0.12, accent, 0.82),
        box(anchorX - 0.65, y + 1.02, anchorZ - 0.14, 0.16, 0.54, 0.12, accent, 0.82),
        box(anchorX + 0.35, y + 0.54, anchorZ - 0.14, 0.72, 0.16, 0.12, accent, 0.82),
        box(anchorX + 0.65 + shift, y + 0.34, anchorZ - 0.14, 0.16, 0.54, 0.12, accent, 0.82),
      ];
    case 'moonlit-marquee':
      return [
        box(anchorX, y + 0.78, anchorZ, 1.55, 1.5, 0.18, primary, 0.36),
        box(anchorX + 0.28 + shift, y + 0.88, anchorZ - 0.13, 0.98, 1.08, 0.12, accent, 0.78),
        box(anchorX + 0.52 + shift, y + 0.88, anchorZ - 0.2, 0.7, 0.82, 0.08, primary, 0.88),
        box(anchorX - 0.62, y + 1.48, anchorZ - 0.16, 0.16, 0.16, 0.1, accent, 0.95),
        box(anchorX + 0.7, y + 1.35, anchorZ - 0.16, 0.12, 0.12, 0.1, accent, 0.95),
        box(anchorX - 0.72, y + 0.38, anchorZ - 0.16, 0.12, 0.12, 0.1, accent, 0.95),
      ];
    case 'ringmaster-crown':
      return [
        box(anchorX, y + 0.38, anchorZ, 1.7, 0.54, 0.24, primary, 0.42),
        box(anchorX - 0.62, y + 1.02, anchorZ, 0.28, 1.18, 0.22, accent, 0.84),
        box(anchorX, y + 1.25, anchorZ, 0.3, 1.64, 0.22, accent, 0.92),
        box(anchorX + 0.62, y + 1.02, anchorZ, 0.28, 1.18, 0.22, accent, 0.84),
        box(anchorX - 0.31 + shift, y + 0.72, anchorZ - 0.16, 0.18, 0.18, 0.1, primary, 0.96),
        box(anchorX + 0.31 + shift, y + 0.72, anchorZ - 0.16, 0.18, 0.18, 0.1, primary, 0.96),
      ];
    case 'pipe-valves':
      return [
        box(anchorX - 0.58, y + 0.68, anchorZ, 0.28, 1.36, 0.28, primary, 0.38),
        box(anchorX + 0.58, y + 0.68, anchorZ, 0.28, 1.36, 0.28, primary, 0.38),
        box(anchorX, y + 1.22, anchorZ, 1.42, 0.24, 0.32, accent, 0.65),
        box(anchorX, y + 0.66, anchorZ - 0.18, 0.84, 0.84, 0.14, accent, 0.86),
        box(anchorX, y + 0.66, anchorZ - 0.28, 0.16, 1.08, 0.1, primary, 0.96),
        box(anchorX + shift, y + 0.66, anchorZ - 0.28, 1.08, 0.16, 0.1, primary, 0.96),
      ];
    case 'steam-canisters':
      return [
        box(anchorX - 0.54, y + 0.62, anchorZ, 0.46, 1.24, 0.46, primary, 0.42),
        box(anchorX + 0.54, y + 0.62, anchorZ, 0.46, 1.24, 0.46, primary, 0.42),
        box(anchorX - 0.54, y + 1.3, anchorZ, 0.64, 0.14, 0.64, accent, 0.76),
        box(anchorX + 0.54, y + 1.3, anchorZ, 0.64, 0.14, 0.64, accent, 0.76),
        box(anchorX + shift, y + 1.62, anchorZ, 1.36, 0.18, 0.24, accent, 0.9),
      ];
    case 'fiesta-braziers':
      return [
        box(anchorX - 0.62, y + 0.42, anchorZ, 0.42, 0.84, 0.42, primary, 0.4),
        box(anchorX + 0.62, y + 0.42, anchorZ, 0.42, 0.84, 0.42, primary, 0.4),
        box(anchorX - 0.62, y + 1.08, anchorZ, 0.72, 0.48, 0.58, accent, 0.9),
        box(anchorX + 0.62, y + 1.08, anchorZ, 0.72, 0.48, 0.58, accent, 0.9),
        box(anchorX + shift, y + 1.52, anchorZ, 1.54, 0.18, 0.24, primary, 0.84),
      ];
    case 'pressure-valves':
      return [
        box(anchorX, y + 0.66, anchorZ, 0.86, 1.32, 0.38, primary, 0.48),
        box(anchorX, y + 1.46, anchorZ, 1.36, 0.18, 0.22, accent, 0.88),
        box(anchorX - 0.5, y + 1.46, anchorZ, 0.18, 0.68, 0.18, accent, 0.9),
        box(anchorX + 0.5, y + 1.46, anchorZ, 0.18, 0.68, 0.18, accent, 0.9),
        box(anchorX + shift, y + 1.46, anchorZ, 1.14, 0.18, 0.18, accent, 0.92),
      ];
    case 'crimson-duel':
      return [
        box(anchorX - 0.44, y + 0.84, anchorZ, 0.18, 1.68, 0.18, primary, 0.78),
        box(anchorX + 0.44, y + 0.84, anchorZ, 0.18, 1.68, 0.18, primary, 0.78),
        box(anchorX, y + 1.42, anchorZ, 1.46, 0.16, 0.2, accent, 0.92),
        box(anchorX - 0.28, y + 1.78, anchorZ, 0.92, 0.14, 0.16, accent, 0.96),
        box(anchorX + 0.28 + shift, y + 1.78, anchorZ, 0.92, 0.14, 0.16, accent, 0.96),
      ];
    case 'bomb-chandeliers':
      return [
        box(anchorX, y + 1.62, anchorZ, 1.42, 0.16, 0.18, primary, 0.9),
        box(anchorX - 0.54, y + 1.18, anchorZ, 0.18, 0.86, 0.18, accent, 0.82),
        box(anchorX + 0.54, y + 1.18, anchorZ, 0.18, 0.86, 0.18, accent, 0.82),
        box(anchorX - 0.54, y + 0.72, anchorZ, 0.58, 0.58, 0.58, primary, 0.66),
        box(anchorX + 0.54 + shift, y + 0.72, anchorZ, 0.58, 0.58, 0.58, primary, 0.66),
      ];
    case 'drain-risers':
      return [
        box(anchorX - 0.58, y + 0.5, anchorZ, 0.32, 1, 0.32, primary, 0.68),
        box(anchorX, y + 0.9, anchorZ, 0.32, 1.8, 0.32, accent, 0.82),
        box(anchorX + 0.58, y + 1.3, anchorZ, 0.32, 2.6, 0.32, primary, 0.9),
        box(anchorX + shift, y + 1.68, anchorZ, 1.52, 0.14, 0.18, accent, 0.94),
      ];
    case 'triple-key-totems':
      return [
        box(anchorX - 0.58, y + 0.72, anchorZ, 0.28, 1.44, 0.28, primary, 0.7),
        box(anchorX, y + 1.02, anchorZ, 0.28, 2.04, 0.28, accent, 0.84),
        box(anchorX + 0.58, y + 0.72, anchorZ, 0.28, 1.44, 0.28, primary, 0.7),
        box(anchorX - 0.58, y + 1.48, anchorZ, 0.56, 0.28, 0.18, accent, 0.92),
        box(anchorX + shift, y + 2.08, anchorZ, 0.56, 0.28, 0.18, primary, 0.96),
        box(anchorX + 0.58, y + 1.48, anchorZ, 0.56, 0.28, 0.18, accent, 0.92),
      ];
    case 'fever-thermometers':
      return [
        box(anchorX - 0.46, y + 0.82, anchorZ, 0.22, 1.64, 0.22, primary, 0.72),
        box(anchorX + 0.46, y + 0.82, anchorZ, 0.22, 1.64, 0.22, accent, 0.78),
        box(anchorX - 0.46, y + 0.18, anchorZ, 0.48, 0.48, 0.28, accent, 0.9),
        box(anchorX + 0.46 + shift, y + 0.18, anchorZ, 0.48, 0.48, 0.28, primary, 0.92),
        box(anchorX, y + 1.72, anchorZ, 1.42, 0.16, 0.18, accent, 0.96),
      ];
    case 'furnace-jaws':
      return [
        box(anchorX, y + 0.8, anchorZ, 1.64, 1.36, 0.3, primary, 0.68),
        box(anchorX - 0.56, y + 1.62, anchorZ, 0.26, 0.72, 0.24, accent, 0.94),
        box(anchorX, y + 1.74, anchorZ, 0.26, 0.84, 0.24, accent, 0.98),
        box(anchorX + 0.56, y + 1.62, anchorZ, 0.26, 0.72, 0.24, accent, 0.94),
        box(anchorX - 0.42, y + 0.2, anchorZ, 0.34, 0.56, 0.3, accent, 0.88),
        box(anchorX + 0.42 + shift, y + 0.2, anchorZ, 0.34, 0.56, 0.3, accent, 0.88),
      ];
    case 'ice-crystals':
      return [
        box(anchorX - 0.5, y + 0.66, anchorZ, 0.3, 1.32, 0.3, primary, 0.76),
        box(anchorX, y + 1.08, anchorZ, 0.34, 2.16, 0.34, accent, 0.92),
        box(anchorX + 0.5, y + 0.76, anchorZ, 0.28, 1.52, 0.28, primary, 0.82),
        box(anchorX - 0.3, y + 1.36, anchorZ, 0.72, 0.2, 0.22, accent, 0.9),
        box(anchorX + 0.32 + shift, y + 1.76, anchorZ, 0.76, 0.18, 0.2, primary, 0.96),
      ];
    case 'ice-skate-arches':
      return [
        box(anchorX - 0.72, y + 0.94, anchorZ, 0.24, 1.88, 0.28, primary, 0.78),
        box(anchorX + 0.72, y + 0.94, anchorZ, 0.24, 1.88, 0.28, primary, 0.78),
        box(anchorX + shift, y + 1.82, anchorZ, 1.68, 0.24, 0.3, accent, 0.94),
        box(anchorX - 0.36, y + 0.26, anchorZ, 0.72, 0.18, 0.36, accent, 0.88),
        box(anchorX + 0.36, y + 0.38, anchorZ, 0.72, 0.18, 0.36, primary, 0.9),
      ];
    case 'violet-shield-pylons':
      return [
        box(anchorX - 0.72, y + 0.9, anchorZ, 0.26, 1.8, 0.3, primary, 0.76),
        box(anchorX + 0.72, y + 0.9, anchorZ, 0.26, 1.8, 0.3, primary, 0.76),
        box(anchorX, y + 1.64, anchorZ, 1.5, 0.24, 0.28, accent, 0.94),
        box(anchorX - 0.44, y + 0.86, anchorZ, 0.12, 0.88, 0.34, accent, 0.9),
        box(anchorX + 0.44 + shift, y + 0.86, anchorZ, 0.12, 0.88, 0.34, accent, 0.9),
        box(anchorX, y + 0.86, anchorZ, 0.86, 0.12, 0.36, primary, 0.96),
      ];
    case 'crystal-glass-crossroads':
      return [
        box(anchorX - 0.62, y + 0.92, anchorZ, 0.12, 1.84, 0.72, primary, 0.9),
        box(anchorX + 0.62, y + 0.92, anchorZ, 0.12, 1.84, 0.72, accent, 0.9),
        box(anchorX, y + 1.78, anchorZ, 1.36, 0.12, 0.72, primary, 0.98),
        box(anchorX + shift, y + 0.92, anchorZ, 0.82, 0.08, 0.76, accent, 0.72),
        box(anchorX, y + 0.44, anchorZ, 1.46, 0.08, 0.18, primary, 0.94),
        box(anchorX, y + 1.38, anchorZ, 1.46, 0.08, 0.18, accent, 0.94),
      ];
    case 'zero-degree-scoreboards':
      return [
        box(anchorX, y + 0.82, anchorZ, 1.68, 1.5, 0.24, primary, 0.72),
        box(anchorX, y + 0.88, anchorZ - 0.16, 1.18, 0.86, 0.1, accent, 0.94),
        box(anchorX - 0.34, y + 0.88, anchorZ - 0.24, 0.16, 0.62, 0.08, primary, 0.98),
        box(anchorX + 0.34 + shift, y + 0.88, anchorZ - 0.24, 0.16, 0.62, 0.08, primary, 0.98),
        box(anchorX, y + 1.74, anchorZ, 1.82, 0.18, 0.28, accent, 0.9),
        box(anchorX, y + 0.18, anchorZ, 1.32, 0.2, 0.42, primary, 0.84),
      ];
    case 'refrigerator-crown':
      return [
        box(anchorX, y + 0.94, anchorZ, 1.62, 1.88, 0.42, primary, 0.78),
        box(anchorX, y + 1.18, anchorZ - 0.25, 1.22, 0.12, 0.1, accent, 0.98),
        box(anchorX - 0.52, y + 2.08, anchorZ, 0.3, 0.54, 0.34, accent, 0.96),
        box(anchorX, y + 2.24, anchorZ, 0.3, 0.86, 0.34, primary, 0.98),
        box(anchorX + 0.52 + shift, y + 2.08, anchorZ, 0.3, 0.54, 0.34, accent, 0.96),
        box(anchorX + shift, y + 0.48, anchorZ - 0.28, 1.08, 0.1, 0.08, accent, 0.94),
      ];
  }
}

export function campaignLandmarkLayout(levelId: PlayableLevelId): CampaignLandmarkLayout {
  const level = campaignLevel(levelId);
  const palette = paletteRuntimeProfile(level.palette.presetId);
  const anchorCells = selectVisibleWallAnchors(levelId);
  const boxes = anchorCells.flatMap((anchor, index) => {
    const center = cellCenter(anchor.column, anchor.row);
    const primary = palette.walls[(level.number + index) % palette.walls.length]!;
    const accent = palette.walls[(level.number + index + 2) % palette.walls.length]!;
    return [...motifBoxes(
      LANDMARK_MOTIFS[levelId], center.x, center.z,
      primary,
      accent,
      index,
    ), ...pictureFrameBoxes(levelId, anchor, primary, accent, index)];
  });
  if (boxes.length > MAX_CAMPAIGN_LANDMARK_BOXES) throw new Error(`Level ${levelId} exceeds its landmark box cap`);
  return { motif: LANDMARK_MOTIFS[levelId], anchorCells, boxes };
}

function exitApproach(levelId: PlayableLevelId, x: number, z: number): readonly [number, number] {
  const exitCell = worldCell(x, z);
  for (const [columnOffset, rowOffset] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
    if (cellAt(exitCell.column + columnOffset, exitCell.row + rowOffset, levelId) !== '#') {
      return [columnOffset, rowOffset];
    }
  }
  throw new Error(`Level ${levelId} exit has no traversable approach`);
}

export function exitBeaconBoxes(
  levelId: PlayableLevelId,
  exit: { readonly x: number; readonly z: number },
  unlocked: boolean,
  tick: number,
  motionScale: number,
): readonly EnvironmentBox[] {
  const [approachColumn, approachRow] = exitApproach(levelId, exit.x, exit.z);
  const approachX = approachColumn * CELL_SIZE;
  const approachZ = approachRow * CELL_SIZE;
  const portal: RuntimeRgb = unlocked ? [0.12, 1, 0.42] : [0.22, 0.25, 0.32];
  const signal: RuntimeRgb = unlocked ? [0.72, 1, 0.8] : [1, 0.2, 0.24];
  const pulse = unlocked ? (0.08 + (Math.sin(tick * 0.1) + 1) * 0.06 * motionScale) : 0;
  const boxes: EnvironmentBox[] = [
    box(exit.x, 0.035, exit.z, 2.2, 0.07, 2.2, portal, unlocked ? 0.35 : 0.05),
    box(exit.x - 0.78, 1.3, exit.z, 0.26, 2.6, 0.32, portal, unlocked ? 0.35 : 0.05),
    box(exit.x + 0.78, 1.3, exit.z, 0.26, 2.6, 0.32, portal, unlocked ? 0.35 : 0.05),
    box(exit.x, 2.52, exit.z, 1.82, 0.24, 0.34, portal, unlocked ? 0.35 : 0.05),
    box(exit.x, 3.7, exit.z, 0.12 + pulse, 2.1, 0.12 + pulse, signal, unlocked ? 0.9 : 0.55),
    box(exit.x, 4.72, exit.z, 0.72 + pulse, 0.14, 0.72 + pulse, signal, unlocked ? 0.9 : 0.55),
  ];
  for (let index = 1; index <= 3; index += 1) {
    const distance = index * CELL_SIZE * 0.42;
    const stripeX = exit.x + approachX * distance / CELL_SIZE;
    const stripeZ = exit.z + approachZ * distance / CELL_SIZE;
    const alongX = approachColumn === 0 ? 1.1 : 0.12;
    const alongZ = approachRow === 0 ? 1.1 : 0.12;
    boxes.push(box(
      stripeX, 0.045, stripeZ, alongX, 0.09, alongZ, index === 1 ? signal : portal,
      unlocked ? (index === 1 ? 0.9 : 0.35) : 0.15,
    ));
  }
  if (!unlocked) {
    boxes.push(
      box(exit.x - 0.33, 1.25, exit.z - 0.03, 0.16, 2.0, 0.2, signal, 0.55),
      box(exit.x + 0.33, 1.25, exit.z - 0.03, 0.16, 2.0, 0.2, signal, 0.55),
    );
  } else {
    boxes.push(
      box(exit.x - 0.38, 1.25, exit.z - 0.03, 0.08, 1.75, 0.12, signal, 0.9),
      box(exit.x + 0.38, 1.25, exit.z - 0.03, 0.08, 1.75, 0.12, signal, 0.9),
      box(exit.x, 2.08, exit.z - 0.03, 0.84, 0.08, 0.12, signal, 0.9),
    );
  }
  if (boxes.length > MAX_EXIT_BEACON_BOXES) throw new Error('Exit beacon exceeds its box cap');
  return boxes;
}
