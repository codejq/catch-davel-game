import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const output = fileURLToPath(new URL('../src/content/schema/level-definition.schema.json', import.meta.url));
const id = { type: 'string', pattern: '^[a-z0-9][a-z0-9._-]*$', maxLength: 256 };
const nullableId = { anyOf: [id, { type: 'null' }] };
const idArray = { type: 'array', maxItems: 1000, uniqueItems: true, items: id };
const integer = (minimum = 0, maximum) => ({ type: 'integer', minimum, ...(maximum === undefined ? {} : { maximum }) });
const strict = (properties, required = Object.keys(properties)) => ({
  type: 'object', additionalProperties: false, required, properties,
});
const binding = strict({ presetId: id, override: { type: 'object' } }, ['presetId']);

const definitions = {
  presetBinding: binding,
  integerRange: strict({ minimum: integer(), maximum: integer() }),
  mazeNode: strict({
    id,
    role: { enum: ['entrance', 'corridor', 'arena', 'checkpoint', 'exit', 'secret'] },
    templateTags: idArray,
    sizeClass: { enum: ['small', 'medium', 'large'] },
    encounterIds: idArray,
    pickupIds: idArray,
    checkpointId: nullableId,
    storyIds: idArray,
    criticalPath: { type: 'boolean' },
  }),
  mazeEdge: strict({
    id, from: id, to: id, bidirectional: { type: 'boolean' }, requiredKeyId: nullableId,
    doorType: { enum: ['open', 'workshop-lock', 'ticket-gate', 'arena-lock'] },
    traversalCost: integer(1, 1000), stateTrigger: nullableId,
  }),
  key: strict({ id, placementNodeId: id }),
  hazard: strict({ id, nodeId: id, periodTicks: integer(1, 36000), activeTicks: integer(1, 36000), collisionProfileId: id }),
  maze: strict({
    templateSetId: id, generatorVersion: integer(1),
    criticalPathRooms: { $ref: '#/$defs/integerRange' }, optionalRooms: { $ref: '#/$defs/integerRange' },
    maxBranchDepth: integer(0, 32), secretCount: integer(0, 100), entranceNodeId: id, exitNodeId: id,
    nodes: { type: 'array', minItems: 2, maxItems: 1024, items: { $ref: '#/$defs/mazeNode' } },
    edges: { type: 'array', minItems: 1, maxItems: 4096, items: { $ref: '#/$defs/mazeEdge' } },
    keys: { type: 'array', maxItems: 100, items: { $ref: '#/$defs/key' } },
    hazards: { type: 'array', maxItems: 64, items: { $ref: '#/$defs/hazard' } },
    generationAttempts: integer(1, 1000), validationProfile: id,
  }),
  objective: strict({
    id,
    type: { enum: ['deactivate', 'recover-keys', 'shutdown', 'survive', 'hunt', 'defend', 'escape', 'boss'] },
    required: { type: 'boolean' }, titleKey: id, targetIds: idArray,
    targetCount: { anyOf: [integer(1), { type: 'null' }] },
    durationTicks: { anyOf: [integer(1), { type: 'null' }] },
    dependsOn: idArray, completionMode: { enum: ['all', 'any', 'count', 'timer', 'reach'] },
    markerPolicy: { enum: ['always', 'discovered', 'nearby', 'none'] },
  }),
  spawnGroup: strict({
    id, archetypeId: id, count: integer(1, 24), modifierIds: idArray, spawnPointSetId: id,
    dancePresetId: id, aiProfileId: id, rewardProfileId: id, rngStream: id,
    rank: { enum: ['normal', 'elite', 'boss'] }, accessibilityVerificationId: id,
  }),
  wave: strict({
    id, startCondition: { enum: ['encounter-start', 'previous-wave-complete', 'timer'] },
    startDelayTicks: integer(0, 36000),
    spawnGroups: { type: 'array', minItems: 1, maxItems: 24, items: { $ref: '#/$defs/spawnGroup' } },
    maxConcurrentRobots: integer(1, 24), interGroupDelayTicks: integer(0, 36000), danceTransitionId: nullableId,
    completion: { enum: ['all-defeated', 'timer', 'target-defeated'] }, invalidSpawnPolicy: { const: 'fail-level' },
  }),
  encounter: strict({
    id, roomNodeId: id, trigger: { enum: ['on-enter', 'on-objective', 'on-interact', 'on-tick', 'on-wave-complete'] },
    triggerRef: nullableId, arenaLock: { type: 'boolean' },
    waves: { type: 'array', minItems: 1, maxItems: 100, items: { $ref: '#/$defs/wave' } },
    completion: { enum: ['all-defeated', 'timer', 'target-defeated', 'objective-event'] },
    rewardId: nullableId, checkpointOnComplete: nullableId,
  }),
  dance: strict({
    presetId: id, grammarVersion: integer(1, 1000), bpm: integer(40, 220), timeSignature: { enum: ['4/4', '3/4', '7/8'] },
    barsPerPhrase: integer(1, 32), footPatternId: id, torsoPatternId: id, armPatternId: id, headAccentId: id,
    pathPatternId: id, attackBeats: { type: 'array', uniqueItems: true, items: integer() },
    vulnerableBeats: { type: 'array', uniqueItems: true, items: integer() }, transitionIds: idArray,
    visualIntensity: { type: 'number', minimum: 0, maximum: 1 }, reducedMotionPresetId: id,
  }),
  dependencies: strict({
    simulationSchema: { type: 'string', pattern: '^[0-9a-f]{16}$' },
    effectiveLevel: { type: 'string', pattern: '^[0-9a-f]{16}$' },
    simulationLevel: { type: 'string', pattern: '^[0-9a-f]{16}$' },
    balanceData: { type: 'string', pattern: '^[0-9a-f]{16}$' },
    policyOrReplay: { type: 'string', pattern: '^[0-9a-f]{16}$' },
  }),
  agentRun: strict({
    id, mode: { enum: ['live-agent', 'reference-replay'] }, policyId: nullableId,
    policyVersion: { anyOf: [integer(1), { type: 'null' }] }, referenceReplayId: nullableId,
    seed: id, difficulty: { enum: ['Story', 'Standard', 'Hard'] }, assistProfileId: nullableId,
    maxTicks: integer(1, 3600000), stuckTimeoutTicks: integer(1, 3600000), maxIllegalActions: integer(0, 1000),
    requiredObjectiveIds: idArray, expectedCompletion: { type: 'boolean' },
    expectedChecksum: { anyOf: [{ type: 'string', pattern: '^[0-9a-f]{16}$' }, { type: 'null' }] },
    parTicks: integer(1, 3600000), dependencyHashes: { $ref: '#/$defs/dependencies' },
  }),
  agentValidation: strict({
    tier: { enum: ['ordinary', 'boss', 'named-elite'] },
    runs: { type: 'array', minItems: 1, maxItems: 100, items: { $ref: '#/$defs/agentRun' } }, owner: id,
  }),
  performance: strict({
    maxActiveRobots: integer(1, 24), maxActiveProjectiles: integer(1, 64), maxActivePickups: integer(0, 64),
    maxHazards: integer(0, 64), maxMazeNodes: integer(2, 1024), maxRenderInstances: integer(1, 100000),
    expectedPeakDrawCalls: integer(1, 1000), expectedPeakMemoryMb: integer(1, 4096), benchmarkScenarioIds: idArray,
  }),
  story: strict({
    introId: nullableId, outroId: nullableId, logIds: idArray, dialogueCueIds: idArray,
    localizationKeys: idArray, skippable: { type: 'boolean' },
  }),
};

