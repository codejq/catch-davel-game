import { checksumCanonicalContent } from '../content-hash.ts';
import type { LevelDefinition } from '../level-definition.ts';

const ZERO_HASH = '0000000000000000';

const draft: LevelDefinition = {
  schemaVersion: 1, id: 'level-018', number: 18, chapterId: 'chapter-02',
  nameKey: 'levels.018.name', briefingKey: 'levels.018.briefing', seed: 'campaign-level-018-v1',
  palette: { presetId: 'copper-carnival-18' },
  maze: {
    templateSetId: 'carnival-big-top-backtrack', generatorVersion: 1,
    criticalPathRooms: { minimum: 6, maximum: 6 }, optionalRooms: { minimum: 2, maximum: 2 },
    maxBranchDepth: 2, secretCount: 0, entranceNodeId: 'big-top-entry', exitNodeId: 'reverse-exit',
    nodes: [
      { id: 'big-top-entry', role: 'entrance', templateTags: ['carnival', 'big-top-entry'], sizeClass: 'small', encounterIds: [], pickupIds: ['repair-kit'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'outbound-ring', role: 'corridor', templateTags: ['carnival', 'outbound-route'], sizeClass: 'medium', encounterIds: [], pickupIds: ['coin-cache'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'reverse-key-booth', role: 'corridor', templateTags: ['carnival', 'route-switch'], sizeClass: 'medium', encounterIds: [], pickupIds: ['reverse-key'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'backtrack-arena', role: 'arena', templateTags: ['carnival', 'maze-reversal', 'backtrack-gates'], sizeClass: 'large', encounterIds: ['reverse-circus-company'], pickupIds: ['pulse-cell'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'short-way-booth', role: 'corridor', templateTags: ['carnival', 'closed-after-key'], sizeClass: 'medium', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: false },
      { id: 'long-way-booth', role: 'corridor', templateTags: ['carnival', 'opened-after-key'], sizeClass: 'medium', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: false },
      { id: 'reverse-checkpoint', role: 'checkpoint', templateTags: ['carnival', 'recovery'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: 'checkpoint-018', storyIds: [], criticalPath: true },
      { id: 'reverse-exit', role: 'exit', templateTags: ['carnival', 'objective-exit'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
    ],
    edges: [
      { id: 'entry-outbound', from: 'big-top-entry', to: 'outbound-ring', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'outbound-key', from: 'outbound-ring', to: 'reverse-key-booth', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'key-arena', from: 'reverse-key-booth', to: 'backtrack-arena', bidirectional: true, requiredKeyId: 'reverse-key', doorType: 'ticket-gate', traversalCost: 1, stateTrigger: 'key-collected' },
      { id: 'arena-checkpoint', from: 'backtrack-arena', to: 'reverse-checkpoint', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'checkpoint-exit', from: 'reverse-checkpoint', to: 'reverse-exit', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: 'primary-objective' },
      { id: 'outbound-short', from: 'outbound-ring', to: 'short-way-booth', bidirectional: true, requiredKeyId: null, doorType: 'arena-lock', traversalCost: 1, stateTrigger: null },
      { id: 'short-checkpoint', from: 'short-way-booth', to: 'reverse-checkpoint', bidirectional: true, requiredKeyId: null, doorType: 'arena-lock', traversalCost: 1, stateTrigger: null },
      { id: 'key-long', from: 'reverse-key-booth', to: 'long-way-booth', bidirectional: true, requiredKeyId: 'reverse-key', doorType: 'ticket-gate', traversalCost: 2, stateTrigger: 'key-collected' },
      { id: 'long-arena', from: 'long-way-booth', to: 'backtrack-arena', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 2, stateTrigger: null },
    ],
    keys: [{ id: 'reverse-key', placementNodeId: 'reverse-key-booth' }],
    hazards: [
      { id: 'backtrack-forward-gate', nodeId: 'backtrack-arena', periodTicks: 1, activeTicks: 1, collisionProfileId: 'backtrack-gate-forward-v1' },
      { id: 'backtrack-return-gate', nodeId: 'backtrack-arena', periodTicks: 1, activeTicks: 1, collisionProfileId: 'backtrack-gate-return-v1' },
    ],
    generationAttempts: 1, validationProfile: 'authored-grid-v1',
  },
  objectives: [{
    id: 'clear-big-top-backtrack', type: 'survive', required: true, titleKey: 'objectives.level_018',
    targetIds: ['outbound-parade', 'reverse-rush', 'backtrack-finale'], targetCount: 10,
    durationTicks: null, dependsOn: [], completionMode: 'count', markerPolicy: 'always',
  }],
  encounters: [{
    id: 'reverse-circus-company', roomNodeId: 'backtrack-arena', trigger: 'on-enter', triggerRef: null,
    arenaLock: true, waves: [{
      id: 'outbound-parade', startCondition: 'encounter-start', startDelayTicks: 0,
      spawnGroups: [
        { id: 'outbound-wobblers', archetypeId: 'wobble-scout', count: 2, modifierIds: ['wrong-way'], spawnPointSetId: 'level-018-arena-1', dancePresetId: 'reverse-circus-strut', aiProfileId: 'chapter-02-stage-18', rewardProfileId: 'chapter-02-coins-18', rngStream: 'encounter.level-018.wave-1.wobblers', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
        { id: 'outbound-sliders', archetypeId: 'blue-slider', count: 2, modifierIds: ['reverse-skater'], spawnPointSetId: 'level-018-arena-1', dancePresetId: 'reverse-circus-strut', aiProfileId: 'chapter-02-stage-18', rewardProfileId: 'chapter-02-coins-18', rngStream: 'encounter.level-018.wave-1.sliders', rank: 'normal', accessibilityVerificationId: 'silhouette-blue-slider-v1' },
      ], maxConcurrentRobots: 4, interGroupDelayTicks: 9, danceTransitionId: null,
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'reverse-rush', startCondition: 'previous-wave-complete', startDelayTicks: 26,
      spawnGroups: [
        { id: 'reverse-spinner', archetypeId: 'yellow-spinner', count: 2, modifierIds: ['about-face'], spawnPointSetId: 'level-018-arena-2', dancePresetId: 'reverse-circus-strut', aiProfileId: 'chapter-02-stage-18', rewardProfileId: 'chapter-02-coins-18', rngStream: 'encounter.level-018.wave-2.spinners', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
        { id: 'reverse-firemouth', archetypeId: 'red-firemouth', count: 1, modifierIds: ['backfire'], spawnPointSetId: 'level-018-arena-2', dancePresetId: 'reverse-circus-strut', aiProfileId: 'chapter-02-stage-18', rewardProfileId: 'chapter-02-coins-18', rngStream: 'encounter.level-018.wave-2.firemouth', rank: 'normal', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
      ], maxConcurrentRobots: 3, interGroupDelayTicks: 8, danceTransitionId: 'reverse-rush',
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'backtrack-finale', startCondition: 'previous-wave-complete', startDelayTicks: 22,
      spawnGroups: [
        { id: 'finale-wobbler', archetypeId: 'wobble-scout', count: 1, modifierIds: ['wrong-way'], spawnPointSetId: 'level-018-arena-3', dancePresetId: 'reverse-circus-strut', aiProfileId: 'chapter-02-stage-18', rewardProfileId: 'chapter-02-coins-18', rngStream: 'encounter.level-018.wave-3.wobbler', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
        { id: 'finale-foreman', archetypeId: 'red-firemouth', count: 1, modifierIds: ['reverse-ringmaster'], spawnPointSetId: 'level-018-arena-3', dancePresetId: 'reverse-circus-strut', aiProfileId: 'chapter-02-stage-18', rewardProfileId: 'chapter-02-coins-18', rngStream: 'encounter.level-018.wave-3.foreman', rank: 'elite', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
        { id: 'finale-dj', archetypeId: 'cyan-dj', count: 1, modifierIds: ['backbeat-barker'], spawnPointSetId: 'level-018-arena-3', dancePresetId: 'reverse-circus-strut', aiProfileId: 'chapter-02-stage-18', rewardProfileId: 'chapter-02-coins-18', rngStream: 'encounter.level-018.wave-3.dj', rank: 'elite', accessibilityVerificationId: 'silhouette-cyan-dj-v1' },
      ], maxConcurrentRobots: 3, interGroupDelayTicks: 7, danceTransitionId: 'backtrack-finale',
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }], completion: 'all-defeated', rewardId: 'chapter-02-clear-018', checkpointOnComplete: null,
  }],
  dance: {
    presetId: 'reverse-circus-strut', grammarVersion: 1, bpm: 150, timeSignature: '4/4', barsPerPhrase: 4,
    footPatternId: 'reverse-circus-strut-feet-v1', torsoPatternId: 'reverse-circus-strut-torso-v1',
    armPatternId: 'reverse-circus-strut-arms-v1', headAccentId: 'reverse-circus-strut-head-v1',
    pathPatternId: 'reverse-circus-strut-path-v1', attackBeats: [0, 4, 8, 12],
    vulnerableBeats: [2, 6, 10, 14], transitionIds: ['reverse-rush', 'backtrack-finale', 'objective-clear'],
    visualIntensity: 1, reducedMotionPresetId: 'reverse-circus-strut-reduced-v1',
  },
  difficulty: { presetId: 'standard-chapter-02-018' }, economy: { presetId: 'economy-chapter-02-018' },
  checkpoints: [{ presetId: 'checkpoint-018' }], audio: { presetId: 'audio-copper-carnival-018' },
  mastery: [{ presetId: 'level-018-par-time' }, { presetId: 'level-018-no-wrong-way' }],
  agentValidation: {
    tier: 'named-elite', owner: 'gameplay-qa', runs: [{
      id: 'standard-live', mode: 'live-agent', policyId: 'baseline-campaign-agent', policyVersion: 1,
      referenceReplayId: null, seed: 'campaign-level-018-v1', difficulty: 'Standard', assistProfileId: null,
      maxTicks: 15_000, stuckTimeoutTicks: 2_000, maxIllegalActions: 0,
      requiredObjectiveIds: ['clear-big-top-backtrack'], expectedCompletion: true, expectedChecksum: null,
      parTicks: 11_000,
      dependencyHashes: {
        simulationSchema: '6cafd562c735e11d', effectiveLevel: ZERO_HASH, simulationLevel: '05ad08de4cb6dc07',
        balanceData: '1f697b70870c7801', policyOrReplay: '5eedcddff4365989',
      },
    }],
  },
  performance: {
    maxActiveRobots: 4, maxActiveProjectiles: 56, maxActivePickups: 4, maxHazards: 2,
    maxMazeNodes: 10, maxRenderInstances: 1_024, expectedPeakDrawCalls: 8,
    expectedPeakMemoryMb: 192, benchmarkScenarioIds: ['level-018-standard-live'],
  },
  tags: ['chapter-02', 'copper-carnival', 'maze-reversal', 'backtrack-gates', 'reverse-circus-strut'],
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

export const LEVEL_018: LevelDefinition = {
  ...draft,
  agentValidation: {
    ...draft.agentValidation,
    runs: draft.agentValidation.runs.map((run) => ({
      ...run,
      dependencyHashes: { ...run.dependencyHashes, effectiveLevel },
    })),
  },
};
