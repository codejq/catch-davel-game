import { describe, expect, it } from 'vitest';
import { BOMB_BLAST_RADIUS } from '../src/sim/combat';
import { bombPreviewOccludedRadius, bombPreviewSegment } from '../src/render/bomb-preview';
import { createPlayer } from '../src/sim/player';

describe('bounded raw-WebGL2 bomb blast preview', () => {
  const bomb = { id: 3, x: 4, z: -2, fuseTicks: 60 };

  it('draws deterministic finite dashed segments at the authoritative blast radius', () => {
    const segment = bombPreviewSegment(bomb, 2, 8, 1)!;
    expect(segment).toEqual(bombPreviewSegment(bomb, 2, 8, 1));
    expect(Object.values(segment.start).every(Number.isFinite)).toBe(true);
    expect(Object.values(segment.end).every(Number.isFinite)).toBe(true);
    const startRadius = Math.hypot(segment.start.x - bomb.x, segment.start.z - bomb.z);
    expect(startRadius).toBeGreaterThan(BOMB_BLAST_RADIUS * 0.92);
    expect(startRadius).toBeLessThan(BOMB_BLAST_RADIUS * 1.02);
  });

  it('keeps the complete radius stable while removing fuse pulsing at zero motion', () => {
    const early = bombPreviewSegment({ ...bomb, fuseTicks: 70 }, 1, 6, 0)!;
    const urgent = bombPreviewSegment({ ...bomb, fuseTicks: 10 }, 1, 6, 0)!;
    expect(Math.hypot(early.start.x - bomb.x, early.start.z - bomb.z))
      .toBeCloseTo(Math.hypot(urgent.start.x - bomb.x, urgent.start.z - bomb.z));
    expect(urgent.radius).toBeGreaterThan(early.radius);
  });

  it('rejects invalid segment requests', () => {
    expect(bombPreviewSegment(bomb, -1, 8, 1)).toBeNull();
    expect(bombPreviewSegment(bomb, 8, 8, 1)).toBeNull();
    expect(bombPreviewSegment(bomb, 0, 3, 1)).toBeNull();
  });

  it('contracts sectors to the real wall-occluded line-of-effect boundary', () => {
    const player = createPlayer();
    const radii = Array.from({ length: 24 }, (_, index) => (
      bombPreviewOccludedRadius(player, index / 24 * Math.PI * 2, 'level-001')
    ));
    expect(Math.min(...radii)).toBeLessThan(BOMB_BLAST_RADIUS);
    expect(Math.max(...radii)).toBeLessThanOrEqual(BOMB_BLAST_RADIUS);
    expect(Math.min(...radii)).toBeGreaterThanOrEqual(0.3);
  });
});
