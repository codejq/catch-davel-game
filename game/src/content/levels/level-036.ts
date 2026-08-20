import { checksumCanonicalContent } from '../content-hash.ts';
import type { LevelDefinition } from '../level-definition.ts';

const ZERO_HASH = '0000000000000000';

const draft: LevelDefinition = {
  schemaVersion: 1, id: 'level-036', number: 36, chapterId: 'chapter-04',
  nameKey: 'levels.036.name', briefingKey: 'levels.036.briefing', seed: 'campaign-level-036-v1',
  palette: { presetId: 'cold-storage-36' },
  maze: {
    templateSetId: 'cold-storage-refrigerator-finale', generatorVersion: 1,
    criticalPathRooms: { minimum: 7, maximum: 7 }, optionalRooms: { minimum: 1, maximum: 1 },
    maxBranchDepth: 1, secretCount: 0, entranceNodeId: 'final-airlock', exitNodeId: 'sunrise-exit',
    nodes: [
      { id: 'final-airlock', role: 'entrance', templateTags: ['cold-storage', 'limited-repair'], sizeClass: 'small', encounterIds: [], pickupIds: ['repair-kit'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'master-key-vault', role: 'corridor', templateTags: ['cold-storage', 'master-key'], sizeClass: 'medium', encounterIds: [], pickupIds: ['master-key'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'compressor-run', role: 'corridor', templateTags: ['cold-storage', 'compressor-run'], sizeClass: 'large', encounterIds: [], pickupIds: ['pulse-cell'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'refrigerator-heart', role: 'arena', templateTags: ['cold-storage', 'final-endurance', 'refrigerator-robot'], sizeClass: 'large', encounterIds: ['cold-storage-finale'], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'last-cache', role: 'corridor', templateTags: ['cold-storage', 'optional-final-cache'], sizeClass: 'medium', encounterIds: [], pickupIds: ['coin-cache'], checkpointId: null, storyIds: [], criticalPath: false },
      { id: 'thawing-gallery', role: 'corridor', templateTags: ['cold-storage', 'thawing-gallery'], sizeClass: 'large', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'final-checkpoint', role: 'checkpoint', templateTags: ['cold-storage', 'final-recovery'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: 'checkpoint-036', storyIds: [], criticalPath: true },
      { id: 'sunrise-exit', role: 'exit', templateTags: ['cold-storage', 'campaign-ending'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
    ],
    edges: [
      { id: 'airlock-vault', from: 'final-airlock', to: 'master-key-vault', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'vault-compressor', from: 'master-key-vault', to: 'compressor-run', bidirectional: true, requiredKeyId: 'master-key', doorType: 'workshop-lock', traversalCost: 1, stateTrigger: 'key-collected' },
      { id: 'compressor-heart', from: 'compressor-run', to: 'refrigerator-heart', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'heart-gallery', from: 'refrigerator-heart', to: 'thawing-gallery', bidirectional: true, requiredKeyId: null, doorType: 'arena-lock', traversalCost: 1, stateTrigger: null },
      { id: 'gallery-checkpoint', from: 'thawing-gallery', to: 'final-checkpoint', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'checkpoint-sunrise', from: 'final-checkpoint', to: 'sunrise-exit', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: 'primary-objective' },
      { id: 'vault-cache', from: 'master-key-vault', to: 'last-cache', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 2, stateTrigger: null },
      { id: 'cache-heart', from: 'last-cache', to: 'refrigerator-heart', bidirectional: true, requiredKeyId: 'master-key', doorType: 'workshop-lock', traversalCost: 2, stateTrigger: 'key-collected' },
    ],
    keys: [{ id: 'master-key', placementNodeId: 'master-key-vault' }],
    hazards: [
      { id: 'final-west-ice', nodeId: 'compressor-run', periodTicks: 240, activeTicks: 240, collisionProfileId: 'refrigerator-west-v1' },
      { id: 'final-north-ice', nodeId: 'refrigerator-heart', periodTicks: 240, activeTicks: 240, collisionProfileId: 'refrigerator-north-v1' },
      { id: 'final-south-ice', nodeId: 'refrigerator-heart', periodTicks: 240, activeTicks: 240, collisionProfileId: 'refrigerator-south-v1' },
      { id: 'final-east-ice', nodeId: 'thawing-gallery', periodTicks: 240, activeTicks: 240, collisionProfileId: 'refrigerator-east-v1' },
    ], generationAttempts: 1, validationProfile: 'authored-grid-v1',
  },
  objectives: [{
    id: 'survive-cold-storage', type: 'deactivate', required: true, titleKey: 'objectives.level_036',
    targetIds: ['last-call', 'compressor-crush', 'elite-thaw', 'refrigerator-robot'], targetCount: 12,
    durationTicks: null, dependsOn: [], completionMode: 'count', markerPolicy: 'always',
  }],
  encounters: [{
    id: 'cold-storage-finale', roomNodeId: 'refrigerator-heart', trigger: 'on-enter', triggerRef: null,
    arenaLock: true, waves: [{
      id: 'last-call', startCondition: 'encounter-start', startDelayTicks: 0,
      spawnGroups: [
        { id: 'final-wobblers', archetypeId: 'wobble-scout', count: 3, modifierIds: ['last-call-grins'], spawnPointSetId: 'level-036-arena-1', dancePresetId: 'refrigerator-robot-rumble', aiProfileId: 'chapter-04-stage-36', rewardProfileId: 'chapter-04-coins-36', rngStream: 'encounter.level-036.wave-1.wobblers', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
        { id: 'final-spinner-a', archetypeId: 'yellow-spinner', count: 1, modifierIds: ['cold-snap-spin'], spawnPointSetId: 'level-036-arena-1', dancePresetId: 'refrigerator-robot-rumble', aiProfileId: 'chapter-04-stage-36', rewardProfileId: 'chapter-04-coins-36', rngStream: 'encounter.level-036.wave-1.spinner', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
      ], maxConcurrentRobots: 4, interGroupDelayTicks: 5, danceTransitionId: null, completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'compressor-crush', startCondition: 'previous-wave-complete', startDelayTicks: 12,
      spawnGroups: [
        { id: 'final-sliders', archetypeId: 'blue-slider', count: 2, modifierIds: ['compressor-crossfire'], spawnPointSetId: 'level-036-arena-2', dancePresetId: 'refrigerator-robot-rumble', aiProfileId: 'chapter-04-stage-36', rewardProfileId: 'chapter-04-coins-36', rngStream: 'encounter.level-036.wave-2.sliders', rank: 'normal', accessibilityVerificationId: 'silhouette-blue-slider-v1' },
        { id: 'final-spinner-b', archetypeId: 'yellow-spinner', count: 1, modifierIds: ['freezer-spin'], spawnPointSetId: 'level-036-arena-2', dancePresetId: 'refrigerator-robot-rumble', aiProfileId: 'chapter-04-stage-36', rewardProfileId: 'chapter-04-coins-36', rngStream: 'encounter.level-036.wave-2.spinner', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
        { id: 'final-firemouth', archetypeId: 'red-firemouth', count: 1, modifierIds: ['cold-flame'], spawnPointSetId: 'level-036-arena-2', dancePresetId: 'refrigerator-robot-rumble', aiProfileId: 'chapter-04-stage-36', rewardProfileId: 'chapter-04-coins-36', rngStream: 'encounter.level-036.wave-2.firemouth', rank: 'normal', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
      ], maxConcurrentRobots: 4, interGroupDelayTicks: 4, danceTransitionId: 'compressor-crush', completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'elite-thaw', startCondition: 'previous-wave-complete', startDelayTicks: 15,
      spawnGroups: [
        { id: 'final-shielder', archetypeId: 'violet-shielder', count: 1, modifierIds: ['last-shield-standing'], spawnPointSetId: 'level-036-arena-3', dancePresetId: 'refrigerator-robot-rumble', aiProfileId: 'chapter-04-stage-36', rewardProfileId: 'chapter-04-coins-36', rngStream: 'encounter.level-036.wave-3.shielder', rank: 'normal', accessibilityVerificationId: 'silhouette-violet-shielder-v1' },
        { id: 'final-dj', archetypeId: 'cyan-dj', count: 1, modifierIds: ['finale-conductor'], spawnPointSetId: 'level-036-arena-3', dancePresetId: 'refrigerator-robot-rumble', aiProfileId: 'chapter-04-stage-36', rewardProfileId: 'chapter-04-coins-36', rngStream: 'encounter.level-036.wave-3.dj', rank: 'elite', accessibilityVerificationId: 'silhouette-cyan-dj-v1' },
        { id: 'final-foreman', archetypeId: 'red-firemouth', count: 1, modifierIds: ['cold-storage-foreman'], spawnPointSetId: 'level-036-arena-3', dancePresetId: 'refrigerator-robot-rumble', aiProfileId: 'chapter-04-stage-36', rewardProfileId: 'chapter-04-coins-36', rngStream: 'encounter.level-036.wave-3.foreman', rank: 'elite', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
      ], maxConcurrentRobots: 3, interGroupDelayTicks: 4, danceTransitionId: 'elite-thaw', completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'refrigerator-robot', startCondition: 'previous-wave-complete', startDelayTicks: 20,
      spawnGroups: [{
        id: 'refrigerator-overlord', archetypeId: 'invoice-overlord', count: 1,
        modifierIds: ['refrigerator-crown', 'three-stage-deep-freeze'], spawnPointSetId: 'level-036-boss',
        dancePresetId: 'refrigerator-robot-rumble', aiProfileId: 'chapter-04-boss-36',
        rewardProfileId: 'chapter-04-boss-coins-36', rngStream: 'encounter.level-036.boss.refrigerator',
        rank: 'boss', accessibilityVerificationId: 'silhouette-invoice-overlord-v1',
      }],
      maxConcurrentRobots: 1, interGroupDelayTicks: 0, danceTransitionId: 'boss-phase',
      completion: 'target-defeated', invalidSpawnPolicy: 'fail-level',
    }], completion: 'all-defeated', rewardId: 'chapter-04-clear-036', checkpointOnComplete: null,
  }],
  dance: {
    presetId: 'refrigerator-robot-rumble', grammarVersion: 1, bpm: 140, timeSignature: '4/4', barsPerPhrase: 4,
    footPatternId: 'refrigerator-rumble-feet-v1', torsoPatternId: 'refrigerator-rumble-torso-v1',
    armPatternId: 'refrigerator-rumble-arms-v1', headAccentId: 'refrigerator-rumble-head-v1',
    pathPatternId: 'refrigerator-rumble-path-v1', attackBeats: [0, 3, 6, 9, 12, 15],
    vulnerableBeats: [2, 5, 8, 11, 14], transitionIds: ['compressor-crush', 'elite-thaw', 'boss-phase', 'objective-clear'],
    visualIntensity: 1, reducedMotionPresetId: 'refrigerator-rumble-reduced-v1',
  },
  difficulty: { presetId: 'standard-chapter-04-036' }, economy: { presetId: 'economy-chapter-04-036' },
  checkpoints: [{ presetId: 'checkpoint-036' }], audio: { presetId: 'audio-cold-storage-036' },
  mastery: [{ presetId: 'level-036-par-time' }, { presetId: 'level-036-limited-repair-clear' }],
  agentValidation: { tier: 'boss', owner: 'gameplay-qa', runs: [{
    id: 'standard-live', mode: 'live-agent', policyId: 'baseline-campaign-agent', policyVersion: 1,
    referenceReplayId: null, seed: 'campaign-level-036-v1', difficulty: 'Standard', assistProfileId: null,
    maxTicks: 24_000, stuckTimeoutTicks: 2_400, maxIllegalActions: 0,
    requiredObjectiveIds: ['survive-cold-storage'], expectedCompletion: true, expectedChecksum: null, parTicks: 19_000,
    dependencyHashes: {
      simulationSchema: '7673b9fb7039c568', effectiveLevel: ZERO_HASH, simulationLevel: 'f187873e2832fc55',
      balanceData: 'c1df429a54459a12', policyOrReplay: 'c00c7c2e50668d3b',
    },
  }] },
  performance: {
    maxActiveRobots: 4, maxActiveProjectiles: 64, maxActivePickups: 4, maxHazards: 4,
    maxMazeNodes: 10, maxRenderInstances: 1_024, expectedPeakDrawCalls: 8,
    expectedPeakMemoryMb: 192, benchmarkScenarioIds: ['level-036-standard-live'],
  },
  tags: ['chapter-04', 'cold-storage', 'final-endurance', 'limited-healing', 'refrigerator-robot', 'campaign-finale'],
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

export const LEVEL_036: LevelDefinition = {
  ...draft,
  agentValidation: { ...draft.agentValidation, runs: draft.agentValidation.runs.map((run) => ({
    ...run, dependencyHashes: { ...run.dependencyHashes, effectiveLevel },
  })) },
};
