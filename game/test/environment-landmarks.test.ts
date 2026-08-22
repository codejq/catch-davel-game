import { describe, expect, it } from 'vitest';
import { PLAYABLE_LEVEL_IDS } from '../src/content/level-ids';
import {
  campaignLandmarkLayout, exitBeaconBoxes, MAX_CAMPAIGN_LANDMARK_BOXES, MAX_EXIT_BEACON_BOXES,
} from '../src/render/environment-landmarks';
import { cellAt, cellCenter, findCell, wallCells } from '../src/sim/level';

describe('bounded campaign environmental landmarks', () => {
  it('gives every playable maze a distinct wall-mounted motif with five visible anchors', () => {
    const motifs = new Set<string>();
    const signatures = new Set<string>();
    for (const levelId of PLAYABLE_LEVEL_IDS) {
      const layout = campaignLandmarkLayout(levelId);
      motifs.add(layout.motif);
      signatures.add(JSON.stringify(layout.boxes));
      expect(layout.anchorCells).toHaveLength(5);
      expect(layout.boxes.length).toBeGreaterThanOrEqual(55);
      expect(layout.boxes.length).toBeLessThanOrEqual(MAX_CAMPAIGN_LANDMARK_BOXES);
      for (const anchor of layout.anchorCells) expect(cellAt(anchor.column, anchor.row, levelId)).toBe('#');
      for (const box of layout.boxes) {
        expect([box.x, box.y, box.z, box.sizeX, box.sizeY, box.sizeZ, box.emission, ...box.color].every(Number.isFinite)).toBe(true);
        expect(Math.min(box.sizeX, box.sizeY, box.sizeZ)).toBeGreaterThan(0);
        expect(box.emission).toBeGreaterThanOrEqual(0);
        expect(box.emission).toBeLessThanOrEqual(1);
        expect(box.y - box.sizeY / 2).toBeGreaterThanOrEqual(0.65);
      }
      expect(layout.boxes.filter((box) => box.y < 3.1)).toHaveLength(40);
    }
    expect(motifs.size).toBe(PLAYABLE_LEVEL_IDS.length);
    expect(signatures.size).toBe(PLAYABLE_LEVEL_IDS.length);
  });

  it('keeps the complete world cube batch comfortably below its hard cap', () => {
    for (const levelId of PLAYABLE_LEVEL_IDS) {
      const worstDynamicBoxes = 5 + 21 + 3 + 2 + MAX_EXIT_BEACON_BOXES;
      expect(wallCells(levelId).length + campaignLandmarkLayout(levelId).boxes.length + 1 + worstDynamicBoxes)
        .toBeLessThan(512);
    }
  });
});

describe('objective-readable exit beacon', () => {
  const levelId = 'level-001' as const;
  const exit = cellCenter(findCell('E', levelId).column, findCell('E', levelId).row);

  it('changes from a red barred lock to a taller green route beacon', () => {
    const locked = exitBeaconBoxes(levelId, exit, false, 60, 1);
    const unlocked = exitBeaconBoxes(levelId, exit, true, 60, 1);
    expect(locked.length).toBeLessThanOrEqual(MAX_EXIT_BEACON_BOXES);
    expect(unlocked.length).toBeLessThanOrEqual(MAX_EXIT_BEACON_BOXES);
    expect(locked.some((entry) => entry.color[0] > 0.9 && entry.color[1] < 0.3)).toBe(true);
    expect(unlocked.some((entry) => entry.color[1] === 1 && entry.color[0] < 0.2)).toBe(true);
    expect(Math.max(...unlocked.map((entry) => entry.y + entry.sizeY / 2))).toBeGreaterThan(4.7);
  });

  it('uses snapshot ticks for bounded pulse and becomes static at zero motion', () => {
    expect(exitBeaconBoxes(levelId, exit, true, 10, 0)).toEqual(exitBeaconBoxes(levelId, exit, true, 40, 0));
    expect(exitBeaconBoxes(levelId, exit, true, 10, 1)).not.toEqual(exitBeaconBoxes(levelId, exit, true, 40, 1));
  });
});
