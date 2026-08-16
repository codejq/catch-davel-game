import { BOMB_BLAST_RADIUS } from '../sim/combat';
import { isWallAtWorld } from '../sim/level';
import type { Chapter01LevelId } from '../content/levels/chapter-01';

interface Point { readonly x: number; readonly y: number; readonly z: number }

export interface BombPreviewState {
  readonly id: number;
  readonly x: number;
  readonly z: number;
  readonly fuseTicks: number;
}

export interface BombPreviewSegment {
  readonly start: Point;
  readonly end: Point;
  readonly radius: number;
}

export function bombPreviewOccludedRadius(
  bomb: Pick<BombPreviewState, 'x' | 'z'>,
  angle: number,
  levelId: Chapter01LevelId,
): number {
  for (let distance = 0.15; distance <= BOMB_BLAST_RADIUS; distance += 0.15) {
    if (isWallAtWorld(
      bomb.x + Math.cos(angle) * distance,
      bomb.z + Math.sin(angle) * distance,
      levelId,
    )) return Math.max(0.3, distance - 0.18);
  }
  return BOMB_BLAST_RADIUS;
}

export function bombPreviewSegment(
  bomb: BombPreviewState,
  segmentIndex: number,
  segmentCount: number,
  motionScale: number,
  levelId?: Chapter01LevelId,
): BombPreviewSegment | null {
  if (segmentCount < 4 || segmentIndex < 0 || segmentIndex >= segmentCount) return null;
  const motion = Number.isFinite(motionScale) ? Math.max(0, Math.min(1, motionScale)) : 0;
  const urgency = 1 - Math.max(0, Math.min(90, bomb.fuseTicks)) / 90;
  const pulse = Math.sin(bomb.fuseTicks * 0.31) * 0.035 * motion * (0.35 + urgency * 0.65);
  const angle = segmentIndex / segmentCount * Math.PI * 2 + bomb.id * 0.071;
  const halfArc = Math.PI / segmentCount * 0.58;
  const startAngle = angle - halfArc;
  const endAngle = angle + halfArc;
  const radiusScale = 0.965 + pulse;
  const ringRadius = (levelId === undefined
    ? BOMB_BLAST_RADIUS : bombPreviewOccludedRadius(bomb, angle, levelId)) * radiusScale;
  return {
    start: {
      x: bomb.x + Math.cos(startAngle) * ringRadius,
      y: 0.055,
      z: bomb.z + Math.sin(startAngle) * ringRadius,
    },
    end: {
      x: bomb.x + Math.cos(endAngle) * ringRadius,
      y: 0.055,
      z: bomb.z + Math.sin(endAngle) * ringRadius,
    },
    radius: 0.032 + urgency * 0.018,
  };
}
