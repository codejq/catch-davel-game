import { checksumCanonicalContent } from '../content-hash.ts';
import type { LevelDefinition } from '../level-definition.ts';

const ZERO_HASH = '0000000000000000';

const draft: LevelDefinition = {
  schemaVersion: 1, id: 'level-019', number: 19, chapterId: 'chapter-02',
  nameKey: 'levels.019.name', briefingKey: 'levels.019.briefing', seed: 'campaign-level-019-v1',
  palette: { presetId: 'copper-carnival-19' },
  maze: {
    templateSetId: 'carnival-midnight-matinee', generatorVersion: 1,
    criticalPathRooms: { minimum: 6, maximum: 6 }, optionalRooms: { minimum: 2, maximum: 2 },
    maxBranchDepth: 2, secretCount: 0, entranceNodeId: 'moon-gate-entry', exitNodeId: 'curtain-call-exit',
    nodes: [
      { id: 'moon-gate-entry', role: 'entrance', templateTags: ['carnival', 'moon-gate'], sizeClass: 'small', encounterIds: [], pickupIds: ['repair-kit'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'silver-ticket-lane', role: 'corridor', templateTags: ['carnival', 'silver-ticket'], sizeClass: 'medium', encounterIds: [], pickupIds: ['moon-ticket'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'moonlit-gauntlet', role: 'arena', templateTags: ['carnival', 'moonlit', 'moving-lanes', 'curtain-gates'], sizeClass: 'large', encounterIds: ['midnight-company'], pickupIds: ['pulse-cell'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'west-balcony', role: 'corridor', templateTags: ['carnival', 'balcony-loop'], sizeClass: 'medium', encounterIds: [], pickupIds: ['coin-cache'], checkpointId: null, storyIds: [], criticalPath: false },
      { id: 'east-balcony', role: 'corridor', templateTags: ['carnival', 'balcony-loop'], sizeClass: 'medium', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: false },
      { id: 'matinee-crossing', role: 'corridor', templateTags: ['carnival', 'curtain-crossing'], sizeClass: 'medium', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'midnight-checkpoint', role: 'checkpoint', templateTags: ['carnival', 'recovery'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: 'checkpoint-019', storyIds: [], criticalPath: true },
      { id: 'curtain-call-exit', role: 'exit', templateTags: ['carnival', 'objective-exit'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
    ],
    edges: [
      { id: 'entry-ticket', from: 'moon-gate-entry', to: 'silver-ticket-lane', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'ticket-gauntlet', from: 'silver-ticket-lane', to: 'moonlit-gauntlet', bidirectional: true, requiredKeyId: 'moon-ticket', doorType: 'ticket-gate', traversalCost: 1, stateTrigger: 'key-collected' },
      { id: 'gauntlet-crossing', from: 'moonlit-gauntlet', to: 'matinee-crossing', bidirectional: true, requiredKeyId: null, doorType: 'arena-lock', traversalCost: 1, stateTrigger: null },
      { id: 'crossing-checkpoint', from: 'matinee-crossing', to: 'midnight-checkpoint', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'checkpoint-exit', from: 'midnight-checkpoint', to: 'curtain-call-exit', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: 'primary-objective' },
      { id: 'ticket-west', from: 'silver-ticket-lane', to: 'west-balcony', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 2, stateTrigger: null },
      { id: 'west-east', from: 'west-balcony', to: 'east-balcony', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 2, stateTrigger: null },
      { id: 'east-crossing', from: 'east-balcony', to: 'matinee-crossing', bidirectional: true, requiredKeyId: 'moon-ticket', doorType: 'ticket-gate', traversalCost: 2, stateTrigger: 'key-collected' },
    ],
    keys: [{ id: 'moon-ticket', placementNodeId: 'silver-ticket-lane' }],
    hazards: [
      { id: 'matinee-slide-west', nodeId: 'moonlit-gauntlet', periodTicks: 180, activeTicks: 135, collisionProfileId: 'matinee-slide-west-v1' },
      { id: 'matinee-slide-east', nodeId: 'moonlit-gauntlet', periodTicks: 180, activeTicks: 135, collisionProfileId: 'matinee-slide-east-v1' },
      { id: 'matinee-curtain-north', nodeId: 'moonlit-gauntlet', periodTicks: 160, activeTicks: 64, collisionProfileId: 'matinee-curtain-north-v1' },
      { id: 'matinee-curtain-south', nodeId: 'moonlit-gauntlet', periodTicks: 160, activeTicks: 64, collisionProfileId: 'matinee-curtain-south-v1' },
    ],
    generationAttempts: 1, validationProfile: 'authored-grid-v1',
  },
  objectives: [{
    id: 'clear-midnight-matinee', type: 'survive', required: true, titleKey: 'objectives.level_019',
    targetIds: ['moonrise-overture', 'midnight-swing', 'curtain-call'], targetCount: 10,
    durationTicks: null, dependsOn: [], completionMode: 'count', markerPolicy: 'always',
  }],
  encounters: [{
    id: 'midnight-company', roomNodeId: 'moonlit-gauntlet', trigger: 'on-enter', triggerRef: null,
    arenaLock: true, waves: [{
      id: 'moonrise-overture', startCondition: 'encounter-start', startDelayTicks: 0,
      spawnGroups: [
        { id: 'overture-wobblers', archetypeId: 'wobble-scout', count: 2, modifierIds: ['moon-mask'], spawnPointSetId: 'level-019-arena-1', dancePresetId: 'moonlit-swing-off', aiProfileId: 'chapter-02-stage-19', rewardProfileId: 'chapter-02-coins-19', rngStream: 'encounter.level-019.wave-1.wobblers', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
        { id: 'overture-slider', archetypeId: 'blue-slider', count: 1, modifierIds: ['spotlight-slide'], spawnPointSetId: 'level-019-arena-1', dancePresetId: 'moonlit-swing-off', aiProfileId: 'chapter-02-stage-19', rewardProfileId: 'chapter-02-coins-19', rngStream: 'encounter.level-019.wave-1.slider', rank: 'normal', accessibilityVerificationId: 'silhouette-blue-slider-v1' },
      ], maxConcurrentRobots: 3, interGroupDelayTicks: 9, danceTransitionId: null,
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'midnight-swing', startCondition: 'previous-wave-complete', startDelayTicks: 24,
      spawnGroups: [
        { id: 'swing-wobbler', archetypeId: 'wobble-scout', count: 1, modifierIds: ['moon-mask'], spawnPointSetId: 'level-019-arena-2', dancePresetId: 'moonlit-swing-off', aiProfileId: 'chapter-02-stage-19', rewardProfileId: 'chapter-02-coins-19', rngStream: 'encounter.level-019.wave-2.wobbler', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
        { id: 'swing-slider', archetypeId: 'blue-slider', count: 1, modifierIds: ['spotlight-slide'], spawnPointSetId: 'level-019-arena-2', dancePresetId: 'moonlit-swing-off', aiProfileId: 'chapter-02-stage-19', rewardProfileId: 'chapter-02-coins-19', rngStream: 'encounter.level-019.wave-2.slider', rank: 'normal', accessibilityVerificationId: 'silhouette-blue-slider-v1' },
        { id: 'swing-spinners', archetypeId: 'yellow-spinner', count: 2, modifierIds: ['moon-wheel'], spawnPointSetId: 'level-019-arena-2', dancePresetId: 'moonlit-swing-off', aiProfileId: 'chapter-02-stage-19', rewardProfileId: 'chapter-02-coins-19', rngStream: 'encounter.level-019.wave-2.spinners', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
      ], maxConcurrentRobots: 4, interGroupDelayTicks: 8, danceTransitionId: 'midnight-swing',
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'curtain-call', startCondition: 'previous-wave-complete', startDelayTicks: 20,
      spawnGroups: [
        { id: 'curtain-firemouth', archetypeId: 'red-firemouth', count: 1, modifierIds: ['footlight-fire'], spawnPointSetId: 'level-019-arena-3', dancePresetId: 'moonlit-swing-off', aiProfileId: 'chapter-02-stage-19', rewardProfileId: 'chapter-02-coins-19', rngStream: 'encounter.level-019.wave-3.firemouth', rank: 'normal', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
        { id: 'curtain-foreman', archetypeId: 'red-firemouth', count: 1, modifierIds: ['midnight-ringmaster'], spawnPointSetId: 'level-019-arena-3', dancePresetId: 'moonlit-swing-off', aiProfileId: 'chapter-02-stage-19', rewardProfileId: 'chapter-02-coins-19', rngStream: 'encounter.level-019.wave-3.foreman', rank: 'elite', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
        { id: 'curtain-dj', archetypeId: 'cyan-dj', count: 1, modifierIds: ['moonlight-conductor'], spawnPointSetId: 'level-019-arena-3', dancePresetId: 'moonlit-swing-off', aiProfileId: 'chapter-02-stage-19', rewardProfileId: 'chapter-02-coins-19', rngStream: 'encounter.level-019.wave-3.dj', rank: 'elite', accessibilityVerificationId: 'silhouette-cyan-dj-v1' },
      ], maxConcurrentRobots: 3, interGroupDelayTicks: 7, danceTransitionId: 'curtain-call',
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }], completion: 'all-defeated', rewardId: 'chapter-02-clear-019', checkpointOnComplete: null,
  }],
  dance: {
    presetId: 'moonlit-swing-off', grammarVersion: 1, bpm: 154, timeSignature: '4/4', barsPerPhrase: 4,
    footPatternId: 'moonlit-swing-off-feet-v1', torsoPatternId: 'moonlit-swing-off-torso-v1',
    armPatternId: 'moonlit-swing-off-arms-v1', headAccentId: 'moonlit-swing-off-head-v1',
    pathPatternId: 'moonlit-swing-off-path-v1', attackBeats: [1, 5, 9, 13],
    vulnerableBeats: [3, 7, 11, 15], transitionIds: ['midnight-swing', 'curtain-call', 'objective-clear'],
    visualIntensity: 1, reducedMotionPresetId: 'moonlit-swing-off-reduced-v1',
  },
  difficulty: { presetId: 'standard-chapter-02-019' }, economy: { presetId: 'economy-chapter-02-019' },
  checkpoints: [{ presetId: 'checkpoint-019' }], audio: { presetId: 'audio-copper-carnival-019' },
  mastery: [{ presetId: 'level-019-par-time' }, { presetId: 'level-019-no-curtain-hit' }],
  agentValidation: {
    tier: 'ordinary', owner: 'gameplay-qa', runs: [{
      id: 'standard-live', mode: 'live-agent', policyId: 'baseline-campaign-agent', policyVersion: 1,
      referenceReplayId: null, seed: 'campaign-level-019-v1', difficulty: 'Standard', assistProfileId: null,
      maxTicks: 16_000, stuckTimeoutTicks: 2_000, maxIllegalActions: 0,
      requiredObjectiveIds: ['clear-midnight-matinee'], expectedCompletion: true, expectedChecksum: null,
      parTicks: 11_800,
      dependencyHashes: {
        simulationSchema: '6cafd562c735e11d', effectiveLevel: ZERO_HASH, simulationLevel: '2a11ddf526e2aca1',
        balanceData: '1f697b70870c7801', policyOrReplay: '33ce82519e6acf00',
      },
    }],
  },
  performance: {
    maxActiveRobots: 4, maxActiveProjectiles: 60, maxActivePickups: 4, maxHazards: 4,
    maxMazeNodes: 10, maxRenderInstances: 1_024, expectedPeakDrawCalls: 8,
    expectedPeakMemoryMb: 192, benchmarkScenarioIds: ['level-019-standard-live'],
  },
  tags: ['chapter-02', 'copper-carnival', 'moonlit-gauntlet', 'moving-lanes', 'moonlit-swing-off'],
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

export const LEVEL_019: LevelDefinition = {
  ...draft,
  agentValidation: {
    ...draft.agentValidation,
    runs: draft.agentValidation.runs.map((run) => ({
      ...run,
      dependencyHashes: { ...run.dependencyHashes, effectiveLevel },
    })),
  },
};
