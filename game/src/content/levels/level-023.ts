import { checksumCanonicalContent } from '../content-hash.ts';
import type { LevelDefinition } from '../level-definition.ts';

const ZERO_HASH = '0000000000000000';

const draft: LevelDefinition = {
  schemaVersion: 1, id: 'level-023', number: 23, chapterId: 'chapter-03',
  nameKey: 'levels.023.name', briefingKey: 'levels.023.briefing', seed: 'campaign-level-023-v1',
  palette: { presetId: 'toxic-boiler-23' },
  maze: {
    templateSetId: 'boiler-firemouth-fiesta', generatorVersion: 1,
    criticalPathRooms: { minimum: 6, maximum: 6 }, optionalRooms: { minimum: 1, maximum: 1 },
    maxBranchDepth: 1, secretCount: 0, entranceNodeId: 'furnace-entry', exitNodeId: 'coolant-exit',
    nodes: [
      { id: 'furnace-entry', role: 'entrance', templateTags: ['toxic-boiler', 'furnace-gate'], sizeClass: 'small', encounterIds: [], pickupIds: ['repair-kit'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'ignition-control', role: 'corridor', templateTags: ['toxic-boiler', 'furnace-key'], sizeClass: 'medium', encounterIds: [], pickupIds: ['furnace-key'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'flame-shutter-crossing', role: 'corridor', templateTags: ['toxic-boiler', 'alternating-flames'], sizeClass: 'large', encounterIds: [], pickupIds: ['pulse-cell'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'firemouth-fiesta-floor', role: 'arena', templateTags: ['toxic-boiler', 'red-firemouth', 'hot-draft'], sizeClass: 'large', encounterIds: ['firemouth-fiesta-company'], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'coolant-gallery', role: 'corridor', templateTags: ['toxic-boiler', 'optional-coolant'], sizeClass: 'medium', encounterIds: [], pickupIds: ['coin-cache'], checkpointId: null, storyIds: [], criticalPath: false },
      { id: 'fiesta-checkpoint', role: 'checkpoint', templateTags: ['toxic-boiler', 'recovery'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: 'checkpoint-023', storyIds: [], criticalPath: true },
      { id: 'coolant-exit', role: 'exit', templateTags: ['toxic-boiler', 'objective-exit'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
    ],
    edges: [
      { id: 'entry-ignition', from: 'furnace-entry', to: 'ignition-control', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'ignition-crossing', from: 'ignition-control', to: 'flame-shutter-crossing', bidirectional: true, requiredKeyId: 'furnace-key', doorType: 'workshop-lock', traversalCost: 1, stateTrigger: 'key-collected' },
      { id: 'crossing-fiesta', from: 'flame-shutter-crossing', to: 'firemouth-fiesta-floor', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'floor-checkpoint', from: 'firemouth-fiesta-floor', to: 'fiesta-checkpoint', bidirectional: true, requiredKeyId: null, doorType: 'arena-lock', traversalCost: 1, stateTrigger: null },
      { id: 'checkpoint-exit', from: 'fiesta-checkpoint', to: 'coolant-exit', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: 'primary-objective' },
      { id: 'ignition-gallery', from: 'ignition-control', to: 'coolant-gallery', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 2, stateTrigger: null },
      { id: 'gallery-fiesta', from: 'coolant-gallery', to: 'firemouth-fiesta-floor', bidirectional: true, requiredKeyId: 'furnace-key', doorType: 'workshop-lock', traversalCost: 2, stateTrigger: 'key-collected' },
    ],
    keys: [{ id: 'furnace-key', placementNodeId: 'ignition-control' }],
    hazards: [
      { id: 'fiesta-flame-west', nodeId: 'flame-shutter-crossing', periodTicks: 210, activeTicks: 84, collisionProfileId: 'fiesta-flame-west-v1' },
      { id: 'fiesta-flame-east', nodeId: 'flame-shutter-crossing', periodTicks: 210, activeTicks: 84, collisionProfileId: 'fiesta-flame-east-v1' },
      { id: 'fiesta-hot-draft', nodeId: 'firemouth-fiesta-floor', periodTicks: 210, activeTicks: 150, collisionProfileId: 'fiesta-hot-draft-v1' },
    ],
    generationAttempts: 1, validationProfile: 'authored-grid-v1',
  },
  objectives: [{
    id: 'clear-firemouth-fiesta', type: 'deactivate', required: true, titleKey: 'objectives.level_023',
    targetIds: ['flame-welcome', 'fiesta-turn', 'blazing-encore'], targetCount: 10,
    durationTicks: null, dependsOn: [], completionMode: 'count', markerPolicy: 'always',
  }],
  encounters: [{
    id: 'firemouth-fiesta-company', roomNodeId: 'firemouth-fiesta-floor', trigger: 'on-enter', triggerRef: null,
    arenaLock: true, waves: [{
      id: 'flame-welcome', startCondition: 'encounter-start', startDelayTicks: 0,
      spawnGroups: [
        { id: 'welcome-wobblers', archetypeId: 'wobble-scout', count: 2, modifierIds: ['fiesta-mask'], spawnPointSetId: 'level-023-arena-1', dancePresetId: 'flame-lick-flamenco', aiProfileId: 'chapter-03-stage-23', rewardProfileId: 'chapter-03-coins-23', rngStream: 'encounter.level-023.wave-1.wobblers', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
        { id: 'welcome-spinner', archetypeId: 'yellow-spinner', count: 1, modifierIds: ['flame-fan'], spawnPointSetId: 'level-023-arena-1', dancePresetId: 'flame-lick-flamenco', aiProfileId: 'chapter-03-stage-23', rewardProfileId: 'chapter-03-coins-23', rngStream: 'encounter.level-023.wave-1.spinner', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
        { id: 'welcome-firemouth', archetypeId: 'red-firemouth', count: 1, modifierIds: ['fiesta-headliner'], spawnPointSetId: 'level-023-arena-1', dancePresetId: 'flame-lick-flamenco', aiProfileId: 'chapter-03-stage-23', rewardProfileId: 'chapter-03-coins-23', rngStream: 'encounter.level-023.wave-1.firemouth', rank: 'normal', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
      ], maxConcurrentRobots: 4, interGroupDelayTicks: 7, danceTransitionId: null,
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'fiesta-turn', startCondition: 'previous-wave-complete', startDelayTicks: 21,
      spawnGroups: [
        { id: 'turn-sliders', archetypeId: 'blue-slider', count: 2, modifierIds: ['ember-skater'], spawnPointSetId: 'level-023-arena-2', dancePresetId: 'flame-lick-flamenco', aiProfileId: 'chapter-03-stage-23', rewardProfileId: 'chapter-03-coins-23', rngStream: 'encounter.level-023.wave-2.sliders', rank: 'normal', accessibilityVerificationId: 'silhouette-blue-slider-v1' },
        { id: 'turn-wobbler', archetypeId: 'wobble-scout', count: 1, modifierIds: ['fiesta-mask'], spawnPointSetId: 'level-023-arena-2', dancePresetId: 'flame-lick-flamenco', aiProfileId: 'chapter-03-stage-23', rewardProfileId: 'chapter-03-coins-23', rngStream: 'encounter.level-023.wave-2.wobbler', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
      ], maxConcurrentRobots: 3, interGroupDelayTicks: 7, danceTransitionId: 'fiesta-turn',
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'blazing-encore', startCondition: 'previous-wave-complete', startDelayTicks: 20,
      spawnGroups: [
        { id: 'encore-spinner', archetypeId: 'yellow-spinner', count: 1, modifierIds: ['flame-fan'], spawnPointSetId: 'level-023-arena-3', dancePresetId: 'flame-lick-flamenco', aiProfileId: 'chapter-03-stage-23', rewardProfileId: 'chapter-03-coins-23', rngStream: 'encounter.level-023.wave-3.spinner', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
        { id: 'encore-foreman', archetypeId: 'red-firemouth', count: 1, modifierIds: ['inferno-foreman'], spawnPointSetId: 'level-023-arena-3', dancePresetId: 'flame-lick-flamenco', aiProfileId: 'chapter-03-stage-23', rewardProfileId: 'chapter-03-coins-23', rngStream: 'encounter.level-023.wave-3.foreman', rank: 'elite', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
        { id: 'encore-dj', archetypeId: 'cyan-dj', count: 1, modifierIds: ['fiesta-conductor'], spawnPointSetId: 'level-023-arena-3', dancePresetId: 'flame-lick-flamenco', aiProfileId: 'chapter-03-stage-23', rewardProfileId: 'chapter-03-coins-23', rngStream: 'encounter.level-023.wave-3.dj', rank: 'elite', accessibilityVerificationId: 'silhouette-cyan-dj-v1' },
      ], maxConcurrentRobots: 3, interGroupDelayTicks: 6, danceTransitionId: 'blazing-encore',
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }], completion: 'all-defeated', rewardId: 'chapter-03-clear-023', checkpointOnComplete: null,
  }],
  dance: {
    presetId: 'flame-lick-flamenco', grammarVersion: 1, bpm: 134, timeSignature: '4/4', barsPerPhrase: 4,
    footPatternId: 'flame-lick-flamenco-feet-v1', torsoPatternId: 'flame-lick-flamenco-torso-v1',
    armPatternId: 'flame-lick-flamenco-arms-v1', headAccentId: 'flame-lick-flamenco-head-v1',
    pathPatternId: 'flame-lick-flamenco-path-v1', attackBeats: [2, 5, 10, 13],
    vulnerableBeats: [0, 4, 8, 12], transitionIds: ['fiesta-turn', 'blazing-encore', 'objective-clear'],
    visualIntensity: 0.94, reducedMotionPresetId: 'flame-lick-flamenco-reduced-v1',
  },
  difficulty: { presetId: 'standard-chapter-03-023' }, economy: { presetId: 'economy-chapter-03-023' },
  checkpoints: [{ presetId: 'checkpoint-023' }], audio: { presetId: 'audio-toxic-boiler-023' },
  mastery: [{ presetId: 'level-023-par-time' }, { presetId: 'level-023-no-fireball-hit' }],
  agentValidation: {
    tier: 'named-elite', owner: 'gameplay-qa', runs: [{
      id: 'standard-live', mode: 'live-agent', policyId: 'baseline-campaign-agent', policyVersion: 1,
      referenceReplayId: null, seed: 'campaign-level-023-v1', difficulty: 'Standard', assistProfileId: null,
      maxTicks: 15_000, stuckTimeoutTicks: 2_000, maxIllegalActions: 0,
      requiredObjectiveIds: ['clear-firemouth-fiesta'], expectedCompletion: true, expectedChecksum: null,
      parTicks: 10_500,
      dependencyHashes: {
        simulationSchema: '6cafd562c735e11d', effectiveLevel: ZERO_HASH, simulationLevel: 'dff52cc3fa613256',
        balanceData: '1f697b70870c7801', policyOrReplay: '5eedcddff4365989',
      },
    }],
  },
  performance: {
    maxActiveRobots: 4, maxActiveProjectiles: 60, maxActivePickups: 4, maxHazards: 3,
    maxMazeNodes: 9, maxRenderInstances: 1_024, expectedPeakDrawCalls: 8,
    expectedPeakMemoryMb: 192, benchmarkScenarioIds: ['level-023-standard-live'],
  },
  tags: ['chapter-03', 'toxic-boiler', 'red-firemouth', 'flame-shutters', 'flame-lick-flamenco'],
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

export const LEVEL_023: LevelDefinition = {
  ...draft,
  agentValidation: {
    ...draft.agentValidation,
    runs: draft.agentValidation.runs.map((run) => ({
      ...run,
      dependencyHashes: { ...run.dependencyHashes, effectiveLevel },
    })),
  },
};
