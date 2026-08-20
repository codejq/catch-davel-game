import { describe, expect, it } from 'vitest';
import { CAMPAIGN_LEVEL_IDS, isCampaignLevelId, isPlayableLevelId } from '../src/content/level-ids';
import {
  PLAYABLE_LEVEL_IDS, PLAYABLE_LEVELS, campaignLevel, type PlayableLevelId,
} from '../src/content/levels/catalog';
import { mazeRuntimeProfile } from '../src/content/runtime-manifests';
import { GameSimulation } from '../src/sim/game';
import { findCell, levelRows } from '../src/sim/level';
import { campaignWeaponMask, WEAPON_MASK } from '../src/sim/weapons';

describe('scalable campaign level registry', () => {
  it('keeps the complete 36-level campaign inside its closed numbering envelope', () => {
    expect(CAMPAIGN_LEVEL_IDS).toHaveLength(36);
    expect(PLAYABLE_LEVEL_IDS).toHaveLength(36);
    expect(isCampaignLevelId('level-036')).toBe(true);
    expect(isPlayableLevelId('level-036')).toBe(true);
    expect(isCampaignLevelId('level-037')).toBe(false);
  });

  it('unlocks the sword at the Chapter 2 boundary in the shared simulation path', () => {
    expect(campaignWeaponMask('level-001')).toBe(WEAPON_MASK.pulse);
    expect(campaignWeaponMask('level-011')).toBe(WEAPON_MASK.pulse | WEAPON_MASK.sword);
    const simulation = new GameSimulation(
      'level-011-loadout-proof', undefined, undefined, 'campaign', 'level-011',
    );
    expect(simulation.state.player.unlockedWeaponMask).toBe(WEAPON_MASK.pulse | WEAPON_MASK.sword);
    expect(campaignWeaponMask('level-021')).toBe(WEAPON_MASK.pulse | WEAPON_MASK.sword | WEAPON_MASK.bomb);
    const chapterThree = new GameSimulation(
      'level-021-loadout-proof', undefined, undefined, 'campaign', 'level-021',
    );
    expect(chapterThree.state.player.unlockedWeaponMask)
      .toBe(WEAPON_MASK.pulse | WEAPON_MASK.sword | WEAPON_MASK.bomb);
    expect(campaignWeaponMask('level-031')).toBe(WEAPON_MASK.pulse | WEAPON_MASK.sword | WEAPON_MASK.bomb);
    expect(campaignWeaponMask('level-032')).toBe(WEAPON_MASK.pulse | WEAPON_MASK.sword | WEAPON_MASK.bomb);
    expect(campaignWeaponMask('level-033')).toBe(WEAPON_MASK.pulse | WEAPON_MASK.sword | WEAPON_MASK.bomb);
    expect(campaignWeaponMask('level-034')).toBe(WEAPON_MASK.pulse | WEAPON_MASK.sword | WEAPON_MASK.bomb);
    expect(campaignWeaponMask('level-035')).toBe(WEAPON_MASK.pulse | WEAPON_MASK.sword | WEAPON_MASK.bomb);
    expect(campaignWeaponMask('level-036')).toBe(WEAPON_MASK.pulse | WEAPON_MASK.sword | WEAPON_MASK.bomb);
  });

  it('maps every playable ID to exactly one ordered authored definition', () => {
    expect(PLAYABLE_LEVELS.map((level) => level.id)).toEqual(PLAYABLE_LEVEL_IDS);
    expect(new Set(PLAYABLE_LEVELS.map((level) => level.id)).size).toBe(PLAYABLE_LEVEL_IDS.length);
    for (const levelId of PLAYABLE_LEVEL_IDS) expect(campaignLevel(levelId).id).toBe(levelId);
  });

  it('authors exactly one reachable runtime secret cache for every released level', () => {
    for (const level of PLAYABLE_LEVELS) {
      const levelId = level.id as PlayableLevelId;
      expect(level.maze.secretCount).toBe(1);
      const secretNodes = level.maze.nodes.filter((node) => node.role === 'secret');
      expect(secretNodes).toHaveLength(1);
      expect(secretNodes[0]).toMatchObject({ criticalPath: false });
      expect(secretNodes[0]!.pickupIds).toContain('secret-coin-cache');
      const interactions = mazeRuntimeProfile(level.maze.templateSetId).interactions;
      const secret = interactions.secretCoin!;
      const rows = levelRows(levelId);
      expect(rows[secret.row]?.[secret.column]).not.toBe('#');
      const start = findCell('S', levelId);
      const pending = [start];
      const visited = new Set([`${start.column},${start.row}`]);
      while (pending.length > 0) {
        const cell = pending.shift()!;
        const neighbors: readonly (readonly [number, number])[] = [
          [cell.column - 1, cell.row], [cell.column + 1, cell.row],
          [cell.column, cell.row - 1], [cell.column, cell.row + 1],
        ];
        for (const [column, row] of neighbors) {
          const key = `${column},${row}`;
          if (!visited.has(key) && rows[row]?.[column] !== '#') {
            visited.add(key);
            pending.push({ column, row });
          }
        }
      }
      expect(visited.has(`${secret.column},${secret.row}`)).toBe(true);
      const occupied = [interactions.health, interactions.key, ...(interactions.additionalKeys ?? []),
        interactions.energy, interactions.door, interactions.checkpoint, interactions.coin]
        .filter((cell): cell is { readonly column: number; readonly row: number } => cell !== undefined);
      expect(occupied.some((cell) => cell.column === secret.column && cell.row === secret.row)).toBe(false);
    }
  });

  it('has no reserved-but-unauthored IDs after completing the campaign', () => {
    expect(CAMPAIGN_LEVEL_IDS.slice(PLAYABLE_LEVEL_IDS.length)).toEqual([]);
    for (const levelId of CAMPAIGN_LEVEL_IDS.slice(PLAYABLE_LEVEL_IDS.length)) {
      expect(isPlayableLevelId(levelId)).toBe(false);
    }
  });
});
