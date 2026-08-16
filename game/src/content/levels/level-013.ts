import { checksumCanonicalContent } from '../content-hash.ts';
import type { LevelDefinition } from '../level-definition.ts';

const ZERO_HASH = '0000000000000000';

const draft: LevelDefinition = {
  schemaVersion: 1, id: 'level-013', number: 13, chapterId: 'chapter-02',
  nameKey: 'levels.013.name', briefingKey: 'levels.013.briefing', seed: 'campaign-level-013-v1',
  palette: { presetId: 'copper-carnival-13' },
  maze: {
    templateSetId: 'carnival-spinners-midway', generatorVersion: 1,
    criticalPathRooms: { minimum: 5, maximum: 5 }, optionalRooms: { minimum: 1, maximum: 1 },
    maxBranchDepth: 1, secretCount: 0, entranceNodeId: 'midway-entry', exitNodeId: 'roundabout-exit',
    nodes: [
      { id: 'midway-entry', role: 'entrance', templateTags: ['carnival', 'midway-entry'], sizeClass: 'small', encounterIds: [], pickupIds: ['repair-kit'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'token-booth', role: 'corridor', templateTags: ['carnival', 'spinner-token'], sizeClass: 'medium', encounterIds: [], pickupIds: ['spinner-token'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'carousel-arena', role: 'arena', templateTags: ['carnival', 'yellow-spinner', 'rotating-gates'], sizeClass: 'large', encounterIds: ['spinners-midway-crew'], pickupIds: ['pulse-cell'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'prize-arcade', role: 'corridor', templateTags: ['carnival', 'prize-arcade', 'coin-cache'], sizeClass: 'medium', encounterIds: [], pickupIds: ['coin-cache'], checkpointId: null, storyIds: [], criticalPath: false },
      { id: 'midway-checkpoint', role: 'checkpoint', templateTags: ['carnival', 'recovery'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: 'checkpoint-013', storyIds: [], criticalPath: true },
      { id: 'roundabout-exit', role: 'exit', templateTags: ['carnival', 'objective-exit'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
    ],
    edges: [
      { id: 'entry-token', from: 'midway-entry', to: 'token-booth', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'token-arena', from: 'token-booth', to: 'carousel-arena', bidirectional: true, requiredKeyId: 'spinner-token', doorType: 'ticket-gate', traversalCost: 1, stateTrigger: 'key-collected' },
      { id: 'arena-checkpoint', from: 'carousel-arena', to: 'midway-checkpoint', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'checkpoint-exit', from: 'midway-checkpoint', to: 'roundabout-exit', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: 'primary-objective' },
      { id: 'token-arcade', from: 'token-booth', to: 'prize-arcade', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 2, stateTrigger: null },
      { id: 'arcade-checkpoint', from: 'prize-arcade', to: 'midway-checkpoint', bidirectional: true, requiredKeyId: 'spinner-token', doorType: 'ticket-gate', traversalCost: 2, stateTrigger: 'key-collected' },
    ],
    keys: [{ id: 'spinner-token', placementNodeId: 'token-booth' }],
    hazards: [
      { id: 'roundabout-gate-west', nodeId: 'carousel-arena', periodTicks: 180, activeTicks: 105, collisionProfileId: 'roundabout-gate-west-v1' },
      { id: 'roundabout-gate-center', nodeId: 'carousel-arena', periodTicks: 180, activeTicks: 105, collisionProfileId: 'roundabout-gate-center-v1' },
      { id: 'roundabout-gate-east', nodeId: 'carousel-arena', periodTicks: 180, activeTicks: 105, collisionProfileId: 'roundabout-gate-east-v1' },
    ],
    generationAttempts: 1, validationProfile: 'authored-grid-v1',
  },
  objectives: [{
    id: 'clear-spinners-midway', type: 'survive', required: true, titleKey: 'objectives.level_013',
    targetIds: ['carousel-warmup-wave', 'midway-main-event-wave'], targetCount: 10, durationTicks: null,
    dependsOn: [], completionMode: 'count', markerPolicy: 'always',
  }],
  encounters: [{
    id: 'spinners-midway-crew', roomNodeId: 'carousel-arena', trigger: 'on-enter', triggerRef: null,
    arenaLock: true, waves: [{
      id: 'carousel-warmup-wave', startCondition: 'encounter-start', startDelayTicks: 0,
      spawnGroups: [
        { id: 'warmup-spinners', archetypeId: 'yellow-spinner', count: 2, modifierIds: ['carousel-rider'], spawnPointSetId: 'level-013-arena-1', dancePresetId: 'carousel-kick', aiProfileId: 'chapter-02-stage-13', rewardProfileId: 'chapter-02-coins-13', rngStream: 'encounter.level-013.wave-1.spinners', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
        { id: 'warmup-sliders', archetypeId: 'blue-slider', count: 2, modifierIds: ['carousel-rider'], spawnPointSetId: 'level-013-arena-1', dancePresetId: 'carousel-kick', aiProfileId: 'chapter-02-stage-13', rewardProfileId: 'chapter-02-coins-13', rngStream: 'encounter.level-013.wave-1.sliders', rank: 'normal', accessibilityVerificationId: 'silhouette-blue-slider-v1' },
        { id: 'warmup-heckler', archetypeId: 'wobble-scout', count: 1, modifierIds: ['midway-heckler'], spawnPointSetId: 'level-013-arena-1', dancePresetId: 'carousel-kick', aiProfileId: 'chapter-02-stage-13', rewardProfileId: 'chapter-02-coins-13', rngStream: 'encounter.level-013.wave-1.heckler', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
      ],
      maxConcurrentRobots: 5, interGroupDelayTicks: 14, danceTransitionId: null,
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'midway-main-event-wave', startCondition: 'previous-wave-complete', startDelayTicks: 42,
      spawnGroups: [
        { id: 'main-event-wobblers', archetypeId: 'wobble-scout', count: 2, modifierIds: ['midway-heckler'], spawnPointSetId: 'level-013-arena-2', dancePresetId: 'carousel-kick', aiProfileId: 'chapter-02-stage-13', rewardProfileId: 'chapter-02-coins-13', rngStream: 'encounter.level-013.wave-2.wobblers', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
        { id: 'main-event-firemouth', archetypeId: 'red-firemouth', count: 1, modifierIds: ['ring-of-fire'], spawnPointSetId: 'level-013-arena-2', dancePresetId: 'carousel-kick', aiProfileId: 'chapter-02-stage-13', rewardProfileId: 'chapter-02-coins-13', rngStream: 'encounter.level-013.wave-2.firemouth', rank: 'normal', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
        { id: 'main-event-foreman', archetypeId: 'red-firemouth', count: 1, modifierIds: ['ringmaster'], spawnPointSetId: 'level-013-arena-2', dancePresetId: 'carousel-kick', aiProfileId: 'chapter-02-stage-13', rewardProfileId: 'chapter-02-coins-13', rngStream: 'encounter.level-013.wave-2.foreman', rank: 'elite', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
        { id: 'main-event-dj', archetypeId: 'cyan-dj', count: 1, modifierIds: ['carousel-conductor'], spawnPointSetId: 'level-013-arena-2', dancePresetId: 'carousel-kick', aiProfileId: 'chapter-02-stage-13', rewardProfileId: 'chapter-02-coins-13', rngStream: 'encounter.level-013.wave-2.dj', rank: 'elite', accessibilityVerificationId: 'silhouette-cyan-dj-v1' },
      ],
      maxConcurrentRobots: 5, interGroupDelayTicks: 12, danceTransitionId: 'midway-main-event',
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }],
    completion: 'all-defeated', rewardId: 'chapter-02-clear-013', checkpointOnComplete: null,
  }],
  dance: {
    presetId: 'carousel-kick', grammarVersion: 1, bpm: 128, timeSignature: '4/4', barsPerPhrase: 4,
    footPatternId: 'carousel-kick-feet-v1', torsoPatternId: 'carousel-kick-torso-v1',
    armPatternId: 'carousel-kick-arms-v1', headAccentId: 'carousel-kick-head-v1', pathPatternId: 'carousel-kick-path-v1',
    attackBeats: [1, 5, 9, 13], vulnerableBeats: [3, 7, 11, 15],
    transitionIds: ['midway-main-event', 'objective-clear'], visualIntensity: 0.88,
    reducedMotionPresetId: 'carousel-kick-reduced-v1',
  },
  difficulty: { presetId: 'standard-chapter-02-013' }, economy: { presetId: 'economy-chapter-02-013' },
  checkpoints: [{ presetId: 'checkpoint-013' }], audio: { presetId: 'audio-copper-carnival-013' },
  mastery: [{ presetId: 'level-013-par-time' }, { presetId: 'level-013-gate-dancer' }],
  agentValidation: {
    tier: 'ordinary', owner: 'gameplay-qa', runs: [{
      id: 'standard-live', mode: 'live-agent', policyId: 'baseline-campaign-agent', policyVersion: 1,
      referenceReplayId: null, seed: 'campaign-level-013-v1', difficulty: 'Standard', assistProfileId: null,
      maxTicks: 11_500, stuckTimeoutTicks: 1_500, maxIllegalActions: 0,
      requiredObjectiveIds: ['clear-spinners-midway'], expectedCompletion: true, expectedChecksum: null,
      parTicks: 8_200,
      dependencyHashes: {
        simulationSchema: '9f5cdf6817cd80cd', effectiveLevel: ZERO_HASH, simulationLevel: 'f53b6b121e5d711f',
        balanceData: '1f697b70870c7801', policyOrReplay: 'ab8c698b5dea6c13',
      },
    }],
  },
  performance: {
    maxActiveRobots: 5, maxActiveProjectiles: 44, maxActivePickups: 4, maxHazards: 3,
    maxMazeNodes: 8, maxRenderInstances: 1_024, expectedPeakDrawCalls: 8,
    expectedPeakMemoryMb: 192, benchmarkScenarioIds: ['level-013-standard-live'],
  },
  tags: ['chapter-02', 'copper-carnival', 'yellow-spinner', 'rotating-gates', 'carousel-kick'],
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

export const LEVEL_013: LevelDefinition = {
  ...draft,
  agentValidation: {
    ...draft.agentValidation,
    runs: draft.agentValidation.runs.map((run) => ({
      ...run,
      dependencyHashes: { ...run.dependencyHashes, effectiveLevel },
    })),
  },
};
