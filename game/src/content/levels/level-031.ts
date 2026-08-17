import { checksumCanonicalContent } from '../content-hash.ts';
import type { LevelDefinition } from '../level-definition.ts';

const ZERO_HASH = '0000000000000000';

const draft: LevelDefinition = {
  schemaVersion: 1, id: 'level-031', number: 31, chapterId: 'chapter-04',
  nameKey: 'levels.031.name', briefingKey: 'levels.031.briefing', seed: 'campaign-level-031-v1',
  palette: { presetId: 'cold-storage-31' },
  maze: {
    templateSetId: 'cold-storage-reception', generatorVersion: 1,
    criticalPathRooms: { minimum: 7, maximum: 7 }, optionalRooms: { minimum: 1, maximum: 1 },
    maxBranchDepth: 1, secretCount: 0, entranceNodeId: 'thaw-entry', exitNodeId: 'freezer-exit',
    nodes: [
      { id: 'thaw-entry', role: 'entrance', templateTags: ['cold-storage', 'warm-airlock'], sizeClass: 'small', encounterIds: [], pickupIds: ['repair-kit'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'coat-check', role: 'corridor', templateTags: ['cold-storage', 'reception-key'], sizeClass: 'medium', encounterIds: [], pickupIds: ['frost-key'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'welcome-ice', role: 'corridor', templateTags: ['cold-storage', 'ice-tutorial'], sizeClass: 'large', encounterIds: [], pickupIds: ['pulse-cell'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'cold-reception', role: 'arena', templateTags: ['cold-storage', 'icy-arena'], sizeClass: 'large', encounterIds: ['cold-reception-company'], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'heated-office', role: 'corridor', templateTags: ['cold-storage', 'optional-warmth'], sizeClass: 'medium', encounterIds: [], pickupIds: ['coin-cache'], checkpointId: null, storyIds: [], criticalPath: false },
      { id: 'packing-lane', role: 'corridor', templateTags: ['cold-storage', 'cross-ice'], sizeClass: 'medium', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'cold-checkpoint', role: 'checkpoint', templateTags: ['cold-storage', 'recovery'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: 'checkpoint-031', storyIds: [], criticalPath: true },
      { id: 'freezer-exit', role: 'exit', templateTags: ['cold-storage', 'objective-exit'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
    ],
    edges: [
      { id: 'entry-coat-check', from: 'thaw-entry', to: 'coat-check', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'coat-check-ice', from: 'coat-check', to: 'welcome-ice', bidirectional: true, requiredKeyId: 'frost-key', doorType: 'workshop-lock', traversalCost: 1, stateTrigger: 'key-collected' },
      { id: 'ice-reception', from: 'welcome-ice', to: 'cold-reception', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'reception-packing', from: 'cold-reception', to: 'packing-lane', bidirectional: true, requiredKeyId: null, doorType: 'arena-lock', traversalCost: 1, stateTrigger: null },
      { id: 'packing-checkpoint', from: 'packing-lane', to: 'cold-checkpoint', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'checkpoint-exit', from: 'cold-checkpoint', to: 'freezer-exit', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: 'primary-objective' },
      { id: 'coat-office', from: 'coat-check', to: 'heated-office', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 2, stateTrigger: null },
      { id: 'office-reception', from: 'heated-office', to: 'cold-reception', bidirectional: true, requiredKeyId: 'frost-key', doorType: 'workshop-lock', traversalCost: 2, stateTrigger: 'key-collected' },
    ],
    keys: [{ id: 'frost-key', placementNodeId: 'coat-check' }],
    hazards: [
      { id: 'welcome-ice-east', nodeId: 'welcome-ice', periodTicks: 240, activeTicks: 240, collisionProfileId: 'cold-reception-ice-east-v1' },
      { id: 'reception-ice-west', nodeId: 'cold-reception', periodTicks: 240, activeTicks: 240, collisionProfileId: 'cold-reception-ice-west-v1' },
      { id: 'packing-ice-north', nodeId: 'packing-lane', periodTicks: 240, activeTicks: 240, collisionProfileId: 'cold-reception-ice-north-v1' },
    ],
    generationAttempts: 1, validationProfile: 'authored-grid-v1',
  },
  objectives: [{
    id: 'clear-cold-reception', type: 'deactivate', required: true, titleKey: 'objectives.level_031',
    targetIds: ['icy-welcome', 'slippery-service', 'chilly-encore'], targetCount: 10,
    durationTicks: null, dependsOn: [], completionMode: 'count', markerPolicy: 'always',
  }],
  encounters: [{
    id: 'cold-reception-company', roomNodeId: 'cold-reception', trigger: 'on-enter', triggerRef: null,
    arenaLock: true, waves: [{
      id: 'icy-welcome', startCondition: 'encounter-start', startDelayTicks: 0,
      spawnGroups: [
        { id: 'welcome-wobblers', archetypeId: 'wobble-scout', count: 2, modifierIds: ['mittens-and-menace'], spawnPointSetId: 'level-031-arena-1', dancePresetId: 'chilly-funk-walk', aiProfileId: 'chapter-04-stage-31', rewardProfileId: 'chapter-04-coins-31', rngStream: 'encounter.level-031.wave-1.wobblers', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
        { id: 'welcome-spinner', archetypeId: 'yellow-spinner', count: 1, modifierIds: ['snowflake-spin'], spawnPointSetId: 'level-031-arena-1', dancePresetId: 'chilly-funk-walk', aiProfileId: 'chapter-04-stage-31', rewardProfileId: 'chapter-04-coins-31', rngStream: 'encounter.level-031.wave-1.spinner', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
      ], maxConcurrentRobots: 3, interGroupDelayTicks: 7, danceTransitionId: null,
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'slippery-service', startCondition: 'previous-wave-complete', startDelayTicks: 18,
      spawnGroups: [
        { id: 'service-sliders', archetypeId: 'blue-slider', count: 2, modifierIds: ['ice-skates'], spawnPointSetId: 'level-031-arena-2', dancePresetId: 'chilly-funk-walk', aiProfileId: 'chapter-04-stage-31', rewardProfileId: 'chapter-04-coins-31', rngStream: 'encounter.level-031.wave-2.sliders', rank: 'normal', accessibilityVerificationId: 'silhouette-blue-slider-v1' },
        { id: 'service-firemouth', archetypeId: 'red-firemouth', count: 1, modifierIds: ['freezer-burn'], spawnPointSetId: 'level-031-arena-2', dancePresetId: 'chilly-funk-walk', aiProfileId: 'chapter-04-stage-31', rewardProfileId: 'chapter-04-coins-31', rngStream: 'encounter.level-031.wave-2.firemouth', rank: 'normal', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
      ], maxConcurrentRobots: 3, interGroupDelayTicks: 7, danceTransitionId: 'slippery-service',
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'chilly-encore', startCondition: 'previous-wave-complete', startDelayTicks: 16,
      spawnGroups: [
        { id: 'encore-dj', archetypeId: 'cyan-dj', count: 1, modifierIds: ['subzero-conductor'], spawnPointSetId: 'level-031-arena-3', dancePresetId: 'chilly-funk-walk', aiProfileId: 'chapter-04-stage-31', rewardProfileId: 'chapter-04-coins-31', rngStream: 'encounter.level-031.wave-3.dj', rank: 'elite', accessibilityVerificationId: 'silhouette-cyan-dj-v1' },
        { id: 'encore-foreman', archetypeId: 'red-firemouth', count: 1, modifierIds: ['cold-front-foreman'], spawnPointSetId: 'level-031-arena-3', dancePresetId: 'chilly-funk-walk', aiProfileId: 'chapter-04-stage-31', rewardProfileId: 'chapter-04-coins-31', rngStream: 'encounter.level-031.wave-3.foreman', rank: 'elite', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
        { id: 'encore-spinner', archetypeId: 'yellow-spinner', count: 1, modifierIds: ['snow-globe'], spawnPointSetId: 'level-031-arena-3', dancePresetId: 'chilly-funk-walk', aiProfileId: 'chapter-04-stage-31', rewardProfileId: 'chapter-04-coins-31', rngStream: 'encounter.level-031.wave-3.spinner', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
        { id: 'encore-wobbler', archetypeId: 'wobble-scout', count: 1, modifierIds: ['chattering-grin'], spawnPointSetId: 'level-031-arena-3', dancePresetId: 'chilly-funk-walk', aiProfileId: 'chapter-04-stage-31', rewardProfileId: 'chapter-04-coins-31', rngStream: 'encounter.level-031.wave-3.wobbler', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
      ], maxConcurrentRobots: 4, interGroupDelayTicks: 6, danceTransitionId: 'chilly-encore',
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }], completion: 'all-defeated', rewardId: 'chapter-04-clear-031', checkpointOnComplete: null,
  }],
  dance: {
    presetId: 'chilly-funk-walk', grammarVersion: 1, bpm: 118, timeSignature: '4/4', barsPerPhrase: 4,
    footPatternId: 'chilly-funk-walk-feet-v1', torsoPatternId: 'chilly-funk-walk-torso-v1',
    armPatternId: 'chilly-funk-walk-arms-v1', headAccentId: 'chilly-funk-walk-head-v1',
    pathPatternId: 'chilly-funk-walk-path-v1', attackBeats: [1, 5, 9, 13],
    vulnerableBeats: [3, 7, 11, 15], transitionIds: ['slippery-service', 'chilly-encore', 'objective-clear'],
    visualIntensity: 0.92, reducedMotionPresetId: 'chilly-funk-walk-reduced-v1',
  },
  difficulty: { presetId: 'standard-chapter-04-031' }, economy: { presetId: 'economy-chapter-04-031' },
  checkpoints: [{ presetId: 'checkpoint-031' }], audio: { presetId: 'audio-cold-storage-031' },
  mastery: [{ presetId: 'level-031-par-time' }, { presetId: 'level-031-no-ice-wall-hit' }],
  agentValidation: {
    tier: 'ordinary', owner: 'gameplay-qa', runs: [{
      id: 'standard-live', mode: 'live-agent', policyId: 'baseline-campaign-agent', policyVersion: 1,
      referenceReplayId: null, seed: 'campaign-level-031-v1', difficulty: 'Standard', assistProfileId: null,
      maxTicks: 16_000, stuckTimeoutTicks: 2_000, maxIllegalActions: 0,
      requiredObjectiveIds: ['clear-cold-reception'], expectedCompletion: true, expectedChecksum: null,
      parTicks: 12_500,
      dependencyHashes: {
        simulationSchema: '7673b9fb7039c568', effectiveLevel: ZERO_HASH, simulationLevel: 'af693b5ee94f0d79',
        balanceData: 'c1df429a54459a12', policyOrReplay: 'c00c7c2e50668d3b',
      },
    }],
  },
  performance: {
    maxActiveRobots: 4, maxActiveProjectiles: 64, maxActivePickups: 4, maxHazards: 3,
    maxMazeNodes: 10, maxRenderInstances: 1_024, expectedPeakDrawCalls: 8,
    expectedPeakMemoryMb: 192, benchmarkScenarioIds: ['level-031-standard-live'],
  },
  tags: ['chapter-04', 'cold-storage', 'ice-movement-tutorial', 'opposing-ice-lanes', 'chilly-funk-walk'],
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

export const LEVEL_031: LevelDefinition = {
  ...draft,
  agentValidation: {
    ...draft.agentValidation,
    runs: draft.agentValidation.runs.map((run) => ({
      ...run,
      dependencyHashes: { ...run.dependencyHashes, effectiveLevel },
    })),
  },
};
