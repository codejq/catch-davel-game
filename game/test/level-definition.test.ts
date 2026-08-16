import { describe, expect, it } from 'vitest';
import { LEVEL_001 } from '../src/content/levels/level-001';
import { CHAPTER_01_LEVELS, CHAPTER_01_LEVEL_IDS, chapter01Level } from '../src/content/levels/chapter-01';
import { levelDefinitionDependencyHash, levelDefinitionHash, serializeLevelDefinition, validateLevelDefinition } from '../src/content/validate-level';
import { DEFAULT_LEVEL_SEED } from '../src/sim/constants';
import { currentAgentValidationDependencies } from '../src/replay/replay';

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
    expect(CHAPTER_01_LEVELS[4].agentValidation.tier).toBe('named-elite');
    expect(CHAPTER_01_LEVELS[9].agentValidation.tier).toBe('boss');
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
