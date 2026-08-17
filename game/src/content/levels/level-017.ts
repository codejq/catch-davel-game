import { checksumCanonicalContent } from '../content-hash.ts';
import type { LevelDefinition } from '../level-definition.ts';

const ZERO_HASH = '0000000000000000';

const draft: LevelDefinition = {
  schemaVersion: 1, id: 'level-017', number: 17, chapterId: 'chapter-02',
  nameKey: 'levels.017.name', briefingKey: 'levels.017.briefing', seed: 'campaign-level-017-v1',
  palette: { presetId: 'copper-carnival-17' },
  maze: {
    templateSetId: 'carnival-prize-booth-panic', generatorVersion: 1,
    criticalPathRooms: { minimum: 5, maximum: 5 }, optionalRooms: { minimum: 2, maximum: 2 },
    maxBranchDepth: 2, secretCount: 0, entranceNodeId: 'cashier-entry', exitNodeId: 'jackpot-exit',
    nodes: [
      { id: 'cashier-entry', role: 'entrance', templateTags: ['carnival', 'cashier-entry'], sizeClass: 'small', encounterIds: [], pickupIds: ['repair-kit'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'vault-key-lane', role: 'corridor', templateTags: ['carnival', 'vault-key'], sizeClass: 'medium', encounterIds: [], pickupIds: ['vault-key'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'prize-bank-arena', role: 'arena', templateTags: ['carnival', 'defense', 'prize-bank'], sizeClass: 'large', encounterIds: ['jackpot-raiders'], pickupIds: ['pulse-cell'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'golden-side-booth', role: 'corridor', templateTags: ['carnival', 'prize-loop'], sizeClass: 'medium', encounterIds: [], pickupIds: ['coin-cache'], checkpointId: null, storyIds: [], criticalPath: false },
      { id: 'crooked-side-booth', role: 'corridor', templateTags: ['carnival', 'decoy-loop'], sizeClass: 'medium', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: false },
      { id: 'bank-checkpoint', role: 'checkpoint', templateTags: ['carnival', 'recovery'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: 'checkpoint-017', storyIds: [], criticalPath: true },
      { id: 'jackpot-exit', role: 'exit', templateTags: ['carnival', 'objective-exit'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
    ],
    edges: [
      { id: 'entry-key', from: 'cashier-entry', to: 'vault-key-lane', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'key-bank', from: 'vault-key-lane', to: 'prize-bank-arena', bidirectional: true, requiredKeyId: 'vault-key', doorType: 'ticket-gate', traversalCost: 1, stateTrigger: 'key-collected' },
      { id: 'bank-checkpoint-edge', from: 'prize-bank-arena', to: 'bank-checkpoint', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'checkpoint-exit', from: 'bank-checkpoint', to: 'jackpot-exit', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: 'primary-objective' },
      { id: 'key-golden', from: 'vault-key-lane', to: 'golden-side-booth', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 2, stateTrigger: null },
      { id: 'golden-crooked', from: 'golden-side-booth', to: 'crooked-side-booth', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 2, stateTrigger: null },
      { id: 'crooked-checkpoint', from: 'crooked-side-booth', to: 'bank-checkpoint', bidirectional: true, requiredKeyId: 'vault-key', doorType: 'ticket-gate', traversalCost: 2, stateTrigger: 'key-collected' },
    ],
    keys: [{ id: 'vault-key', placementNodeId: 'vault-key-lane' }], hazards: [],
    generationAttempts: 1, validationProfile: 'authored-grid-v1',
  },
  objectives: [{
    id: 'defend-prize-bank', type: 'defend', required: true, titleKey: 'objectives.level_017',
    targetIds: ['prize-bank-arena'], targetCount: 10, durationTicks: null, dependsOn: [],
    completionMode: 'count', markerPolicy: 'always',
  }],
  encounters: [{
    id: 'jackpot-raiders', roomNodeId: 'prize-bank-arena', trigger: 'on-enter', triggerRef: null,
    arenaLock: true, waves: [{
      id: 'coin-snatch-warmup', startCondition: 'encounter-start', startDelayTicks: 0,
      spawnGroups: [
        { id: 'warmup-wobblers', archetypeId: 'wobble-scout', count: 2, modifierIds: ['coin-snatcher'], spawnPointSetId: 'level-017-arena-1', dancePresetId: 'jackpot-jitterbug', aiProfileId: 'chapter-02-stage-17', rewardProfileId: 'chapter-02-coins-17', rngStream: 'encounter.level-017.wave-1.wobblers', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
        { id: 'warmup-slider', archetypeId: 'blue-slider', count: 1, modifierIds: ['till-skater'], spawnPointSetId: 'level-017-arena-1', dancePresetId: 'jackpot-jitterbug', aiProfileId: 'chapter-02-stage-17', rewardProfileId: 'chapter-02-coins-17', rngStream: 'encounter.level-017.wave-1.slider', rank: 'normal', accessibilityVerificationId: 'silhouette-blue-slider-v1' },
        { id: 'warmup-spinner', archetypeId: 'yellow-spinner', count: 1, modifierIds: ['coin-tosser'], spawnPointSetId: 'level-017-arena-1', dancePresetId: 'jackpot-jitterbug', aiProfileId: 'chapter-02-stage-17', rewardProfileId: 'chapter-02-coins-17', rngStream: 'encounter.level-017.wave-1.spinner', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
      ], maxConcurrentRobots: 4, interGroupDelayTicks: 9, danceTransitionId: null,
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'vault-rush', startCondition: 'previous-wave-complete', startDelayTicks: 28,
      spawnGroups: [
        { id: 'rush-wobbler', archetypeId: 'wobble-scout', count: 1, modifierIds: ['vault-rusher'], spawnPointSetId: 'level-017-arena-2', dancePresetId: 'jackpot-jitterbug', aiProfileId: 'chapter-02-stage-17', rewardProfileId: 'chapter-02-coins-17', rngStream: 'encounter.level-017.wave-2.wobbler', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
        { id: 'rush-slider', archetypeId: 'blue-slider', count: 1, modifierIds: ['till-skater'], spawnPointSetId: 'level-017-arena-2', dancePresetId: 'jackpot-jitterbug', aiProfileId: 'chapter-02-stage-17', rewardProfileId: 'chapter-02-coins-17', rngStream: 'encounter.level-017.wave-2.slider', rank: 'normal', accessibilityVerificationId: 'silhouette-blue-slider-v1' },
        { id: 'rush-spinner', archetypeId: 'yellow-spinner', count: 1, modifierIds: ['coin-tosser'], spawnPointSetId: 'level-017-arena-2', dancePresetId: 'jackpot-jitterbug', aiProfileId: 'chapter-02-stage-17', rewardProfileId: 'chapter-02-coins-17', rngStream: 'encounter.level-017.wave-2.spinner', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
      ], maxConcurrentRobots: 3, interGroupDelayTicks: 8, danceTransitionId: 'vault-rush',
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'jackpot-heist', startCondition: 'previous-wave-complete', startDelayTicks: 24,
      spawnGroups: [
        { id: 'heist-firemouth', archetypeId: 'red-firemouth', count: 1, modifierIds: ['vault-torcher'], spawnPointSetId: 'level-017-arena-3', dancePresetId: 'jackpot-jitterbug', aiProfileId: 'chapter-02-stage-17', rewardProfileId: 'chapter-02-coins-17', rngStream: 'encounter.level-017.wave-3.firemouth', rank: 'normal', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
        { id: 'heist-foreman', archetypeId: 'red-firemouth', count: 1, modifierIds: ['jackpot-enforcer'], spawnPointSetId: 'level-017-arena-3', dancePresetId: 'jackpot-jitterbug', aiProfileId: 'chapter-02-stage-17', rewardProfileId: 'chapter-02-coins-17', rngStream: 'encounter.level-017.wave-3.foreman', rank: 'elite', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
        { id: 'heist-dj', archetypeId: 'cyan-dj', count: 1, modifierIds: ['jackpot-mastermind'], spawnPointSetId: 'level-017-arena-3', dancePresetId: 'jackpot-jitterbug', aiProfileId: 'chapter-02-stage-17', rewardProfileId: 'chapter-02-coins-17', rngStream: 'encounter.level-017.wave-3.dj', rank: 'elite', accessibilityVerificationId: 'silhouette-cyan-dj-v1' },
      ], maxConcurrentRobots: 3, interGroupDelayTicks: 7, danceTransitionId: 'jackpot-heist',
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }], completion: 'objective-event', rewardId: 'chapter-02-clear-017', checkpointOnComplete: null,
  }],
  dance: {
    presetId: 'jackpot-jitterbug', grammarVersion: 1, bpm: 146, timeSignature: '4/4', barsPerPhrase: 4,
    footPatternId: 'jackpot-jitterbug-feet-v1', torsoPatternId: 'jackpot-jitterbug-torso-v1',
    armPatternId: 'jackpot-jitterbug-arms-v1', headAccentId: 'jackpot-jitterbug-head-v1',
    pathPatternId: 'jackpot-jitterbug-path-v1', attackBeats: [1, 5, 9, 13],
    vulnerableBeats: [3, 7, 11, 15], transitionIds: ['vault-rush', 'jackpot-heist', 'objective-clear'],
    visualIntensity: 0.98, reducedMotionPresetId: 'jackpot-jitterbug-reduced-v1',
  },
  difficulty: { presetId: 'standard-chapter-02-017' }, economy: { presetId: 'economy-chapter-02-017' },
  checkpoints: [{ presetId: 'checkpoint-017' }], audio: { presetId: 'audio-copper-carnival-017' },
  mastery: [{ presetId: 'level-017-par-time' }, { presetId: 'level-017-bank-untouched' }],
  agentValidation: {
    tier: 'named-elite', owner: 'gameplay-qa', runs: [{
      id: 'standard-live', mode: 'live-agent', policyId: 'baseline-campaign-agent', policyVersion: 1,
      referenceReplayId: null, seed: 'campaign-level-017-v1', difficulty: 'Standard', assistProfileId: null,
      maxTicks: 14_000, stuckTimeoutTicks: 1_800, maxIllegalActions: 0,
      requiredObjectiveIds: ['defend-prize-bank'], expectedCompletion: true, expectedChecksum: null,
      parTicks: 10_200,
      dependencyHashes: {
        simulationSchema: '7673b9fb7039c568', effectiveLevel: ZERO_HASH, simulationLevel: 'f98fa3929a78c786',
        balanceData: 'c1df429a54459a12', policyOrReplay: 'c00c7c2e50668d3b',
      },
    }],
  },
  performance: {
    maxActiveRobots: 4, maxActiveProjectiles: 52, maxActivePickups: 4, maxHazards: 0,
    maxMazeNodes: 9, maxRenderInstances: 1_024, expectedPeakDrawCalls: 8,
    expectedPeakMemoryMb: 192, benchmarkScenarioIds: ['level-017-standard-live'],
  },
  tags: ['chapter-02', 'copper-carnival', 'defense', 'prize-bank', 'jackpot-jitterbug'],
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

export const LEVEL_017: LevelDefinition = {
  ...draft,
  agentValidation: {
    ...draft.agentValidation,
    runs: draft.agentValidation.runs.map((run) => ({
      ...run,
      dependencyHashes: { ...run.dependencyHashes, effectiveLevel },
    })),
  },
};
