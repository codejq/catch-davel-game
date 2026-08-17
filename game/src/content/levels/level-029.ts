import { checksumCanonicalContent } from '../content-hash.ts';
import type { LevelDefinition } from '../level-definition.ts';

const ZERO_HASH = '0000000000000000';

const draft: LevelDefinition = {
  schemaVersion: 1, id: 'level-029', number: 29, chapterId: 'chapter-03',
  nameKey: 'levels.029.name', briefingKey: 'levels.029.briefing', seed: 'campaign-level-029-v1',
  palette: { presetId: 'toxic-boiler-29' },
  maze: {
    templateSetId: 'boiler-fever-tunnels', generatorVersion: 1,
    criticalPathRooms: { minimum: 7, maximum: 7 }, optionalRooms: { minimum: 1, maximum: 1 },
    maxBranchDepth: 1, secretCount: 0, entranceNodeId: 'fever-entry', exitNodeId: 'antidote-exit',
    nodes: [
      { id: 'fever-entry', role: 'entrance', templateTags: ['toxic-boiler', 'fever-gate'], sizeClass: 'small', encounterIds: [], pickupIds: ['repair-kit'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'filter-locker', role: 'corridor', templateTags: ['toxic-boiler', 'filter-key'], sizeClass: 'medium', encounterIds: [], pickupIds: ['fever-filter-key'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'west-flame-throat', role: 'corridor', templateTags: ['toxic-boiler', 'flame-shutter'], sizeClass: 'medium', encounterIds: [], pickupIds: ['pulse-cell'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'poison-crossflow', role: 'corridor', templateTags: ['toxic-boiler', 'poison-conveyor'], sizeClass: 'large', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'fever-floor', role: 'arena', templateTags: ['toxic-boiler', 'fire-poison-mix'], sizeClass: 'large', encounterIds: ['fever-tunnel-company'], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'antidote-cache', role: 'corridor', templateTags: ['toxic-boiler', 'optional-antidote'], sizeClass: 'medium', encounterIds: [], pickupIds: ['coin-cache'], checkpointId: null, storyIds: [], criticalPath: false },
      { id: 'fever-checkpoint', role: 'checkpoint', templateTags: ['toxic-boiler', 'recovery'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: 'checkpoint-029', storyIds: [], criticalPath: true },
      { id: 'antidote-exit', role: 'exit', templateTags: ['toxic-boiler', 'objective-exit'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
    ],
    edges: [
      { id: 'entry-locker', from: 'fever-entry', to: 'filter-locker', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'locker-flame', from: 'filter-locker', to: 'west-flame-throat', bidirectional: true, requiredKeyId: 'fever-filter-key', doorType: 'workshop-lock', traversalCost: 1, stateTrigger: 'key-collected' },
      { id: 'flame-crossflow', from: 'west-flame-throat', to: 'poison-crossflow', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'crossflow-floor', from: 'poison-crossflow', to: 'fever-floor', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'floor-checkpoint', from: 'fever-floor', to: 'fever-checkpoint', bidirectional: true, requiredKeyId: null, doorType: 'arena-lock', traversalCost: 1, stateTrigger: null },
      { id: 'checkpoint-exit', from: 'fever-checkpoint', to: 'antidote-exit', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: 'primary-objective' },
      { id: 'crossflow-cache', from: 'poison-crossflow', to: 'antidote-cache', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 2, stateTrigger: null },
      { id: 'cache-floor', from: 'antidote-cache', to: 'fever-floor', bidirectional: true, requiredKeyId: 'fever-filter-key', doorType: 'workshop-lock', traversalCost: 2, stateTrigger: 'key-collected' },
    ],
    keys: [{ id: 'fever-filter-key', placementNodeId: 'filter-locker' }],
    hazards: [
      { id: 'fever-flame-west', nodeId: 'west-flame-throat', periodTicks: 180, activeTicks: 72, collisionProfileId: 'fever-flame-west-v1' },
      { id: 'fever-flame-east', nodeId: 'poison-crossflow', periodTicks: 180, activeTicks: 72, collisionProfileId: 'fever-flame-east-v1' },
      { id: 'fever-poison-north', nodeId: 'poison-crossflow', periodTicks: 240, activeTicks: 168, collisionProfileId: 'fever-poison-north-v1' },
      { id: 'fever-poison-south', nodeId: 'fever-floor', periodTicks: 240, activeTicks: 168, collisionProfileId: 'fever-poison-south-v1' },
    ],
    generationAttempts: 1, validationProfile: 'authored-grid-v1',
  },
  objectives: [{
    id: 'clear-fever-tunnels', type: 'deactivate', required: true, titleKey: 'objectives.level_029',
    targetIds: ['fever-warmup', 'toxic-cross-step', 'boiling-encore'], targetCount: 10,
    durationTicks: null, dependsOn: [], completionMode: 'count', markerPolicy: 'always',
  }],
  encounters: [{
    id: 'fever-tunnel-company', roomNodeId: 'fever-floor', trigger: 'on-enter', triggerRef: null,
    arenaLock: true, waves: [{
      id: 'fever-warmup', startCondition: 'encounter-start', startDelayTicks: 0,
      spawnGroups: [
        { id: 'warmup-wobblers', archetypeId: 'wobble-scout', count: 2, modifierIds: ['fever-grin'], spawnPointSetId: 'level-029-arena-1', dancePresetId: 'feverish-salsa', aiProfileId: 'chapter-03-stage-29', rewardProfileId: 'chapter-03-coins-29', rngStream: 'encounter.level-029.wave-1.wobblers', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
        { id: 'warmup-spinner', archetypeId: 'yellow-spinner', count: 1, modifierIds: ['thermometer-spin'], spawnPointSetId: 'level-029-arena-1', dancePresetId: 'feverish-salsa', aiProfileId: 'chapter-03-stage-29', rewardProfileId: 'chapter-03-coins-29', rngStream: 'encounter.level-029.wave-1.spinner', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
      ], maxConcurrentRobots: 3, interGroupDelayTicks: 6, danceTransitionId: null,
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'toxic-cross-step', startCondition: 'previous-wave-complete', startDelayTicks: 16,
      spawnGroups: [
        { id: 'cross-step-sliders', archetypeId: 'blue-slider', count: 2, modifierIds: ['poison-skates'], spawnPointSetId: 'level-029-arena-2', dancePresetId: 'feverish-salsa', aiProfileId: 'chapter-03-stage-29', rewardProfileId: 'chapter-03-coins-29', rngStream: 'encounter.level-029.wave-2.sliders', rank: 'normal', accessibilityVerificationId: 'silhouette-blue-slider-v1' },
        { id: 'cross-step-firemouth', archetypeId: 'red-firemouth', count: 1, modifierIds: ['fever-flare'], spawnPointSetId: 'level-029-arena-2', dancePresetId: 'feverish-salsa', aiProfileId: 'chapter-03-stage-29', rewardProfileId: 'chapter-03-coins-29', rngStream: 'encounter.level-029.wave-2.firemouth', rank: 'normal', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
      ], maxConcurrentRobots: 3, interGroupDelayTicks: 6, danceTransitionId: 'toxic-cross-step',
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'boiling-encore', startCondition: 'previous-wave-complete', startDelayTicks: 14,
      spawnGroups: [
        { id: 'encore-dj', archetypeId: 'cyan-dj', count: 1, modifierIds: ['fever-conductor'], spawnPointSetId: 'level-029-arena-3', dancePresetId: 'feverish-salsa', aiProfileId: 'chapter-03-stage-29', rewardProfileId: 'chapter-03-coins-29', rngStream: 'encounter.level-029.wave-3.dj', rank: 'elite', accessibilityVerificationId: 'silhouette-cyan-dj-v1' },
        { id: 'encore-foreman', archetypeId: 'red-firemouth', count: 1, modifierIds: ['boiling-foreman'], spawnPointSetId: 'level-029-arena-3', dancePresetId: 'feverish-salsa', aiProfileId: 'chapter-03-stage-29', rewardProfileId: 'chapter-03-coins-29', rngStream: 'encounter.level-029.wave-3.foreman', rank: 'elite', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
        { id: 'encore-spinner', archetypeId: 'yellow-spinner', count: 1, modifierIds: ['toxic-pinwheel'], spawnPointSetId: 'level-029-arena-3', dancePresetId: 'feverish-salsa', aiProfileId: 'chapter-03-stage-29', rewardProfileId: 'chapter-03-coins-29', rngStream: 'encounter.level-029.wave-3.spinner', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
        { id: 'encore-wobbler', archetypeId: 'wobble-scout', count: 1, modifierIds: ['sickly-smile'], spawnPointSetId: 'level-029-arena-3', dancePresetId: 'feverish-salsa', aiProfileId: 'chapter-03-stage-29', rewardProfileId: 'chapter-03-coins-29', rngStream: 'encounter.level-029.wave-3.wobbler', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
      ], maxConcurrentRobots: 4, interGroupDelayTicks: 5, danceTransitionId: 'boiling-encore',
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }], completion: 'all-defeated', rewardId: 'chapter-03-clear-029', checkpointOnComplete: null,
  }],
  dance: {
    presetId: 'feverish-salsa', grammarVersion: 1, bpm: 158, timeSignature: '4/4', barsPerPhrase: 4,
    footPatternId: 'feverish-salsa-feet-v1', torsoPatternId: 'feverish-salsa-torso-v1',
    armPatternId: 'feverish-salsa-arms-v1', headAccentId: 'feverish-salsa-head-v1',
    pathPatternId: 'feverish-salsa-path-v1', attackBeats: [1, 4, 9, 12],
    vulnerableBeats: [3, 7, 11, 15], transitionIds: ['toxic-cross-step', 'boiling-encore', 'objective-clear'],
    visualIntensity: 1, reducedMotionPresetId: 'feverish-salsa-reduced-v1',
  },
  difficulty: { presetId: 'standard-chapter-03-029' }, economy: { presetId: 'economy-chapter-03-029' },
  checkpoints: [{ presetId: 'checkpoint-029' }], audio: { presetId: 'audio-toxic-boiler-029' },
  mastery: [{ presetId: 'level-029-par-time' }, { presetId: 'level-029-no-fever-hit' }],
  agentValidation: {
    tier: 'ordinary', owner: 'gameplay-qa', runs: [{
      id: 'standard-live', mode: 'live-agent', policyId: 'baseline-campaign-agent', policyVersion: 1,
      referenceReplayId: null, seed: 'campaign-level-029-v1', difficulty: 'Standard', assistProfileId: null,
      maxTicks: 16_000, stuckTimeoutTicks: 2_000, maxIllegalActions: 0,
      requiredObjectiveIds: ['clear-fever-tunnels'], expectedCompletion: true, expectedChecksum: null,
      parTicks: 12_500,
      dependencyHashes: {
        simulationSchema: '7673b9fb7039c568', effectiveLevel: ZERO_HASH, simulationLevel: '042561dfffe467b1',
        balanceData: 'c1df429a54459a12', policyOrReplay: 'c00c7c2e50668d3b',
      },
    }],
  },
  performance: {
    maxActiveRobots: 4, maxActiveProjectiles: 64, maxActivePickups: 4, maxHazards: 4,
    maxMazeNodes: 10, maxRenderInstances: 1_024, expectedPeakDrawCalls: 8,
    expectedPeakMemoryMb: 192, benchmarkScenarioIds: ['level-029-standard-live'],
  },
  tags: ['chapter-03', 'toxic-boiler', 'fire-poison-remix', 'fever-tunnels', 'feverish-salsa'],
};

const normalizedForHash: LevelDefinition = {
  ...draft,
  agentValidation: {
    ...draft.agentValidation,
    runs: draft.agentValidation.runs.map((run) => ({
      ...run,
      dependencyHashes: {
        simulationSchema: ZERO_HASH, effectiveLevel: ZERO_HASH, simulationLevel: ZERO_HASH,
        balanceData: ZERO_HASH, policyOrReplay: ZERO_HASH,
      },
    })),
  },
};

const effectiveLevel = checksumCanonicalContent(normalizedForHash);

export const LEVEL_029: LevelDefinition = {
  ...draft,
  agentValidation: {
    ...draft.agentValidation,
    runs: draft.agentValidation.runs.map((run) => ({
      ...run,
      dependencyHashes: { ...run.dependencyHashes, effectiveLevel },
    })),
  },
};
