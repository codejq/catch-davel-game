import { checksumCanonicalContent } from '../content-hash.ts';
import type { LevelDefinition } from '../level-definition.ts';
import { LEVEL_012 } from './level-012.ts';
import { LEVEL_013 } from './level-013.ts';
import { LEVEL_014 } from './level-014.ts';
import { LEVEL_015 } from './level-015.ts';
import { LEVEL_016 } from './level-016.ts';
import { LEVEL_017 } from './level-017.ts';
import { LEVEL_018 } from './level-018.ts';
import { LEVEL_019 } from './level-019.ts';
import { LEVEL_020 } from './level-020.ts';

const ZERO_HASH = '0000000000000000';

const draft: LevelDefinition = {
  schemaVersion: 1,
  id: 'level-011',
  number: 11,
  chapterId: 'chapter-02',
  nameKey: 'levels.011.name',
  briefingKey: 'levels.011.briefing',
  seed: 'campaign-level-011-v1',
  palette: { presetId: 'copper-carnival-11' },
  maze: {
    templateSetId: 'carnival-ticket-trouble',
    generatorVersion: 1,
    criticalPathRooms: { minimum: 5, maximum: 5 },
    optionalRooms: { minimum: 1, maximum: 1 },
    maxBranchDepth: 1,
    secretCount: 0,
    entranceNodeId: 'ticket-entry',
    exitNodeId: 'big-top-exit',
    nodes: [
      { id: 'ticket-entry', role: 'entrance', templateTags: ['carnival', 'ticket-lane'], sizeClass: 'small', encounterIds: [], pickupIds: ['repair-kit'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'brass-booth', role: 'corridor', templateTags: ['carnival', 'ticket-booth'], sizeClass: 'medium', encounterIds: [], pickupIds: ['carnival-ticket'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'swing-arena', role: 'arena', templateTags: ['carnival', 'sword-tutorial', 'timed-gates'], sizeClass: 'large', encounterIds: ['ticket-taker-crew'], pickupIds: ['pulse-cell'], checkpointId: null, storyIds: [], criticalPath: true },
      { id: 'prize-loop', role: 'corridor', templateTags: ['carnival', 'prize-booth'], sizeClass: 'medium', encounterIds: [], pickupIds: ['coin-cache'], checkpointId: null, storyIds: [], criticalPath: false },
      { id: 'carnival-checkpoint', role: 'checkpoint', templateTags: ['carnival', 'recovery'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: 'checkpoint-011', storyIds: [], criticalPath: true },
      { id: 'big-top-exit', role: 'exit', templateTags: ['carnival', 'objective-exit'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
    ],
    edges: [
      { id: 'entry-booth', from: 'ticket-entry', to: 'brass-booth', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'booth-arena', from: 'brass-booth', to: 'swing-arena', bidirectional: true, requiredKeyId: 'carnival-ticket', doorType: 'ticket-gate', traversalCost: 1, stateTrigger: 'key-collected' },
      { id: 'arena-checkpoint', from: 'swing-arena', to: 'carnival-checkpoint', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
      { id: 'checkpoint-exit', from: 'carnival-checkpoint', to: 'big-top-exit', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: 'primary-objective' },
      { id: 'booth-prize', from: 'brass-booth', to: 'prize-loop', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 2, stateTrigger: null },
      { id: 'prize-checkpoint', from: 'prize-loop', to: 'carnival-checkpoint', bidirectional: true, requiredKeyId: 'carnival-ticket', doorType: 'ticket-gate', traversalCost: 2, stateTrigger: 'key-collected' },
    ],
    keys: [{ id: 'carnival-ticket', placementNodeId: 'brass-booth' }],
    hazards: [
      { id: 'ticket-gate-west', nodeId: 'swing-arena', periodTicks: 180, activeTicks: 90, collisionProfileId: 'ticket-gate-west-v1' },
      { id: 'ticket-gate-east', nodeId: 'swing-arena', periodTicks: 180, activeTicks: 90, collisionProfileId: 'ticket-gate-east-v1' },
    ],
    generationAttempts: 1,
    validationProfile: 'authored-grid-v1',
  },
  objectives: [{
    id: 'clear-ticket-trouble',
    type: 'deactivate',
    required: true,
    titleKey: 'objectives.level_011',
    targetIds: ['ticket-taker-wave'],
    targetCount: 8,
    durationTicks: null,
    dependsOn: [],
    completionMode: 'count',
    markerPolicy: 'always',
  }],
  encounters: [{
    id: 'ticket-taker-crew',
    roomNodeId: 'swing-arena',
    trigger: 'on-enter',
    triggerRef: null,
    arenaLock: true,
    waves: [{
      id: 'ticket-taker-wave',
      startCondition: 'encounter-start',
      startDelayTicks: 0,
      spawnGroups: [
        { id: 'ticket-wobblers', archetypeId: 'wobble-scout', count: 3, modifierIds: ['ticket-taker'], spawnPointSetId: 'level-011-arena-1', dancePresetId: 'ticket-taker-swing', aiProfileId: 'chapter-02-stage-11', rewardProfileId: 'chapter-02-coins-11', rngStream: 'encounter.level-011.wave-1.wobblers', rank: 'normal', accessibilityVerificationId: 'silhouette-wobble-scout-v1' },
        { id: 'ticket-sliders', archetypeId: 'blue-slider', count: 2, modifierIds: ['ticket-taker'], spawnPointSetId: 'level-011-arena-1', dancePresetId: 'ticket-taker-swing', aiProfileId: 'chapter-02-stage-11', rewardProfileId: 'chapter-02-coins-11', rngStream: 'encounter.level-011.wave-1.sliders', rank: 'normal', accessibilityVerificationId: 'silhouette-blue-slider-v1' },
        { id: 'ticket-spinners', archetypeId: 'yellow-spinner', count: 2, modifierIds: ['ticket-taker'], spawnPointSetId: 'level-011-arena-1', dancePresetId: 'ticket-taker-swing', aiProfileId: 'chapter-02-stage-11', rewardProfileId: 'chapter-02-coins-11', rngStream: 'encounter.level-011.wave-1.spinners', rank: 'normal', accessibilityVerificationId: 'silhouette-yellow-spinner-v1' },
        { id: 'ticket-firemouth', archetypeId: 'red-firemouth', count: 1, modifierIds: ['ticket-taker'], spawnPointSetId: 'level-011-arena-1', dancePresetId: 'ticket-taker-swing', aiProfileId: 'chapter-02-stage-11', rewardProfileId: 'chapter-02-coins-11', rngStream: 'encounter.level-011.wave-1.firemouth', rank: 'normal', accessibilityVerificationId: 'silhouette-red-firemouth-v1' },
      ],
      maxConcurrentRobots: 8,
      interGroupDelayTicks: 18,
      danceTransitionId: null,
      completion: 'all-defeated',
      invalidSpawnPolicy: 'fail-level',
    }],
    completion: 'all-defeated',
    rewardId: 'chapter-02-clear-011',
    checkpointOnComplete: null,
  }],
  dance: {
    presetId: 'ticket-taker-swing',
    grammarVersion: 1,
    bpm: 118,
    timeSignature: '4/4',
    barsPerPhrase: 4,
    footPatternId: 'ticket-taker-swing-feet-v1',
    torsoPatternId: 'ticket-taker-swing-torso-v1',
    armPatternId: 'ticket-taker-swing-arms-v1',
    headAccentId: 'ticket-taker-swing-head-v1',
    pathPatternId: 'ticket-taker-swing-path-v1',
    attackBeats: [3, 11],
    vulnerableBeats: [1, 5, 9, 13],
    transitionIds: ['objective-clear'],
    visualIntensity: 0.78,
    reducedMotionPresetId: 'ticket-taker-swing-reduced-v1',
  },
  difficulty: { presetId: 'standard-chapter-02-011' },
  economy: { presetId: 'economy-chapter-02-011' },
  checkpoints: [{ presetId: 'checkpoint-011' }],
  audio: { presetId: 'audio-copper-carnival-011' },
  mastery: [{ presetId: 'level-011-par-time' }, { presetId: 'level-011-sword-style' }],
  agentValidation: {
    tier: 'ordinary',
    owner: 'gameplay-qa',
    runs: [{
      id: 'standard-live',
      mode: 'live-agent',
      policyId: 'baseline-campaign-agent',
      policyVersion: 1,
      referenceReplayId: null,
      seed: 'campaign-level-011-v1',
      difficulty: 'Standard',
      assistProfileId: null,
      maxTicks: 10_000,
      stuckTimeoutTicks: 1_200,
      maxIllegalActions: 0,
      requiredObjectiveIds: ['clear-ticket-trouble'],
      expectedCompletion: true,
      expectedChecksum: null,
      parTicks: 7_250,
      dependencyHashes: {
        simulationSchema: '7673b9fb7039c568',
        effectiveLevel: ZERO_HASH,
        simulationLevel: '57038c81ca027089',
        balanceData: 'c1df429a54459a12',
        policyOrReplay: 'c00c7c2e50668d3b',
      },
    }],
  },
  performance: {
    maxActiveRobots: 8,
    maxActiveProjectiles: 36,
    maxActivePickups: 4,
    maxHazards: 2,
    maxMazeNodes: 8,
    maxRenderInstances: 1_024,
    expectedPeakDrawCalls: 8,
    expectedPeakMemoryMb: 192,
    benchmarkScenarioIds: ['level-011-standard-live'],
  },
  tags: ['chapter-02', 'copper-carnival', 'sword-tutorial', 'timed-gates', 'ticket-taker-swing'],
};

const normalizedForHash: LevelDefinition = {
  ...draft,
  agentValidation: {
    ...draft.agentValidation,
    runs: draft.agentValidation.runs.map((run) => ({
      ...run,
      dependencyHashes: {
        simulationSchema: ZERO_HASH,
        effectiveLevel: ZERO_HASH,
        simulationLevel: ZERO_HASH,
        balanceData: ZERO_HASH,
        policyOrReplay: ZERO_HASH,
      },
    })),
  },
};

const effectiveLevel = checksumCanonicalContent(normalizedForHash);

export const LEVEL_011: LevelDefinition = {
  ...draft,
  agentValidation: {
    ...draft.agentValidation,
    runs: draft.agentValidation.runs.map((run) => ({
      ...run,
      dependencyHashes: { ...run.dependencyHashes, effectiveLevel },
    })),
  },
};

export { LEVEL_012 } from './level-012.ts';
export { LEVEL_013 } from './level-013.ts';
export { LEVEL_014 } from './level-014.ts';
export { LEVEL_015 } from './level-015.ts';
export { LEVEL_016 } from './level-016.ts';
export { LEVEL_017 } from './level-017.ts';
export { LEVEL_018 } from './level-018.ts';
export { LEVEL_019 } from './level-019.ts';
export { LEVEL_020 } from './level-020.ts';

export const CHAPTER_02_LEVELS = [
  LEVEL_011, LEVEL_012, LEVEL_013, LEVEL_014, LEVEL_015, LEVEL_016, LEVEL_017, LEVEL_018, LEVEL_019, LEVEL_020,
] as const satisfies readonly LevelDefinition[];
