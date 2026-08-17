import { checksumCanonicalContent } from '../content-hash.ts';
import type { LevelDefinition } from '../level-definition.ts';

const ZERO_HASH = '0000000000000000';

const draft: LevelDefinition = {
  schemaVersion: 1, id: 'level-027', number: 27, chapterId: 'chapter-03',
  nameKey: 'levels.027.name', briefingKey: 'levels.027.briefing', seed: 'campaign-level-027-v1',
  palette: { presetId: 'toxic-boiler-27' },
  maze: {
    templateSetId: 'boiler-magenta-drain', generatorVersion: 1,
    criticalPathRooms: { minimum: 6, maximum: 6 }, optionalRooms: { minimum: 1, maximum: 1 },
    maxBranchDepth: 1, secretCount: 0, entranceNodeId: 'drain-entry', exitNodeId: 'upper-exit',
    nodes: [
      { id: 'drain-entry', role: 'entrance', templateTags: ['toxic-boiler', 'lower-drain'], sizeClass: 'small', encounterIds: [], pickupIds: ['repair-kit'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'sluice-key-bay', role: 'corridor', templateTags: ['toxic-boiler', 'sluice-key'], sizeClass: 'medium', encounterIds: [], pickupIds: ['sluice-key'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'rising-switchbacks', role: 'corridor', templateTags: ['toxic-boiler', 'rising-hazard'], sizeClass: 'large', encounterIds: [], pickupIds: ['pulse-cell'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'magenta-drain-floor', role: 'arena', templateTags: ['toxic-boiler', 'escape-arena'], sizeClass: 'large', encounterIds: ['drainpipe-company'], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'overflow-balcony', role: 'corridor', templateTags: ['toxic-boiler', 'optional-overflow'], sizeClass: 'medium', encounterIds: [], pickupIds: ['coin-cache'], checkpointId: null, storyIds: [], criticalPath: false },
      { id: 'upper-checkpoint', role: 'checkpoint', templateTags: ['toxic-boiler', 'high-ground'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: 'checkpoint-027', storyIds: [], criticalPath: true },
      { id: 'upper-exit', role: 'exit', templateTags: ['toxic-boiler', 'objective-exit'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
    ],
    edges: [
      { id: 'entry-key', from: 'drain-entry', to: 'sluice-key-bay', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'key-switchbacks', from: 'sluice-key-bay', to: 'rising-switchbacks', bidirectional: true, requiredKeyId: 'sluice-key', doorType: 'workshop-lock', traversalCost: 1, stateTrigger: 'key-collected' },
      { id: 'switchbacks-arena', from: 'rising-switchbacks', to: 'magenta-drain-floor', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'arena-checkpoint', from: 'magenta-drain-floor', to: 'upper-checkpoint', bidirectional: true, requiredKeyId: null, doorType: 'arena-lock', traversalCost: 1, stateTrigger: null },
      { id: 'checkpoint-exit', from: 'upper-checkpoint', to: 'upper-exit', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: 'primary-objective' },
      { id: 'key-overflow', from: 'sluice-key-bay', to: 'overflow-balcony', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 2, stateTrigger: null },
      { id: 'overflow-arena', from: 'overflow-balcony', to: 'magenta-drain-floor', bidirectional: true, requiredKeyId: 'sluice-key', doorType: 'workshop-lock', traversalCost: 2, stateTrigger: 'key-collected' },
    ],
    keys: [{ id: 'sluice-key', placementNodeId: 'sluice-key-bay' }],
    hazards: [
      { id: 'magenta-drain-lower', nodeId: 'rising-switchbacks', periodTicks: 5000, activeTicks: 1, collisionProfileId: 'magenta-drain-lower-v1' },
      { id: 'magenta-drain-middle', nodeId: 'magenta-drain-floor', periodTicks: 5000, activeTicks: 1, collisionProfileId: 'magenta-drain-middle-v1' },
      { id: 'magenta-drain-upper', nodeId: 'upper-checkpoint', periodTicks: 5000, activeTicks: 1, collisionProfileId: 'magenta-drain-upper-v1' },
    ],
    generationAttempts: 1, validationProfile: 'authored-grid-v1',
  },
  objectives: [{
    id: 'escape-magenta-drain', type: 'hunt', required: true, titleKey: 'objectives.level_027',
    targetIds: ['lower-drain-rush', 'switchback-surge', 'upper-drain-escape'], targetCount: 10,
    durationTicks: null, dependsOn: [], completionMode: 'count', markerPolicy: 'always',
  }],
  encounters: [{
    id: 'drainpipe-company', roomNodeId: 'magenta-drain-floor', trigger: 'on-enter', triggerRef: null,
    arenaLock: true, waves: [{
      id: 'lower-drain-rush', startCondition: 'encounter-start', startDelayTicks: 0,
      spawnGroups: [
        { id: 'drain-wobblers', archetypeId: 'wobble-scout', count: 2, modifierIds: ['drain-mask'], spawnPointSetId: 'level-027-arena-1', dancePresetId: 'drainpipe-rumba', aiProfileId: 'chapter-03-stage-27', rewardProfileId: 'chapter-03-coins-27', rngStream: 'encounter.level-027.wave-1.wobblers', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
        { id: 'drain-slider', archetypeId: 'blue-slider', count: 1, modifierIds: ['sluice-skater'], spawnPointSetId: 'level-027-arena-1', dancePresetId: 'drainpipe-rumba', aiProfileId: 'chapter-03-stage-27', rewardProfileId: 'chapter-03-coins-27', rngStream: 'encounter.level-027.wave-1.slider', rank: 'normal', accessibilityVerificationId: 'silhouette-blue-slider-v1' },
        { id: 'drain-spinner', archetypeId: 'yellow-spinner', count: 1, modifierIds: ['drain-wheel'], spawnPointSetId: 'level-027-arena-1', dancePresetId: 'drainpipe-rumba', aiProfileId: 'chapter-03-stage-27', rewardProfileId: 'chapter-03-coins-27', rngStream: 'encounter.level-027.wave-1.spinner', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
      ], maxConcurrentRobots: 4, interGroupDelayTicks: 7, danceTransitionId: null,
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'switchback-surge', startCondition: 'previous-wave-complete', startDelayTicks: 18,
      spawnGroups: [
        { id: 'surge-firemouth', archetypeId: 'red-firemouth', count: 1, modifierIds: ['magenta-spit'], spawnPointSetId: 'level-027-arena-2', dancePresetId: 'drainpipe-rumba', aiProfileId: 'chapter-03-stage-27', rewardProfileId: 'chapter-03-coins-27', rngStream: 'encounter.level-027.wave-2.firemouth', rank: 'normal', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
        { id: 'surge-slider', archetypeId: 'blue-slider', count: 1, modifierIds: ['sluice-skater'], spawnPointSetId: 'level-027-arena-2', dancePresetId: 'drainpipe-rumba', aiProfileId: 'chapter-03-stage-27', rewardProfileId: 'chapter-03-coins-27', rngStream: 'encounter.level-027.wave-2.slider', rank: 'normal', accessibilityVerificationId: 'silhouette-blue-slider-v1' },
        { id: 'surge-wobbler', archetypeId: 'wobble-scout', count: 1, modifierIds: ['drain-mask'], spawnPointSetId: 'level-027-arena-2', dancePresetId: 'drainpipe-rumba', aiProfileId: 'chapter-03-stage-27', rewardProfileId: 'chapter-03-coins-27', rngStream: 'encounter.level-027.wave-2.wobbler', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
      ], maxConcurrentRobots: 3, interGroupDelayTicks: 6, danceTransitionId: 'switchback-surge',
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'upper-drain-escape', startCondition: 'previous-wave-complete', startDelayTicks: 16,
      spawnGroups: [
        { id: 'upper-firemouth', archetypeId: 'red-firemouth', count: 1, modifierIds: ['overflow-elite'], spawnPointSetId: 'level-027-arena-3', dancePresetId: 'drainpipe-rumba', aiProfileId: 'chapter-03-stage-27', rewardProfileId: 'chapter-03-coins-27', rngStream: 'encounter.level-027.wave-3.firemouth', rank: 'elite', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
        { id: 'upper-dj', archetypeId: 'cyan-dj', count: 1, modifierIds: ['drain-conductor'], spawnPointSetId: 'level-027-arena-3', dancePresetId: 'drainpipe-rumba', aiProfileId: 'chapter-03-stage-27', rewardProfileId: 'chapter-03-coins-27', rngStream: 'encounter.level-027.wave-3.dj', rank: 'elite', accessibilityVerificationId: 'silhouette-cyan-dj-v1' },
        { id: 'upper-spinner', archetypeId: 'yellow-spinner', count: 1, modifierIds: ['overflow-wheel'], spawnPointSetId: 'level-027-arena-3', dancePresetId: 'drainpipe-rumba', aiProfileId: 'chapter-03-stage-27', rewardProfileId: 'chapter-03-coins-27', rngStream: 'encounter.level-027.wave-3.spinner', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
      ], maxConcurrentRobots: 3, interGroupDelayTicks: 5, danceTransitionId: 'upper-drain-escape',
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }], completion: 'all-defeated', rewardId: 'chapter-03-clear-027', checkpointOnComplete: null,
  }],
  dance: {
    presetId: 'drainpipe-rumba', grammarVersion: 1, bpm: 150, timeSignature: '4/4', barsPerPhrase: 4,
    footPatternId: 'drainpipe-rumba-feet-v1', torsoPatternId: 'drainpipe-rumba-torso-v1',
    armPatternId: 'drainpipe-rumba-arms-v1', headAccentId: 'drainpipe-rumba-head-v1',
    pathPatternId: 'drainpipe-rumba-path-v1', attackBeats: [2, 6, 10, 14],
    vulnerableBeats: [0, 4, 8, 12], transitionIds: ['switchback-surge', 'upper-drain-escape', 'objective-clear'],
    visualIntensity: 0.98, reducedMotionPresetId: 'drainpipe-rumba-reduced-v1',
  },
  difficulty: { presetId: 'standard-chapter-03-027' }, economy: { presetId: 'economy-chapter-03-027' },
  checkpoints: [{ presetId: 'checkpoint-027' }], audio: { presetId: 'audio-toxic-boiler-027' },
  mastery: [{ presetId: 'level-027-par-time' }, { presetId: 'level-027-beat-second-rise' }],
  agentValidation: {
    tier: 'ordinary', owner: 'gameplay-qa', runs: [{
      id: 'standard-live', mode: 'live-agent', policyId: 'baseline-campaign-agent', policyVersion: 1,
      referenceReplayId: null, seed: 'campaign-level-027-v1', difficulty: 'Standard', assistProfileId: null,
      maxTicks: 15_000, stuckTimeoutTicks: 2_000, maxIllegalActions: 0,
      requiredObjectiveIds: ['escape-magenta-drain'], expectedCompletion: true, expectedChecksum: null,
      parTicks: 11_000,
      dependencyHashes: {
        simulationSchema: '7673b9fb7039c568', effectiveLevel: ZERO_HASH, simulationLevel: '9c349a3c30a13c05',
        balanceData: 'c1df429a54459a12', policyOrReplay: 'c00c7c2e50668d3b',
      },
    }],
  },
  performance: {
    maxActiveRobots: 4, maxActiveProjectiles: 64, maxActivePickups: 4, maxHazards: 3,
    maxMazeNodes: 9, maxRenderInstances: 1_024, expectedPeakDrawCalls: 8,
    expectedPeakMemoryMb: 192, benchmarkScenarioIds: ['level-027-standard-live'],
  },
  tags: ['chapter-03', 'toxic-boiler', 'rising-hazard-escape', 'magenta-drain', 'drainpipe-rumba'],
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

export const LEVEL_027: LevelDefinition = {
  ...draft,
  agentValidation: {
    ...draft.agentValidation,
    runs: draft.agentValidation.runs.map((run) => ({
      ...run,
      dependencyHashes: { ...run.dependencyHashes, effectiveLevel },
    })),
  },
};
