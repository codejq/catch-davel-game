import { checksumCanonicalContent } from '../content-hash.ts';
import type { LevelDefinition } from '../level-definition.ts';

const ZERO_HASH = '0000000000000000';

const draft: LevelDefinition = {
  schemaVersion: 1, id: 'level-034', number: 34, chapterId: 'chapter-04',
  nameKey: 'levels.034.name', briefingKey: 'levels.034.briefing', seed: 'campaign-level-034-v1',
  palette: { presetId: 'cold-storage-34' },
  maze: {
    templateSetId: 'cold-storage-frosted-crossroads', generatorVersion: 1,
    criticalPathRooms: { minimum: 7, maximum: 7 }, optionalRooms: { minimum: 1, maximum: 1 },
    maxBranchDepth: 1, secretCount: 1, entranceNodeId: 'frosted-entry', exitNodeId: 'crystal-exit',
    nodes: [
      { id: 'frosted-entry', role: 'entrance', templateTags: ['cold-storage', 'glass-airlock'], sizeClass: 'small', encounterIds: [], pickupIds: ['repair-kit'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'prism-locker', role: 'corridor', templateTags: ['cold-storage', 'prism-key'], sizeClass: 'medium', encounterIds: [], pickupIds: ['prism-key'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'west-refraction', role: 'corridor', templateTags: ['cold-storage', 'glass-route-west'], sizeClass: 'large', encounterIds: [], pickupIds: ['pulse-cell'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'frosted-crossroads', role: 'arena', templateTags: ['cold-storage', 'glass-crossroads'], sizeClass: 'large', encounterIds: ['crystal-lock-company'], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'clear-cache', role: 'secret', templateTags: ['cold-storage', 'visible-optional-route'], sizeClass: 'medium', encounterIds: [], pickupIds: ['coin-cache', 'secret-coin-cache'], checkpointId: null, storyIds: [], criticalPath: false },
      { id: 'east-refraction', role: 'corridor', templateTags: ['cold-storage', 'glass-route-east'], sizeClass: 'large', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'crystal-checkpoint', role: 'checkpoint', templateTags: ['cold-storage', 'recovery'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: 'checkpoint-034', storyIds: [], criticalPath: true },
      { id: 'crystal-exit', role: 'exit', templateTags: ['cold-storage', 'objective-exit'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
    ],
    edges: [
      { id: 'entry-locker', from: 'frosted-entry', to: 'prism-locker', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'locker-west', from: 'prism-locker', to: 'west-refraction', bidirectional: true, requiredKeyId: 'prism-key', doorType: 'workshop-lock', traversalCost: 1, stateTrigger: 'key-collected' },
      { id: 'west-crossroads', from: 'west-refraction', to: 'frosted-crossroads', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'crossroads-east', from: 'frosted-crossroads', to: 'east-refraction', bidirectional: true, requiredKeyId: null, doorType: 'arena-lock', traversalCost: 1, stateTrigger: null },
      { id: 'east-checkpoint', from: 'east-refraction', to: 'crystal-checkpoint', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'checkpoint-exit', from: 'crystal-checkpoint', to: 'crystal-exit', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: 'primary-objective' },
      { id: 'locker-cache', from: 'prism-locker', to: 'clear-cache', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 2, stateTrigger: null },
      { id: 'cache-crossroads', from: 'clear-cache', to: 'frosted-crossroads', bidirectional: true, requiredKeyId: 'prism-key', doorType: 'workshop-lock', traversalCost: 2, stateTrigger: 'key-collected' },
    ],
    keys: [{ id: 'prism-key', placementNodeId: 'prism-locker' }],
    hazards: [
      { id: 'west-glass-ice', nodeId: 'west-refraction', periodTicks: 240, activeTicks: 240, collisionProfileId: 'frosted-crossroads-west-v1' },
      { id: 'crossroads-north-ice', nodeId: 'frosted-crossroads', periodTicks: 240, activeTicks: 240, collisionProfileId: 'frosted-crossroads-north-v1' },
      { id: 'crossroads-south-ice', nodeId: 'frosted-crossroads', periodTicks: 240, activeTicks: 240, collisionProfileId: 'frosted-crossroads-south-v1' },
      { id: 'east-glass-ice', nodeId: 'east-refraction', periodTicks: 240, activeTicks: 240, collisionProfileId: 'frosted-crossroads-east-v1' },
    ], generationAttempts: 1, validationProfile: 'authored-grid-v1',
  },
  objectives: [{
    id: 'clear-frosted-crossroads', type: 'deactivate', required: true, titleKey: 'objectives.level_034',
    targetIds: ['prism-guard', 'crossroads-lock', 'crystal-encore'], targetCount: 10,
    durationTicks: null, dependsOn: [], completionMode: 'count', markerPolicy: 'always',
  }],
  encounters: [{
    id: 'crystal-lock-company', roomNodeId: 'frosted-crossroads', trigger: 'on-enter', triggerRef: null,
    arenaLock: true, waves: [{
      id: 'prism-guard', startCondition: 'encounter-start', startDelayTicks: 0,
      spawnGroups: [
        { id: 'prism-shielder', archetypeId: 'violet-shielder', count: 1, modifierIds: ['glass-guard'], spawnPointSetId: 'level-034-arena-1', dancePresetId: 'crystal-locking-dance', aiProfileId: 'chapter-04-stage-34', rewardProfileId: 'chapter-04-coins-34', rngStream: 'encounter.level-034.wave-1.shielder', rank: 'normal', accessibilityVerificationId: 'silhouette-violet-shielder-v1' },
        { id: 'prism-sliders', archetypeId: 'blue-slider', count: 2, modifierIds: ['refracted-crossfire'], spawnPointSetId: 'level-034-arena-1', dancePresetId: 'crystal-locking-dance', aiProfileId: 'chapter-04-stage-34', rewardProfileId: 'chapter-04-coins-34', rngStream: 'encounter.level-034.wave-1.sliders', rank: 'normal', accessibilityVerificationId: 'silhouette-blue-slider-v1' },
      ], maxConcurrentRobots: 3, interGroupDelayTicks: 7, danceTransitionId: null, completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'crossroads-lock', startCondition: 'previous-wave-complete', startDelayTicks: 16,
      spawnGroups: [
        { id: 'crossroads-wobblers', archetypeId: 'wobble-scout', count: 2, modifierIds: ['glass-mimes'], spawnPointSetId: 'level-034-arena-2', dancePresetId: 'crystal-locking-dance', aiProfileId: 'chapter-04-stage-34', rewardProfileId: 'chapter-04-coins-34', rngStream: 'encounter.level-034.wave-2.wobblers', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
        { id: 'crossroads-spinners', archetypeId: 'yellow-spinner', count: 2, modifierIds: ['prism-spotters'], spawnPointSetId: 'level-034-arena-2', dancePresetId: 'crystal-locking-dance', aiProfileId: 'chapter-04-stage-34', rewardProfileId: 'chapter-04-coins-34', rngStream: 'encounter.level-034.wave-2.spinners', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
      ], maxConcurrentRobots: 4, interGroupDelayTicks: 5, danceTransitionId: 'crossroads-lock', completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'crystal-encore', startCondition: 'previous-wave-complete', startDelayTicks: 14,
      spawnGroups: [
        { id: 'encore-firemouth', archetypeId: 'red-firemouth', count: 1, modifierIds: ['crystal-flame'], spawnPointSetId: 'level-034-arena-3', dancePresetId: 'crystal-locking-dance', aiProfileId: 'chapter-04-stage-34', rewardProfileId: 'chapter-04-coins-34', rngStream: 'encounter.level-034.wave-3.firemouth', rank: 'normal', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
        { id: 'encore-dj', archetypeId: 'cyan-dj', count: 1, modifierIds: ['prism-conductor'], spawnPointSetId: 'level-034-arena-3', dancePresetId: 'crystal-locking-dance', aiProfileId: 'chapter-04-stage-34', rewardProfileId: 'chapter-04-coins-34', rngStream: 'encounter.level-034.wave-3.dj', rank: 'elite', accessibilityVerificationId: 'silhouette-cyan-dj-v1' },
        { id: 'encore-foreman', archetypeId: 'red-firemouth', count: 1, modifierIds: ['glass-foreman'], spawnPointSetId: 'level-034-arena-3', dancePresetId: 'crystal-locking-dance', aiProfileId: 'chapter-04-stage-34', rewardProfileId: 'chapter-04-coins-34', rngStream: 'encounter.level-034.wave-3.foreman', rank: 'elite', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
      ], maxConcurrentRobots: 3, interGroupDelayTicks: 5, danceTransitionId: 'crystal-encore', completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }], completion: 'all-defeated', rewardId: 'chapter-04-clear-034', checkpointOnComplete: null,
  }],
  dance: {
    presetId: 'crystal-locking-dance', grammarVersion: 1, bpm: 130, timeSignature: '4/4', barsPerPhrase: 4,
    footPatternId: 'crystal-locking-feet-v1', torsoPatternId: 'crystal-locking-torso-v1', armPatternId: 'crystal-locking-arms-v1',
    headAccentId: 'crystal-locking-head-v1', pathPatternId: 'crystal-locking-path-v1', attackBeats: [1, 5, 9, 13],
    vulnerableBeats: [3, 7, 11, 15], transitionIds: ['crossroads-lock', 'crystal-encore', 'objective-clear'],
    visualIntensity: 0.99, reducedMotionPresetId: 'crystal-locking-reduced-v1',
  },
  difficulty: { presetId: 'standard-chapter-04-034' }, economy: { presetId: 'economy-chapter-04-034' },
  checkpoints: [{ presetId: 'checkpoint-034' }], audio: { presetId: 'audio-cold-storage-034' },
  mastery: [{ presetId: 'level-034-par-time' }, { presetId: 'level-034-clear-route-reader' }],
  agentValidation: { tier: 'ordinary', owner: 'gameplay-qa', runs: [{
    id: 'standard-live', mode: 'live-agent', policyId: 'baseline-campaign-agent', policyVersion: 1,
    referenceReplayId: null, seed: 'campaign-level-034-v1', difficulty: 'Standard', assistProfileId: null,
    maxTicks: 18_000, stuckTimeoutTicks: 2_000, maxIllegalActions: 0,
    requiredObjectiveIds: ['clear-frosted-crossroads'], expectedCompletion: true, expectedChecksum: null, parTicks: 14_000,
    dependencyHashes: {
      simulationSchema: '7673b9fb7039c568', effectiveLevel: ZERO_HASH, simulationLevel: '0ca029700705c3a9',
      balanceData: 'c1df429a54459a12', policyOrReplay: 'c00c7c2e50668d3b',
    },
  }] },
  performance: {
    maxActiveRobots: 4, maxActiveProjectiles: 64, maxActivePickups: 5, maxHazards: 4,
    maxMazeNodes: 10, maxRenderInstances: 1_024, expectedPeakDrawCalls: 8,
    expectedPeakMemoryMb: 192, benchmarkScenarioIds: ['level-034-standard-live'],
  },
  tags: ['chapter-04', 'cold-storage', 'glass-route-visibility', 'crossing-ice', 'crystal-locking-dance'],
};

const normalizedForHash: LevelDefinition = {
  ...draft,
  agentValidation: { ...draft.agentValidation, runs: draft.agentValidation.runs.map((run) => ({
    ...run, dependencyHashes: {
      simulationSchema: ZERO_HASH, effectiveLevel: ZERO_HASH, simulationLevel: ZERO_HASH,
      balanceData: ZERO_HASH, policyOrReplay: ZERO_HASH,
    },
  })) },
};

const effectiveLevel = checksumCanonicalContent(normalizedForHash);

export const LEVEL_034: LevelDefinition = {
  ...draft,
  agentValidation: { ...draft.agentValidation, runs: draft.agentValidation.runs.map((run) => ({
    ...run, dependencyHashes: { ...run.dependencyHashes, effectiveLevel },
  })) },
};
