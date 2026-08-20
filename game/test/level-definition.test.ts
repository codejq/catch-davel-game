import { describe, expect, it } from 'vitest';
import { LEVEL_001 } from '../src/content/levels/level-001';
import { CHAPTER_01_LEVELS, CHAPTER_01_LEVEL_IDS, chapter01Level } from '../src/content/levels/chapter-01';
import { levelDefinitionDependencyHash, levelDefinitionHash, serializeLevelDefinition, validateLevelDefinition } from '../src/content/validate-level';
import { DEFAULT_LEVEL_SEED } from '../src/sim/constants';
import { currentAgentValidationDependencies } from '../src/replay/replay';
import {
  CHAPTER_02_LEVELS, LEVEL_011, LEVEL_012, LEVEL_013, LEVEL_014, LEVEL_015, LEVEL_016, LEVEL_017,
  LEVEL_018, LEVEL_019, LEVEL_020,
} from '../src/content/levels/chapter-02';
import { campaignLevel } from '../src/content/levels/catalog';
import {
  CHAPTER_03_LEVELS, LEVEL_021, LEVEL_022, LEVEL_023, LEVEL_024, LEVEL_025, LEVEL_026, LEVEL_027, LEVEL_028,
  LEVEL_029, LEVEL_030,
} from '../src/content/levels/chapter-03';
import { CHAPTER_04_LEVELS, LEVEL_031, LEVEL_032, LEVEL_033, LEVEL_034, LEVEL_035 } from '../src/content/levels/chapter-04';

