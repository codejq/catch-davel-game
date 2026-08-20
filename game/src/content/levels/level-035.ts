import { checksumCanonicalContent } from '../content-hash.ts';
import type { LevelDefinition } from '../level-definition.ts';

const ZERO_HASH = '0000000000000000';

const draft: LevelDefinition = {
  schemaVersion: 1, id: 'level-035', number: 35, chapterId: 'chapter-04',
  nameKey: 'levels.035.name', briefingKey: 'levels.035.briefing', seed: 'campaign-level-035-v1',
  palette: { presetId: 'cold-storage-35' },
  maze: {
    templateSetId: 'cold-storage-zero-degree-duel', generatorVersion: 1,
    criticalPathRooms: { minimum: 7, maximum: 7 }, optionalRooms: { minimum: 1, maximum: 1 },
    maxBranchDepth: 1, secretCount: 0, entranceNodeId: 'duel-airlock', exitNodeId: 'zero-exit',
    nodes: [
      { id: 'duel-airlock', role: 'entrance', templateTags: ['cold-storage', 'duel-airlock'], sizeClass: 'small', encounterIds: [], pickupIds: ['repair-kit'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'challenge-locker', role: 'corridor', templateTags: ['cold-storage', 'challenge-key'], sizeClass: 'medium', encounterIds: [], pickupIds: ['challenge-key'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'west-second', role: 'corridor', templateTags: ['cold-storage', 'countdown-west'], sizeClass: 'large', encounterIds: [], pickupIds: ['pulse-cell'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'zero-degree-ring', role: 'arena', templateTags: ['cold-storage', 'elite-duel-ring'], sizeClass: 'large', encounterIds: ['zero-degree-challengers'], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'spectator-freezer', role: 'corridor', templateTags: ['cold-storage', 'optional-gallery'], sizeClass: 'medium', encounterIds: [], pickupIds: ['coin-cache'], checkpointId: null, storyIds: [], criticalPath: false },
      { id: 'east-second', role: 'corridor', templateTags: ['cold-storage', 'countdown-east'], sizeClass: 'large', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'duel-checkpoint', role: 'checkpoint', templateTags: ['cold-storage', 'recovery'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: 'checkpoint-035', storyIds: [], criticalPath: true },
      { id: 'zero-exit', role: 'exit', templateTags: ['cold-storage', 'objective-exit'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
    ],
    edges: [
      { id: 'airlock-locker', from: 'duel-airlock', to: 'challenge-locker', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'locker-west', from: 'challenge-locker', to: 'west-second', bidirectional: true, requiredKeyId: 'challenge-key', doorType: 'workshop-lock', traversalCost: 1, stateTrigger: 'key-collected' },
      { id: 'west-ring', from: 'west-second', to: 'zero-degree-ring', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'ring-east', from: 'zero-degree-ring', to: 'east-second', bidirectional: true, requiredKeyId: null, doorType: 'arena-lock', traversalCost: 1, stateTrigger: null },
      { id: 'east-checkpoint', from: 'east-second', to: 'duel-checkpoint', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'checkpoint-exit', from: 'duel-checkpoint', to: 'zero-exit', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: 'primary-objective' },
      { id: 'locker-gallery', from: 'challenge-locker', to: 'spectator-freezer', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 2, stateTrigger: null },
      { id: 'gallery-ring', from: 'spectator-freezer', to: 'zero-degree-ring', bidirectional: true, requiredKeyId: 'challenge-key', doorType: 'workshop-lock', traversalCost: 2, stateTrigger: 'key-collected' },
    ],
    keys: [{ id: 'challenge-key', placementNodeId: 'challenge-locker' }],
    hazards: [
      { id: 'duel-west-ice', nodeId: 'west-second', periodTicks: 240, activeTicks: 240, collisionProfileId: 'zero-duel-west-v1' },
      { id: 'duel-north-ice', nodeId: 'zero-degree-ring', periodTicks: 240, activeTicks: 240, collisionProfileId: 'zero-duel-north-v1' },
      { id: 'duel-south-ice', nodeId: 'zero-degree-ring', periodTicks: 240, activeTicks: 240, collisionProfileId: 'zero-duel-south-v1' },
      { id: 'duel-east-ice', nodeId: 'east-second', periodTicks: 240, activeTicks: 240, collisionProfileId: 'zero-duel-east-v1' },
    ], generationAttempts: 1, validationProfile: 'authored-grid-v1',
  },
  objectives: [{
    id: 'win-zero-degree-duel', type: 'deactivate', required: true, titleKey: 'objectives.level_035',
    targetIds: ['opening-challenge', 'semifinal-freeze', 'elite-face-off'], targetCount: 10,
    durationTicks: null, dependsOn: [], completionMode: 'count', markerPolicy: 'always',
  }],
  encounters: [{
    id: 'zero-degree-challengers', roomNodeId: 'zero-degree-ring', trigger: 'on-enter', triggerRef: null,
    arenaLock: true, waves: [{
      id: 'opening-challenge', startCondition: 'encounter-start', startDelayTicks: 0,
      spawnGroups: [
        { id: 'challenge-wobblers', archetypeId: 'wobble-scout', count: 3, modifierIds: ['freeze-frame-mimes'], spawnPointSetId: 'level-035-arena-1', dancePresetId: 'freeze-frame-face-off', aiProfileId: 'chapter-04-stage-35', rewardProfileId: 'chapter-04-coins-35', rngStream: 'encounter.level-035.wave-1.wobblers', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
        { id: 'challenge-spinner', archetypeId: 'yellow-spinner', count: 1, modifierIds: ['countdown-spin'], spawnPointSetId: 'level-035-arena-1', dancePresetId: 'freeze-frame-face-off', aiProfileId: 'chapter-04-stage-35', rewardProfileId: 'chapter-04-coins-35', rngStream: 'encounter.level-035.wave-1.spinner', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
      ], maxConcurrentRobots: 4, interGroupDelayTicks: 6, danceTransitionId: null, completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'semifinal-freeze', startCondition: 'previous-wave-complete', startDelayTicks: 15,
      spawnGroups: [
        { id: 'semifinal-sliders', archetypeId: 'blue-slider', count: 2, modifierIds: ['duel-crossfire'], spawnPointSetId: 'level-035-arena-2', dancePresetId: 'freeze-frame-face-off', aiProfileId: 'chapter-04-stage-35', rewardProfileId: 'chapter-04-coins-35', rngStream: 'encounter.level-035.wave-2.sliders', rank: 'normal', accessibilityVerificationId: 'silhouette-blue-slider-v1' },
        { id: 'semifinal-spinner', archetypeId: 'yellow-spinner', count: 1, modifierIds: ['zero-spotter'], spawnPointSetId: 'level-035-arena-2', dancePresetId: 'freeze-frame-face-off', aiProfileId: 'chapter-04-stage-35', rewardProfileId: 'chapter-04-coins-35', rngStream: 'encounter.level-035.wave-2.spinner', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
      ], maxConcurrentRobots: 3, interGroupDelayTicks: 5, danceTransitionId: 'semifinal-freeze', completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'elite-face-off', startCondition: 'previous-wave-complete', startDelayTicks: 18,
      spawnGroups: [
        { id: 'duel-shielder', archetypeId: 'violet-shielder', count: 1, modifierIds: ['zero-degree-champion'], spawnPointSetId: 'level-035-arena-3', dancePresetId: 'freeze-frame-face-off', aiProfileId: 'chapter-04-stage-35', rewardProfileId: 'chapter-04-coins-35', rngStream: 'encounter.level-035.wave-3.shielder', rank: 'normal', accessibilityVerificationId: 'silhouette-violet-shielder-v1' },
        { id: 'duel-dj', archetypeId: 'cyan-dj', count: 1, modifierIds: ['face-off-conductor'], spawnPointSetId: 'level-035-arena-3', dancePresetId: 'freeze-frame-face-off', aiProfileId: 'chapter-04-stage-35', rewardProfileId: 'chapter-04-coins-35', rngStream: 'encounter.level-035.wave-3.dj', rank: 'elite', accessibilityVerificationId: 'silhouette-cyan-dj-v1' },
        { id: 'duel-foreman', archetypeId: 'red-firemouth', count: 1, modifierIds: ['subzero-foreman'], spawnPointSetId: 'level-035-arena-3', dancePresetId: 'freeze-frame-face-off', aiProfileId: 'chapter-04-stage-35', rewardProfileId: 'chapter-04-coins-35', rngStream: 'encounter.level-035.wave-3.foreman', rank: 'elite', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
      ], maxConcurrentRobots: 3, interGroupDelayTicks: 5, danceTransitionId: 'elite-face-off', completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }], completion: 'all-defeated', rewardId: 'chapter-04-clear-035', checkpointOnComplete: null,
  }],
  dance: {
    presetId: 'freeze-frame-face-off', grammarVersion: 1, bpm: 134, timeSignature: '4/4', barsPerPhrase: 4,
    footPatternId: 'freeze-frame-feet-v1', torsoPatternId: 'freeze-frame-torso-v1', armPatternId: 'freeze-frame-arms-v1',
    headAccentId: 'freeze-frame-head-v1', pathPatternId: 'freeze-frame-path-v1', attackBeats: [1, 5, 9, 13],
    vulnerableBeats: [3, 7, 11, 15], transitionIds: ['semifinal-freeze', 'elite-face-off', 'objective-clear'],
    visualIntensity: 1, reducedMotionPresetId: 'freeze-frame-reduced-v1',
  },
  difficulty: { presetId: 'standard-chapter-04-035' }, economy: { presetId: 'economy-chapter-04-035' },
  checkpoints: [{ presetId: 'checkpoint-035' }], audio: { presetId: 'audio-cold-storage-035' },
  mastery: [{ presetId: 'level-035-par-time' }, { presetId: 'level-035-break-the-champion' }],
  agentValidation: { tier: 'named-elite', owner: 'gameplay-qa', runs: [{
    id: 'standard-live', mode: 'live-agent', policyId: 'baseline-campaign-agent', policyVersion: 1,
    referenceReplayId: null, seed: 'campaign-level-035-v1', difficulty: 'Standard', assistProfileId: null,
    maxTicks: 18_000, stuckTimeoutTicks: 2_000, maxIllegalActions: 0,
    requiredObjectiveIds: ['win-zero-degree-duel'], expectedCompletion: true, expectedChecksum: null, parTicks: 14_500,
    dependencyHashes: {
      simulationSchema: '7673b9fb7039c568', effectiveLevel: ZERO_HASH, simulationLevel: '95b529fe964fa73a',
      balanceData: 'c1df429a54459a12', policyOrReplay: 'c00c7c2e50668d3b',
    },
  }] },
  performance: {
    maxActiveRobots: 4, maxActiveProjectiles: 64, maxActivePickups: 4, maxHazards: 4,
    maxMazeNodes: 10, maxRenderInstances: 1_024, expectedPeakDrawCalls: 8,
    expectedPeakMemoryMb: 192, benchmarkScenarioIds: ['level-035-standard-live'],
  },
  tags: ['chapter-04', 'cold-storage', 'shield-elite-hunt', 'zero-degree-duel', 'freeze-frame-face-off'],
};

const normalizedForHash: LevelDefinition = {
  ...draft,
  agentValidation: { ...draft.agentValidation, runs: draft.agentValidation.runs.map((run) => ({
    ...run, dependencyHashes: {
      simulationSchema: ZERO_HASH, effectiveLevel: ZERO_HASH, simulationLevel: ZERO_HASH,
      balanceData: ZERO_HASH, policyOrReplay: ZERO_HASH,
    },
  })) },
};

const effectiveLevel = checksumCanonicalContent(normalizedForHash);

export const LEVEL_035: LevelDefinition = {
  ...draft,
  agentValidation: { ...draft.agentValidation, runs: draft.agentValidation.runs.map((run) => ({
    ...run, dependencyHashes: { ...run.dependencyHashes, effectiveLevel },
  })) },
};
