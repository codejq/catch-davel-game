import { checksumCanonicalContent } from '../content-hash.ts';
import type { LevelDefinition } from '../level-definition.ts';

const ZERO_HASH = '0000000000000000';

const draft: LevelDefinition = {
  schemaVersion: 1, id: 'level-026', number: 26, chapterId: 'chapter-03',
  nameKey: 'levels.026.name', briefingKey: 'levels.026.briefing', seed: 'campaign-level-026-v1',
  palette: { presetId: 'toxic-boiler-26' },
  maze: {
    templateSetId: 'boiler-bombs-ballroom', generatorVersion: 1,
    criticalPathRooms: { minimum: 6, maximum: 6 }, optionalRooms: { minimum: 1, maximum: 1 },
    maxBranchDepth: 1, secretCount: 0, entranceNodeId: 'ballroom-entry', exitNodeId: 'blast-exit',
    nodes: [
      { id: 'ballroom-entry', role: 'entrance', templateTags: ['toxic-boiler', 'bomb-ballroom'], sizeClass: 'small', encounterIds: [], pickupIds: ['repair-kit'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'detonator-key-bay', role: 'corridor', templateTags: ['toxic-boiler', 'detonator-key'], sizeClass: 'medium', encounterIds: [], pickupIds: ['detonator-key'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'three-seal-gallery', role: 'corridor', templateTags: ['toxic-boiler', 'destructible-routes'], sizeClass: 'large', encounterIds: [], pickupIds: ['pulse-cell'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'blast-ballroom', role: 'arena', templateTags: ['toxic-boiler', 'blast-draft'], sizeClass: 'large', encounterIds: ['ballroom-company'], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'shortcut-balcony', role: 'corridor', templateTags: ['toxic-boiler', 'optional-shortcut'], sizeClass: 'medium', encounterIds: [], pickupIds: ['coin-cache'], checkpointId: null, storyIds: [], criticalPath: false },
      { id: 'ballroom-checkpoint', role: 'checkpoint', templateTags: ['toxic-boiler', 'recovery'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: 'checkpoint-026', storyIds: [], criticalPath: true },
      { id: 'blast-exit', role: 'exit', templateTags: ['toxic-boiler', 'objective-exit'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
    ],
    edges: [
      { id: 'entry-key', from: 'ballroom-entry', to: 'detonator-key-bay', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'key-gallery', from: 'detonator-key-bay', to: 'three-seal-gallery', bidirectional: true, requiredKeyId: 'detonator-key', doorType: 'workshop-lock', traversalCost: 1, stateTrigger: 'key-collected' },
      { id: 'gallery-ballroom', from: 'three-seal-gallery', to: 'blast-ballroom', bidirectional: true, requiredKeyId: null, doorType: 'workshop-lock', traversalCost: 1, stateTrigger: 'bomb-detonated' },
      { id: 'ballroom-checkpoint-edge', from: 'blast-ballroom', to: 'ballroom-checkpoint', bidirectional: true, requiredKeyId: null, doorType: 'arena-lock', traversalCost: 1, stateTrigger: null },
      { id: 'checkpoint-exit', from: 'ballroom-checkpoint', to: 'blast-exit', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: 'primary-objective' },
      { id: 'key-balcony', from: 'detonator-key-bay', to: 'shortcut-balcony', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 2, stateTrigger: null },
      { id: 'balcony-ballroom', from: 'shortcut-balcony', to: 'blast-ballroom', bidirectional: true, requiredKeyId: null, doorType: 'workshop-lock', traversalCost: 2, stateTrigger: 'bomb-detonated' },
    ],
    keys: [{ id: 'detonator-key', placementNodeId: 'detonator-key-bay' }],
    hazards: [
      { id: 'ballroom-bomb-seal-center', nodeId: 'three-seal-gallery', periodTicks: 1, activeTicks: 1, collisionProfileId: 'ballroom-bomb-seal-center-v1' },
      { id: 'ballroom-bomb-shortcut-left', nodeId: 'shortcut-balcony', periodTicks: 1, activeTicks: 1, collisionProfileId: 'ballroom-bomb-shortcut-left-v1' },
      { id: 'ballroom-bomb-shortcut-right', nodeId: 'shortcut-balcony', periodTicks: 1, activeTicks: 1, collisionProfileId: 'ballroom-bomb-shortcut-right-v1' },
      { id: 'ballroom-blast-draft', nodeId: 'blast-ballroom', periodTicks: 180, activeTicks: 132, collisionProfileId: 'ballroom-blast-draft-v1' },
    ],
    generationAttempts: 1, validationProfile: 'authored-grid-v1',
  },
  objectives: [{
    id: 'clear-bombs-ballroom', type: 'deactivate', required: true, titleKey: 'objectives.level_026',
    targetIds: ['fuse-rehearsal', 'blast-crossfire', 'detonator-encore'], targetCount: 10,
    durationTicks: null, dependsOn: [], completionMode: 'count', markerPolicy: 'always',
  }],
  encounters: [{
    id: 'ballroom-company', roomNodeId: 'blast-ballroom', trigger: 'on-enter', triggerRef: null,
    arenaLock: true, waves: [{
      id: 'fuse-rehearsal', startCondition: 'encounter-start', startDelayTicks: 0,
      spawnGroups: [
        { id: 'fuse-wobblers', archetypeId: 'wobble-scout', count: 2, modifierIds: ['fuse-mask'], spawnPointSetId: 'level-026-arena-1', dancePresetId: 'detonator-danzon', aiProfileId: 'chapter-03-stage-26', rewardProfileId: 'chapter-03-coins-26', rngStream: 'encounter.level-026.wave-1.wobblers', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
        { id: 'fuse-slider', archetypeId: 'blue-slider', count: 1, modifierIds: ['blast-skater'], spawnPointSetId: 'level-026-arena-1', dancePresetId: 'detonator-danzon', aiProfileId: 'chapter-03-stage-26', rewardProfileId: 'chapter-03-coins-26', rngStream: 'encounter.level-026.wave-1.slider', rank: 'normal', accessibilityVerificationId: 'silhouette-blue-slider-v1' },
        { id: 'fuse-spinner', archetypeId: 'yellow-spinner', count: 1, modifierIds: ['fuse-wheel'], spawnPointSetId: 'level-026-arena-1', dancePresetId: 'detonator-danzon', aiProfileId: 'chapter-03-stage-26', rewardProfileId: 'chapter-03-coins-26', rngStream: 'encounter.level-026.wave-1.spinner', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
      ], maxConcurrentRobots: 4, interGroupDelayTicks: 7, danceTransitionId: null,
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'blast-crossfire', startCondition: 'previous-wave-complete', startDelayTicks: 20,
      spawnGroups: [
        { id: 'blast-firemouth', archetypeId: 'red-firemouth', count: 1, modifierIds: ['powder-belch'], spawnPointSetId: 'level-026-arena-2', dancePresetId: 'detonator-danzon', aiProfileId: 'chapter-03-stage-26', rewardProfileId: 'chapter-03-coins-26', rngStream: 'encounter.level-026.wave-2.firemouth', rank: 'normal', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
        { id: 'blast-slider', archetypeId: 'blue-slider', count: 1, modifierIds: ['blast-skater'], spawnPointSetId: 'level-026-arena-2', dancePresetId: 'detonator-danzon', aiProfileId: 'chapter-03-stage-26', rewardProfileId: 'chapter-03-coins-26', rngStream: 'encounter.level-026.wave-2.slider', rank: 'normal', accessibilityVerificationId: 'silhouette-blue-slider-v1' },
        { id: 'blast-wobbler', archetypeId: 'wobble-scout', count: 1, modifierIds: ['fuse-mask'], spawnPointSetId: 'level-026-arena-2', dancePresetId: 'detonator-danzon', aiProfileId: 'chapter-03-stage-26', rewardProfileId: 'chapter-03-coins-26', rngStream: 'encounter.level-026.wave-2.wobbler', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
      ], maxConcurrentRobots: 3, interGroupDelayTicks: 6, danceTransitionId: 'blast-crossfire',
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'detonator-encore', startCondition: 'previous-wave-complete', startDelayTicks: 18,
      spawnGroups: [
        { id: 'detonator-firemouth', archetypeId: 'red-firemouth', count: 1, modifierIds: ['detonator-elite'], spawnPointSetId: 'level-026-arena-3', dancePresetId: 'detonator-danzon', aiProfileId: 'chapter-03-stage-26', rewardProfileId: 'chapter-03-coins-26', rngStream: 'encounter.level-026.wave-3.firemouth', rank: 'elite', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
        { id: 'detonator-dj', archetypeId: 'cyan-dj', count: 1, modifierIds: ['fuse-conductor'], spawnPointSetId: 'level-026-arena-3', dancePresetId: 'detonator-danzon', aiProfileId: 'chapter-03-stage-26', rewardProfileId: 'chapter-03-coins-26', rngStream: 'encounter.level-026.wave-3.dj', rank: 'elite', accessibilityVerificationId: 'silhouette-cyan-dj-v1' },
        { id: 'detonator-spinner', archetypeId: 'yellow-spinner', count: 1, modifierIds: ['detonator-wheel'], spawnPointSetId: 'level-026-arena-3', dancePresetId: 'detonator-danzon', aiProfileId: 'chapter-03-stage-26', rewardProfileId: 'chapter-03-coins-26', rngStream: 'encounter.level-026.wave-3.spinner', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
      ], maxConcurrentRobots: 3, interGroupDelayTicks: 5, danceTransitionId: 'detonator-encore',
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }], completion: 'all-defeated', rewardId: 'chapter-03-clear-026', checkpointOnComplete: null,
  }],
  dance: {
    presetId: 'detonator-danzon', grammarVersion: 1, bpm: 146, timeSignature: '4/4', barsPerPhrase: 4,
    footPatternId: 'detonator-danzon-feet-v1', torsoPatternId: 'detonator-danzon-torso-v1',
    armPatternId: 'detonator-danzon-arms-v1', headAccentId: 'detonator-danzon-head-v1',
    pathPatternId: 'detonator-danzon-path-v1', attackBeats: [2, 6, 10, 14],
    vulnerableBeats: [0, 4, 8, 12], transitionIds: ['blast-crossfire', 'detonator-encore', 'objective-clear'],
    visualIntensity: 0.96, reducedMotionPresetId: 'detonator-danzon-reduced-v1',
  },
  difficulty: { presetId: 'standard-chapter-03-026' }, economy: { presetId: 'economy-chapter-03-026' },
  checkpoints: [{ presetId: 'checkpoint-026' }], audio: { presetId: 'audio-toxic-boiler-026' },
  mastery: [{ presetId: 'level-026-par-time' }, { presetId: 'level-026-open-one-shortcut' }],
  agentValidation: {
    tier: 'ordinary', owner: 'gameplay-qa', runs: [{
      id: 'standard-live', mode: 'live-agent', policyId: 'baseline-campaign-agent', policyVersion: 2,
      referenceReplayId: null, seed: 'campaign-level-026-v1', difficulty: 'Standard', assistProfileId: null,
      maxTicks: 15_000, stuckTimeoutTicks: 2_000, maxIllegalActions: 0,
      requiredObjectiveIds: ['clear-bombs-ballroom'], expectedCompletion: true, expectedChecksum: null,
      parTicks: 11_000,
      dependencyHashes: {
        simulationSchema: '7673b9fb7039c568', effectiveLevel: ZERO_HASH, simulationLevel: 'eac80a3af3d37d9a',
        balanceData: 'c1df429a54459a12', policyOrReplay: 'c0167c2e506ee1c0',
      },
    }],
  },
  performance: {
    maxActiveRobots: 4, maxActiveProjectiles: 64, maxActivePickups: 4, maxHazards: 4,
    maxMazeNodes: 9, maxRenderInstances: 1_024, expectedPeakDrawCalls: 8,
    expectedPeakMemoryMb: 192, benchmarkScenarioIds: ['level-026-standard-live'],
  },
  tags: ['chapter-03', 'toxic-boiler', 'bomb-seal', 'destructible-route-choices', 'bomb-ballroom', 'detonator-danzon'],
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

export const LEVEL_026: LevelDefinition = {
  ...draft,
  agentValidation: {
    ...draft.agentValidation,
    runs: draft.agentValidation.runs.map((run) => ({
      ...run,
      dependencyHashes: { ...run.dependencyHashes, effectiveLevel },
    })),
  },
};
