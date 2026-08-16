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
  | 'backtrack-arrows';

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
};

const LANDMARKS_PER_LEVEL = 3;
const CARDINAL_OFFSETS = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;
export const MAX_CAMPAIGN_LANDMARK_BOXES = 18;
export const MAX_EXIT_BEACON_BOXES = 13;

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
  }
}

export function campaignLandmarkLayout(levelId: PlayableLevelId): CampaignLandmarkLayout {
  const level = campaignLevel(levelId);
  const palette = paletteRuntimeProfile(level.palette.presetId);
  const anchorCells = selectVisibleWallAnchors(levelId);
  const boxes = anchorCells.flatMap((anchor, index) => {
    const center = cellCenter(anchor.column, anchor.row);
    return motifBoxes(
      LANDMARK_MOTIFS[levelId], center.x, center.z,
      palette.walls[(level.number + index) % palette.walls.length]!,
      palette.walls[(level.number + index + 2) % palette.walls.length]!,
      index,
    );
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
