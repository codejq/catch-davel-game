import { checksumCanonicalContent } from '../content-hash.ts';
import type { LevelDefinition } from '../level-definition.ts';

const ZERO_HASH = '0000000000000000';

const draft: LevelDefinition = {
  schemaVersion: 1, id: 'level-028', number: 28, chapterId: 'chapter-03',
  nameKey: 'levels.028.name', briefingKey: 'levels.028.briefing', seed: 'campaign-level-028-v1',
  palette: { presetId: 'toxic-boiler-28' },
  maze: {
    templateSetId: 'boiler-three-key-tango', generatorVersion: 1,
    criticalPathRooms: { minimum: 7, maximum: 7 }, optionalRooms: { minimum: 1, maximum: 1 },
    maxBranchDepth: 1, secretCount: 0, entranceNodeId: 'tango-entry', exitNodeId: 'triple-lock-exit',
    nodes: [
      { id: 'tango-entry', role: 'entrance', templateTags: ['toxic-boiler', 'key-sequence'], sizeClass: 'small', encounterIds: [], pickupIds: ['repair-kit'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'brass-key-bay', role: 'corridor', templateTags: ['toxic-boiler', 'brass-key'], sizeClass: 'medium', encounterIds: [], pickupIds: ['brass-tango-key'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'cyan-key-bay', role: 'corridor', templateTags: ['toxic-boiler', 'cyan-key'], sizeClass: 'medium', encounterIds: [], pickupIds: ['cyan-tango-key', 'pulse-cell'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'magenta-key-bay', role: 'corridor', templateTags: ['toxic-boiler', 'magenta-key'], sizeClass: 'medium', encounterIds: [], pickupIds: ['magenta-tango-key'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'three-key-floor', role: 'arena', templateTags: ['toxic-boiler', 'triple-lock-arena'], sizeClass: 'large', encounterIds: ['triple-key-company'], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'gearbox-loop', role: 'corridor', templateTags: ['toxic-boiler', 'optional-loop'], sizeClass: 'medium', encounterIds: [], pickupIds: ['coin-cache'], checkpointId: null, storyIds: [], criticalPath: false },
      { id: 'tango-checkpoint', role: 'checkpoint', templateTags: ['toxic-boiler', 'three-key-console'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: 'checkpoint-028', storyIds: [], criticalPath: true },
      { id: 'triple-lock-exit', role: 'exit', templateTags: ['toxic-boiler', 'objective-exit'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
    ],
    edges: [
      { id: 'entry-brass', from: 'tango-entry', to: 'brass-key-bay', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'brass-cyan', from: 'brass-key-bay', to: 'cyan-key-bay', bidirectional: true, requiredKeyId: 'brass-tango-key', doorType: 'workshop-lock', traversalCost: 1, stateTrigger: 'key-collected' },
      { id: 'cyan-magenta', from: 'cyan-key-bay', to: 'magenta-key-bay', bidirectional: true, requiredKeyId: 'cyan-tango-key', doorType: 'workshop-lock', traversalCost: 1, stateTrigger: 'key-collected' },
      { id: 'magenta-floor', from: 'magenta-key-bay', to: 'three-key-floor', bidirectional: true, requiredKeyId: 'magenta-tango-key', doorType: 'workshop-lock', traversalCost: 1, stateTrigger: 'key-collected' },
      { id: 'floor-checkpoint', from: 'three-key-floor', to: 'tango-checkpoint', bidirectional: true, requiredKeyId: null, doorType: 'arena-lock', traversalCost: 1, stateTrigger: null },
      { id: 'checkpoint-exit', from: 'tango-checkpoint', to: 'triple-lock-exit', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: 'primary-objective' },
      { id: 'brass-loop', from: 'brass-key-bay', to: 'gearbox-loop', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 2, stateTrigger: null },
      { id: 'loop-floor', from: 'gearbox-loop', to: 'three-key-floor', bidirectional: true, requiredKeyId: 'magenta-tango-key', doorType: 'workshop-lock', traversalCost: 3, stateTrigger: 'key-collected' },
    ],
    keys: [
      { id: 'brass-tango-key', placementNodeId: 'brass-key-bay' },
      { id: 'cyan-tango-key', placementNodeId: 'cyan-key-bay' },
      { id: 'magenta-tango-key', placementNodeId: 'magenta-key-bay' },
    ],
    hazards: [
      { id: 'brass-key-lock', nodeId: 'brass-key-bay', periodTicks: 1, activeTicks: 1, collisionProfileId: 'three-key-brass-lock-v1' },
      { id: 'cyan-key-lock', nodeId: 'cyan-key-bay', periodTicks: 1, activeTicks: 1, collisionProfileId: 'three-key-cyan-lock-v1' },
    ],
    generationAttempts: 1, validationProfile: 'authored-grid-v1',
  },
  objectives: [{
    id: 'clear-three-key-tango', type: 'recover-keys', required: true, titleKey: 'objectives.level_028',
    targetIds: ['brass-key-beat', 'cyan-key-counterstep', 'magenta-key-finale'], targetCount: 10,
    durationTicks: null, dependsOn: [], completionMode: 'count', markerPolicy: 'always',
  }],
  encounters: [{
    id: 'triple-key-company', roomNodeId: 'three-key-floor', trigger: 'on-enter', triggerRef: null,
    arenaLock: true, waves: [{
      id: 'brass-key-beat', startCondition: 'encounter-start', startDelayTicks: 0,
      spawnGroups: [
        { id: 'brass-wobblers', archetypeId: 'wobble-scout', count: 2, modifierIds: ['brass-key-grin'], spawnPointSetId: 'level-028-arena-1', dancePresetId: 'triple-key-cha-cha', aiProfileId: 'chapter-03-stage-28', rewardProfileId: 'chapter-03-coins-28', rngStream: 'encounter.level-028.wave-1.wobblers', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
        { id: 'brass-spinner', archetypeId: 'yellow-spinner', count: 1, modifierIds: ['brass-key-spin'], spawnPointSetId: 'level-028-arena-1', dancePresetId: 'triple-key-cha-cha', aiProfileId: 'chapter-03-stage-28', rewardProfileId: 'chapter-03-coins-28', rngStream: 'encounter.level-028.wave-1.spinner', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
      ], maxConcurrentRobots: 3, interGroupDelayTicks: 7, danceTransitionId: null,
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'cyan-key-counterstep', startCondition: 'previous-wave-complete', startDelayTicks: 17,
      spawnGroups: [
        { id: 'cyan-sliders', archetypeId: 'blue-slider', count: 2, modifierIds: ['cyan-key-skate'], spawnPointSetId: 'level-028-arena-2', dancePresetId: 'triple-key-cha-cha', aiProfileId: 'chapter-03-stage-28', rewardProfileId: 'chapter-03-coins-28', rngStream: 'encounter.level-028.wave-2.sliders', rank: 'normal', accessibilityVerificationId: 'silhouette-blue-slider-v1' },
        { id: 'cyan-dj', archetypeId: 'cyan-dj', count: 1, modifierIds: ['lockstep-conductor'], spawnPointSetId: 'level-028-arena-2', dancePresetId: 'triple-key-cha-cha', aiProfileId: 'chapter-03-stage-28', rewardProfileId: 'chapter-03-coins-28', rngStream: 'encounter.level-028.wave-2.dj', rank: 'elite', accessibilityVerificationId: 'silhouette-cyan-dj-v1' },
      ], maxConcurrentRobots: 3, interGroupDelayTicks: 6, danceTransitionId: 'cyan-key-counterstep',
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'magenta-key-finale', startCondition: 'previous-wave-complete', startDelayTicks: 15,
      spawnGroups: [
        { id: 'magenta-firemouth', archetypeId: 'red-firemouth', count: 1, modifierIds: ['magenta-key-fire'], spawnPointSetId: 'level-028-arena-3', dancePresetId: 'triple-key-cha-cha', aiProfileId: 'chapter-03-stage-28', rewardProfileId: 'chapter-03-coins-28', rngStream: 'encounter.level-028.wave-3.firemouth', rank: 'normal', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
        { id: 'magenta-foreman', archetypeId: 'red-firemouth', count: 1, modifierIds: ['triple-lock-elite'], spawnPointSetId: 'level-028-arena-3', dancePresetId: 'triple-key-cha-cha', aiProfileId: 'chapter-03-stage-28', rewardProfileId: 'chapter-03-coins-28', rngStream: 'encounter.level-028.wave-3.foreman', rank: 'elite', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
        { id: 'magenta-spinner', archetypeId: 'yellow-spinner', count: 1, modifierIds: ['triple-lock-wheel'], spawnPointSetId: 'level-028-arena-3', dancePresetId: 'triple-key-cha-cha', aiProfileId: 'chapter-03-stage-28', rewardProfileId: 'chapter-03-coins-28', rngStream: 'encounter.level-028.wave-3.spinner', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
        { id: 'magenta-wobbler', archetypeId: 'wobble-scout', count: 1, modifierIds: ['final-key-grin'], spawnPointSetId: 'level-028-arena-3', dancePresetId: 'triple-key-cha-cha', aiProfileId: 'chapter-03-stage-28', rewardProfileId: 'chapter-03-coins-28', rngStream: 'encounter.level-028.wave-3.wobbler', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
      ], maxConcurrentRobots: 4, interGroupDelayTicks: 5, danceTransitionId: 'magenta-key-finale',
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }], completion: 'all-defeated', rewardId: 'chapter-03-clear-028', checkpointOnComplete: null,
  }],
  dance: {
    presetId: 'triple-key-cha-cha', grammarVersion: 1, bpm: 154, timeSignature: '4/4', barsPerPhrase: 4,
    footPatternId: 'triple-key-cha-cha-feet-v1', torsoPatternId: 'triple-key-cha-cha-torso-v1',
    armPatternId: 'triple-key-cha-cha-arms-v1', headAccentId: 'triple-key-cha-cha-head-v1',
    pathPatternId: 'triple-key-cha-cha-path-v1', attackBeats: [1, 5, 9, 13],
    vulnerableBeats: [3, 7, 11, 15], transitionIds: ['cyan-key-counterstep', 'magenta-key-finale', 'objective-clear'],
    visualIntensity: 1, reducedMotionPresetId: 'triple-key-cha-cha-reduced-v1',
  },
  difficulty: { presetId: 'standard-chapter-03-028' }, economy: { presetId: 'economy-chapter-03-028' },
  checkpoints: [{ presetId: 'checkpoint-028' }], audio: { presetId: 'audio-toxic-boiler-028' },
  mastery: [{ presetId: 'level-028-par-time' }, { presetId: 'level-028-three-keys-no-damage' }],
  agentValidation: {
    tier: 'ordinary', owner: 'gameplay-qa', runs: [{
      id: 'standard-live', mode: 'live-agent', policyId: 'baseline-campaign-agent', policyVersion: 1,
      referenceReplayId: null, seed: 'campaign-level-028-v1', difficulty: 'Standard', assistProfileId: null,
      maxTicks: 16_000, stuckTimeoutTicks: 2_000, maxIllegalActions: 0,
      requiredObjectiveIds: ['clear-three-key-tango'], expectedCompletion: true, expectedChecksum: null,
      parTicks: 12_000,
      dependencyHashes: {
        simulationSchema: '6cafd562c735e11d', effectiveLevel: ZERO_HASH, simulationLevel: '2ce1fc91cbee4832',
        balanceData: '1f697b70870c7801', policyOrReplay: '33ce82519e6acf00',
      },
    }],
  },
  performance: {
    maxActiveRobots: 4, maxActiveProjectiles: 64, maxActivePickups: 6, maxHazards: 2,
    maxMazeNodes: 10, maxRenderInstances: 1_024, expectedPeakDrawCalls: 8,
    expectedPeakMemoryMb: 192, benchmarkScenarioIds: ['level-028-standard-live'],
  },
  tags: ['chapter-03', 'toxic-boiler', 'multi-key-progression', 'three-key-tango', 'triple-key-cha-cha'],
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

export const LEVEL_028: LevelDefinition = {
  ...draft,
  agentValidation: {
    ...draft.agentValidation,
    runs: draft.agentValidation.runs.map((run) => ({
      ...run,
      dependencyHashes: { ...run.dependencyHashes, effectiveLevel },
    })),
  },
};
