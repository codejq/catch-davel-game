import type { LevelDefinition } from '../content/level-definition';
import {
  levelDefinitionDependencyHash, levelDefinitionHash, serializeLevelDefinition, validateLevelDefinition,
} from '../content/validate-level';

export interface LevelToolingReport {
  readonly level: LevelDefinition;
  readonly canonicalJson: string;
  readonly contentHash: string;
  readonly effectiveLevelHash: string;
  readonly declaredEffectiveLevelHash: string;
  readonly dependencyCurrent: boolean;
  readonly roomCount: number;
  readonly edgeCount: number;
  readonly criticalRoomCount: number;
  readonly optionalRoomCount: number;
  readonly hazardCount: number;
  readonly encounterCount: number;
  readonly waveCount: number;
  readonly totalRobotCount: number;
  readonly peakRobotCount: number;
  readonly pickupIds: readonly string[];
  readonly localizationKeys: readonly string[];
}

export function createLevelToolingReport(value: unknown): LevelToolingReport {
  const level = validateLevelDefinition(value);
  const waves = level.encounters.flatMap((encounter) => encounter.waves);
  const populations = waves.map((wave) => wave.spawnGroups.reduce((sum, group) => sum + group.count, 0));
  const effectiveLevelHash = levelDefinitionDependencyHash(level);
  const declaredEffectiveLevelHash = level.agentValidation.runs[0]!.dependencyHashes.effectiveLevel;
  return {
    level,
    canonicalJson: serializeLevelDefinition(level),
    contentHash: levelDefinitionHash(level),
    effectiveLevelHash,
    declaredEffectiveLevelHash,
    dependencyCurrent: level.agentValidation.runs.every(
      (run) => run.dependencyHashes.effectiveLevel === effectiveLevelHash,
    ),
    roomCount: level.maze.nodes.length,
    edgeCount: level.maze.edges.length,
    criticalRoomCount: level.maze.nodes.filter((node) => node.criticalPath).length,
    optionalRoomCount: level.maze.nodes.filter((node) => !node.criticalPath).length,
    hazardCount: level.maze.hazards.length,
    encounterCount: level.encounters.length,
    waveCount: waves.length,
    totalRobotCount: populations.reduce((sum, population) => sum + population, 0),
    peakRobotCount: Math.max(...populations),
    pickupIds: [...new Set(level.maze.nodes.flatMap((node) => node.pickupIds))].sort(),
    localizationKeys: [
      level.nameKey, level.briefingKey,
      ...level.objectives.flatMap((objective) => [objective.titleKey]),
      ...(level.story?.localizationKeys ?? []),
    ].sort(),
  };
}
