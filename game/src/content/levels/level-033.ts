import { checksumCanonicalContent } from '../content-hash.ts';
import type { LevelDefinition } from '../level-definition.ts';

const ZERO_HASH = '0000000000000000';

const draft: LevelDefinition = {
  schemaVersion: 1, id: 'level-033', number: 33, chapterId: 'chapter-04',
  nameKey: 'levels.033.name', briefingKey: 'levels.033.briefing', seed: 'campaign-level-033-v1',
  palette: { presetId: 'cold-storage-33' },
  maze: {
    templateSetId: 'cold-storage-violet-wall', generatorVersion: 1,
    criticalPathRooms: { minimum: 7, maximum: 7 }, optionalRooms: { minimum: 1, maximum: 1 },
    maxBranchDepth: 1, secretCount: 0, entranceNodeId: 'violet-entry', exitNodeId: 'wall-exit',
    nodes: [
      { id: 'violet-entry', role: 'entrance', templateTags: ['cold-storage', 'violet-airlock'], sizeClass: 'small', encounterIds: [], pickupIds: ['repair-kit'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'plate-locker', role: 'corridor', templateTags: ['cold-storage', 'shield-key'], sizeClass: 'medium', encounterIds: [], pickupIds: ['violet-key'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'guard-lesson', role: 'corridor', templateTags: ['cold-storage', 'shield-readability'], sizeClass: 'large', encounterIds: [], pickupIds: ['pulse-cell'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'violet-wall', role: 'arena', templateTags: ['cold-storage', 'shielder-arena'], sizeClass: 'large', encounterIds: ['violet-wall-company'], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'unshielded-cache', role: 'corridor', templateTags: ['cold-storage', 'optional-flank'], sizeClass: 'medium', encounterIds: [], pickupIds: ['coin-cache'], checkpointId: null, storyIds: [], criticalPath: false },
      { id: 'popping-lane', role: 'corridor', templateTags: ['cold-storage', 'shield-pose-route'], sizeClass: 'large', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'wall-checkpoint', role: 'checkpoint', templateTags: ['cold-storage', 'recovery'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: 'checkpoint-033', storyIds: [], criticalPath: true },
      { id: 'wall-exit', role: 'exit', templateTags: ['cold-storage', 'objective-exit'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
    ],
    edges: [
      { id: 'entry-locker', from: 'violet-entry', to: 'plate-locker', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'locker-lesson', from: 'plate-locker', to: 'guard-lesson', bidirectional: true, requiredKeyId: 'violet-key', doorType: 'workshop-lock', traversalCost: 1, stateTrigger: 'key-collected' },
      { id: 'lesson-wall', from: 'guard-lesson', to: 'violet-wall', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'wall-popping', from: 'violet-wall', to: 'popping-lane', bidirectional: true, requiredKeyId: null, doorType: 'arena-lock', traversalCost: 1, stateTrigger: null },
      { id: 'popping-checkpoint', from: 'popping-lane', to: 'wall-checkpoint', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'checkpoint-exit', from: 'wall-checkpoint', to: 'wall-exit', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: 'primary-objective' },
      { id: 'locker-cache', from: 'plate-locker', to: 'unshielded-cache', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 2, stateTrigger: null },
      { id: 'cache-wall', from: 'unshielded-cache', to: 'violet-wall', bidirectional: true, requiredKeyId: 'violet-key', doorType: 'workshop-lock', traversalCost: 2, stateTrigger: 'key-collected' },
    ],
    keys: [{ id: 'violet-key', placementNodeId: 'plate-locker' }],
    hazards: [
      { id: 'lesson-ice-west', nodeId: 'guard-lesson', periodTicks: 240, activeTicks: 240, collisionProfileId: 'violet-wall-ice-west-v1' },
      { id: 'arena-ice-south', nodeId: 'violet-wall', periodTicks: 240, activeTicks: 240, collisionProfileId: 'violet-wall-ice-south-v1' },
      { id: 'popping-ice-east', nodeId: 'popping-lane', periodTicks: 240, activeTicks: 240, collisionProfileId: 'violet-wall-ice-east-v1' },
    ],
    generationAttempts: 1, validationProfile: 'authored-grid-v1',
  },
  objectives: [{
    id: 'clear-violet-wall', type: 'deactivate', required: true, titleKey: 'objectives.level_033',
    targetIds: ['shield-up', 'wall-crossfire', 'plate-encore'], targetCount: 10,
    durationTicks: null, dependsOn: [], completionMode: 'count', markerPolicy: 'always',
  }],
  encounters: [{
    id: 'violet-wall-company', roomNodeId: 'violet-wall', trigger: 'on-enter', triggerRef: null,
    arenaLock: true, waves: [{
      id: 'shield-up', startCondition: 'encounter-start', startDelayTicks: 0,
      spawnGroups: [
        { id: 'opening-shielder', archetypeId: 'violet-shielder', count: 1, modifierIds: ['shield-pose-teacher'], spawnPointSetId: 'level-033-arena-1', dancePresetId: 'shield-pose-popping', aiProfileId: 'chapter-04-stage-33', rewardProfileId: 'chapter-04-coins-33', rngStream: 'encounter.level-033.wave-1.shielder', rank: 'normal', accessibilityVerificationId: 'silhouette-violet-shielder-v1' },
        { id: 'opening-wobblers', archetypeId: 'wobble-scout', count: 2, modifierIds: ['wall-mimes'], spawnPointSetId: 'level-033-arena-1', dancePresetId: 'shield-pose-popping', aiProfileId: 'chapter-04-stage-33', rewardProfileId: 'chapter-04-coins-33', rngStream: 'encounter.level-033.wave-1.wobblers', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
      ], maxConcurrentRobots: 3, interGroupDelayTicks: 8, danceTransitionId: null,
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'wall-crossfire', startCondition: 'previous-wave-complete', startDelayTicks: 18,
      spawnGroups: [
        { id: 'wall-sliders', archetypeId: 'blue-slider', count: 2, modifierIds: ['violet-flank'], spawnPointSetId: 'level-033-arena-2', dancePresetId: 'shield-pose-popping', aiProfileId: 'chapter-04-stage-33', rewardProfileId: 'chapter-04-coins-33', rngStream: 'encounter.level-033.wave-2.sliders', rank: 'normal', accessibilityVerificationId: 'silhouette-blue-slider-v1' },
        { id: 'wall-spinners', archetypeId: 'yellow-spinner', count: 2, modifierIds: ['shield-spotters'], spawnPointSetId: 'level-033-arena-2', dancePresetId: 'shield-pose-popping', aiProfileId: 'chapter-04-stage-33', rewardProfileId: 'chapter-04-coins-33', rngStream: 'encounter.level-033.wave-2.spinners', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
      ], maxConcurrentRobots: 4, interGroupDelayTicks: 6, danceTransitionId: 'wall-crossfire',
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }, {
      id: 'plate-encore', startCondition: 'previous-wave-complete', startDelayTicks: 16,
      spawnGroups: [
        { id: 'encore-firemouth', archetypeId: 'red-firemouth', count: 1, modifierIds: ['violet-flame'], spawnPointSetId: 'level-033-arena-3', dancePresetId: 'shield-pose-popping', aiProfileId: 'chapter-04-stage-33', rewardProfileId: 'chapter-04-coins-33', rngStream: 'encounter.level-033.wave-3.firemouth', rank: 'normal', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
        { id: 'encore-foreman', archetypeId: 'red-firemouth', count: 1, modifierIds: ['wall-foreman'], spawnPointSetId: 'level-033-arena-3', dancePresetId: 'shield-pose-popping', aiProfileId: 'chapter-04-stage-33', rewardProfileId: 'chapter-04-coins-33', rngStream: 'encounter.level-033.wave-3.foreman', rank: 'elite', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
        { id: 'encore-dj', archetypeId: 'cyan-dj', count: 1, modifierIds: ['shield-pulse-conductor'], spawnPointSetId: 'level-033-arena-3', dancePresetId: 'shield-pose-popping', aiProfileId: 'chapter-04-stage-33', rewardProfileId: 'chapter-04-coins-33', rngStream: 'encounter.level-033.wave-3.dj', rank: 'elite', accessibilityVerificationId: 'silhouette-cyan-dj-v1' },
      ], maxConcurrentRobots: 3, interGroupDelayTicks: 5, danceTransitionId: 'plate-encore',
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }], completion: 'all-defeated', rewardId: 'chapter-04-clear-033', checkpointOnComplete: null,
  }],
  dance: {
    presetId: 'shield-pose-popping', grammarVersion: 1, bpm: 126, timeSignature: '4/4', barsPerPhrase: 4,
    footPatternId: 'shield-pose-popping-feet-v1', torsoPatternId: 'shield-pose-popping-torso-v1',
    armPatternId: 'shield-pose-popping-arms-v1', headAccentId: 'shield-pose-popping-head-v1',
    pathPatternId: 'shield-pose-popping-path-v1', attackBeats: [1, 5, 9, 13],
    vulnerableBeats: [3, 7, 11, 15], transitionIds: ['wall-crossfire', 'plate-encore', 'objective-clear'],
    visualIntensity: 0.98, reducedMotionPresetId: 'shield-pose-popping-reduced-v1',
  },
  difficulty: { presetId: 'standard-chapter-04-033' }, economy: { presetId: 'economy-chapter-04-033' },
  checkpoints: [{ presetId: 'checkpoint-033' }], audio: { presetId: 'audio-cold-storage-033' },
  mastery: [{ presetId: 'level-033-par-time' }, { presetId: 'level-033-break-on-open-pose' }],
  agentValidation: {
    tier: 'ordinary', owner: 'gameplay-qa', runs: [{
      id: 'standard-live', mode: 'live-agent', policyId: 'baseline-campaign-agent', policyVersion: 1,
      referenceReplayId: null, seed: 'campaign-level-033-v1', difficulty: 'Standard', assistProfileId: null,
      maxTicks: 18_000, stuckTimeoutTicks: 2_000, maxIllegalActions: 0,
      requiredObjectiveIds: ['clear-violet-wall'], expectedCompletion: true, expectedChecksum: null,
      parTicks: 14_000,
      dependencyHashes: {
        simulationSchema: '7673b9fb7039c568', effectiveLevel: ZERO_HASH, simulationLevel: '36460f12387f9356',
        balanceData: 'c1df429a54459a12', policyOrReplay: 'c00c7c2e50668d3b',
      },
    }],
  },
  performance: {
    maxActiveRobots: 4, maxActiveProjectiles: 64, maxActivePickups: 4, maxHazards: 3,
    maxMazeNodes: 10, maxRenderInstances: 1_024, expectedPeakDrawCalls: 8,
    expectedPeakMemoryMb: 192, benchmarkScenarioIds: ['level-033-standard-live'],
  },
  tags: ['chapter-04', 'cold-storage', 'shielder-introduction', 'derived-shield-pulse', 'shield-pose-popping'],
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

export const LEVEL_033: LevelDefinition = {
  ...draft,
  agentValidation: {
    ...draft.agentValidation,
    runs: draft.agentValidation.runs.map((run) => ({
      ...run,
      dependencyHashes: { ...run.dependencyHashes, effectiveLevel },
    })),
  },
};
