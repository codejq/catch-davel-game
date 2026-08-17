import { checksumCanonicalContent } from '../content-hash.ts';
import type { LevelDefinition } from '../level-definition.ts';

const ZERO_HASH = '0000000000000000';

const draft: LevelDefinition = {
  schemaVersion: 1, id: 'level-021', number: 21, chapterId: 'chapter-03',
  nameKey: 'levels.021.name', briefingKey: 'levels.021.briefing', seed: 'campaign-level-021-v1',
  palette: { presetId: 'toxic-boiler-21' },
  maze: {
    templateSetId: 'boiler-pipework-promenade', generatorVersion: 1,
    criticalPathRooms: { minimum: 6, maximum: 6 }, optionalRooms: { minimum: 1, maximum: 1 },
    maxBranchDepth: 1, secretCount: 0, entranceNodeId: 'boiler-entry', exitNodeId: 'steamworks-exit',
    nodes: [
      { id: 'boiler-entry', role: 'entrance', templateTags: ['toxic-boiler', 'bomb-locker'], sizeClass: 'small', encounterIds: [], pickupIds: ['repair-kit'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'service-wrench-room', role: 'corridor', templateTags: ['toxic-boiler', 'service-wrench'], sizeClass: 'medium', encounterIds: [], pickupIds: ['service-wrench'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'demolition-lock', role: 'corridor', templateTags: ['toxic-boiler', 'bomb-tutorial', 'pressure-seal'], sizeClass: 'medium', encounterIds: [], pickupIds: ['pulse-cell'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'pipework-promenade', role: 'arena', templateTags: ['toxic-boiler', 'vent-routes', 'steam-lanes'], sizeClass: 'large', encounterIds: ['pipe-tap-crews'], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'maintenance-vent', role: 'corridor', templateTags: ['toxic-boiler', 'optional-vent'], sizeClass: 'medium', encounterIds: [], pickupIds: ['coin-cache'], checkpointId: null, storyIds: [], criticalPath: false },
      { id: 'boiler-checkpoint', role: 'checkpoint', templateTags: ['toxic-boiler', 'recovery'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: 'checkpoint-021', storyIds: [], criticalPath: true },
      { id: 'steamworks-exit', role: 'exit', templateTags: ['toxic-boiler', 'objective-exit'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
    ],
    edges: [
      { id: 'entry-wrench', from: 'boiler-entry', to: 'service-wrench-room', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'wrench-lock', from: 'service-wrench-room', to: 'demolition-lock', bidirectional: true, requiredKeyId: 'service-wrench', doorType: 'workshop-lock', traversalCost: 1, stateTrigger: 'key-collected' },
      { id: 'lock-promenade', from: 'demolition-lock', to: 'pipework-promenade', bidirectional: true, requiredKeyId: null, doorType: 'workshop-lock', traversalCost: 1, stateTrigger: 'bomb-detonated' },
      { id: 'promenade-checkpoint', from: 'pipework-promenade', to: 'boiler-checkpoint', bidirectional: true, requiredKeyId: null, doorType: 'arena-lock', traversalCost: 1, stateTrigger: null },
      { id: 'checkpoint-exit', from: 'boiler-checkpoint', to: 'steamworks-exit', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: 'primary-objective' },
      { id: 'wrench-vent', from: 'service-wrench-room', to: 'maintenance-vent', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 2, stateTrigger: null },
      { id: 'vent-promenade', from: 'maintenance-vent', to: 'pipework-promenade', bidirectional: true, requiredKeyId: 'service-wrench', doorType: 'workshop-lock', traversalCost: 2, stateTrigger: 'key-collected' },
    ],
    keys: [{ id: 'service-wrench', placementNodeId: 'service-wrench-room' }],
    hazards: [
      { id: 'promenade-bomb-seal', nodeId: 'demolition-lock', periodTicks: 1, activeTicks: 1, collisionProfileId: 'promenade-bomb-seal-v1' },
      { id: 'promenade-steam-west', nodeId: 'pipework-promenade', periodTicks: 180, activeTicks: 135, collisionProfileId: 'promenade-steam-west-v1' },
      { id: 'promenade-steam-east', nodeId: 'pipework-promenade', periodTicks: 180, activeTicks: 135, collisionProfileId: 'promenade-steam-east-v1' },
    ],
    generationAttempts: 1, validationProfile: 'authored-grid-v1',
  },
  objectives: [{
    id: 'clear-pipework-promenade', type: 'deactivate', required: true, titleKey: 'objectives.level_021',
    targetIds: ['pressure-rehearsal', 'steamline-encore'], targetCount: 8,
    durationTicks: null, dependsOn: [], completionMode: 'count', markerPolicy: 'always',
  }],
  encounters: [{
    id: 'pipe-tap-crews', roomNodeId: 'pipework-promenade', trigger: 'on-enter', triggerRef: null,
    arenaLock: true, waves: [{
      id: 'pressure-rehearsal', startCondition: 'encounter-start', startDelayTicks: 0,
      spawnGroups: [
        { id: 'pipe-wobblers', archetypeId: 'wobble-scout', count: 2, modifierIds: ['pipe-knocker'], spawnPointSetId: 'level-021-arena-1', dancePresetId: 'pipe-tap-tango', aiProfileId: 'chapter-03-stage-21', rewardProfileId: 'chapter-03-coins-21', rngStream: 'encounter.level-021.wave-1.wobblers', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
        { id: 'pipe-firemouth', archetypeId: 'red-firemouth', count: 1, modifierIds: ['boiler-belch'], spawnPointSetId: 'level-021-arena-1', dancePresetId: 'pipe-tap-tango', aiProfileId: 'chapter-03-stage-21', rewardProfileId: 'chapter-03-coins-21', rngStream: 'encounter.level-021.wave-1.firemouth', rank: 'normal', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
        { id: 'pipe-spinner', archetypeId: 'yellow-spinner', count: 1, modifierIds: ['valve-wheel'], spawnPointSetId: 'level-021-arena-1', dancePresetId: 'pipe-tap-tango', aiProfileId: 'chapter-03-stage-21', rewardProfileId: 'chapter-03-coins-21', rngStream: 'encounter.level-021.wave-1.spinner', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
      ], maxConcurrentRobots: 4, interGroupDelayTicks: 8, danceTransitionId: null,
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'steamline-encore', startCondition: 'previous-wave-complete', startDelayTicks: 24,
      spawnGroups: [
        { id: 'vent-sliders', archetypeId: 'blue-slider', count: 2, modifierIds: ['vent-skater'], spawnPointSetId: 'level-021-arena-2', dancePresetId: 'pipe-tap-tango', aiProfileId: 'chapter-03-stage-21', rewardProfileId: 'chapter-03-coins-21', rngStream: 'encounter.level-021.wave-2.sliders', rank: 'normal', accessibilityVerificationId: 'silhouette-blue-slider-v1' },
        { id: 'boiler-foreman', archetypeId: 'red-firemouth', count: 1, modifierIds: ['pressure-foreman'], spawnPointSetId: 'level-021-arena-2', dancePresetId: 'pipe-tap-tango', aiProfileId: 'chapter-03-stage-21', rewardProfileId: 'chapter-03-coins-21', rngStream: 'encounter.level-021.wave-2.foreman', rank: 'elite', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
        { id: 'boiler-dj', archetypeId: 'cyan-dj', count: 1, modifierIds: ['steam-conductor'], spawnPointSetId: 'level-021-arena-2', dancePresetId: 'pipe-tap-tango', aiProfileId: 'chapter-03-stage-21', rewardProfileId: 'chapter-03-coins-21', rngStream: 'encounter.level-021.wave-2.dj', rank: 'elite', accessibilityVerificationId: 'silhouette-cyan-dj-v1' },
      ], maxConcurrentRobots: 4, interGroupDelayTicks: 8, danceTransitionId: 'steamline-encore',
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }], completion: 'all-defeated', rewardId: 'chapter-03-clear-021', checkpointOnComplete: null,
  }],
  dance: {
    presetId: 'pipe-tap-tango', grammarVersion: 1, bpm: 126, timeSignature: '4/4', barsPerPhrase: 4,
    footPatternId: 'pipe-tap-tango-feet-v1', torsoPatternId: 'pipe-tap-tango-torso-v1',
    armPatternId: 'pipe-tap-tango-arms-v1', headAccentId: 'pipe-tap-tango-head-v1',
    pathPatternId: 'pipe-tap-tango-path-v1', attackBeats: [2, 6, 10, 14],
    vulnerableBeats: [0, 4, 8, 12], transitionIds: ['steamline-encore', 'objective-clear'],
    visualIntensity: 0.86, reducedMotionPresetId: 'pipe-tap-tango-reduced-v1',
  },
  difficulty: { presetId: 'standard-chapter-03-021' }, economy: { presetId: 'economy-chapter-03-021' },
  checkpoints: [{ presetId: 'checkpoint-021' }], audio: { presetId: 'audio-toxic-boiler-021' },
  mastery: [{ presetId: 'level-021-par-time' }, { presetId: 'level-021-one-bomb' }],
  agentValidation: {
    tier: 'ordinary', owner: 'gameplay-qa', runs: [{
      id: 'standard-live', mode: 'live-agent', policyId: 'baseline-campaign-agent', policyVersion: 2,
      referenceReplayId: null, seed: 'campaign-level-021-v1', difficulty: 'Standard', assistProfileId: null,
      maxTicks: 14_000, stuckTimeoutTicks: 2_000, maxIllegalActions: 0,
      requiredObjectiveIds: ['clear-pipework-promenade'], expectedCompletion: true, expectedChecksum: null,
      parTicks: 9_500,
      dependencyHashes: {
        simulationSchema: '7673b9fb7039c568', effectiveLevel: ZERO_HASH, simulationLevel: 'ae7edbfccd2b01e7',
        balanceData: 'c1df429a54459a12', policyOrReplay: 'c0167c2e506ee1c0',
      },
    }],
  },
  performance: {
    maxActiveRobots: 4, maxActiveProjectiles: 48, maxActivePickups: 4, maxHazards: 3,
    maxMazeNodes: 9, maxRenderInstances: 1_024, expectedPeakDrawCalls: 8,
    expectedPeakMemoryMb: 192, benchmarkScenarioIds: ['level-021-standard-live'],
  },
  tags: ['chapter-03', 'toxic-boiler', 'bomb-tutorial', 'bomb-seal', 'vent-routes', 'pipe-tap-tango'],
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

export const LEVEL_021: LevelDefinition = {
  ...draft,
  agentValidation: {
    ...draft.agentValidation,
    runs: draft.agentValidation.runs.map((run) => ({
      ...run,
      dependencyHashes: { ...run.dependencyHashes, effectiveLevel },
    })),
  },
};
