import { checksumCanonicalContent } from '../content-hash.ts';
import type { LevelDefinition } from '../level-definition.ts';

const ZERO_HASH = '0000000000000000';

const draft: LevelDefinition = {
  schemaVersion: 1, id: 'level-022', number: 22, chapterId: 'chapter-03',
  nameKey: 'levels.022.name', briefingKey: 'levels.022.briefing', seed: 'campaign-level-022-v1',
  palette: { presetId: 'toxic-boiler-22' },
  maze: {
    templateSetId: 'boiler-green-steam', generatorVersion: 1,
    criticalPathRooms: { minimum: 6, maximum: 6 }, optionalRooms: { minimum: 1, maximum: 1 },
    maxBranchDepth: 1, secretCount: 0, entranceNodeId: 'steam-intake', exitNodeId: 'clear-air-exit',
    nodes: [
      { id: 'steam-intake', role: 'entrance', templateTags: ['toxic-boiler', 'steam-intake'], sizeClass: 'small', encounterIds: [], pickupIds: ['repair-kit'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'filter-control', role: 'corridor', templateTags: ['toxic-boiler', 'filter-key'], sizeClass: 'medium', encounterIds: [], pickupIds: ['filter-key'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'green-steam-crossing', role: 'corridor', templateTags: ['toxic-boiler', 'visibility-pulses'], sizeClass: 'large', encounterIds: [], pickupIds: ['pulse-cell'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'toxic-tango-floor', role: 'arena', templateTags: ['toxic-boiler', 'steam-lanes', 'toxic-tango'], sizeClass: 'large', encounterIds: ['green-steam-company'], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'scrubber-bypass', role: 'corridor', templateTags: ['toxic-boiler', 'optional-scrubber'], sizeClass: 'medium', encounterIds: [], pickupIds: ['coin-cache'], checkpointId: null, storyIds: [], criticalPath: false },
      { id: 'steam-checkpoint', role: 'checkpoint', templateTags: ['toxic-boiler', 'recovery'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: 'checkpoint-022', storyIds: [], criticalPath: true },
      { id: 'clear-air-exit', role: 'exit', templateTags: ['toxic-boiler', 'objective-exit'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
    ],
    edges: [
      { id: 'intake-filter', from: 'steam-intake', to: 'filter-control', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'filter-crossing', from: 'filter-control', to: 'green-steam-crossing', bidirectional: true, requiredKeyId: 'filter-key', doorType: 'workshop-lock', traversalCost: 1, stateTrigger: 'key-collected' },
      { id: 'crossing-floor', from: 'green-steam-crossing', to: 'toxic-tango-floor', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'floor-checkpoint', from: 'toxic-tango-floor', to: 'steam-checkpoint', bidirectional: true, requiredKeyId: null, doorType: 'arena-lock', traversalCost: 1, stateTrigger: null },
      { id: 'checkpoint-exit', from: 'steam-checkpoint', to: 'clear-air-exit', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: 'primary-objective' },
      { id: 'filter-bypass', from: 'filter-control', to: 'scrubber-bypass', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 2, stateTrigger: null },
      { id: 'bypass-floor', from: 'scrubber-bypass', to: 'toxic-tango-floor', bidirectional: true, requiredKeyId: 'filter-key', doorType: 'workshop-lock', traversalCost: 2, stateTrigger: 'key-collected' },
    ],
    keys: [{ id: 'filter-key', placementNodeId: 'filter-control' }],
    hazards: [
      { id: 'green-steam-north', nodeId: 'green-steam-crossing', periodTicks: 180, activeTicks: 120, collisionProfileId: 'green-steam-north-v1' },
      { id: 'green-steam-south', nodeId: 'toxic-tango-floor', periodTicks: 180, activeTicks: 120, collisionProfileId: 'green-steam-south-v1' },
      { id: 'green-steam-spine', nodeId: 'toxic-tango-floor', periodTicks: 180, activeTicks: 120, collisionProfileId: 'green-steam-spine-v1' },
    ],
    generationAttempts: 1, validationProfile: 'authored-grid-v1',
  },
  objectives: [{
    id: 'clear-green-steam', type: 'survive', required: true, titleKey: 'objectives.level_022',
    targetIds: ['haze-warmup', 'toxic-encore'], targetCount: 9,
    durationTicks: null, dependsOn: [], completionMode: 'count', markerPolicy: 'always',
  }],
  encounters: [{
    id: 'green-steam-company', roomNodeId: 'toxic-tango-floor', trigger: 'on-enter', triggerRef: null,
    arenaLock: true, waves: [{
      id: 'haze-warmup', startCondition: 'encounter-start', startDelayTicks: 0,
      spawnGroups: [
        { id: 'haze-wobblers', archetypeId: 'wobble-scout', count: 2, modifierIds: ['filter-mask'], spawnPointSetId: 'level-022-arena-1', dancePresetId: 'toxic-toe-tango', aiProfileId: 'chapter-03-stage-22', rewardProfileId: 'chapter-03-coins-22', rngStream: 'encounter.level-022.wave-1.wobblers', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
        { id: 'haze-slider', archetypeId: 'blue-slider', count: 1, modifierIds: ['steam-skater'], spawnPointSetId: 'level-022-arena-1', dancePresetId: 'toxic-toe-tango', aiProfileId: 'chapter-03-stage-22', rewardProfileId: 'chapter-03-coins-22', rngStream: 'encounter.level-022.wave-1.slider', rank: 'normal', accessibilityVerificationId: 'silhouette-blue-slider-v1' },
        { id: 'haze-spinner', archetypeId: 'yellow-spinner', count: 1, modifierIds: ['scrubber-wheel'], spawnPointSetId: 'level-022-arena-1', dancePresetId: 'toxic-toe-tango', aiProfileId: 'chapter-03-stage-22', rewardProfileId: 'chapter-03-coins-22', rngStream: 'encounter.level-022.wave-1.spinner', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
      ], maxConcurrentRobots: 4, interGroupDelayTicks: 8, danceTransitionId: null,
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'toxic-encore', startCondition: 'previous-wave-complete', startDelayTicks: 22,
      spawnGroups: [
        { id: 'encore-slider', archetypeId: 'blue-slider', count: 1, modifierIds: ['steam-skater'], spawnPointSetId: 'level-022-arena-2', dancePresetId: 'toxic-toe-tango', aiProfileId: 'chapter-03-stage-22', rewardProfileId: 'chapter-03-coins-22', rngStream: 'encounter.level-022.wave-2.slider', rank: 'normal', accessibilityVerificationId: 'silhouette-blue-slider-v1' },
        { id: 'encore-spinner', archetypeId: 'yellow-spinner', count: 1, modifierIds: ['toxic-toe'], spawnPointSetId: 'level-022-arena-2', dancePresetId: 'toxic-toe-tango', aiProfileId: 'chapter-03-stage-22', rewardProfileId: 'chapter-03-coins-22', rngStream: 'encounter.level-022.wave-2.spinner', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
        { id: 'encore-firemouth', archetypeId: 'red-firemouth', count: 1, modifierIds: ['green-flame'], spawnPointSetId: 'level-022-arena-2', dancePresetId: 'toxic-toe-tango', aiProfileId: 'chapter-03-stage-22', rewardProfileId: 'chapter-03-coins-22', rngStream: 'encounter.level-022.wave-2.firemouth', rank: 'normal', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
        { id: 'steam-foreman', archetypeId: 'red-firemouth', count: 1, modifierIds: ['scrubber-foreman'], spawnPointSetId: 'level-022-arena-2', dancePresetId: 'toxic-toe-tango', aiProfileId: 'chapter-03-stage-22', rewardProfileId: 'chapter-03-coins-22', rngStream: 'encounter.level-022.wave-2.foreman', rank: 'elite', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
        { id: 'toxic-dj', archetypeId: 'cyan-dj', count: 1, modifierIds: ['haze-conductor'], spawnPointSetId: 'level-022-arena-2', dancePresetId: 'toxic-toe-tango', aiProfileId: 'chapter-03-stage-22', rewardProfileId: 'chapter-03-coins-22', rngStream: 'encounter.level-022.wave-2.dj', rank: 'elite', accessibilityVerificationId: 'silhouette-cyan-dj-v1' },
      ], maxConcurrentRobots: 5, interGroupDelayTicks: 7, danceTransitionId: 'toxic-encore',
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }], completion: 'all-defeated', rewardId: 'chapter-03-clear-022', checkpointOnComplete: null,
  }],
  dance: {
    presetId: 'toxic-toe-tango', grammarVersion: 1, bpm: 130, timeSignature: '4/4', barsPerPhrase: 4,
    footPatternId: 'toxic-toe-tango-feet-v1', torsoPatternId: 'toxic-toe-tango-torso-v1',
    armPatternId: 'toxic-toe-tango-arms-v1', headAccentId: 'toxic-toe-tango-head-v1',
    pathPatternId: 'toxic-toe-tango-path-v1', attackBeats: [1, 5, 9, 13],
    vulnerableBeats: [3, 7, 11, 15], transitionIds: ['toxic-encore', 'objective-clear'],
    visualIntensity: 0.9, reducedMotionPresetId: 'toxic-toe-tango-reduced-v1',
  },
  difficulty: { presetId: 'standard-chapter-03-022' }, economy: { presetId: 'economy-chapter-03-022' },
  checkpoints: [{ presetId: 'checkpoint-022' }], audio: { presetId: 'audio-toxic-boiler-022' },
  mastery: [{ presetId: 'level-022-par-time' }, { presetId: 'level-022-clear-vision' }],
  agentValidation: {
    tier: 'ordinary', owner: 'gameplay-qa', runs: [{
      id: 'standard-live', mode: 'live-agent', policyId: 'baseline-campaign-agent', policyVersion: 1,
      referenceReplayId: null, seed: 'campaign-level-022-v1', difficulty: 'Standard', assistProfileId: null,
      maxTicks: 14_000, stuckTimeoutTicks: 2_000, maxIllegalActions: 0,
      requiredObjectiveIds: ['clear-green-steam'], expectedCompletion: true, expectedChecksum: null,
      parTicks: 9_800,
      dependencyHashes: {
        simulationSchema: '6cafd562c735e11d', effectiveLevel: ZERO_HASH, simulationLevel: 'ed22c5c39b4e5213',
        balanceData: '1f697b70870c7801', policyOrReplay: '5eedcddff4365989',
      },
    }],
  },
  performance: {
    maxActiveRobots: 5, maxActiveProjectiles: 54, maxActivePickups: 4, maxHazards: 3,
    maxMazeNodes: 9, maxRenderInstances: 1_024, expectedPeakDrawCalls: 8,
    expectedPeakMemoryMb: 192, benchmarkScenarioIds: ['level-022-standard-live'],
  },
  tags: ['chapter-03', 'toxic-boiler', 'visibility-pulses', 'steam-lanes', 'toxic-toe-tango'],
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

export const LEVEL_022: LevelDefinition = {
  ...draft,
  agentValidation: {
    ...draft.agentValidation,
    runs: draft.agentValidation.runs.map((run) => ({
      ...run,
      dependencyHashes: { ...run.dependencyHashes, effectiveLevel },
    })),
  },
};
