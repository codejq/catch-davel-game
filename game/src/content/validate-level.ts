import { canonicalJson, checksumCanonical } from '../sim/serialization';
import type {
  AgentValidationRunSpec, DanceLevelSpec, EncounterSpec, HazardSpec, IntegerRange, KeySpec, LevelDefinition,
  MazeEdgeSpec, MazeNodeSpec, ObjectiveSpec, PerformanceSpec, PresetBinding, SpawnGroupSpec, StorySpec, WaveSpec,
} from './level-definition';

function object(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function exact(value: Record<string, unknown>, expected: readonly string[], label: string): void {
  const actual = Object.keys(value).sort();
  const keys = [...expected].sort();
  if (actual.length !== keys.length || actual.some((key, index) => key !== keys[index])) {
    throw new Error(`${label} has unknown or missing fields`);
  }
}

function text(value: unknown, label: string, pattern?: RegExp): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 256 || (pattern !== undefined && !pattern.test(value))) {
    throw new Error(`${label} is invalid`);
  }
  return value;
}

function integer(value: unknown, label: string, minimum = 0, maximum = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be an integer from ${minimum} through ${maximum}`);
  }
  return value;
}

function finite(value: unknown, label: string, minimum: number, maximum: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be finite from ${minimum} through ${maximum}`);
  }
  return value;
}

