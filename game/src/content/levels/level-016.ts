import { checksumCanonicalContent } from '../content-hash.ts';
import type { LevelDefinition } from '../level-definition.ts';

const ZERO_HASH = '0000000000000000';

const draft: LevelDefinition = {
  schemaVersion: 1, id: 'level-016', number: 16, chapterId: 'chapter-02',
  nameKey: 'levels.016.name', briefingKey: 'levels.016.briefing', seed: 'campaign-level-016-v1',
  palette: { presetId: 'copper-carnival-16' },
  maze: {
    templateSetId: 'carnival-laughing-mirrors', generatorVersion: 1,
    criticalPathRooms: { minimum: 5, maximum: 5 }, optionalRooms: { minimum: 2, maximum: 2 },
    maxBranchDepth: 2, secretCount: 0, entranceNodeId: 'mirror-entry', exitNodeId: 'reflection-exit',
    nodes: [
      { id: 'mirror-entry', role: 'entrance', templateTags: ['carnival', 'mirror-entry'], sizeClass: 'small', encounterIds: [], pickupIds: ['repair-kit'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'silver-token-booth', role: 'corridor', templateTags: ['carnival', 'silver-token'], sizeClass: 'medium', encounterIds: [], pickupIds: ['silver-token'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'laughing-mirror-arena', role: 'arena', templateTags: ['carnival', 'false-corridors', 'mirror-shutters'], sizeClass: 'large', encounterIds: ['mirrorball-company'], pickupIds: ['pulse-cell'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'left-reflection', role: 'corridor', templateTags: ['carnival', 'false-corridor', 'left-reflection'], sizeClass: 'medium', encounterIds: [], pickupIds: ['coin-cache'], checkpointId: null, storyIds: [], criticalPath: false },
      { id: 'right-reflection', role: 'corridor', templateTags: ['carnival', 'false-corridor', 'right-reflection'], sizeClass: 'medium', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: false },
      { id: 'mirror-checkpoint', role: 'checkpoint', templateTags: ['carnival', 'recovery'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: 'checkpoint-016', storyIds: [], criticalPath: true },
      { id: 'reflection-exit', role: 'exit', templateTags: ['carnival', 'objective-exit'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
    ],
    edges: [
      { id: 'entry-token', from: 'mirror-entry', to: 'silver-token-booth', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'token-arena', from: 'silver-token-booth', to: 'laughing-mirror-arena', bidirectional: true, requiredKeyId: 'silver-token', doorType: 'ticket-gate', traversalCost: 1, stateTrigger: 'key-collected' },
      { id: 'arena-checkpoint', from: 'laughing-mirror-arena', to: 'mirror-checkpoint', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'checkpoint-exit', from: 'mirror-checkpoint', to: 'reflection-exit', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: 'primary-objective' },
      { id: 'token-left-reflection', from: 'silver-token-booth', to: 'left-reflection', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 2, stateTrigger: null },
      { id: 'left-right-reflection', from: 'left-reflection', to: 'right-reflection', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 2, stateTrigger: null },
      { id: 'right-checkpoint', from: 'right-reflection', to: 'mirror-checkpoint', bidirectional: true, requiredKeyId: 'silver-token', doorType: 'ticket-gate', traversalCost: 2, stateTrigger: 'key-collected' },
    ],
    keys: [{ id: 'silver-token', placementNodeId: 'silver-token-booth' }],
    hazards: [
      { id: 'mirror-shutter-left', nodeId: 'laughing-mirror-arena', periodTicks: 210, activeTicks: 70, collisionProfileId: 'mirror-shutter-left-v1' },
      { id: 'mirror-shutter-center', nodeId: 'laughing-mirror-arena', periodTicks: 210, activeTicks: 70, collisionProfileId: 'mirror-shutter-center-v1' },
      { id: 'mirror-shutter-right', nodeId: 'laughing-mirror-arena', periodTicks: 210, activeTicks: 70, collisionProfileId: 'mirror-shutter-right-v1' },
    ],
    generationAttempts: 1, validationProfile: 'authored-grid-v1',
  },
  objectives: [{
    id: 'clear-laughing-mirrors', type: 'survive', required: true, titleKey: 'objectives.level_016',
    targetIds: ['reflection-rehearsal', 'mirrorball-mixup', 'last-laugh'], targetCount: 10,
    durationTicks: null, dependsOn: [], completionMode: 'count', markerPolicy: 'always',
  }],
  encounters: [{
    id: 'mirrorball-company', roomNodeId: 'laughing-mirror-arena', trigger: 'on-enter', triggerRef: null,
    arenaLock: true, waves: [{
      id: 'reflection-rehearsal', startCondition: 'encounter-start', startDelayTicks: 0,
      spawnGroups: [
        { id: 'rehearsal-wobbler', archetypeId: 'wobble-scout', count: 1, modifierIds: ['mirror-copy'], spawnPointSetId: 'level-016-arena-1', dancePresetId: 'mirrorball-lindy', aiProfileId: 'chapter-02-stage-16', rewardProfileId: 'chapter-02-coins-16', rngStream: 'encounter.level-016.wave-1.wobbler', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
        { id: 'rehearsal-slider', archetypeId: 'blue-slider', count: 1, modifierIds: ['mirror-copy'], spawnPointSetId: 'level-016-arena-1', dancePresetId: 'mirrorball-lindy', aiProfileId: 'chapter-02-stage-16', rewardProfileId: 'chapter-02-coins-16', rngStream: 'encounter.level-016.wave-1.slider', rank: 'normal', accessibilityVerificationId: 'silhouette-blue-slider-v1' },
        { id: 'rehearsal-spinner', archetypeId: 'yellow-spinner', count: 1, modifierIds: ['mirror-copy'], spawnPointSetId: 'level-016-arena-1', dancePresetId: 'mirrorball-lindy', aiProfileId: 'chapter-02-stage-16', rewardProfileId: 'chapter-02-coins-16', rngStream: 'encounter.level-016.wave-1.spinner', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
      ],
      maxConcurrentRobots: 3, interGroupDelayTicks: 10, danceTransitionId: null,
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'mirrorball-mixup', startCondition: 'previous-wave-complete', startDelayTicks: 34,
      spawnGroups: [
        { id: 'mixup-wobbler', archetypeId: 'wobble-scout', count: 1, modifierIds: ['wrong-reflection'], spawnPointSetId: 'level-016-arena-2', dancePresetId: 'mirrorball-lindy', aiProfileId: 'chapter-02-stage-16', rewardProfileId: 'chapter-02-coins-16', rngStream: 'encounter.level-016.wave-2.wobbler', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
        { id: 'mixup-slider', archetypeId: 'blue-slider', count: 1, modifierIds: ['wrong-reflection'], spawnPointSetId: 'level-016-arena-2', dancePresetId: 'mirrorball-lindy', aiProfileId: 'chapter-02-stage-16', rewardProfileId: 'chapter-02-coins-16', rngStream: 'encounter.level-016.wave-2.slider', rank: 'normal', accessibilityVerificationId: 'silhouette-blue-slider-v1' },
        { id: 'mixup-spinner', archetypeId: 'yellow-spinner', count: 1, modifierIds: ['wrong-reflection'], spawnPointSetId: 'level-016-arena-2', dancePresetId: 'mirrorball-lindy', aiProfileId: 'chapter-02-stage-16', rewardProfileId: 'chapter-02-coins-16', rngStream: 'encounter.level-016.wave-2.spinner', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
        { id: 'mixup-firemouth', archetypeId: 'red-firemouth', count: 1, modifierIds: ['wrong-reflection'], spawnPointSetId: 'level-016-arena-2', dancePresetId: 'mirrorball-lindy', aiProfileId: 'chapter-02-stage-16', rewardProfileId: 'chapter-02-coins-16', rngStream: 'encounter.level-016.wave-2.firemouth', rank: 'normal', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
      ],
      maxConcurrentRobots: 4, interGroupDelayTicks: 9, danceTransitionId: 'mirror-mixup',
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'last-laugh', startCondition: 'previous-wave-complete', startDelayTicks: 30,
      spawnGroups: [
        { id: 'laughing-wobbler', archetypeId: 'wobble-scout', count: 1, modifierIds: ['last-laugh'], spawnPointSetId: 'level-016-arena-3', dancePresetId: 'mirrorball-lindy', aiProfileId: 'chapter-02-stage-16', rewardProfileId: 'chapter-02-coins-16', rngStream: 'encounter.level-016.wave-3.wobbler', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
        { id: 'laughing-firemouth', archetypeId: 'red-firemouth', count: 1, modifierIds: ['last-laugh'], spawnPointSetId: 'level-016-arena-3', dancePresetId: 'mirrorball-lindy', aiProfileId: 'chapter-02-stage-16', rewardProfileId: 'chapter-02-coins-16', rngStream: 'encounter.level-016.wave-3.firemouth', rank: 'elite', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
        { id: 'laughing-dj', archetypeId: 'cyan-dj', count: 1, modifierIds: ['mirrorball-headliner'], spawnPointSetId: 'level-016-arena-3', dancePresetId: 'mirrorball-lindy', aiProfileId: 'chapter-02-stage-16', rewardProfileId: 'chapter-02-coins-16', rngStream: 'encounter.level-016.wave-3.dj', rank: 'elite', accessibilityVerificationId: 'silhouette-cyan-dj-v1' },
      ],
      maxConcurrentRobots: 3, interGroupDelayTicks: 8, danceTransitionId: 'last-laugh',
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }],
    completion: 'all-defeated', rewardId: 'chapter-02-clear-016', checkpointOnComplete: null,
  }],
  dance: {
    presetId: 'mirrorball-lindy', grammarVersion: 1, bpm: 140, timeSignature: '4/4', barsPerPhrase: 4,
    footPatternId: 'mirrorball-lindy-feet-v1', torsoPatternId: 'mirrorball-lindy-torso-v1',
    armPatternId: 'mirrorball-lindy-arms-v1', headAccentId: 'mirrorball-lindy-head-v1',
    pathPatternId: 'mirrorball-lindy-path-v1', attackBeats: [2, 6, 10, 14],
    vulnerableBeats: [0, 4, 8, 12], transitionIds: ['mirror-mixup', 'last-laugh', 'objective-clear'],
    visualIntensity: 0.96, reducedMotionPresetId: 'mirrorball-lindy-reduced-v1',
  },
  difficulty: { presetId: 'standard-chapter-02-016' }, economy: { presetId: 'economy-chapter-02-016' },
  checkpoints: [{ presetId: 'checkpoint-016' }], audio: { presetId: 'audio-copper-carnival-016' },
  mastery: [{ presetId: 'level-016-par-time' }, { presetId: 'level-016-no-false-turns' }],
  agentValidation: {
    tier: 'named-elite', owner: 'gameplay-qa', runs: [{
      id: 'standard-live', mode: 'live-agent', policyId: 'baseline-campaign-agent', policyVersion: 1,
      referenceReplayId: null, seed: 'campaign-level-016-v1', difficulty: 'Standard', assistProfileId: null,
      maxTicks: 13_000, stuckTimeoutTicks: 1_800, maxIllegalActions: 0,
      requiredObjectiveIds: ['clear-laughing-mirrors'], expectedCompletion: true, expectedChecksum: null,
      parTicks: 9_600,
      dependencyHashes: {
        simulationSchema: '6cafd562c735e11d', effectiveLevel: ZERO_HASH, simulationLevel: 'b9d98494a998b1f7',
        balanceData: '1f697b70870c7801', policyOrReplay: '33ce82519e6acf00',
      },
    }],
  },
  performance: {
    maxActiveRobots: 4, maxActiveProjectiles: 52, maxActivePickups: 4, maxHazards: 3,
    maxMazeNodes: 9, maxRenderInstances: 1_024, expectedPeakDrawCalls: 8,
    expectedPeakMemoryMb: 192, benchmarkScenarioIds: ['level-016-standard-live'],
  },
  tags: ['chapter-02', 'copper-carnival', 'false-corridors', 'mirror-shutters', 'mirrorball-lindy'],
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

export const LEVEL_016: LevelDefinition = {
  ...draft,
  agentValidation: {
    ...draft.agentValidation,
    runs: draft.agentValidation.runs.map((run) => ({
      ...run,
      dependencyHashes: { ...run.dependencyHashes, effectiveLevel },
    })),
  },
};
