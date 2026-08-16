import { checksumCanonicalContent } from '../content-hash.ts';
import type { LevelDefinition } from '../level-definition.ts';

const ZERO_HASH = '0000000000000000';

const draft: LevelDefinition = {
  schemaVersion: 1, id: 'level-024', number: 24, chapterId: 'chapter-03',
  nameKey: 'levels.024.name', briefingKey: 'levels.024.briefing', seed: 'campaign-level-024-v1',
  palette: { presetId: 'toxic-boiler-24' },
  maze: {
    templateSetId: 'boiler-valve-velocity', generatorVersion: 1,
    criticalPathRooms: { minimum: 6, maximum: 6 }, optionalRooms: { minimum: 1, maximum: 1 },
    maxBranchDepth: 1, secretCount: 0, entranceNodeId: 'pressure-entry', exitNodeId: 'stabilized-exit',
    nodes: [
      { id: 'pressure-entry', role: 'entrance', templateTags: ['toxic-boiler', 'pressure-lock'], sizeClass: 'small', encounterIds: [], pickupIds: ['repair-kit'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'valve-key-bay', role: 'corridor', templateTags: ['toxic-boiler', 'pressure-key'], sizeClass: 'medium', encounterIds: [], pickupIds: ['pressure-key'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'velocity-manifold', role: 'corridor', templateTags: ['toxic-boiler', 'timed-valves'], sizeClass: 'large', encounterIds: [], pickupIds: ['pulse-cell'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'pressure-floor', role: 'arena', templateTags: ['toxic-boiler', 'pressure-holdout'], sizeClass: 'large', encounterIds: ['valve-velocity-company'], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'gauge-gallery', role: 'corridor', templateTags: ['toxic-boiler', 'optional-gauges'], sizeClass: 'medium', encounterIds: [], pickupIds: ['coin-cache'], checkpointId: null, storyIds: [], criticalPath: false },
      { id: 'pressure-checkpoint', role: 'checkpoint', templateTags: ['toxic-boiler', 'recovery'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: 'checkpoint-024', storyIds: [], criticalPath: true },
      { id: 'stabilized-exit', role: 'exit', templateTags: ['toxic-boiler', 'objective-exit'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
    ],
    edges: [
      { id: 'entry-key', from: 'pressure-entry', to: 'valve-key-bay', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'key-manifold', from: 'valve-key-bay', to: 'velocity-manifold', bidirectional: true, requiredKeyId: 'pressure-key', doorType: 'workshop-lock', traversalCost: 1, stateTrigger: 'key-collected' },
      { id: 'manifold-floor', from: 'velocity-manifold', to: 'pressure-floor', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'floor-checkpoint', from: 'pressure-floor', to: 'pressure-checkpoint', bidirectional: true, requiredKeyId: null, doorType: 'arena-lock', traversalCost: 1, stateTrigger: null },
      { id: 'checkpoint-exit', from: 'pressure-checkpoint', to: 'stabilized-exit', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: 'primary-objective' },
      { id: 'key-gallery', from: 'valve-key-bay', to: 'gauge-gallery', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 2, stateTrigger: null },
      { id: 'gallery-floor', from: 'gauge-gallery', to: 'pressure-floor', bidirectional: true, requiredKeyId: 'pressure-key', doorType: 'workshop-lock', traversalCost: 2, stateTrigger: 'key-collected' },
    ],
    keys: [{ id: 'pressure-key', placementNodeId: 'valve-key-bay' }],
    hazards: [
      { id: 'velocity-valve-west', nodeId: 'velocity-manifold', periodTicks: 240, activeTicks: 90, collisionProfileId: 'velocity-valve-west-v1' },
      { id: 'velocity-valve-center', nodeId: 'velocity-manifold', periodTicks: 240, activeTicks: 90, collisionProfileId: 'velocity-valve-center-v1' },
      { id: 'velocity-valve-east', nodeId: 'velocity-manifold', periodTicks: 240, activeTicks: 90, collisionProfileId: 'velocity-valve-east-v1' },
    ],
    generationAttempts: 1, validationProfile: 'authored-grid-v1',
  },
  objectives: [{
    id: 'stabilize-velocity-valves', type: 'survive', required: true, titleKey: 'objectives.level_024',
    targetIds: ['pressure-opening', 'manifold-surge', 'stabilization-step'], targetCount: 10,
    durationTicks: 3_600, dependsOn: [], completionMode: 'timer', markerPolicy: 'always',
  }],
  encounters: [{
    id: 'valve-velocity-company', roomNodeId: 'pressure-floor', trigger: 'on-enter', triggerRef: null,
    arenaLock: true, waves: [{
      id: 'pressure-opening', startCondition: 'encounter-start', startDelayTicks: 0,
      spawnGroups: [
        { id: 'opening-wobblers', archetypeId: 'wobble-scout', count: 2, modifierIds: ['gauge-runner'], spawnPointSetId: 'level-024-arena-1', dancePresetId: 'pressure-step-paso', aiProfileId: 'chapter-03-stage-24', rewardProfileId: 'chapter-03-coins-24', rngStream: 'encounter.level-024.wave-1.wobblers', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
        { id: 'opening-slider', archetypeId: 'blue-slider', count: 1, modifierIds: ['valve-skater'], spawnPointSetId: 'level-024-arena-1', dancePresetId: 'pressure-step-paso', aiProfileId: 'chapter-03-stage-24', rewardProfileId: 'chapter-03-coins-24', rngStream: 'encounter.level-024.wave-1.slider', rank: 'normal', accessibilityVerificationId: 'silhouette-blue-slider-v1' },
        { id: 'opening-spinner', archetypeId: 'yellow-spinner', count: 1, modifierIds: ['handwheel'], spawnPointSetId: 'level-024-arena-1', dancePresetId: 'pressure-step-paso', aiProfileId: 'chapter-03-stage-24', rewardProfileId: 'chapter-03-coins-24', rngStream: 'encounter.level-024.wave-1.spinner', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
      ], maxConcurrentRobots: 4, interGroupDelayTicks: 7, danceTransitionId: null,
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'manifold-surge', startCondition: 'previous-wave-complete', startDelayTicks: 20,
      spawnGroups: [
        { id: 'surge-firemouth', archetypeId: 'red-firemouth', count: 1, modifierIds: ['pressure-flame'], spawnPointSetId: 'level-024-arena-2', dancePresetId: 'pressure-step-paso', aiProfileId: 'chapter-03-stage-24', rewardProfileId: 'chapter-03-coins-24', rngStream: 'encounter.level-024.wave-2.firemouth', rank: 'normal', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
        { id: 'surge-slider', archetypeId: 'blue-slider', count: 1, modifierIds: ['valve-skater'], spawnPointSetId: 'level-024-arena-2', dancePresetId: 'pressure-step-paso', aiProfileId: 'chapter-03-stage-24', rewardProfileId: 'chapter-03-coins-24', rngStream: 'encounter.level-024.wave-2.slider', rank: 'normal', accessibilityVerificationId: 'silhouette-blue-slider-v1' },
        { id: 'surge-wobbler', archetypeId: 'wobble-scout', count: 1, modifierIds: ['gauge-runner'], spawnPointSetId: 'level-024-arena-2', dancePresetId: 'pressure-step-paso', aiProfileId: 'chapter-03-stage-24', rewardProfileId: 'chapter-03-coins-24', rngStream: 'encounter.level-024.wave-2.wobbler', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
      ], maxConcurrentRobots: 3, interGroupDelayTicks: 7, danceTransitionId: 'manifold-surge',
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'stabilization-step', startCondition: 'previous-wave-complete', startDelayTicks: 18,
      spawnGroups: [
        { id: 'step-firemouth', archetypeId: 'red-firemouth', count: 1, modifierIds: ['pressure-foreman'], spawnPointSetId: 'level-024-arena-3', dancePresetId: 'pressure-step-paso', aiProfileId: 'chapter-03-stage-24', rewardProfileId: 'chapter-03-coins-24', rngStream: 'encounter.level-024.wave-3.firemouth', rank: 'elite', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
        { id: 'step-dj', archetypeId: 'cyan-dj', count: 1, modifierIds: ['gauge-conductor'], spawnPointSetId: 'level-024-arena-3', dancePresetId: 'pressure-step-paso', aiProfileId: 'chapter-03-stage-24', rewardProfileId: 'chapter-03-coins-24', rngStream: 'encounter.level-024.wave-3.dj', rank: 'elite', accessibilityVerificationId: 'silhouette-cyan-dj-v1' },
        { id: 'step-spinner', archetypeId: 'yellow-spinner', count: 1, modifierIds: ['release-wheel'], spawnPointSetId: 'level-024-arena-3', dancePresetId: 'pressure-step-paso', aiProfileId: 'chapter-03-stage-24', rewardProfileId: 'chapter-03-coins-24', rngStream: 'encounter.level-024.wave-3.spinner', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
      ], maxConcurrentRobots: 3, interGroupDelayTicks: 6, danceTransitionId: 'stabilization-step',
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }], completion: 'objective-event', rewardId: 'chapter-03-clear-024', checkpointOnComplete: null,
  }],
  dance: {
    presetId: 'pressure-step-paso', grammarVersion: 1, bpm: 138, timeSignature: '4/4', barsPerPhrase: 4,
    footPatternId: 'pressure-step-paso-feet-v1', torsoPatternId: 'pressure-step-paso-torso-v1',
    armPatternId: 'pressure-step-paso-arms-v1', headAccentId: 'pressure-step-paso-head-v1',
    pathPatternId: 'pressure-step-paso-path-v1', attackBeats: [1, 4, 9, 12],
    vulnerableBeats: [3, 7, 11, 15], transitionIds: ['manifold-surge', 'stabilization-step', 'objective-clear'],
    visualIntensity: 0.96, reducedMotionPresetId: 'pressure-step-paso-reduced-v1',
  },
  difficulty: { presetId: 'standard-chapter-03-024' }, economy: { presetId: 'economy-chapter-03-024' },
  checkpoints: [{ presetId: 'checkpoint-024' }], audio: { presetId: 'audio-toxic-boiler-024' },
  mastery: [{ presetId: 'level-024-par-time' }, { presetId: 'level-024-valve-perfect' }],
  agentValidation: {
    tier: 'named-elite', owner: 'gameplay-qa', runs: [{
      id: 'standard-live', mode: 'live-agent', policyId: 'baseline-campaign-agent', policyVersion: 1,
      referenceReplayId: null, seed: 'campaign-level-024-v1', difficulty: 'Standard', assistProfileId: null,
      maxTicks: 15_000, stuckTimeoutTicks: 2_400, maxIllegalActions: 0,
      requiredObjectiveIds: ['stabilize-velocity-valves'], expectedCompletion: true, expectedChecksum: null,
      parTicks: 10_800,
      dependencyHashes: {
        simulationSchema: '6cafd562c735e11d', effectiveLevel: ZERO_HASH, simulationLevel: '6af9106095909e44',
        balanceData: '1f697b70870c7801', policyOrReplay: '33ce82519e6acf00',
      },
    }],
  },
  performance: {
    maxActiveRobots: 4, maxActiveProjectiles: 60, maxActivePickups: 4, maxHazards: 3,
    maxMazeNodes: 9, maxRenderInstances: 1_024, expectedPeakDrawCalls: 8,
    expectedPeakMemoryMb: 192, benchmarkScenarioIds: ['level-024-standard-live'],
  },
  tags: ['chapter-03', 'toxic-boiler', 'timed-objective', 'valve-shutters', 'pressure-step-paso'],
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

export const LEVEL_024: LevelDefinition = {
  ...draft,
  agentValidation: {
    ...draft.agentValidation,
    runs: draft.agentValidation.runs.map((run) => ({
      ...run,
      dependencyHashes: { ...run.dependencyHashes, effectiveLevel },
    })),
  },
};