function booleanValue(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${label} must be boolean`);
  return value;
}

function oneOf<T extends string>(value: unknown, values: readonly T[], label: string): T {
  if (typeof value !== 'string' || !values.includes(value as T)) throw new Error(`${label} is not an approved value`);
  return value as T;
}

function values(value: unknown, label: string, minimum = 0): unknown[] {
  if (!Array.isArray(value) || value.length < minimum || value.length > 1_000) throw new Error(`${label} must be a bounded array`);
  return value;
}

function strings(value: unknown, label: string): string[] {
  return values(value, label).map((entry, index) => text(entry, `${label}[${index}]`, /^[a-z0-9][a-z0-9._-]*$/));
}

function nullableText(value: unknown, label: string): string | null {
  return value === null ? null : text(value, label, /^[a-z0-9][a-z0-9._-]*$/);
}

function unique(items: readonly string[], label: string): void {
  if (new Set(items).size !== items.length) throw new Error(`${label} must contain unique stable IDs`);
}

function binding(value: unknown, label: string): PresetBinding {
  const result = object(value, label);
  exact(result, result.override === undefined ? ['presetId'] : ['presetId', 'override'], label);
  text(result.presetId, `${label}.presetId`, /^[a-z0-9][a-z0-9._-]*$/);
  if (result.override !== undefined) throw new Error(`${label}.override must be resolved and approved by its preset manifest before release validation`);
  return result as unknown as PresetBinding;
}

function range(value: unknown, label: string): IntegerRange {
  const result = object(value, label);
  exact(result, ['minimum', 'maximum'], label);
  const minimum = integer(result.minimum, `${label}.minimum`);
  const maximum = integer(result.maximum, `${label}.maximum`, minimum);
  return { minimum, maximum };
}

function node(value: unknown, index: number): MazeNodeSpec {
  const label = `level.maze.nodes[${index}]`;
  const result = object(value, label);
  exact(result, ['id', 'role', 'templateTags', 'sizeClass', 'encounterIds', 'pickupIds', 'checkpointId', 'storyIds', 'criticalPath'], label);
  text(result.id, `${label}.id`, /^[a-z0-9][a-z0-9-]*$/);
  oneOf(result.role, ['entrance', 'corridor', 'arena', 'checkpoint', 'exit', 'secret'], `${label}.role`);
  strings(result.templateTags, `${label}.templateTags`);
  oneOf(result.sizeClass, ['small', 'medium', 'large'], `${label}.sizeClass`);
  unique(strings(result.encounterIds, `${label}.encounterIds`), `${label}.encounterIds`);
  unique(strings(result.pickupIds, `${label}.pickupIds`), `${label}.pickupIds`);
  nullableText(result.checkpointId, `${label}.checkpointId`);
  unique(strings(result.storyIds, `${label}.storyIds`), `${label}.storyIds`);
  booleanValue(result.criticalPath, `${label}.criticalPath`);
  return result as unknown as MazeNodeSpec;
}

function edge(value: unknown, index: number): MazeEdgeSpec {
  const label = `level.maze.edges[${index}]`;
  const result = object(value, label);
  exact(result, ['id', 'from', 'to', 'bidirectional', 'requiredKeyId', 'doorType', 'traversalCost', 'stateTrigger'], label);
  text(result.id, `${label}.id`, /^[a-z0-9][a-z0-9-]*$/);
  text(result.from, `${label}.from`); text(result.to, `${label}.to`);
  booleanValue(result.bidirectional, `${label}.bidirectional`);
  nullableText(result.requiredKeyId, `${label}.requiredKeyId`);
  oneOf(result.doorType, ['open', 'workshop-lock', 'arena-lock'], `${label}.doorType`);
  integer(result.traversalCost, `${label}.traversalCost`, 1, 1_000);
  nullableText(result.stateTrigger, `${label}.stateTrigger`);
  return result as unknown as MazeEdgeSpec;
}

function keySpec(value: unknown, index: number): KeySpec {
  const label = `level.maze.keys[${index}]`;
  const result = object(value, label);
  exact(result, ['id', 'placementNodeId'], label);
  text(result.id, `${label}.id`); text(result.placementNodeId, `${label}.placementNodeId`);
  return result as unknown as KeySpec;
}

function hazard(value: unknown, index: number): HazardSpec {
  const label = `level.maze.hazards[${index}]`;
  const result = object(value, label);
  exact(result, ['id', 'nodeId', 'periodTicks', 'activeTicks', 'collisionProfileId'], label);
  text(result.id, `${label}.id`); text(result.nodeId, `${label}.nodeId`);
  const period = integer(result.periodTicks, `${label}.periodTicks`, 1, 36_000);
  integer(result.activeTicks, `${label}.activeTicks`, 1, period);
  text(result.collisionProfileId, `${label}.collisionProfileId`);
  return result as unknown as HazardSpec;
}

function objective(value: unknown, index: number): ObjectiveSpec {
  const label = `level.objectives[${index}]`;
  const result = object(value, label);
  exact(result, ['id', 'type', 'required', 'titleKey', 'targetIds', 'targetCount', 'durationTicks', 'dependsOn', 'completionMode', 'markerPolicy'], label);
  text(result.id, `${label}.id`);
  oneOf(result.type, ['deactivate', 'recover-keys', 'shutdown', 'survive', 'hunt', 'defend', 'escape', 'boss'], `${label}.type`);
  booleanValue(result.required, `${label}.required`); text(result.titleKey, `${label}.titleKey`);
  unique(strings(result.targetIds, `${label}.targetIds`), `${label}.targetIds`);
  if (result.targetCount !== null) integer(result.targetCount, `${label}.targetCount`, 1);
  if (result.durationTicks !== null) integer(result.durationTicks, `${label}.durationTicks`, 1);
  unique(strings(result.dependsOn, `${label}.dependsOn`), `${label}.dependsOn`);
  const completion = oneOf(result.completionMode, ['all', 'any', 'count', 'timer', 'reach'], `${label}.completionMode`);
  if (completion === 'count' && result.targetCount === null) throw new Error(`${label}.targetCount is required for count completion`);
  if (completion === 'timer' && result.durationTicks === null) throw new Error(`${label}.durationTicks is required for timer completion`);
  oneOf(result.markerPolicy, ['always', 'discovered', 'nearby', 'none'], `${label}.markerPolicy`);
  return result as unknown as ObjectiveSpec;
}

function spawnGroup(value: unknown, label: string): SpawnGroupSpec {
  const result = object(value, label);
  exact(result, ['id', 'archetypeId', 'count', 'modifierIds', 'spawnPointSetId', 'dancePresetId', 'aiProfileId', 'rewardProfileId', 'rngStream', 'rank', 'accessibilityVerificationId'], label);
  for (const field of ['id', 'archetypeId', 'spawnPointSetId', 'dancePresetId', 'aiProfileId', 'rewardProfileId', 'rngStream', 'accessibilityVerificationId'] as const) {
    text(result[field], `${label}.${field}`);
  }
  integer(result.count, `${label}.count`, 1, 24);
  unique(strings(result.modifierIds, `${label}.modifierIds`), `${label}.modifierIds`);
  oneOf(result.rank, ['normal', 'elite', 'boss'], `${label}.rank`);
  return result as unknown as SpawnGroupSpec;
}

function wave(value: unknown, label: string): WaveSpec {
  const result = object(value, label);
  exact(result, ['id', 'startCondition', 'startDelayTicks', 'spawnGroups', 'maxConcurrentRobots', 'interGroupDelayTicks', 'danceTransitionId', 'completion', 'invalidSpawnPolicy'], label);
  text(result.id, `${label}.id`);
  oneOf(result.startCondition, ['encounter-start', 'previous-wave-complete', 'timer'], `${label}.startCondition`);
  integer(result.startDelayTicks, `${label}.startDelayTicks`, 0, 36_000);
  const groups = values(result.spawnGroups, `${label}.spawnGroups`, 1).map((entry, index) => spawnGroup(entry, `${label}.spawnGroups[${index}]`));
  unique(groups.map((group) => group.id), `${label}.spawnGroups`);
  const maximum = integer(result.maxConcurrentRobots, `${label}.maxConcurrentRobots`, 1, 24);
  if (groups.reduce((sum, group) => sum + group.count, 0) < maximum) throw new Error(`${label}.maxConcurrentRobots exceeds its declared group population`);
  integer(result.interGroupDelayTicks, `${label}.interGroupDelayTicks`, 0, 36_000);
  nullableText(result.danceTransitionId, `${label}.danceTransitionId`);
  oneOf(result.completion, ['all-defeated', 'timer', 'target-defeated'], `${label}.completion`);
  if (result.invalidSpawnPolicy !== 'fail-level') throw new Error(`${label}.invalidSpawnPolicy must fail explicitly`);
  return result as unknown as WaveSpec;
}

function encounter(value: unknown, index: number): EncounterSpec {
  const label = `level.encounters[${index}]`;
  const result = object(value, label);
  exact(result, ['id', 'roomNodeId', 'trigger', 'triggerRef', 'arenaLock', 'waves', 'completion', 'rewardId', 'checkpointOnComplete'], label);
  text(result.id, `${label}.id`); text(result.roomNodeId, `${label}.roomNodeId`);
  oneOf(result.trigger, ['on-enter', 'on-objective', 'on-interact', 'on-tick', 'on-wave-complete'], `${label}.trigger`);
  nullableText(result.triggerRef, `${label}.triggerRef`);
  booleanValue(result.arenaLock, `${label}.arenaLock`);
  const waves = values(result.waves, `${label}.waves`, 1).map((entry, waveIndex) => wave(entry, `${label}.waves[${waveIndex}]`));
  unique(waves.map((entry) => entry.id), `${label}.waves`);
  oneOf(result.completion, ['all-defeated', 'timer', 'target-defeated', 'objective-event'], `${label}.completion`);
  nullableText(result.rewardId, `${label}.rewardId`);
  nullableText(result.checkpointOnComplete, `${label}.checkpointOnComplete`);
  return result as unknown as EncounterSpec;
}

function dance(value: unknown): DanceLevelSpec {
  const label = 'level.dance';
  const result = object(value, label);
  exact(result, ['presetId', 'grammarVersion', 'bpm', 'timeSignature', 'barsPerPhrase', 'footPatternId', 'torsoPatternId', 'armPatternId', 'headAccentId', 'pathPatternId', 'attackBeats', 'vulnerableBeats', 'transitionIds', 'visualIntensity', 'reducedMotionPresetId'], label);
  for (const field of ['presetId', 'footPatternId', 'torsoPatternId', 'armPatternId', 'headAccentId', 'pathPatternId', 'reducedMotionPresetId'] as const) text(result[field], `${label}.${field}`);
  integer(result.grammarVersion, `${label}.grammarVersion`, 1, 1_000);
  integer(result.bpm, `${label}.bpm`, 40, 220);
  const signature = oneOf(result.timeSignature, ['4/4', '3/4', '7/8'], `${label}.timeSignature`);
  const bars = integer(result.barsPerPhrase, `${label}.barsPerPhrase`, 1, 32);
  const beatsPerBar = signature === '4/4' ? 4 : signature === '3/4' ? 3 : 7;
  const validateBeats = (field: 'attackBeats' | 'vulnerableBeats'): void => {
    const beats = values(result[field], `${label}.${field}`).map((beat, index) => integer(beat, `${label}.${field}[${index}]`, 0, beatsPerBar * bars - 1));
    unique(beats.map(String), `${label}.${field}`);
    if (beats.some((beat, index) => index > 0 && beat <= beats[index - 1]!)) throw new Error(`${label}.${field} must be sorted`);
  };
  validateBeats('attackBeats'); validateBeats('vulnerableBeats');
  unique(strings(result.transitionIds, `${label}.transitionIds`), `${label}.transitionIds`);
  finite(result.visualIntensity, `${label}.visualIntensity`, 0, 1);
  return result as unknown as DanceLevelSpec;
}

function agentRun(value: unknown, index: number): AgentValidationRunSpec {
  const label = `level.agentValidation.runs[${index}]`;
  const result = object(value, label);
  exact(result, ['id', 'mode', 'policyId', 'policyVersion', 'referenceReplayId', 'seed', 'difficulty', 'assistProfileId', 'maxTicks', 'stuckTimeoutTicks', 'maxIllegalActions', 'requiredObjectiveIds', 'expectedCompletion', 'expectedChecksum', 'parTicks', 'dependencyHashes'], label);
  text(result.id, `${label}.id`);
  const mode = oneOf(result.mode, ['live-agent', 'reference-replay'], `${label}.mode`);
  const policyId = nullableText(result.policyId, `${label}.policyId`);
  const policyVersion = result.policyVersion === null ? null : integer(result.policyVersion, `${label}.policyVersion`, 1);
  const replayId = nullableText(result.referenceReplayId, `${label}.referenceReplayId`);
  if (mode === 'live-agent' && (policyId === null || policyVersion === null || replayId !== null)) throw new Error(`${label} has an invalid live-agent policy binding`);
  if (mode === 'reference-replay' && (replayId === null || policyId !== null || policyVersion !== null)) throw new Error(`${label} has an invalid reference replay binding`);
  text(result.seed, `${label}.seed`); oneOf(result.difficulty, ['Story', 'Standard', 'Hard'], `${label}.difficulty`);
  nullableText(result.assistProfileId, `${label}.assistProfileId`);
  const maxTicks = integer(result.maxTicks, `${label}.maxTicks`, 1, 3_600_000);
  integer(result.stuckTimeoutTicks, `${label}.stuckTimeoutTicks`, 1, maxTicks);
  integer(result.maxIllegalActions, `${label}.maxIllegalActions`, 0, 1_000);
  unique(strings(result.requiredObjectiveIds, `${label}.requiredObjectiveIds`), `${label}.requiredObjectiveIds`);
  booleanValue(result.expectedCompletion, `${label}.expectedCompletion`);
  if (result.expectedChecksum !== null) text(result.expectedChecksum, `${label}.expectedChecksum`, /^[0-9a-f]{16}$/);
  integer(result.parTicks, `${label}.parTicks`, 1, maxTicks);
  const dependencies = object(result.dependencyHashes, `${label}.dependencyHashes`);
  exact(dependencies, ['simulationSchema', 'effectiveLevel', 'simulationLevel', 'balanceData', 'policyOrReplay'], `${label}.dependencyHashes`);
  for (const [key, hash] of Object.entries(dependencies)) text(hash, `${label}.dependencyHashes.${key}`, /^[0-9a-f]{16}$/);
  return result as unknown as AgentValidationRunSpec;
}

function performance(value: unknown): PerformanceSpec {
  const label = 'level.performance';
  const result = object(value, label);
  exact(result, ['maxActiveRobots', 'maxActiveProjectiles', 'maxActivePickups', 'maxHazards', 'maxMazeNodes', 'maxRenderInstances', 'expectedPeakDrawCalls', 'expectedPeakMemoryMb', 'benchmarkScenarioIds'], label);
  integer(result.maxActiveRobots, `${label}.maxActiveRobots`, 1, 24);
  integer(result.maxActiveProjectiles, `${label}.maxActiveProjectiles`, 1, 64);
  integer(result.maxActivePickups, `${label}.maxActivePickups`, 0, 64);
  integer(result.maxHazards, `${label}.maxHazards`, 0, 64);
  integer(result.maxMazeNodes, `${label}.maxMazeNodes`, 2, 1_024);
  integer(result.maxRenderInstances, `${label}.maxRenderInstances`, 1, 100_000);
  integer(result.expectedPeakDrawCalls, `${label}.expectedPeakDrawCalls`, 1, 1_000);
  integer(result.expectedPeakMemoryMb, `${label}.expectedPeakMemoryMb`, 1, 4_096);
  unique(strings(result.benchmarkScenarioIds, `${label}.benchmarkScenarioIds`), `${label}.benchmarkScenarioIds`);
  return result as unknown as PerformanceSpec;
}

function story(value: unknown): StorySpec {
  const label = 'level.story';
  const result = object(value, label);
  exact(result, ['introId', 'outroId', 'logIds', 'dialogueCueIds', 'localizationKeys', 'skippable'], label);
  nullableText(result.introId, `${label}.introId`); nullableText(result.outroId, `${label}.outroId`);
  unique(strings(result.logIds, `${label}.logIds`), `${label}.logIds`);
  unique(strings(result.dialogueCueIds, `${label}.dialogueCueIds`), `${label}.dialogueCueIds`);
  unique(strings(result.localizationKeys, `${label}.localizationKeys`), `${label}.localizationKeys`);
  booleanValue(result.skippable, `${label}.skippable`);
  return result as unknown as StorySpec;
}

function assertAcyclic(objectives: readonly ObjectiveSpec[]): void {
  const byId = new Map(objectives.map((entry) => [entry.id, entry]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): void => {
    if (visiting.has(id)) throw new Error('level objective dependency graph contains a cycle');
    if (visited.has(id)) return;
    const entry = byId.get(id);
    if (entry === undefined) throw new Error(`level objective dependency ${id} does not resolve`);
    visiting.add(id);
    for (const dependency of entry.dependsOn) visit(dependency);
    visiting.delete(id); visited.add(id);
  };
  for (const entry of objectives) visit(entry.id);
}

function assertSolvable(maze: LevelDefinition['maze']): void {
  const keysByNode = new Map<string, string[]>();
  for (const key of maze.keys) keysByNode.set(key.placementNodeId, [...(keysByNode.get(key.placementNodeId) ?? []), key.id]);
  const queue: Array<{ node: string; keys: readonly string[] }> = [{ node: maze.entranceNodeId, keys: [] }];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const current = queue.shift()!;
    const held = [...new Set([...current.keys, ...(keysByNode.get(current.node) ?? [])])].sort();
    const stateKey = `${current.node}|${held.join(',')}`;
    if (seen.has(stateKey)) continue;
    seen.add(stateKey);
    if (current.node === maze.exitNodeId) return;
    for (const edge of maze.edges) {
      const destinations: string[] = [];
      if (edge.from === current.node) destinations.push(edge.to);
      if (edge.bidirectional && edge.to === current.node) destinations.push(edge.from);
      if (edge.requiredKeyId === null || held.includes(edge.requiredKeyId)) {
        for (const destination of destinations) queue.push({ node: destination, keys: held });
      }
    }
  }
  throw new Error('level maze exit is not reachable with its declared key ordering');
}

export function validateLevelDefinition(value: unknown): LevelDefinition {
  const level = object(value, 'level');
  exact(level, level.story === undefined
    ? ['schemaVersion', 'id', 'number', 'chapterId', 'nameKey', 'briefingKey', 'seed', 'palette', 'maze', 'objectives', 'encounters', 'dance', 'difficulty', 'economy', 'checkpoints', 'audio', 'mastery', 'agentValidation', 'performance', 'tags']
    : ['schemaVersion', 'id', 'number', 'chapterId', 'nameKey', 'briefingKey', 'seed', 'palette', 'maze', 'objectives', 'encounters', 'dance', 'difficulty', 'economy', 'checkpoints', 'audio', 'mastery', 'agentValidation', 'performance', 'story', 'tags'], 'level');
  if (level.schemaVersion !== 1) throw new Error('Unsupported level schema version');
  const id = text(level.id, 'level.id', /^level-\d{3}$/);
  const number = integer(level.number, 'level.number', 1, 100);
  if (id !== `level-${String(number).padStart(3, '0')}`) throw new Error('level.id and level.number disagree');
  text(level.chapterId, 'level.chapterId', /^chapter-\d{2}$/);
  text(level.nameKey, 'level.nameKey'); text(level.briefingKey, 'level.briefingKey'); text(level.seed, 'level.seed');
  binding(level.palette, 'level.palette');
  const mazeValue = object(level.maze, 'level.maze');
  exact(mazeValue, ['templateSetId', 'generatorVersion', 'criticalPathRooms', 'optionalRooms', 'maxBranchDepth', 'secretCount', 'entranceNodeId', 'exitNodeId', 'nodes', 'edges', 'keys', 'hazards', 'generationAttempts', 'validationProfile'], 'level.maze');
  text(mazeValue.templateSetId, 'level.maze.templateSetId'); integer(mazeValue.generatorVersion, 'level.maze.generatorVersion', 1);
  const criticalRange = range(mazeValue.criticalPathRooms, 'level.maze.criticalPathRooms');
  range(mazeValue.optionalRooms, 'level.maze.optionalRooms');
  integer(mazeValue.maxBranchDepth, 'level.maze.maxBranchDepth', 0, 32);
  const secretCount = integer(mazeValue.secretCount, 'level.maze.secretCount', 0, 100);
  const entranceNodeId = text(mazeValue.entranceNodeId, 'level.maze.entranceNodeId');
  const exitNodeId = text(mazeValue.exitNodeId, 'level.maze.exitNodeId');
  if (entranceNodeId === exitNodeId) throw new Error('level maze entrance and exit must differ');
  const nodes = values(mazeValue.nodes, 'level.maze.nodes', 2).map(node);
  const edges = values(mazeValue.edges, 'level.maze.edges', 1).map(edge);
  const keys = values(mazeValue.keys, 'level.maze.keys').map(keySpec);
  const hazards = values(mazeValue.hazards, 'level.maze.hazards').map(hazard);
  integer(mazeValue.generationAttempts, 'level.maze.generationAttempts', 1, 1_000);
  text(mazeValue.validationProfile, 'level.maze.validationProfile');
  const maze = { ...mazeValue, criticalPathRooms: criticalRange, nodes, edges, keys, hazards } as unknown as LevelDefinition['maze'];
  const nodeIds = nodes.map((entry) => entry.id); unique(nodeIds, 'level.maze.nodes');
  const nodeIdSet = new Set(nodeIds);
  if (!nodeIdSet.has(entranceNodeId) || !nodeIdSet.has(exitNodeId)) throw new Error('level maze entrance or exit does not resolve');
  const criticalCount = nodes.filter((entry) => entry.criticalPath).length;
  if (criticalCount < criticalRange.minimum || criticalCount > criticalRange.maximum) throw new Error('level critical-path room count is outside its declared range');
  if (nodes.filter((entry) => entry.role === 'secret').length !== secretCount) throw new Error('level maze secretCount disagrees with secret nodes');
  unique(edges.map((entry) => entry.id), 'level.maze.edges'); unique(keys.map((entry) => entry.id), 'level.maze.keys'); unique(hazards.map((entry) => entry.id), 'level.maze.hazards');
  const keyIds = new Set(keys.map((entry) => entry.id));
  for (const entry of edges) {
    if (!nodeIdSet.has(entry.from) || !nodeIdSet.has(entry.to)) throw new Error(`level maze edge ${entry.id} references an unknown node`);
    if (entry.requiredKeyId !== null && !keyIds.has(entry.requiredKeyId)) throw new Error(`level maze edge ${entry.id} references an unknown key`);
  }
  for (const entry of keys) if (!nodeIdSet.has(entry.placementNodeId)) throw new Error(`level key ${entry.id} references an unknown node`);
  for (const entry of hazards) if (!nodeIdSet.has(entry.nodeId)) throw new Error(`level hazard ${entry.id} references an unknown node`);
  assertSolvable(maze);
  const objectives = values(level.objectives, 'level.objectives', 1).map(objective);
  unique(objectives.map((entry) => entry.id), 'level.objectives');
  if (!objectives.some((entry) => entry.required)) throw new Error('level requires at least one primary objective');
  assertAcyclic(objectives);
  const encounters = values(level.encounters, 'level.encounters', 1).map(encounter);
  unique(encounters.map((entry) => entry.id), 'level.encounters');
  const encounterIds = new Set(encounters.map((entry) => entry.id));
  const objectiveIds = new Set(objectives.map((entry) => entry.id));
  const waveIds = new Set(encounters.flatMap((entry) => entry.waves.map((entryWave) => entryWave.id)));
  const targetIds = new Set([...nodeIds, ...encounterIds, ...keyIds, ...waveIds]);
  for (const entry of objectives) for (const targetId of entry.targetIds) {
    if (!targetIds.has(targetId)) throw new Error(`level objective ${entry.id} references an unknown target`);
  }
  for (const entry of encounters) {
    if (!nodeIdSet.has(entry.roomNodeId)) throw new Error(`level encounter ${entry.id} references an unknown room`);
    if (entry.trigger === 'on-enter' && entry.triggerRef !== null) throw new Error(`level encounter ${entry.id} on-enter trigger must not have a reference`);
    if (entry.trigger === 'on-objective' && (entry.triggerRef === null || !objectiveIds.has(entry.triggerRef))) {
      throw new Error(`level encounter ${entry.id} references an unknown objective trigger`);
    }
    if (entry.trigger === 'on-wave-complete' && (entry.triggerRef === null || !waveIds.has(entry.triggerRef))) {
      throw new Error(`level encounter ${entry.id} references an unknown wave trigger`);
    }
  }
  for (const entry of nodes) for (const encounterId of entry.encounterIds) {
    const referenced = encounters.find((candidate) => candidate.id === encounterId);
    if (referenced === undefined) throw new Error(`level node ${entry.id} references an unknown encounter`);
    if (referenced.roomNodeId !== entry.id) throw new Error(`level node ${entry.id} owns encounter ${encounterId} assigned to another room`);
  }
  dance(level.dance); binding(level.difficulty, 'level.difficulty'); binding(level.economy, 'level.economy');
  const checkpoints = values(level.checkpoints, 'level.checkpoints').map((entry, index) => binding(entry, `level.checkpoints[${index}]`));
  const checkpointIds = new Set(checkpoints.map((entry) => entry.presetId));
  for (const entry of nodes) if (entry.checkpointId !== null && !checkpointIds.has(entry.checkpointId)) {
    throw new Error(`level node ${entry.id} references an unknown checkpoint`);
  }
  for (const entry of encounters) if (entry.checkpointOnComplete !== null && !checkpointIds.has(entry.checkpointOnComplete)) {
    throw new Error(`level encounter ${entry.id} references an unknown checkpoint reward`);
  }
  binding(level.audio, 'level.audio'); values(level.mastery, 'level.mastery').forEach((entry, index) => binding(entry, `level.mastery[${index}]`));
  const agent = object(level.agentValidation, 'level.agentValidation');
  exact(agent, ['tier', 'runs', 'owner'], 'level.agentValidation');
  const tier = oneOf(agent.tier, ['ordinary', 'boss', 'named-elite'], 'level.agentValidation.tier');
  const runs = values(agent.runs, 'level.agentValidation.runs', 1).map(agentRun);
  unique(runs.map((entry) => entry.id), 'level.agentValidation.runs'); text(agent.owner, 'level.agentValidation.owner');
  const requiredIds = objectives.filter((entry) => entry.required).map((entry) => entry.id).sort();
  for (const run of runs) {
    if (run.seed !== level.seed) throw new Error(`agent run ${run.id} seed differs from the campaign seed`);
    if (run.requiredObjectiveIds.slice().sort().join(',') !== requiredIds.join(',')) throw new Error(`agent run ${run.id} required objectives are stale`);
  }
  if (tier === 'ordinary' && !runs.some((run) => run.mode === 'live-agent' && run.difficulty === 'Standard')) {
    throw new Error('ordinary levels require a Standard live-agent run');
  }
  const budget = performance(level.performance);
  if (nodes.length > budget.maxMazeNodes || hazards.length > budget.maxHazards) throw new Error('level maze content exceeds its performance declaration');
  const pickupCount = new Set(nodes.flatMap((entry) => entry.pickupIds)).size;
  if (pickupCount > budget.maxActivePickups) throw new Error('level pickups exceed their performance declaration');
  for (const entry of encounters) for (const entryWave of entry.waves) {
    if (entryWave.maxConcurrentRobots > budget.maxActiveRobots) throw new Error(`wave ${entryWave.id} exceeds maxActiveRobots`);
  }
  if (level.story !== undefined) story(level.story);
  unique(strings(level.tags, 'level.tags'), 'level.tags');
  return level as unknown as LevelDefinition;
}

export function serializeLevelDefinition(level: LevelDefinition): string {
  return canonicalJson(validateLevelDefinition(level));
}

export function levelDefinitionHash(level: LevelDefinition): string {
  return checksumCanonical(validateLevelDefinition(level));
}
