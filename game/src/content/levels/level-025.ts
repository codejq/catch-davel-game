import { checksumCanonicalContent } from '../content-hash.ts';
import type { LevelDefinition } from '../level-definition.ts';

const ZERO_HASH = '0000000000000000';

const draft: LevelDefinition = {
  schemaVersion: 1, id: 'level-025', number: 25, chapterId: 'chapter-03',
  nameKey: 'levels.025.name', briefingKey: 'levels.025.briefing', seed: 'campaign-level-025-v1',
  palette: { presetId: 'toxic-boiler-25' },
  maze: {
    templateSetId: 'boiler-crimson-pair', generatorVersion: 1,
    criticalPathRooms: { minimum: 6, maximum: 6 }, optionalRooms: { minimum: 1, maximum: 1 },
    maxBranchDepth: 1, secretCount: 0, entranceNodeId: 'duet-entry', exitNodeId: 'crimson-exit',
    nodes: [
      { id: 'duet-entry', role: 'entrance', templateTags: ['toxic-boiler', 'duet-gate'], sizeClass: 'small', encounterIds: [], pickupIds: ['repair-kit'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'duet-key-bay', role: 'corridor', templateTags: ['toxic-boiler', 'duet-key'], sizeClass: 'medium', encounterIds: [], pickupIds: ['duet-key'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'split-steam-lanes', role: 'corridor', templateTags: ['toxic-boiler', 'opposed-steam'], sizeClass: 'large', encounterIds: [], pickupIds: ['pulse-cell'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'crimson-duel-floor', role: 'arena', templateTags: ['toxic-boiler', 'synchronized-duo'], sizeClass: 'large', encounterIds: ['crimson-pair-company'], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'balcony-loop', role: 'corridor', templateTags: ['toxic-boiler', 'optional-balcony'], sizeClass: 'medium', encounterIds: [], pickupIds: ['coin-cache'], checkpointId: null, storyIds: [], criticalPath: false },
      { id: 'duet-checkpoint', role: 'checkpoint', templateTags: ['toxic-boiler', 'recovery'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: 'checkpoint-025', storyIds: [], criticalPath: true },
      { id: 'crimson-exit', role: 'exit', templateTags: ['toxic-boiler', 'objective-exit'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
    ],
    edges: [
      { id: 'entry-key', from: 'duet-entry', to: 'duet-key-bay', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'key-lanes', from: 'duet-key-bay', to: 'split-steam-lanes', bidirectional: true, requiredKeyId: 'duet-key', doorType: 'workshop-lock', traversalCost: 1, stateTrigger: 'key-collected' },
      { id: 'lanes-duel', from: 'split-steam-lanes', to: 'crimson-duel-floor', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'duel-checkpoint', from: 'crimson-duel-floor', to: 'duet-checkpoint', bidirectional: true, requiredKeyId: null, doorType: 'arena-lock', traversalCost: 1, stateTrigger: null },
      { id: 'checkpoint-exit', from: 'duet-checkpoint', to: 'crimson-exit', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: 'primary-objective' },
      { id: 'key-balcony', from: 'duet-key-bay', to: 'balcony-loop', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 2, stateTrigger: null },
      { id: 'balcony-duel', from: 'balcony-loop', to: 'crimson-duel-floor', bidirectional: true, requiredKeyId: 'duet-key', doorType: 'workshop-lock', traversalCost: 2, stateTrigger: 'key-collected' },
    ],
    keys: [{ id: 'duet-key', placementNodeId: 'duet-key-bay' }],
    hazards: [
      { id: 'crimson-gate-left', nodeId: 'split-steam-lanes', periodTicks: 240, activeTicks: 96, collisionProfileId: 'crimson-gate-left-v1' },
      { id: 'crimson-gate-right', nodeId: 'split-steam-lanes', periodTicks: 240, activeTicks: 96, collisionProfileId: 'crimson-gate-right-v1' },
      { id: 'crimson-steam-left', nodeId: 'crimson-duel-floor', periodTicks: 240, activeTicks: 170, collisionProfileId: 'crimson-steam-left-v1' },
      { id: 'crimson-steam-right', nodeId: 'crimson-duel-floor', periodTicks: 240, activeTicks: 170, collisionProfileId: 'crimson-steam-right-v1' },
    ],
    generationAttempts: 1, validationProfile: 'authored-grid-v1',
  },
  objectives: [{
    id: 'break-crimson-pair', type: 'hunt', required: true, titleKey: 'objectives.level_025',
    targetIds: ['duet-opening', 'crossfire-rehearsal', 'crimson-pair'], targetCount: 10,
    durationTicks: null, dependsOn: [], completionMode: 'count', markerPolicy: 'always',
  }],
  encounters: [{
    id: 'crimson-pair-company', roomNodeId: 'crimson-duel-floor', trigger: 'on-enter', triggerRef: null,
    arenaLock: true, waves: [{
      id: 'duet-opening', startCondition: 'encounter-start', startDelayTicks: 0,
      spawnGroups: [
        { id: 'opening-wobblers', archetypeId: 'wobble-scout', count: 2, modifierIds: ['crimson-mask'], spawnPointSetId: 'level-025-arena-1', dancePresetId: 'duelling-tango', aiProfileId: 'chapter-03-stage-25', rewardProfileId: 'chapter-03-coins-25', rngStream: 'encounter.level-025.wave-1.wobblers', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
        { id: 'opening-slider', archetypeId: 'blue-slider', count: 1, modifierIds: ['duet-skater'], spawnPointSetId: 'level-025-arena-1', dancePresetId: 'duelling-tango', aiProfileId: 'chapter-03-stage-25', rewardProfileId: 'chapter-03-coins-25', rngStream: 'encounter.level-025.wave-1.slider', rank: 'normal', accessibilityVerificationId: 'silhouette-blue-slider-v1' },
        { id: 'opening-spinner', archetypeId: 'yellow-spinner', count: 1, modifierIds: ['duet-wheel'], spawnPointSetId: 'level-025-arena-1', dancePresetId: 'duelling-tango', aiProfileId: 'chapter-03-stage-25', rewardProfileId: 'chapter-03-coins-25', rngStream: 'encounter.level-025.wave-1.spinner', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
      ], maxConcurrentRobots: 4, interGroupDelayTicks: 7, danceTransitionId: null,
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'crossfire-rehearsal', startCondition: 'previous-wave-complete', startDelayTicks: 20,
      spawnGroups: [
        { id: 'rehearsal-firemouth', archetypeId: 'red-firemouth', count: 1, modifierIds: ['crimson-flame'], spawnPointSetId: 'level-025-arena-2', dancePresetId: 'duelling-tango', aiProfileId: 'chapter-03-stage-25', rewardProfileId: 'chapter-03-coins-25', rngStream: 'encounter.level-025.wave-2.firemouth', rank: 'normal', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
        { id: 'rehearsal-wobbler', archetypeId: 'wobble-scout', count: 1, modifierIds: ['crimson-mask'], spawnPointSetId: 'level-025-arena-2', dancePresetId: 'duelling-tango', aiProfileId: 'chapter-03-stage-25', rewardProfileId: 'chapter-03-coins-25', rngStream: 'encounter.level-025.wave-2.wobbler', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
        { id: 'rehearsal-slider', archetypeId: 'blue-slider', count: 1, modifierIds: ['duet-skater'], spawnPointSetId: 'level-025-arena-2', dancePresetId: 'duelling-tango', aiProfileId: 'chapter-03-stage-25', rewardProfileId: 'chapter-03-coins-25', rngStream: 'encounter.level-025.wave-2.slider', rank: 'normal', accessibilityVerificationId: 'silhouette-blue-slider-v1' },
        { id: 'rehearsal-spinner', archetypeId: 'yellow-spinner', count: 1, modifierIds: ['duet-wheel'], spawnPointSetId: 'level-025-arena-2', dancePresetId: 'duelling-tango', aiProfileId: 'chapter-03-stage-25', rewardProfileId: 'chapter-03-coins-25', rngStream: 'encounter.level-025.wave-2.spinner', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
      ], maxConcurrentRobots: 4, interGroupDelayTicks: 6, danceTransitionId: 'crossfire-rehearsal',
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'crimson-pair', startCondition: 'previous-wave-complete', startDelayTicks: 18,
      spawnGroups: [
        { id: 'crimson-firemouth', archetypeId: 'red-firemouth', count: 1, modifierIds: ['crimson-pair'], spawnPointSetId: 'level-025-arena-3', dancePresetId: 'duelling-tango', aiProfileId: 'chapter-03-stage-25', rewardProfileId: 'chapter-03-coins-25', rngStream: 'encounter.level-025.wave-3.firemouth', rank: 'elite', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
        { id: 'crimson-conductor', archetypeId: 'cyan-dj', count: 1, modifierIds: ['crimson-pair'], spawnPointSetId: 'level-025-arena-3', dancePresetId: 'duelling-tango', aiProfileId: 'chapter-03-stage-25', rewardProfileId: 'chapter-03-coins-25', rngStream: 'encounter.level-025.wave-3.dj', rank: 'elite', accessibilityVerificationId: 'silhouette-cyan-dj-v1' },
      ], maxConcurrentRobots: 2, interGroupDelayTicks: 0, danceTransitionId: 'crimson-pair',
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }], completion: 'all-defeated', rewardId: 'chapter-03-clear-025', checkpointOnComplete: null,
  }],
  dance: {
    presetId: 'duelling-tango', grammarVersion: 1, bpm: 142, timeSignature: '4/4', barsPerPhrase: 4,
    footPatternId: 'duelling-tango-feet-v1', torsoPatternId: 'duelling-tango-torso-v1',
    armPatternId: 'duelling-tango-arms-v1', headAccentId: 'duelling-tango-head-v1',
    pathPatternId: 'duelling-tango-path-v1', attackBeats: [2, 6, 10, 14],
    vulnerableBeats: [0, 4, 8, 12], transitionIds: ['crossfire-rehearsal', 'crimson-pair', 'objective-clear'],
    visualIntensity: 1, reducedMotionPresetId: 'duelling-tango-reduced-v1',
  },
  difficulty: { presetId: 'standard-chapter-03-025' }, economy: { presetId: 'economy-chapter-03-025' },
  checkpoints: [{ presetId: 'checkpoint-025' }], audio: { presetId: 'audio-toxic-boiler-025' },
  mastery: [{ presetId: 'level-025-par-time' }, { presetId: 'level-025-break-sync' }],
  agentValidation: {
    tier: 'named-elite', owner: 'gameplay-qa', runs: [{
      id: 'standard-live', mode: 'live-agent', policyId: 'baseline-campaign-agent', policyVersion: 1,
      referenceReplayId: null, seed: 'campaign-level-025-v1', difficulty: 'Standard', assistProfileId: null,
      maxTicks: 15_000, stuckTimeoutTicks: 2_000, maxIllegalActions: 0,
      requiredObjectiveIds: ['break-crimson-pair'], expectedCompletion: true, expectedChecksum: null,
      parTicks: 11_000,
      dependencyHashes: {
        simulationSchema: '7673b9fb7039c568', effectiveLevel: ZERO_HASH, simulationLevel: '1c7b106c08f767cd',
        balanceData: 'c1df429a54459a12', policyOrReplay: 'c00c7c2e50668d3b',
      },
    }],
  },
  performance: {
    maxActiveRobots: 4, maxActiveProjectiles: 64, maxActivePickups: 4, maxHazards: 4,
    maxMazeNodes: 9, maxRenderInstances: 1_024, expectedPeakDrawCalls: 8,
    expectedPeakMemoryMb: 192, benchmarkScenarioIds: ['level-025-standard-live'],
  },
  tags: ['chapter-03', 'toxic-boiler', 'synchronized-elite-duo', 'crimson-pair', 'duelling-tango'],
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

export const LEVEL_025: LevelDefinition = {
  ...draft,
  agentValidation: {
    ...draft.agentValidation,
    runs: draft.agentValidation.runs.map((run) => ({
      ...run,
      dependencyHashes: { ...run.dependencyHashes, effectiveLevel },
    })),
  },
};