describe('Appendix A level-data contract', () => {
  it('strictly validates and canonically serializes Level 1', () => {
    expect(validateLevelDefinition(LEVEL_001)).toBe(LEVEL_001);
    expect(LEVEL_001.seed).toBe(DEFAULT_LEVEL_SEED);
    const serialized = serializeLevelDefinition(LEVEL_001);
    expect(serializeLevelDefinition(JSON.parse(serialized))).toBe(serialized);
    expect(levelDefinitionHash(LEVEL_001)).toMatch(/^[0-9a-f]{16}$/);
    expect(LEVEL_001.agentValidation.runs[0].dependencyHashes).toEqual(currentAgentValidationDependencies());
  });

  it('reserves, validates, and canonically serializes all ten Chapter 1 levels', () => {
    expect(CHAPTER_01_LEVELS.map((level) => level.id)).toEqual(CHAPTER_01_LEVEL_IDS);
    expect(new Set(CHAPTER_01_LEVELS.map((level) => level.seed)).size).toBe(10);
    expect(new Set(CHAPTER_01_LEVELS.map((level) => level.palette.presetId)).size).toBe(10);
    expect(new Set(CHAPTER_01_LEVELS.map((level) => level.dance.presetId)).size).toBe(10);
    for (const [index, level] of CHAPTER_01_LEVELS.entries()) {
      expect(validateLevelDefinition(level)).toBe(level);
      expect(serializeLevelDefinition(JSON.parse(serializeLevelDefinition(level)))).toBe(serializeLevelDefinition(level));
      expect(chapter01Level(CHAPTER_01_LEVEL_IDS[index]!)).toBe(level);
      expect(level.agentValidation.runs[0]?.dependencyHashes.effectiveLevel).toBe(levelDefinitionDependencyHash(level));
    }
    expect(CHAPTER_01_LEVELS.map((level) => level.agentValidation.runs[0]?.dependencyHashes)).toEqual(
      CHAPTER_01_LEVEL_IDS.map((levelId) => currentAgentValidationDependencies(levelId)),
    );
    expect(CHAPTER_01_LEVELS[4].agentValidation.tier).toBe('named-elite');
    expect(CHAPTER_01_LEVELS[9].agentValidation.tier).toBe('boss');
  });

  it('admits every authored Chapter 2 level through the shared catalog with current replay dependencies', () => {
    expect(validateLevelDefinition(LEVEL_011)).toBe(LEVEL_011);
    expect(campaignLevel('level-011')).toBe(LEVEL_011);
    expect(LEVEL_011.chapterId).toBe('chapter-02');
    expect(LEVEL_011.maze.keys[0]?.id).toBe('carnival-ticket');
    expect(LEVEL_011.agentValidation.runs[0]?.dependencyHashes.effectiveLevel)
      .toBe(levelDefinitionDependencyHash(LEVEL_011));
    expect(LEVEL_011.agentValidation.runs[0]?.dependencyHashes)
      .toEqual(currentAgentValidationDependencies('level-011'));
    expect(CHAPTER_02_LEVELS.map((level) => level.id)).toEqual([
      'level-011', 'level-012', 'level-013', 'level-014', 'level-015', 'level-016', 'level-017',
      'level-018', 'level-019', 'level-020',
    ]);
    expect(validateLevelDefinition(LEVEL_012)).toBe(LEVEL_012);
    expect(campaignLevel('level-012')).toBe(LEVEL_012);
    expect(LEVEL_012.maze.hazards).toHaveLength(2);
    expect(LEVEL_012.agentValidation.runs[0]?.dependencyHashes.effectiveLevel)
      .toBe(levelDefinitionDependencyHash(LEVEL_012));
    expect(LEVEL_012.agentValidation.runs[0]?.dependencyHashes)
      .toEqual(currentAgentValidationDependencies('level-012'));
    expect(validateLevelDefinition(LEVEL_013)).toBe(LEVEL_013);
    expect(campaignLevel('level-013')).toBe(LEVEL_013);
    expect(LEVEL_013.maze.hazards).toHaveLength(3);
    expect(LEVEL_013.agentValidation.runs[0]?.dependencyHashes)
      .toEqual(currentAgentValidationDependencies('level-013'));
    expect(validateLevelDefinition(LEVEL_014)).toBe(LEVEL_014);
    expect(campaignLevel('level-014')).toBe(LEVEL_014);
    expect(LEVEL_014.encounters[0]?.waves).toHaveLength(3);
    expect(LEVEL_014.agentValidation.runs[0]?.dependencyHashes)
      .toEqual(currentAgentValidationDependencies('level-014'));
    expect(validateLevelDefinition(LEVEL_015)).toBe(LEVEL_015);
    expect(campaignLevel('level-015')).toBe(LEVEL_015);
    expect(LEVEL_015.agentValidation.tier).toBe('named-elite');
    expect(LEVEL_015.agentValidation.runs[0]?.dependencyHashes)
      .toEqual(currentAgentValidationDependencies('level-015'));
    expect(validateLevelDefinition(LEVEL_016)).toBe(LEVEL_016);
    expect(campaignLevel('level-016')).toBe(LEVEL_016);
    expect(LEVEL_016.maze.nodes.filter((node) => !node.criticalPath)).toHaveLength(2);
    expect(LEVEL_016.agentValidation.runs[0]?.dependencyHashes)
      .toEqual(currentAgentValidationDependencies('level-016'));
    expect(validateLevelDefinition(LEVEL_017)).toBe(LEVEL_017);
    expect(campaignLevel('level-017')).toBe(LEVEL_017);
    expect(LEVEL_017.objectives[0]).toMatchObject({ id: 'defend-prize-bank', type: 'defend' });
    expect(LEVEL_017.agentValidation.runs[0]?.dependencyHashes)
      .toEqual(currentAgentValidationDependencies('level-017'));
    expect(validateLevelDefinition(LEVEL_018)).toBe(LEVEL_018);
    expect(campaignLevel('level-018')).toBe(LEVEL_018);
    expect(LEVEL_018.tags).toContain('maze-reversal');
    expect(LEVEL_018.agentValidation.runs[0]?.dependencyHashes)
      .toEqual(currentAgentValidationDependencies('level-018'));
    expect(validateLevelDefinition(LEVEL_019)).toBe(LEVEL_019);
    expect(campaignLevel('level-019')).toBe(LEVEL_019);
    expect(LEVEL_019.tags).toContain('moonlit-gauntlet');
    expect(LEVEL_019.agentValidation.runs[0]?.dependencyHashes)
      .toEqual(currentAgentValidationDependencies('level-019'));
    expect(validateLevelDefinition(LEVEL_020)).toBe(LEVEL_020);
    expect(campaignLevel('level-020')).toBe(LEVEL_020);
    expect(LEVEL_020.agentValidation.tier).toBe('boss');
    expect(LEVEL_020.objectives[0]).toMatchObject({ type: 'boss', targetCount: 1 });
    expect(LEVEL_020.agentValidation.runs[0]?.dependencyHashes)
      .toEqual(currentAgentValidationDependencies('level-020'));
  });

  it('admits Pipework Promenade as the first Chapter 3 bomb tutorial', () => {
    expect(CHAPTER_03_LEVELS).toEqual([
      LEVEL_021, LEVEL_022, LEVEL_023, LEVEL_024, LEVEL_025, LEVEL_026, LEVEL_027, LEVEL_028, LEVEL_029, LEVEL_030,
    ]);
    expect(validateLevelDefinition(LEVEL_021)).toBe(LEVEL_021);
    expect(campaignLevel('level-021')).toBe(LEVEL_021);
    expect(LEVEL_021.chapterId).toBe('chapter-03');
    expect(LEVEL_021.tags).toEqual(expect.arrayContaining(['bomb-tutorial', 'bomb-seal', 'vent-routes']));
    expect(LEVEL_021.maze.hazards).toHaveLength(3);
    expect(LEVEL_021.agentValidation.runs[0]?.dependencyHashes)
      .toEqual(currentAgentValidationDependencies('level-021'));
    expect(validateLevelDefinition(LEVEL_022)).toBe(LEVEL_022);
    expect(campaignLevel('level-022')).toBe(LEVEL_022);
    expect(LEVEL_022.tags).toEqual(expect.arrayContaining(['visibility-pulses', 'toxic-toe-tango']));
    expect(LEVEL_022.agentValidation.runs[0]?.dependencyHashes)
      .toEqual(currentAgentValidationDependencies('level-022'));
    expect(validateLevelDefinition(LEVEL_023)).toBe(LEVEL_023);
    expect(campaignLevel('level-023')).toBe(LEVEL_023);
    expect(LEVEL_023.tags).toEqual(expect.arrayContaining(['red-firemouth', 'flame-shutters', 'flame-lick-flamenco']));
    expect(LEVEL_023.agentValidation.runs[0]?.dependencyHashes)
      .toEqual(currentAgentValidationDependencies('level-023'));
    expect(validateLevelDefinition(LEVEL_024)).toBe(LEVEL_024);
    expect(campaignLevel('level-024')).toBe(LEVEL_024);
    expect(LEVEL_024.objectives[0]).toMatchObject({ completionMode: 'timer', durationTicks: 3_600 });
    expect(LEVEL_024.agentValidation.runs[0]?.dependencyHashes)
      .toEqual(currentAgentValidationDependencies('level-024'));
    expect(validateLevelDefinition(LEVEL_025)).toBe(LEVEL_025);
    expect(campaignLevel('level-025')).toBe(LEVEL_025);
    expect(LEVEL_025.tags).toEqual(expect.arrayContaining(['synchronized-elite-duo', 'duelling-tango']));
    expect(LEVEL_025.agentValidation.runs[0]?.dependencyHashes)
      .toEqual(currentAgentValidationDependencies('level-025'));
    expect(validateLevelDefinition(LEVEL_026)).toBe(LEVEL_026);
    expect(campaignLevel('level-026')).toBe(LEVEL_026);
    expect(LEVEL_026.tags).toEqual(expect.arrayContaining(['bomb-seal', 'destructible-route-choices', 'detonator-danzon']));
    expect(LEVEL_026.agentValidation.runs[0]?.dependencyHashes)
      .toEqual(currentAgentValidationDependencies('level-026'));
    expect(validateLevelDefinition(LEVEL_027)).toBe(LEVEL_027);
    expect(campaignLevel('level-027')).toBe(LEVEL_027);
    expect(LEVEL_027.tags).toEqual(expect.arrayContaining(['rising-hazard-escape', 'magenta-drain', 'drainpipe-rumba']));
    expect(LEVEL_027.agentValidation.runs[0]?.dependencyHashes)
      .toEqual(currentAgentValidationDependencies('level-027'));
    expect(validateLevelDefinition(LEVEL_028)).toBe(LEVEL_028);
    expect(campaignLevel('level-028')).toBe(LEVEL_028);
    expect(LEVEL_028.maze.keys.map((key) => key.id)).toEqual([
      'brass-tango-key', 'cyan-tango-key', 'magenta-tango-key',
    ]);
    expect(LEVEL_028.tags).toEqual(expect.arrayContaining(['multi-key-progression', 'triple-key-cha-cha']));
    expect(LEVEL_028.agentValidation.runs[0]?.dependencyHashes)
      .toEqual(currentAgentValidationDependencies('level-028'));
    expect(validateLevelDefinition(LEVEL_029)).toBe(LEVEL_029);
    expect(campaignLevel('level-029')).toBe(LEVEL_029);
    expect(LEVEL_029.tags).toEqual(expect.arrayContaining(['fire-poison-remix', 'feverish-salsa']));
    expect(LEVEL_029.agentValidation.runs[0]?.dependencyHashes)
      .toEqual(currentAgentValidationDependencies('level-029'));
    expect(validateLevelDefinition(LEVEL_030)).toBe(LEVEL_030);
    expect(campaignLevel('level-030')).toBe(LEVEL_030);
    expect(LEVEL_030.agentValidation.tier).toBe('boss');
    expect(LEVEL_030.objectives[0]).toMatchObject({ type: 'boss', targetCount: 1 });
    expect(LEVEL_030.tags).toEqual(expect.arrayContaining(['fire-spitting-boss', 'inferno-flamenco-finale']));
    expect(LEVEL_030.agentValidation.runs[0]?.dependencyHashes)
      .toEqual(currentAgentValidationDependencies('level-030'));
  });

  it('admits Cold Reception as the first Chapter 4 ice-movement level', () => {
    expect(CHAPTER_04_LEVELS).toEqual([LEVEL_031, LEVEL_032, LEVEL_033, LEVEL_034, LEVEL_035]);
    expect(validateLevelDefinition(LEVEL_031)).toBe(LEVEL_031);
    expect(campaignLevel('level-031')).toBe(LEVEL_031);
    expect(LEVEL_031.chapterId).toBe('chapter-04');
    expect(LEVEL_031.maze.hazards).toHaveLength(3);
    expect(LEVEL_031.tags).toEqual(expect.arrayContaining(['ice-movement-tutorial', 'chilly-funk-walk']));
    expect(LEVEL_031.agentValidation.runs[0]?.dependencyHashes)
      .toEqual(currentAgentValidationDependencies('level-031'));
  });

  it('admits Slippery Smiles as the Chapter 4 mobile ranged-squad level', () => {
    expect(validateLevelDefinition(LEVEL_032)).toBe(LEVEL_032);
    expect(campaignLevel('level-032')).toBe(LEVEL_032);
    expect(LEVEL_032.chapterId).toBe('chapter-04');
    expect(LEVEL_032.maze.hazards).toHaveLength(4);
    expect(LEVEL_032.tags).toEqual(expect.arrayContaining(['mobile-ranged-squads', 'ice-slide-moonwalk']));
    expect(LEVEL_032.agentValidation.runs[0]?.dependencyHashes)
      .toEqual(currentAgentValidationDependencies('level-032'));
  });

  it('admits Violet Wall as the Chapter 4 shielder-introduction level', () => {
    expect(validateLevelDefinition(LEVEL_033)).toBe(LEVEL_033);
    expect(campaignLevel('level-033')).toBe(LEVEL_033);
    expect(LEVEL_033.chapterId).toBe('chapter-04');
    expect(LEVEL_033.maze.hazards).toHaveLength(3);
    expect(LEVEL_033.tags).toEqual(expect.arrayContaining(['shielder-introduction', 'shield-pose-popping']));
    expect(LEVEL_033.agentValidation.runs[0]?.dependencyHashes)
      .toEqual(currentAgentValidationDependencies('level-033'));
  });

  it('admits Frosted Crossroads as the Chapter 4 crossing-ice route-reading level', () => {
    expect(validateLevelDefinition(LEVEL_034)).toBe(LEVEL_034);
    expect(campaignLevel('level-034')).toBe(LEVEL_034);
    expect(LEVEL_034.chapterId).toBe('chapter-04');
    expect(LEVEL_034.maze.hazards).toHaveLength(4);
    expect(LEVEL_034.tags).toEqual(expect.arrayContaining(['glass-route-visibility', 'crossing-ice', 'crystal-locking-dance']));
    expect(LEVEL_034.agentValidation.runs[0]?.dependencyHashes)
      .toEqual(currentAgentValidationDependencies('level-034'));
  });

  it('admits Zero-Degree Duel as the Chapter 4 named-elite shield hunt', () => {
    expect(validateLevelDefinition(LEVEL_035)).toBe(LEVEL_035);
    expect(campaignLevel('level-035')).toBe(LEVEL_035);
    expect(LEVEL_035.chapterId).toBe('chapter-04');
    expect(LEVEL_035.agentValidation.tier).toBe('named-elite');
    expect(LEVEL_035.maze.hazards).toHaveLength(4);
    expect(LEVEL_035.tags).toEqual(expect.arrayContaining(['shield-elite-hunt', 'zero-degree-duel', 'freeze-frame-face-off']));
    expect(LEVEL_035.agentValidation.runs[0]?.dependencyHashes)
      .toEqual(currentAgentValidationDependencies('level-035'));
  });

  it('rejects unknown fields, mismatched IDs, stale references, and impossible key ordering', () => {
    expect(() => validateLevelDefinition({ ...LEVEL_001, surprise: true })).toThrow(/unknown or missing/);
    expect(() => validateLevelDefinition({ ...LEVEL_001, number: 2 })).toThrow(/disagree/);
    const stale: unknown = structuredClone(LEVEL_001);
    (stale as { maze: { edges: Array<{ to: string }> } }).maze.edges[0]!.to = 'missing-room';
    expect(() => validateLevelDefinition(stale)).toThrow(/unknown node/);
    const impossible: unknown = structuredClone(LEVEL_001);
    (impossible as { maze: { keys: Array<{ placementNodeId: string }> } }).maze.keys[0]!.placementNodeId = 'room-arena';
    expect(() => validateLevelDefinition(impossible)).toThrow(/not reachable/);
  });

  it('rejects objective cycles and robot budgets above the fixed cap', () => {
    const cycle: unknown = structuredClone(LEVEL_001);
    (cycle as { objectives: Array<{ dependsOn: string[] }> }).objectives[0]!.dependsOn = ['deactivate-davels'];
    expect(() => validateLevelDefinition(cycle)).toThrow(/cycle/);
    const budget: unknown = structuredClone(LEVEL_001);
    (budget as { performance: { maxActiveRobots: number } }).performance.maxActiveRobots = 25;
    expect(() => validateLevelDefinition(budget)).toThrow(/1 through 24/);
  });
});