const schema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://quantum-billing.example/schemas/zama-sniper/level-definition-v1.json',
  title: 'Zama Sniper LevelDefinition v1',
  ...strict({
    schemaVersion: { const: 1 }, id: { type: 'string', pattern: '^level-\\d{3}$' }, number: integer(1, 36),
    chapterId: { type: 'string', pattern: '^chapter-\\d{2}$' }, nameKey: id, briefingKey: id, seed: id,
    palette: { $ref: '#/$defs/presetBinding' }, maze: { $ref: '#/$defs/maze' },
    objectives: { type: 'array', minItems: 1, maxItems: 100, items: { $ref: '#/$defs/objective' } },
    encounters: { type: 'array', minItems: 1, maxItems: 100, items: { $ref: '#/$defs/encounter' } },
    dance: { $ref: '#/$defs/dance' }, difficulty: { $ref: '#/$defs/presetBinding' }, economy: { $ref: '#/$defs/presetBinding' },
    checkpoints: { type: 'array', maxItems: 100, items: { $ref: '#/$defs/presetBinding' } },
    audio: { $ref: '#/$defs/presetBinding' }, mastery: { type: 'array', maxItems: 100, items: { $ref: '#/$defs/presetBinding' } },
    agentValidation: { $ref: '#/$defs/agentValidation' }, performance: { $ref: '#/$defs/performance' },
    story: { $ref: '#/$defs/story' }, tags: idArray,
  }, ['schemaVersion', 'id', 'number', 'chapterId', 'nameKey', 'briefingKey', 'seed', 'palette', 'maze', 'objectives', 'encounters', 'dance', 'difficulty', 'economy', 'checkpoints', 'audio', 'mastery', 'agentValidation', 'performance', 'tags']),
  $defs: definitions,
};

const serialized = `${JSON.stringify(schema, null, 2)}\n`;
if (process.argv.includes('--check')) {
  let existing = '';
  try { existing = readFileSync(output, 'utf8'); } catch { /* reported as stale below */ }
  if (existing !== serialized) {
    console.error('Generated level-definition.schema.json is stale; run npm run content:schema');
    process.exitCode = 1;
  }
} else {
  writeFileSync(output, serialized);
  console.log(`Wrote ${output}`);
}
