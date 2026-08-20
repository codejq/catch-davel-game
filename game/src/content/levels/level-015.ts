import { checksumCanonicalContent } from '../content-hash.ts';
import type { LevelDefinition } from '../level-definition.ts';

const ZERO_HASH = '0000000000000000';

const draft: LevelDefinition = {
  schemaVersion: 1, id: 'level-015', number: 15, chapterId: 'chapter-02',
  nameKey: 'levels.015.name', briefingKey: 'levels.015.briefing', seed: 'campaign-level-015-v1',
  palette: { presetId: 'copper-carnival-15' },
  maze: {
    templateSetId: 'carnival-tempo-tent', generatorVersion: 1,
    criticalPathRooms: { minimum: 5, maximum: 5 }, optionalRooms: { minimum: 1, maximum: 1 },
    maxBranchDepth: 1, secretCount: 1, entranceNodeId: 'tempo-entry', exitNodeId: 'encore-exit',
    nodes: [
      { id: 'tempo-entry', role: 'entrance', templateTags: ['carnival', 'tempo-entry'], sizeClass: 'small', encounterIds: [], pickupIds: ['repair-kit'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'backstage-booth', role: 'corridor', templateTags: ['carnival', 'backstage-pass'], sizeClass: 'medium', encounterIds: [], pickupIds: ['backstage-pass'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'tempo-tent-arena', role: 'arena', templateTags: ['carnival', 'cyan-dj', 'freeze-window', 'staggered-gates'], sizeClass: 'large', encounterIds: ['tempo-tent-crew'], pickupIds: ['pulse-cell'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'speaker-loop', role: 'secret', templateTags: ['carnival', 'speaker-maze', 'coin-cache'], sizeClass: 'medium', encounterIds: [], pickupIds: ['coin-cache', 'secret-coin-cache'], checkpointId: null, storyIds: [], criticalPath: false },
      { id: 'tempo-checkpoint', role: 'checkpoint', templateTags: ['carnival', 'recovery'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: 'checkpoint-015', storyIds: [], criticalPath: true },
      { id: 'encore-exit', role: 'exit', templateTags: ['carnival', 'objective-exit'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
    ],
    edges: [
      { id: 'entry-backstage', from: 'tempo-entry', to: 'backstage-booth', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'backstage-arena', from: 'backstage-booth', to: 'tempo-tent-arena', bidirectional: true, requiredKeyId: 'backstage-pass', doorType: 'ticket-gate', traversalCost: 1, stateTrigger: 'key-collected' },
      { id: 'arena-checkpoint', from: 'tempo-tent-arena', to: 'tempo-checkpoint', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'checkpoint-exit', from: 'tempo-checkpoint', to: 'encore-exit', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: 'primary-objective' },
      { id: 'backstage-speakers', from: 'backstage-booth', to: 'speaker-loop', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 2, stateTrigger: null },
      { id: 'speakers-checkpoint', from: 'speaker-loop', to: 'tempo-checkpoint', bidirectional: true, requiredKeyId: 'backstage-pass', doorType: 'ticket-gate', traversalCost: 2, stateTrigger: 'key-collected' },
    ],
    keys: [{ id: 'backstage-pass', placementNodeId: 'backstage-booth' }],
    hazards: [
      { id: 'tempo-gate-north', nodeId: 'tempo-tent-arena', periodTicks: 180, activeTicks: 90, collisionProfileId: 'tempo-gate-north-v1' },
      { id: 'tempo-gate-west', nodeId: 'tempo-tent-arena', periodTicks: 180, activeTicks: 90, collisionProfileId: 'tempo-gate-west-v1' },
      { id: 'tempo-gate-east', nodeId: 'tempo-tent-arena', periodTicks: 180, activeTicks: 90, collisionProfileId: 'tempo-gate-east-v1' },
      { id: 'tempo-gate-south', nodeId: 'tempo-tent-arena', periodTicks: 180, activeTicks: 90, collisionProfileId: 'tempo-gate-south-v1' },
    ],
    generationAttempts: 1, validationProfile: 'authored-grid-v1',
  },
  objectives: [{
    id: 'clear-tempo-tent', type: 'survive', required: true, titleKey: 'objectives.level_015',
    targetIds: ['soundcheck-wave', 'tempo-twist-wave', 'hostile-encore-wave'], targetCount: 10,
    durationTicks: null, dependsOn: [], completionMode: 'count', markerPolicy: 'always',
  }],
  encounters: [{
    id: 'tempo-tent-crew', roomNodeId: 'tempo-tent-arena', trigger: 'on-enter', triggerRef: null,
    arenaLock: true, waves: [{
      id: 'soundcheck-wave', startCondition: 'encounter-start', startDelayTicks: 0,
      spawnGroups: [
        { id: 'soundcheck-wobblers', archetypeId: 'wobble-scout', count: 2, modifierIds: ['soundcheck'], spawnPointSetId: 'level-015-arena-1', dancePresetId: 'tempo-tent-twist', aiProfileId: 'chapter-02-stage-15', rewardProfileId: 'chapter-02-coins-15', rngStream: 'encounter.level-015.wave-1.wobblers', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
        { id: 'soundcheck-spinner', archetypeId: 'yellow-spinner', count: 1, modifierIds: ['soundcheck'], spawnPointSetId: 'level-015-arena-1', dancePresetId: 'tempo-tent-twist', aiProfileId: 'chapter-02-stage-15', rewardProfileId: 'chapter-02-coins-15', rngStream: 'encounter.level-015.wave-1.spinner', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
      ],
      maxConcurrentRobots: 3, interGroupDelayTicks: 10, danceTransitionId: null,
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'tempo-twist-wave', startCondition: 'previous-wave-complete', startDelayTicks: 36,
      spawnGroups: [
        { id: 'twist-sliders', archetypeId: 'blue-slider', count: 2, modifierIds: ['tempo-twist'], spawnPointSetId: 'level-015-arena-2', dancePresetId: 'tempo-tent-twist', aiProfileId: 'chapter-02-stage-15', rewardProfileId: 'chapter-02-coins-15', rngStream: 'encounter.level-015.wave-2.sliders', rank: 'normal', accessibilityVerificationId: 'silhouette-blue-slider-v1' },
        { id: 'twist-spinner', archetypeId: 'yellow-spinner', count: 1, modifierIds: ['tempo-twist'], spawnPointSetId: 'level-015-arena-2', dancePresetId: 'tempo-tent-twist', aiProfileId: 'chapter-02-stage-15', rewardProfileId: 'chapter-02-coins-15', rngStream: 'encounter.level-015.wave-2.spinner', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
        { id: 'twist-firemouth', archetypeId: 'red-firemouth', count: 1, modifierIds: ['tempo-twist'], spawnPointSetId: 'level-015-arena-2', dancePresetId: 'tempo-tent-twist', aiProfileId: 'chapter-02-stage-15', rewardProfileId: 'chapter-02-coins-15', rngStream: 'encounter.level-015.wave-2.firemouth', rank: 'normal', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
      ],
      maxConcurrentRobots: 4, interGroupDelayTicks: 9, danceTransitionId: 'tempo-twist',
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'hostile-encore-wave', startCondition: 'previous-wave-complete', startDelayTicks: 32,
      spawnGroups: [
        { id: 'encore-heckler', archetypeId: 'wobble-scout', count: 1, modifierIds: ['encore'], spawnPointSetId: 'level-015-arena-3', dancePresetId: 'tempo-tent-twist', aiProfileId: 'chapter-02-stage-15', rewardProfileId: 'chapter-02-coins-15', rngStream: 'encounter.level-015.wave-3.heckler', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
        { id: 'encore-foreman', archetypeId: 'red-firemouth', count: 1, modifierIds: ['encore'], spawnPointSetId: 'level-015-arena-3', dancePresetId: 'tempo-tent-twist', aiProfileId: 'chapter-02-stage-15', rewardProfileId: 'chapter-02-coins-15', rngStream: 'encounter.level-015.wave-3.foreman', rank: 'elite', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
        { id: 'encore-dj', archetypeId: 'cyan-dj', count: 1, modifierIds: ['hostile-headliner'], spawnPointSetId: 'level-015-arena-3', dancePresetId: 'tempo-tent-twist', aiProfileId: 'chapter-02-stage-15', rewardProfileId: 'chapter-02-coins-15', rngStream: 'encounter.level-015.wave-3.dj', rank: 'elite', accessibilityVerificationId: 'silhouette-cyan-dj-v1' },
      ],
      maxConcurrentRobots: 3, interGroupDelayTicks: 8, danceTransitionId: 'hostile-encore',
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }],
    completion: 'all-defeated', rewardId: 'chapter-02-clear-015', checkpointOnComplete: null,
  }],
  dance: {
    presetId: 'tempo-tent-twist', grammarVersion: 1, bpm: 136, timeSignature: '4/4', barsPerPhrase: 4,
    footPatternId: 'tempo-tent-twist-feet-v1', torsoPatternId: 'tempo-tent-twist-torso-v1',
    armPatternId: 'tempo-tent-twist-arms-v1', headAccentId: 'tempo-tent-twist-head-v1',
    pathPatternId: 'tempo-tent-twist-path-v1', attackBeats: [1, 5, 9, 13],
    vulnerableBeats: [3, 7, 11, 15], transitionIds: ['tempo-twist', 'hostile-encore', 'objective-clear'],
    visualIntensity: 0.94, reducedMotionPresetId: 'tempo-tent-twist-reduced-v1',
  },
  difficulty: { presetId: 'standard-chapter-02-015' }, economy: { presetId: 'economy-chapter-02-015' },
  checkpoints: [{ presetId: 'checkpoint-015' }], audio: { presetId: 'audio-copper-carnival-015' },
  mastery: [{ presetId: 'level-015-par-time' }, { presetId: 'level-015-perfect-beat' }],
  agentValidation: {
    tier: 'named-elite', owner: 'gameplay-qa', runs: [{
      id: 'standard-live', mode: 'live-agent', policyId: 'baseline-campaign-agent', policyVersion: 1,
      referenceReplayId: null, seed: 'campaign-level-015-v1', difficulty: 'Standard', assistProfileId: null,
      maxTicks: 12_000, stuckTimeoutTicks: 1_600, maxIllegalActions: 0,
      requiredObjectiveIds: ['clear-tempo-tent'], expectedCompletion: true, expectedChecksum: null,
      parTicks: 9_200,
      dependencyHashes: {
        simulationSchema: '7673b9fb7039c568', effectiveLevel: ZERO_HASH, simulationLevel: 'a6b01eb62d078657',
        balanceData: 'c1df429a54459a12', policyOrReplay: 'c00c7c2e50668d3b',
      },
    }],
  },
  performance: {
    maxActiveRobots: 4, maxActiveProjectiles: 48, maxActivePickups: 5, maxHazards: 4,
    maxMazeNodes: 8, maxRenderInstances: 1_024, expectedPeakDrawCalls: 8,
    expectedPeakMemoryMb: 192, benchmarkScenarioIds: ['level-015-standard-live'],
  },
  tags: ['chapter-02', 'copper-carnival', 'cyan-dj', 'freeze-window', 'staggered-gates', 'tempo-tent-twist'],
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

export const LEVEL_015: LevelDefinition = {
  ...draft,
  agentValidation: {
    ...draft.agentValidation,
    runs: draft.agentValidation.runs.map((run) => ({
      ...run,
      dependencyHashes: { ...run.dependencyHashes, effectiveLevel },
    })),
  },
};
