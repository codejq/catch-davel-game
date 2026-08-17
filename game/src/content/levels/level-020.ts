import { checksumCanonicalContent } from '../content-hash.ts';
import type { LevelDefinition } from '../level-definition.ts';

const ZERO_HASH = '0000000000000000';

const draft: LevelDefinition = {
  schemaVersion: 1, id: 'level-020', number: 20, chapterId: 'chapter-02',
  nameKey: 'levels.020.name', briefingKey: 'levels.020.briefing', seed: 'campaign-level-020-v1',
  palette: { presetId: 'copper-carnival-20' },
  maze: {
    templateSetId: 'carnival-ringmaster-davel', generatorVersion: 1,
    criticalPathRooms: { minimum: 6, maximum: 6 }, optionalRooms: { minimum: 2, maximum: 2 },
    maxBranchDepth: 2, secretCount: 0, entranceNodeId: 'finale-entry', exitNodeId: 'carnival-victory-exit',
    nodes: [
      { id: 'finale-entry', role: 'entrance', templateTags: ['carnival', 'finale-gate'], sizeClass: 'small', encounterIds: [], pickupIds: ['repair-kit'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'ringmaster-ticket-lane', role: 'corridor', templateTags: ['carnival', 'golden-ticket'], sizeClass: 'medium', encounterIds: [], pickupIds: ['ringmaster-ticket'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'evil-big-top', role: 'arena', templateTags: ['carnival', 'chapter-boss', 'rotating-curtains'], sizeClass: 'large', encounterIds: ['ringmaster-finale'], pickupIds: ['pulse-cell'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'west-grandstand', role: 'corridor', templateTags: ['carnival', 'grandstand-loop'], sizeClass: 'medium', encounterIds: [], pickupIds: ['coin-cache'], checkpointId: null, storyIds: [], criticalPath: false },
      { id: 'east-grandstand', role: 'corridor', templateTags: ['carnival', 'grandstand-loop'], sizeClass: 'medium', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: false },
      { id: 'finale-crossing', role: 'corridor', templateTags: ['carnival', 'finale-crossing'], sizeClass: 'medium', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'ringmaster-checkpoint', role: 'checkpoint', templateTags: ['carnival', 'recovery'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: 'checkpoint-020', storyIds: [], criticalPath: true },
      { id: 'carnival-victory-exit', role: 'exit', templateTags: ['carnival', 'chapter-exit'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
    ],
    edges: [
      { id: 'entry-ticket', from: 'finale-entry', to: 'ringmaster-ticket-lane', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'ticket-big-top', from: 'ringmaster-ticket-lane', to: 'evil-big-top', bidirectional: true, requiredKeyId: 'ringmaster-ticket', doorType: 'ticket-gate', traversalCost: 1, stateTrigger: 'key-collected' },
      { id: 'big-top-crossing', from: 'evil-big-top', to: 'finale-crossing', bidirectional: true, requiredKeyId: null, doorType: 'arena-lock', traversalCost: 1, stateTrigger: null },
      { id: 'crossing-checkpoint', from: 'finale-crossing', to: 'ringmaster-checkpoint', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'checkpoint-exit', from: 'ringmaster-checkpoint', to: 'carnival-victory-exit', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: 'primary-objective' },
      { id: 'ticket-west', from: 'ringmaster-ticket-lane', to: 'west-grandstand', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 2, stateTrigger: null },
      { id: 'west-east', from: 'west-grandstand', to: 'east-grandstand', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 2, stateTrigger: null },
      { id: 'east-crossing', from: 'east-grandstand', to: 'finale-crossing', bidirectional: true, requiredKeyId: 'ringmaster-ticket', doorType: 'ticket-gate', traversalCost: 2, stateTrigger: 'key-collected' },
    ],
    keys: [{ id: 'ringmaster-ticket', placementNodeId: 'ringmaster-ticket-lane' }],
    hazards: [
      { id: 'ringmaster-curtain-west', nodeId: 'evil-big-top', periodTicks: 180, activeTicks: 70, collisionProfileId: 'ringmaster-curtain-west-v1' },
      { id: 'ringmaster-curtain-east', nodeId: 'evil-big-top', periodTicks: 180, activeTicks: 70, collisionProfileId: 'ringmaster-curtain-east-v1' },
      { id: 'ringmaster-curtain-north', nodeId: 'evil-big-top', periodTicks: 180, activeTicks: 70, collisionProfileId: 'ringmaster-curtain-north-v1' },
      { id: 'ringmaster-curtain-south', nodeId: 'evil-big-top', periodTicks: 180, activeTicks: 70, collisionProfileId: 'ringmaster-curtain-south-v1' },
    ],
    generationAttempts: 1, validationProfile: 'authored-grid-v1',
  },
  objectives: [{
    id: 'defeat-ringmaster-davel', type: 'boss', required: true, titleKey: 'objectives.level_020',
    targetIds: ['evil-ringmaster-finale'], targetCount: 1,
    durationTicks: null, dependsOn: [], completionMode: 'count', markerPolicy: 'always',
  }],
  encounters: [{
    id: 'ringmaster-finale', roomNodeId: 'evil-big-top', trigger: 'on-enter', triggerRef: null,
    arenaLock: true, waves: [{
      id: 'evil-ringmaster-finale', startCondition: 'encounter-start', startDelayTicks: 0,
      spawnGroups: [{
        id: 'ringmaster-davel', archetypeId: 'invoice-overlord', count: 1,
        modifierIds: ['ringmaster-regalia', 'carnival-volley'], spawnPointSetId: 'level-020-boss',
        dancePresetId: 'evil-ringmaster-revue', aiProfileId: 'chapter-02-boss-20',
        rewardProfileId: 'chapter-02-boss-coins-20', rngStream: 'encounter.level-020.boss.ringmaster',
        rank: 'boss', accessibilityVerificationId: 'silhouette-invoice-overlord-v1',
      }],
      maxConcurrentRobots: 1, interGroupDelayTicks: 0, danceTransitionId: 'boss-phase',
      completion: 'target-defeated', invalidSpawnPolicy: 'fail-level',
    }],
    completion: 'target-defeated', rewardId: 'chapter-02-clear-020', checkpointOnComplete: null,
  }],
  dance: {
    presetId: 'evil-ringmaster-revue', grammarVersion: 1, bpm: 160, timeSignature: '4/4', barsPerPhrase: 4,
    footPatternId: 'evil-ringmaster-revue-feet-v1', torsoPatternId: 'evil-ringmaster-revue-torso-v1',
    armPatternId: 'evil-ringmaster-revue-arms-v1', headAccentId: 'evil-ringmaster-revue-head-v1',
    pathPatternId: 'evil-ringmaster-revue-path-v1', attackBeats: [1, 4, 7, 10, 13],
    vulnerableBeats: [3, 6, 9, 12, 15], transitionIds: ['boss-phase', 'objective-clear'],
    visualIntensity: 1, reducedMotionPresetId: 'evil-ringmaster-revue-reduced-v1',
  },
  difficulty: { presetId: 'standard-chapter-02-020' }, economy: { presetId: 'economy-chapter-02-020' },
  checkpoints: [{ presetId: 'checkpoint-020' }], audio: { presetId: 'audio-copper-carnival-020' },
  mastery: [{ presetId: 'level-020-par-time' }, { presetId: 'level-020-no-boss-hit' }],
  agentValidation: {
    tier: 'boss', owner: 'gameplay-qa', runs: [{
      id: 'standard-live', mode: 'live-agent', policyId: 'baseline-campaign-agent', policyVersion: 1,
      referenceReplayId: null, seed: 'campaign-level-020-v1', difficulty: 'Standard', assistProfileId: null,
      maxTicks: 12_000, stuckTimeoutTicks: 2_000, maxIllegalActions: 0,
      requiredObjectiveIds: ['defeat-ringmaster-davel'], expectedCompletion: true, expectedChecksum: null,
      parTicks: 7_200,
      dependencyHashes: {
        simulationSchema: '7673b9fb7039c568', effectiveLevel: ZERO_HASH, simulationLevel: '2b66b71ee1b11f7e',
        balanceData: 'c1df429a54459a12', policyOrReplay: 'c00c7c2e50668d3b',
      },
    }],
  },
  performance: {
    maxActiveRobots: 1, maxActiveProjectiles: 48, maxActivePickups: 4, maxHazards: 4,
    maxMazeNodes: 10, maxRenderInstances: 1_024, expectedPeakDrawCalls: 8,
    expectedPeakMemoryMb: 192, benchmarkScenarioIds: ['level-020-standard-live'],
  },
  tags: ['chapter-02', 'copper-carnival', 'chapter-boss', 'rotating-curtains', 'evil-ringmaster-revue'],
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

export const LEVEL_020: LevelDefinition = {
  ...draft,
  agentValidation: {
    ...draft.agentValidation,
    runs: draft.agentValidation.runs.map((run) => ({
      ...run,
      dependencyHashes: { ...run.dependencyHashes, effectiveLevel },
    })),
  },
};
