import { describe, expect, it } from 'vitest';
import { CAMPAIGN_LEVEL_IDS, isCampaignLevelId, isPlayableLevelId } from '../src/content/level-ids';
import { PLAYABLE_LEVEL_IDS, PLAYABLE_LEVELS, campaignLevel } from '../src/content/levels/catalog';
import { GameSimulation } from '../src/sim/game';
import { campaignWeaponMask, WEAPON_MASK } from '../src/sim/weapons';

describe('scalable campaign level registry', () => {
  it('keeps the 100-ID numbering envelope separate from implemented content', () => {
    expect(CAMPAIGN_LEVEL_IDS).toHaveLength(100);
    expect(PLAYABLE_LEVEL_IDS).toHaveLength(27);
    expect(isCampaignLevelId('level-100')).toBe(true);
    expect(isPlayableLevelId('level-100')).toBe(false);
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
  });

  it('maps every playable ID to exactly one ordered authored definition', () => {
    expect(PLAYABLE_LEVELS.map((level) => level.id)).toEqual(PLAYABLE_LEVEL_IDS);
    expect(new Set(PLAYABLE_LEVELS.map((level) => level.id)).size).toBe(PLAYABLE_LEVEL_IDS.length);
    for (const levelId of PLAYABLE_LEVEL_IDS) expect(campaignLevel(levelId).id).toBe(levelId);
  });

  it('rejects reserved but unauthored IDs at the playable type guard', () => {
    for (const levelId of CAMPAIGN_LEVEL_IDS.slice(PLAYABLE_LEVEL_IDS.length)) {
      expect(isPlayableLevelId(levelId)).toBe(false);
    }
  });
});
