import { checksumCanonicalContent } from '../content-hash.ts';
import type { LevelDefinition } from '../level-definition.ts';

const ZERO_HASH = '0000000000000000';

const draft: LevelDefinition = {
  schemaVersion: 1, id: 'level-032', number: 32, chapterId: 'chapter-04',
  nameKey: 'levels.032.name', briefingKey: 'levels.032.briefing', seed: 'campaign-level-032-v1',
  palette: { presetId: 'cold-storage-32' },
  maze: {
    templateSetId: 'cold-storage-slippery-smiles', generatorVersion: 1,
    criticalPathRooms: { minimum: 7, maximum: 7 }, optionalRooms: { minimum: 1, maximum: 1 },
    maxBranchDepth: 1, secretCount: 0, entranceNodeId: 'loading-entry', exitNodeId: 'smile-exit',
    nodes: [
      { id: 'loading-entry', role: 'entrance', templateTags: ['cold-storage', 'loading-airlock'], sizeClass: 'small', encounterIds: [], pickupIds: ['repair-kit'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'skate-rack', role: 'corridor', templateTags: ['cold-storage', 'slider-key'], sizeClass: 'medium', encounterIds: [], pickupIds: ['skate-key'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'crossfire-chute', role: 'corridor', templateTags: ['cold-storage', 'crossfire-ice'], sizeClass: 'large', encounterIds: [], pickupIds: ['pulse-cell'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'smile-rink', role: 'arena', templateTags: ['cold-storage', 'mobile-ranged-arena'], sizeClass: 'large', encounterIds: ['slippery-smiles-squad'], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'warming-booth', role: 'corridor', templateTags: ['cold-storage', 'optional-warmth'], sizeClass: 'medium', encounterIds: [], pickupIds: ['coin-cache'], checkpointId: null, storyIds: [], criticalPath: false },
      { id: 'moonwalk-lane', role: 'corridor', templateTags: ['cold-storage', 'moonwalk-ice'], sizeClass: 'large', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'rink-checkpoint', role: 'checkpoint', templateTags: ['cold-storage', 'recovery'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: 'checkpoint-032', storyIds: [], criticalPath: true },
      { id: 'smile-exit', role: 'exit', templateTags: ['cold-storage', 'objective-exit'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
    ],
    edges: [
      { id: 'entry-rack', from: 'loading-entry', to: 'skate-rack', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'rack-chute', from: 'skate-rack', to: 'crossfire-chute', bidirectional: true, requiredKeyId: 'skate-key', doorType: 'workshop-lock', traversalCost: 1, stateTrigger: 'key-collected' },
      { id: 'chute-rink', from: 'crossfire-chute', to: 'smile-rink', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'rink-moonwalk', from: 'smile-rink', to: 'moonwalk-lane', bidirectional: true, requiredKeyId: null, doorType: 'arena-lock', traversalCost: 1, stateTrigger: null },
      { id: 'moonwalk-checkpoint', from: 'moonwalk-lane', to: 'rink-checkpoint', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'checkpoint-exit', from: 'rink-checkpoint', to: 'smile-exit', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: 'primary-objective' },
      { id: 'rack-booth', from: 'skate-rack', to: 'warming-booth', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 2, stateTrigger: null },
      { id: 'booth-rink', from: 'warming-booth', to: 'smile-rink', bidirectional: true, requiredKeyId: 'skate-key', doorType: 'workshop-lock', traversalCost: 2, stateTrigger: 'key-collected' },
    ],
    keys: [{ id: 'skate-key', placementNodeId: 'skate-rack' }],
    hazards: [
      { id: 'chute-ice-south', nodeId: 'crossfire-chute', periodTicks: 240, activeTicks: 240, collisionProfileId: 'slippery-smiles-ice-south-v1' },
      { id: 'rink-ice-east', nodeId: 'smile-rink', periodTicks: 240, activeTicks: 240, collisionProfileId: 'slippery-smiles-ice-east-v1' },
      { id: 'rink-ice-west', nodeId: 'smile-rink', periodTicks: 240, activeTicks: 240, collisionProfileId: 'slippery-smiles-ice-west-v1' },
      { id: 'moonwalk-ice-north', nodeId: 'moonwalk-lane', periodTicks: 240, activeTicks: 240, collisionProfileId: 'slippery-smiles-ice-north-v1' },
    ],
    generationAttempts: 1, validationProfile: 'authored-grid-v1',
  },
  objectives: [{
    id: 'clear-slippery-smiles', type: 'deactivate', required: true, titleKey: 'objectives.level_032',
    targetIds: ['slider-salute', 'crossfire-grins', 'moonwalk-encore'], targetCount: 10,
    durationTicks: null, dependsOn: [], completionMode: 'count', markerPolicy: 'always',
  }],
  encounters: [{
    id: 'slippery-smiles-squad', roomNodeId: 'smile-rink', trigger: 'on-enter', triggerRef: null,
    arenaLock: true, waves: [{
      id: 'slider-salute', startCondition: 'encounter-start', startDelayTicks: 0,
      spawnGroups: [
        { id: 'salute-sliders', archetypeId: 'blue-slider', count: 2, modifierIds: ['crossfire-skates'], spawnPointSetId: 'level-032-arena-1', dancePresetId: 'ice-slide-moonwalk', aiProfileId: 'chapter-04-stage-32', rewardProfileId: 'chapter-04-coins-32', rngStream: 'encounter.level-032.wave-1.sliders', rank: 'normal', accessibilityVerificationId: 'silhouette-blue-slider-v1' },
        { id: 'salute-heckler', archetypeId: 'wobble-scout', count: 1, modifierIds: ['slippery-smile'], spawnPointSetId: 'level-032-arena-1', dancePresetId: 'ice-slide-moonwalk', aiProfileId: 'chapter-04-stage-32', rewardProfileId: 'chapter-04-coins-32', rngStream: 'encounter.level-032.wave-1.heckler', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
      ], maxConcurrentRobots: 3, interGroupDelayTicks: 6, danceTransitionId: null,
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'crossfire-grins', startCondition: 'previous-wave-complete', startDelayTicks: 16,
      spawnGroups: [
        { id: 'crossfire-firemouth', archetypeId: 'red-firemouth', count: 1, modifierIds: ['ricochet-grin'], spawnPointSetId: 'level-032-arena-2', dancePresetId: 'ice-slide-moonwalk', aiProfileId: 'chapter-04-stage-32', rewardProfileId: 'chapter-04-coins-32', rngStream: 'encounter.level-032.wave-2.firemouth', rank: 'normal', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
        { id: 'crossfire-spinners', archetypeId: 'yellow-spinner', count: 2, modifierIds: ['range-spotter'], spawnPointSetId: 'level-032-arena-2', dancePresetId: 'ice-slide-moonwalk', aiProfileId: 'chapter-04-stage-32', rewardProfileId: 'chapter-04-coins-32', rngStream: 'encounter.level-032.wave-2.spinners', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
        { id: 'crossfire-heckler', archetypeId: 'wobble-scout', count: 1, modifierIds: ['slippery-smile'], spawnPointSetId: 'level-032-arena-2', dancePresetId: 'ice-slide-moonwalk', aiProfileId: 'chapter-04-stage-32', rewardProfileId: 'chapter-04-coins-32', rngStream: 'encounter.level-032.wave-2.heckler', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
      ], maxConcurrentRobots: 4, interGroupDelayTicks: 5, danceTransitionId: 'crossfire-grins',
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'moonwalk-encore', startCondition: 'previous-wave-complete', startDelayTicks: 14,
      spawnGroups: [
        { id: 'encore-dj', archetypeId: 'cyan-dj', count: 1, modifierIds: ['moonwalk-conductor'], spawnPointSetId: 'level-032-arena-3', dancePresetId: 'ice-slide-moonwalk', aiProfileId: 'chapter-04-stage-32', rewardProfileId: 'chapter-04-coins-32', rngStream: 'encounter.level-032.wave-3.dj', rank: 'elite', accessibilityVerificationId: 'silhouette-cyan-dj-v1' },
        { id: 'encore-foreman', archetypeId: 'red-firemouth', count: 1, modifierIds: ['cold-crossfire-foreman'], spawnPointSetId: 'level-032-arena-3', dancePresetId: 'ice-slide-moonwalk', aiProfileId: 'chapter-04-stage-32', rewardProfileId: 'chapter-04-coins-32', rngStream: 'encounter.level-032.wave-3.foreman', rank: 'elite', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
        { id: 'encore-heckler', archetypeId: 'wobble-scout', count: 1, modifierIds: ['moonwalk-mime'], spawnPointSetId: 'level-032-arena-3', dancePresetId: 'ice-slide-moonwalk', aiProfileId: 'chapter-04-stage-32', rewardProfileId: 'chapter-04-coins-32', rngStream: 'encounter.level-032.wave-3.heckler', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
      ], maxConcurrentRobots: 3, interGroupDelayTicks: 5, danceTransitionId: 'moonwalk-encore',
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }], completion: 'all-defeated', rewardId: 'chapter-04-clear-032', checkpointOnComplete: null,
  }],
  dance: {
    presetId: 'ice-slide-moonwalk', grammarVersion: 1, bpm: 122, timeSignature: '4/4', barsPerPhrase: 4,
    footPatternId: 'ice-slide-moonwalk-feet-v1', torsoPatternId: 'ice-slide-moonwalk-torso-v1',
    armPatternId: 'ice-slide-moonwalk-arms-v1', headAccentId: 'ice-slide-moonwalk-head-v1',
    pathPatternId: 'ice-slide-moonwalk-path-v1', attackBeats: [2, 6, 10, 14],
    vulnerableBeats: [0, 4, 8, 12], transitionIds: ['crossfire-grins', 'moonwalk-encore', 'objective-clear'],
    visualIntensity: 0.96, reducedMotionPresetId: 'ice-slide-moonwalk-reduced-v1',
  },
  difficulty: { presetId: 'standard-chapter-04-032' }, economy: { presetId: 'economy-chapter-04-032' },
  checkpoints: [{ presetId: 'checkpoint-032' }], audio: { presetId: 'audio-cold-storage-032' },
  mastery: [{ presetId: 'level-032-par-time' }, { presetId: 'level-032-no-crossfire-hit' }],
  agentValidation: {
    tier: 'ordinary', owner: 'gameplay-qa', runs: [{
      id: 'standard-live', mode: 'live-agent', policyId: 'baseline-campaign-agent', policyVersion: 1,
      referenceReplayId: null, seed: 'campaign-level-032-v1', difficulty: 'Standard', assistProfileId: null,
      maxTicks: 16_000, stuckTimeoutTicks: 2_000, maxIllegalActions: 0,
      requiredObjectiveIds: ['clear-slippery-smiles'], expectedCompletion: true, expectedChecksum: null,
      parTicks: 12_500,
      dependencyHashes: {
        simulationSchema: '6cafd562c735e11d', effectiveLevel: ZERO_HASH, simulationLevel: '69859c228e2e161c',
        balanceData: '1f697b70870c7801', policyOrReplay: '33ce82519e6acf00',
      },
    }],
  },
  performance: {
    maxActiveRobots: 4, maxActiveProjectiles: 64, maxActivePickups: 4, maxHazards: 4,
    maxMazeNodes: 10, maxRenderInstances: 1_024, expectedPeakDrawCalls: 8,
    expectedPeakMemoryMb: 192, benchmarkScenarioIds: ['level-032-standard-live'],
  },
  tags: ['chapter-04', 'cold-storage', 'mobile-ranged-squads', 'crossfire-ice', 'ice-slide-moonwalk'],
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

export const LEVEL_032: LevelDefinition = {
  ...draft,
  agentValidation: {
    ...draft.agentValidation,
    runs: draft.agentValidation.runs.map((run) => ({
      ...run,
      dependencyHashes: { ...run.dependencyHashes, effectiveLevel },
    })),
  },
};
