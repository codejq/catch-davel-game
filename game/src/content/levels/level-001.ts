import type { LevelDefinition } from '../level-definition';

const pendingHash = '0000000000000000';

export const LEVEL_001 = {
  schemaVersion: 1,
  id: 'level-001',
  number: 1,
  chapterId: 'chapter-01',
  nameKey: 'levels.001.name',
  briefingKey: 'levels.001.briefing',
  seed: 'campaign-level-001-v1',
  palette: { presetId: 'neon-workshop-01' },
  maze: {
    templateSetId: 'workshop-basic', generatorVersion: 1,
    criticalPathRooms: { minimum: 5, maximum: 5 }, optionalRooms: { minimum: 0, maximum: 1 },
    maxBranchDepth: 1, secretCount: 0, entranceNodeId: 'room-entry', exitNodeId: 'room-exit',
    nodes: [
      { id: 'room-entry', role: 'entrance', templateTags: ['tutorial'], sizeClass: 'small', encounterIds: [], pickupIds: ['repair-kit'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'room-key', role: 'corridor', templateTags: ['key'], sizeClass: 'medium', encounterIds: [], pickupIds: ['workshop-key'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'room-arena', role: 'arena', templateTags: ['combat'], sizeClass: 'large', encounterIds: ['tutorial-wave'], pickupIds: ['pulse-cell'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'room-checkpoint', role: 'checkpoint', templateTags: ['recovery'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: 'checkpoint-before-exit', storyIds: [], criticalPath: true },
      { id: 'room-exit', role: 'exit', templateTags: ['objective-exit'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
    ],
    edges: [
      { id: 'edge-entry-key', from: 'room-entry', to: 'room-key', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'edge-key-arena', from: 'room-key', to: 'room-arena', bidirectional: true, requiredKeyId: 'workshop-key', doorType: 'workshop-lock', traversalCost: 1, stateTrigger: 'key-collected' },
      { id: 'edge-arena-checkpoint', from: 'room-arena', to: 'room-checkpoint', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'edge-checkpoint-exit', from: 'room-checkpoint', to: 'room-exit', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: 'deactivate-davels' },
    ],
    keys: [{ id: 'workshop-key', placementNodeId: 'room-key' }], hazards: [],
    generationAttempts: 1, validationProfile: 'authored-grid-v1',
  },
  objectives: [{
    id: 'deactivate-davels', type: 'deactivate', required: true, titleKey: 'objectives.deactivate_davels',
    targetIds: ['tutorial-wave'], targetCount: 6, durationTicks: null, dependsOn: [], completionMode: 'count', markerPolicy: 'always',
  }],
  encounters: [{
    id: 'tutorial-wave', roomNodeId: 'room-arena', trigger: 'on-enter', triggerRef: null, arenaLock: false,
    waves: [{
      id: 'wave-001', startCondition: 'encounter-start', startDelayTicks: 0,
      spawnGroups: [{
        id: 'scout-davels', archetypeId: 'firemouth-scout', count: 6, modifierIds: [],
        spawnPointSetId: 'level-001-patrols', dancePresetId: 'wobble-march', aiProfileId: 'patrol-fire-v1',
        rewardProfileId: 'tutorial-coins-v1', rngStream: 'encounter.tutorial-wave.scouts', rank: 'normal',
        accessibilityVerificationId: 'silhouette-firemouth-scout-v1',
      }],
      maxConcurrentRobots: 6, interGroupDelayTicks: 0, danceTransitionId: null,
      completion: 'all-defeated', invalidSpawnPolicy: 'fail-level',
    }],
    completion: 'all-defeated', rewardId: 'tutorial-clear', checkpointOnComplete: null,
  }],
  dance: {
    presetId: 'wobble-march', grammarVersion: 1, bpm: 96, timeSignature: '4/4', barsPerPhrase: 4,
    footPatternId: 'wobble-feet-v1', torsoPatternId: 'rubber-torso-v1', armPatternId: 'menace-arms-v1',
    headAccentId: 'comic-glare-v1', pathPatternId: 'independent-patrol-v1', attackBeats: [4, 12],
    vulnerableBeats: [2, 6, 10, 14], transitionIds: ['objective-clear'], visualIntensity: 0.65,
    reducedMotionPresetId: 'wobble-march-reduced-v1',
  },
  difficulty: { presetId: 'standard-tutorial-001' },
  economy: { presetId: 'economy-tutorial-001' },
  checkpoints: [{ presetId: 'checkpoint-before-exit' }],
  audio: { presetId: 'audio-neon-workshop-001' },
  mastery: [{ presetId: 'accuracy-bronze' }, { presetId: 'par-time' }],
  agentValidation: {
    tier: 'ordinary', owner: 'gameplay-qa',
    runs: [{
      id: 'standard-live', mode: 'live-agent', policyId: 'baseline-campaign-agent', policyVersion: 1,
      referenceReplayId: null, seed: 'campaign-level-001-v1', difficulty: 'Standard', assistProfileId: null,
      maxTicks: 18_000, stuckTimeoutTicks: 900, maxIllegalActions: 0,
      requiredObjectiveIds: ['deactivate-davels'], expectedCompletion: true, expectedChecksum: null, parTicks: 9_000,
      dependencyHashes: {
        simulationSchema: pendingHash, effectiveLevel: pendingHash, simulationLevel: pendingHash,
        balanceData: pendingHash, policyOrReplay: pendingHash,
      },
    }],
  },
  performance: {
    maxActiveRobots: 6, maxActiveProjectiles: 16, maxActivePickups: 3, maxHazards: 0, maxMazeNodes: 8,
    maxRenderInstances: 512, expectedPeakDrawCalls: 8, expectedPeakMemoryMb: 192,
    benchmarkScenarioIds: ['level-001-standard-live', 'bomb-squad-transport'],
  },
  tags: ['tutorial', 'workshop', 'gun', 'scouts'],
} as const satisfies LevelDefinition;
