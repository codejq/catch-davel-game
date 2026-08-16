import { checksumCanonicalContent } from '../content-hash.ts';
import type { LevelDefinition } from '../level-definition.ts';

const ZERO_HASH = '0000000000000000';

const draft: LevelDefinition = {
  schemaVersion: 1, id: 'level-014', number: 14, chapterId: 'chapter-02',
  nameKey: 'levels.014.name', briefingKey: 'levels.014.briefing', seed: 'campaign-level-014-v1',
  palette: { presetId: 'copper-carnival-14' },
  maze: {
    templateSetId: 'carnival-firebreather-funhouse', generatorVersion: 1,
    criticalPathRooms: { minimum: 5, maximum: 5 }, optionalRooms: { minimum: 1, maximum: 1 },
    maxBranchDepth: 1, secretCount: 0, entranceNodeId: 'funhouse-entry', exitNodeId: 'firework-exit',
    nodes: [
      { id: 'funhouse-entry', role: 'entrance', templateTags: ['carnival', 'funhouse-entry'], sizeClass: 'small', encounterIds: [], pickupIds: ['repair-kit'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'match-booth', role: 'corridor', templateTags: ['carnival', 'brass-match'], sizeClass: 'medium', encounterIds: [], pickupIds: ['brass-match'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'fire-ring-arena', role: 'arena', templateTags: ['carnival', 'red-firemouth', 'crossing-belts', 'timed-gate'], sizeClass: 'large', encounterIds: ['firebreather-funhouse-crew'], pickupIds: ['pulse-cell'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'smoke-mirror-loop', role: 'corridor', templateTags: ['carnival', 'smoke-mirrors', 'coin-cache'], sizeClass: 'medium', encounterIds: [], pickupIds: ['coin-cache'], checkpointId: null, storyIds: [], criticalPath: false },
      { id: 'funhouse-checkpoint', role: 'checkpoint', templateTags: ['carnival', 'recovery'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: 'checkpoint-014', storyIds: [], criticalPath: true },
      { id: 'firework-exit', role: 'exit', templateTags: ['carnival', 'objective-exit'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
    ],
    edges: [
      { id: 'entry-match', from: 'funhouse-entry', to: 'match-booth', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'match-arena', from: 'match-booth', to: 'fire-ring-arena', bidirectional: true, requiredKeyId: 'brass-match', doorType: 'ticket-gate', traversalCost: 1, stateTrigger: 'key-collected' },
      { id: 'arena-checkpoint', from: 'fire-ring-arena', to: 'funhouse-checkpoint', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'checkpoint-exit', from: 'funhouse-checkpoint', to: 'firework-exit', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: 'primary-objective' },
      { id: 'match-mirrors', from: 'match-booth', to: 'smoke-mirror-loop', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 2, stateTrigger: null },
      { id: 'mirrors-checkpoint', from: 'smoke-mirror-loop', to: 'funhouse-checkpoint', bidirectional: true, requiredKeyId: 'brass-match', doorType: 'ticket-gate', traversalCost: 2, stateTrigger: 'key-collected' },
    ],
    keys: [{ id: 'brass-match', placementNodeId: 'match-booth' }],
    hazards: [
      { id: 'fire-belt-west', nodeId: 'fire-ring-arena', periodTicks: 180, activeTicks: 120, collisionProfileId: 'fire-belt-west-v1' },
      { id: 'fire-belt-east', nodeId: 'fire-ring-arena', periodTicks: 180, activeTicks: 120, collisionProfileId: 'fire-belt-east-v1' },
      { id: 'fire-ring-gate', nodeId: 'fire-ring-arena', periodTicks: 150, activeTicks: 84, collisionProfileId: 'fire-ring-gate-v1' },
    ],
    generationAttempts: 1, validationProfile: 'authored-grid-v1',
  },
  objectives: [{
    id: 'clear-firebreather-funhouse', type: 'survive', required: true, titleKey: 'objectives.level_014',
    targetIds: ['funhouse-welcome-wave', 'fire-ring-wave', 'ringmaster-flare-wave'], targetCount: 10,
    durationTicks: null, dependsOn: [], completionMode: 'count', markerPolicy: 'always',
  }],
  encounters: [{
    id: 'firebreather-funhouse-crew', roomNodeId: 'fire-ring-arena', trigger: 'on-enter', triggerRef: null,
    arenaLock: true, waves: [{
      id: 'funhouse-welcome-wave', startCondition: 'encounter-start', startDelayTicks: 0,
      spawnGroups: [
        { id: 'welcome-wobblers', archetypeId: 'wobble-scout', count: 2, modifierIds: ['funhouse-mask'], spawnPointSetId: 'level-014-arena-1', dancePresetId: 'flame-fan-fandango', aiProfileId: 'chapter-02-stage-14', rewardProfileId: 'chapter-02-coins-14', rngStream: 'encounter.level-014.wave-1.wobblers', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
        { id: 'welcome-sliders', archetypeId: 'blue-slider', count: 2, modifierIds: ['funhouse-mask'], spawnPointSetId: 'level-014-arena-1', dancePresetId: 'flame-fan-fandango', aiProfileId: 'chapter-02-stage-14', rewardProfileId: 'chapter-02-coins-14', rngStream: 'encounter.level-014.wave-1.sliders', rank: 'normal', accessibilityVerificationId: 'silhouette-blue-slider-v1' },
      ],
      maxConcurrentRobots: 4, interGroupDelayTicks: 12, danceTransitionId: null,
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'fire-ring-wave', startCondition: 'previous-wave-complete', startDelayTicks: 38,
      spawnGroups: [
        { id: 'fire-ring-spinners', archetypeId: 'yellow-spinner', count: 2, modifierIds: ['spark-wheel'], spawnPointSetId: 'level-014-arena-2', dancePresetId: 'flame-fan-fandango', aiProfileId: 'chapter-02-stage-14', rewardProfileId: 'chapter-02-coins-14', rngStream: 'encounter.level-014.wave-2.spinners', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
        { id: 'fire-ring-firemouth', archetypeId: 'red-firemouth', count: 1, modifierIds: ['firebreather'], spawnPointSetId: 'level-014-arena-2', dancePresetId: 'flame-fan-fandango', aiProfileId: 'chapter-02-stage-14', rewardProfileId: 'chapter-02-coins-14', rngStream: 'encounter.level-014.wave-2.firemouth', rank: 'normal', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
        { id: 'fire-ring-heckler', archetypeId: 'wobble-scout', count: 1, modifierIds: ['smoke-mask'], spawnPointSetId: 'level-014-arena-2', dancePresetId: 'flame-fan-fandango', aiProfileId: 'chapter-02-stage-14', rewardProfileId: 'chapter-02-coins-14', rngStream: 'encounter.level-014.wave-2.heckler', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
      ],
      maxConcurrentRobots: 4, interGroupDelayTicks: 10, danceTransitionId: 'fire-ring-open',
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'ringmaster-flare-wave', startCondition: 'previous-wave-complete', startDelayTicks: 34,
      spawnGroups: [
        { id: 'flare-foreman', archetypeId: 'red-firemouth', count: 1, modifierIds: ['fire-ringmaster'], spawnPointSetId: 'level-014-arena-3', dancePresetId: 'flame-fan-fandango', aiProfileId: 'chapter-02-stage-14', rewardProfileId: 'chapter-02-coins-14', rngStream: 'encounter.level-014.wave-3.foreman', rank: 'elite', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
        { id: 'flare-dj', archetypeId: 'cyan-dj', count: 1, modifierIds: ['flare-conductor'], spawnPointSetId: 'level-014-arena-3', dancePresetId: 'flame-fan-fandango', aiProfileId: 'chapter-02-stage-14', rewardProfileId: 'chapter-02-coins-14', rngStream: 'encounter.level-014.wave-3.dj', rank: 'elite', accessibilityVerificationId: 'silhouette-cyan-dj-v1' },
      ],
      maxConcurrentRobots: 2, interGroupDelayTicks: 8, danceTransitionId: 'ringmaster-flare',
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }],
    completion: 'all-defeated', rewardId: 'chapter-02-clear-014', checkpointOnComplete: null,
  }],
  dance: {
    presetId: 'flame-fan-fandango', grammarVersion: 1, bpm: 132, timeSignature: '4/4', barsPerPhrase: 4,
    footPatternId: 'flame-fan-fandango-feet-v1', torsoPatternId: 'flame-fan-fandango-torso-v1',
    armPatternId: 'flame-fan-fandango-arms-v1', headAccentId: 'flame-fan-fandango-head-v1',
    pathPatternId: 'flame-fan-fandango-path-v1', attackBeats: [0, 4, 8, 12],
    vulnerableBeats: [2, 6, 10, 14], transitionIds: ['fire-ring-open', 'ringmaster-flare', 'objective-clear'],
    visualIntensity: 0.92, reducedMotionPresetId: 'flame-fan-fandango-reduced-v1',
  },
  difficulty: { presetId: 'standard-chapter-02-014' }, economy: { presetId: 'economy-chapter-02-014' },
  checkpoints: [{ presetId: 'checkpoint-014' }], audio: { presetId: 'audio-copper-carnival-014' },
  mastery: [{ presetId: 'level-014-par-time' }, { presetId: 'level-014-fireproof' }],
  agentValidation: {
    tier: 'ordinary', owner: 'gameplay-qa', runs: [{
      id: 'standard-live', mode: 'live-agent', policyId: 'baseline-campaign-agent', policyVersion: 1,
      referenceReplayId: null, seed: 'campaign-level-014-v1', difficulty: 'Standard', assistProfileId: null,
      maxTicks: 12_000, stuckTimeoutTicks: 1_600, maxIllegalActions: 0,
      requiredObjectiveIds: ['clear-firebreather-funhouse'], expectedCompletion: true, expectedChecksum: null,
      parTicks: 9_000,
      dependencyHashes: {
        simulationSchema: '6cafd562c735e11d', effectiveLevel: ZERO_HASH, simulationLevel: 'b05834f0d9e4201d',
        balanceData: '1f697b70870c7801', policyOrReplay: '33ce82519e6acf00',
      },
    }],
  },
  performance: {
    maxActiveRobots: 4, maxActiveProjectiles: 48, maxActivePickups: 4, maxHazards: 3,
    maxMazeNodes: 8, maxRenderInstances: 1_024, expectedPeakDrawCalls: 8,
    expectedPeakMemoryMb: 192, benchmarkScenarioIds: ['level-014-standard-live'],
  },
  tags: ['chapter-02', 'copper-carnival', 'red-firemouth', 'crossing-belts', 'timed-gate', 'flame-fan-fandango'],
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

export const LEVEL_014: LevelDefinition = {
  ...draft,
  agentValidation: {
    ...draft.agentValidation,
    runs: draft.agentValidation.runs.map((run) => ({
      ...run,
      dependencyHashes: { ...run.dependencyHashes, effectiveLevel },
    })),
  },
};
