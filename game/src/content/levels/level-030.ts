import { checksumCanonicalContent } from '../content-hash.ts';
import type { LevelDefinition } from '../level-definition.ts';

const ZERO_HASH = '0000000000000000';

const draft: LevelDefinition = {
  schemaVersion: 1, id: 'level-030', number: 30, chapterId: 'chapter-03',
  nameKey: 'levels.030.name', briefingKey: 'levels.030.briefing', seed: 'campaign-level-030-v1',
  palette: { presetId: 'toxic-boiler-30' },
  maze: {
    templateSetId: 'boiler-furnace-mouth', generatorVersion: 1,
    criticalPathRooms: { minimum: 6, maximum: 6 }, optionalRooms: { minimum: 2, maximum: 2 },
    maxBranchDepth: 2, secretCount: 0, entranceNodeId: 'furnace-entry', exitNodeId: 'boiler-victory-exit',
    nodes: [
      { id: 'furnace-entry', role: 'entrance', templateTags: ['toxic-boiler', 'boss-gate'], sizeClass: 'small', encounterIds: [], pickupIds: ['repair-kit'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'ignition-key-lane', role: 'corridor', templateTags: ['toxic-boiler', 'ignition-key'], sizeClass: 'medium', encounterIds: [], pickupIds: ['ignition-key'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'furnace-mouth-arena', role: 'arena', templateTags: ['toxic-boiler', 'chapter-boss', 'flame-jaws'], sizeClass: 'large', encounterIds: ['furnace-mouth-finale'], pickupIds: ['pulse-cell'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'coolant-west', role: 'corridor', templateTags: ['toxic-boiler', 'coolant-loop'], sizeClass: 'medium', encounterIds: [], pickupIds: ['coin-cache'], checkpointId: null, storyIds: [], criticalPath: false },
      { id: 'coolant-east', role: 'corridor', templateTags: ['toxic-boiler', 'coolant-loop'], sizeClass: 'medium', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: false },
      { id: 'slag-crossing', role: 'corridor', templateTags: ['toxic-boiler', 'slag-crossing'], sizeClass: 'medium', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'furnace-checkpoint', role: 'checkpoint', templateTags: ['toxic-boiler', 'recovery'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: 'checkpoint-030', storyIds: [], criticalPath: true },
      { id: 'boiler-victory-exit', role: 'exit', templateTags: ['toxic-boiler', 'chapter-exit'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
    ],
    edges: [
      { id: 'entry-key', from: 'furnace-entry', to: 'ignition-key-lane', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'key-arena', from: 'ignition-key-lane', to: 'furnace-mouth-arena', bidirectional: true, requiredKeyId: 'ignition-key', doorType: 'workshop-lock', traversalCost: 1, stateTrigger: 'key-collected' },
      { id: 'arena-crossing', from: 'furnace-mouth-arena', to: 'slag-crossing', bidirectional: true, requiredKeyId: null, doorType: 'arena-lock', traversalCost: 1, stateTrigger: null },
      { id: 'crossing-checkpoint', from: 'slag-crossing', to: 'furnace-checkpoint', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'checkpoint-exit', from: 'furnace-checkpoint', to: 'boiler-victory-exit', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: 'primary-objective' },
      { id: 'key-coolant-west', from: 'ignition-key-lane', to: 'coolant-west', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 2, stateTrigger: null },
      { id: 'coolant-link', from: 'coolant-west', to: 'coolant-east', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 2, stateTrigger: null },
      { id: 'coolant-crossing', from: 'coolant-east', to: 'slag-crossing', bidirectional: true, requiredKeyId: 'ignition-key', doorType: 'workshop-lock', traversalCost: 2, stateTrigger: 'key-collected' },
    ],
    keys: [{ id: 'ignition-key', placementNodeId: 'ignition-key-lane' }],
    hazards: [
      { id: 'furnace-jaw-west', nodeId: 'furnace-mouth-arena', periodTicks: 160, activeTicks: 64, collisionProfileId: 'furnace-jaw-west-v1' },
      { id: 'furnace-jaw-east', nodeId: 'furnace-mouth-arena', periodTicks: 160, activeTicks: 64, collisionProfileId: 'furnace-jaw-east-v1' },
      { id: 'furnace-jaw-north', nodeId: 'furnace-mouth-arena', periodTicks: 160, activeTicks: 64, collisionProfileId: 'furnace-jaw-north-v1' },
      { id: 'furnace-jaw-south', nodeId: 'furnace-mouth-arena', periodTicks: 160, activeTicks: 64, collisionProfileId: 'furnace-jaw-south-v1' },
    ],
    generationAttempts: 1, validationProfile: 'authored-grid-v1',
  },
  objectives: [{
    id: 'defeat-furnace-mouth', type: 'boss', required: true, titleKey: 'objectives.level_030',
    targetIds: ['inferno-finale'], targetCount: 1,
    durationTicks: null, dependsOn: [], completionMode: 'count', markerPolicy: 'always',
  }],
  encounters: [{
    id: 'furnace-mouth-finale', roomNodeId: 'furnace-mouth-arena', trigger: 'on-enter', triggerRef: null,
    arenaLock: true, waves: [{
      id: 'inferno-finale', startCondition: 'encounter-start', startDelayTicks: 0,
      spawnGroups: [{
        id: 'furnace-mouth', archetypeId: 'invoice-overlord', count: 1,
        modifierIds: ['furnace-crown', 'three-stage-inferno'], spawnPointSetId: 'level-030-boss',
        dancePresetId: 'inferno-flamenco-finale', aiProfileId: 'chapter-03-boss-30',
        rewardProfileId: 'chapter-03-boss-coins-30', rngStream: 'encounter.level-030.boss.furnace-mouth',
        rank: 'boss', accessibilityVerificationId: 'silhouette-invoice-overlord-v1',
      }],
      maxConcurrentRobots: 1, interGroupDelayTicks: 0, danceTransitionId: 'boss-phase',
      completion: 'target-defeated', invalidSpawnPolicy: 'fail-level',
    }],
    completion: 'target-defeated', rewardId: 'chapter-03-clear-030', checkpointOnComplete: null,
  }],
  dance: {
    presetId: 'inferno-flamenco-finale', grammarVersion: 1, bpm: 164, timeSignature: '4/4', barsPerPhrase: 4,
    footPatternId: 'inferno-flamenco-finale-feet-v1', torsoPatternId: 'inferno-flamenco-finale-torso-v1',
    armPatternId: 'inferno-flamenco-finale-arms-v1', headAccentId: 'inferno-flamenco-finale-head-v1',
    pathPatternId: 'inferno-flamenco-finale-path-v1', attackBeats: [0, 3, 6, 9, 12, 15],
    vulnerableBeats: [2, 5, 8, 11, 14], transitionIds: ['boss-phase', 'objective-clear'],
    visualIntensity: 1, reducedMotionPresetId: 'inferno-flamenco-finale-reduced-v1',
  },
  difficulty: { presetId: 'standard-chapter-03-030' }, economy: { presetId: 'economy-chapter-03-030' },
  checkpoints: [{ presetId: 'checkpoint-030' }], audio: { presetId: 'audio-toxic-boiler-030' },
  mastery: [{ presetId: 'level-030-par-time' }, { presetId: 'level-030-no-fireball-hit' }],
  agentValidation: {
    tier: 'boss', owner: 'gameplay-qa', runs: [{
      id: 'standard-live', mode: 'live-agent', policyId: 'baseline-campaign-agent', policyVersion: 1,
      referenceReplayId: null, seed: 'campaign-level-030-v1', difficulty: 'Standard', assistProfileId: null,
      maxTicks: 12_000, stuckTimeoutTicks: 2_000, maxIllegalActions: 0,
      requiredObjectiveIds: ['defeat-furnace-mouth'], expectedCompletion: true, expectedChecksum: null,
      parTicks: 7_000,
      dependencyHashes: {
        simulationSchema: '6cafd562c735e11d', effectiveLevel: ZERO_HASH, simulationLevel: 'e2789398020900b3',
        balanceData: '1f697b70870c7801', policyOrReplay: '5eedcddff4365989',
      },
    }],
  },
  performance: {
    maxActiveRobots: 1, maxActiveProjectiles: 64, maxActivePickups: 4, maxHazards: 4,
    maxMazeNodes: 10, maxRenderInstances: 1_024, expectedPeakDrawCalls: 8,
    expectedPeakMemoryMb: 192, benchmarkScenarioIds: ['level-030-standard-live'],
  },
  tags: ['chapter-03', 'toxic-boiler', 'chapter-boss', 'fire-spitting-boss', 'inferno-flamenco-finale'],
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

export const LEVEL_030: LevelDefinition = {
  ...draft,
  agentValidation: {
    ...draft.agentValidation,
    runs: draft.agentValidation.runs.map((run) => ({
      ...run,
      dependencyHashes: { ...run.dependencyHashes, effectiveLevel },
    })),
  },
};
