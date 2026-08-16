import type { LevelDefinition, SpawnGroupSpec, WaveSpec } from '../level-definition';
import { checksumCanonicalContent } from '../content-hash.ts';
import { LEVEL_001 } from './level-001.ts';

export const CHAPTER_01_LEVEL_IDS = [
  'level-001', 'level-002', 'level-003', 'level-004', 'level-005',
  'level-006', 'level-007', 'level-008', 'level-009', 'level-010',
] as const;

export type Chapter01LevelId = typeof CHAPTER_01_LEVEL_IDS[number];

interface Chapter01Recipe {
  readonly number: number;
  readonly nameSlug: string;
  readonly paletteId: string;
  readonly danceId: string;
  readonly bpm: number;
  readonly visualIntensity: number;
  readonly mechanicTags: readonly string[];
  readonly groups: readonly {
    readonly archetypeId: string;
    readonly count: number;
    readonly rank?: SpawnGroupSpec['rank'];
    readonly modifiers?: readonly string[];
  }[];
  readonly waves?: number;
  readonly branch?: boolean;
  readonly secret?: boolean;
  readonly hazard?: { readonly periodTicks: number; readonly activeTicks: number; readonly profileId: string };
  readonly tier?: LevelDefinition['agentValidation']['tier'];
}

const GLOBAL_DEPENDENCIES = {
  simulationSchema: 'be2cb2b2041c50ba',
  simulationLevel: 'ca2195b229d1f939',
  balanceData: 'abb88e1dff516df8',
  policyOrReplay: 'd3d7c87fc057d2d4',
} as const;

function pad(number: number): string {
  return String(number).padStart(3, '0');
}

function makeGroups(recipe: Chapter01Recipe, waveNumber: number): SpawnGroupSpec[] {
  return recipe.groups.map((group, groupIndex) => ({
    id: `${group.archetypeId}-${waveNumber}-${groupIndex + 1}`,
    archetypeId: group.archetypeId,
    count: group.count,
    modifierIds: [...(group.modifiers ?? [])],
    spawnPointSetId: `level-${pad(recipe.number)}-arena-${waveNumber}`,
    dancePresetId: recipe.danceId,
    aiProfileId: `chapter-01-stage-${recipe.number}`,
    rewardProfileId: `chapter-01-coins-${recipe.number}`,
    rngStream: `encounter.level-${pad(recipe.number)}.wave-${waveNumber}.group-${groupIndex + 1}`,
    rank: group.rank ?? 'normal',
    accessibilityVerificationId: `silhouette-${group.archetypeId}-v1`,
  }));
}

function makeWaves(recipe: Chapter01Recipe): WaveSpec[] {
  const waveCount = recipe.waves ?? 1;
  return Array.from({ length: waveCount }, (_, index) => {
    const waveNumber = index + 1;
    const groups = makeGroups(recipe, waveNumber);
    const population = groups.reduce((sum, group) => sum + group.count, 0);
    return {
      id: `wave-${pad(recipe.number)}-${waveNumber}`,
      startCondition: index === 0 ? 'encounter-start' : 'previous-wave-complete',
      startDelayTicks: index === 0 ? 0 : 45,
      spawnGroups: groups,
      maxConcurrentRobots: population,
      interGroupDelayTicks: groups.length > 1 ? 18 : 0,
      danceTransitionId: index === 0 ? null : `dance-transition-${waveNumber}`,
      completion: recipe.tier === 'boss' ? 'target-defeated' : 'all-defeated',
      invalidSpawnPolicy: 'fail-level',
    } satisfies WaveSpec;
  });
}

function createChapter01Level(recipe: Chapter01Recipe): LevelDefinition {
  const suffix = pad(recipe.number);
  const encounterId = recipe.tier === 'boss' ? 'chief-wobble' : `workshop-encounter-${suffix}`;
  const waves = makeWaves(recipe);
  const population = waves.reduce(
    (sum, wave) => sum + wave.spawnGroups.reduce((waveSum, group) => waveSum + group.count, 0), 0,
  );
  const peakRobots = Math.max(...waves.map((wave) => wave.maxConcurrentRobots));
  const nodes: LevelDefinition['maze']['nodes'][number][] = [
    { id: 'room-entry', role: 'entrance', templateTags: ['workshop', 'entry'], sizeClass: 'small', encounterIds: [], pickupIds: ['repair-kit'], checkpointId: null, storyIds: [], criticalPath: true },
    { id: 'room-key', role: 'corridor', templateTags: ['workshop', 'key'], sizeClass: 'medium', encounterIds: [], pickupIds: ['workshop-key'], checkpointId: null, storyIds: [], criticalPath: true },
    { id: 'room-arena', role: 'arena', templateTags: ['workshop', ...recipe.mechanicTags], sizeClass: 'large', encounterIds: [encounterId], pickupIds: ['pulse-cell'], checkpointId: null, storyIds: [], criticalPath: true },
    { id: 'room-checkpoint', role: 'checkpoint', templateTags: ['workshop', 'recovery'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: `checkpoint-${suffix}`, storyIds: [], criticalPath: true },
    { id: 'room-exit', role: 'exit', templateTags: ['workshop', 'objective-exit'], sizeClass: 'small', encounterIds: [], pickupIds: [], checkpointId: null, storyIds: [], criticalPath: true },
  ];
  const edges: LevelDefinition['maze']['edges'][number][] = [
    { id: 'edge-entry-key', from: 'room-entry', to: 'room-key', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
    { id: 'edge-key-arena', from: 'room-key', to: 'room-arena', bidirectional: true, requiredKeyId: 'workshop-key', doorType: 'workshop-lock', traversalCost: 1, stateTrigger: 'key-collected' },
    { id: 'edge-arena-checkpoint', from: 'room-arena', to: 'room-checkpoint', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: null },
    { id: 'edge-checkpoint-exit', from: 'room-checkpoint', to: 'room-exit', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 1, stateTrigger: 'primary-objective' },
  ];
  if (recipe.branch) {
    nodes.push({ id: 'room-loop', role: 'corridor', templateTags: ['workshop', 'branch'], sizeClass: 'medium', encounterIds: [], pickupIds: ['coin-cache'], checkpointId: null, storyIds: [], criticalPath: false });
    edges.push(
      { id: 'edge-key-loop', from: 'room-key', to: 'room-loop', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 2, stateTrigger: null },
      { id: 'edge-loop-checkpoint', from: 'room-loop', to: 'room-checkpoint', bidirectional: true, requiredKeyId: 'workshop-key', doorType: 'workshop-lock', traversalCost: 2, stateTrigger: 'key-collected' },
    );
  }
  if (recipe.secret) {
    nodes.push({ id: 'room-secret', role: 'secret', templateTags: ['workshop', 'secret'], sizeClass: 'small', encounterIds: [], pickupIds: ['secret-coin-cache'], checkpointId: null, storyIds: [], criticalPath: false });
    edges.push({ id: 'edge-key-secret', from: 'room-key', to: 'room-secret', bidirectional: true, requiredKeyId: null, doorType: 'open', traversalCost: 3, stateTrigger: 'secret-discovered' });
  }
  const requiredObjectiveId = recipe.tier === 'boss' ? 'defeat-chief-wobble' : `deactivate-davels-${suffix}`;
  const draft: LevelDefinition = {
    schemaVersion: 1,
    id: `level-${suffix}`,
    number: recipe.number,
    chapterId: 'chapter-01',
    nameKey: `levels.${suffix}.name`,
    briefingKey: `levels.${suffix}.briefing`,
    seed: `campaign-level-${suffix}-v1`,
    palette: { presetId: recipe.paletteId },
    maze: {
      templateSetId: `workshop-${recipe.nameSlug}`,
      generatorVersion: 1,
      criticalPathRooms: { minimum: 5, maximum: 5 },
      optionalRooms: { minimum: Number(recipe.branch ?? false), maximum: Number(recipe.branch ?? false) + Number(recipe.secret ?? false) },
      maxBranchDepth: recipe.secret ? 2 : recipe.branch ? 1 : 0,
      secretCount: recipe.secret ? 1 : 0,
      entranceNodeId: 'room-entry',
      exitNodeId: 'room-exit',
      nodes,
      edges,
      keys: [{ id: 'workshop-key', placementNodeId: 'room-key' }],
      hazards: recipe.hazard === undefined ? [] : [{
        id: `hazard-${suffix}`, nodeId: 'room-arena', periodTicks: recipe.hazard.periodTicks,
        activeTicks: recipe.hazard.activeTicks, collisionProfileId: recipe.hazard.profileId,
      }],
      generationAttempts: 1,
      validationProfile: 'authored-grid-v1',
    },
    objectives: [{
      id: requiredObjectiveId,
      type: recipe.tier === 'boss' ? 'boss' : recipe.number === 9 ? 'survive' : recipe.number === 5 ? 'hunt' : 'deactivate',
      required: true,
      titleKey: recipe.tier === 'boss' ? 'objectives.defeat_chief_wobble' : `objectives.level_${suffix}`,
      targetIds: waves.map((wave) => wave.id),
      targetCount: population,
      durationTicks: null,
      dependsOn: [],
      completionMode: 'count',
      markerPolicy: recipe.secret ? 'discovered' : 'always',
    }],
    encounters: [{
      id: encounterId,
      roomNodeId: 'room-arena',
      trigger: 'on-enter',
      triggerRef: null,
      arenaLock: recipe.number >= 4,
      waves,
      completion: recipe.tier === 'boss' ? 'target-defeated' : 'all-defeated',
      rewardId: `chapter-01-clear-${suffix}`,
      checkpointOnComplete: null,
    }],
    dance: {
      presetId: recipe.danceId,
      grammarVersion: 1,
      bpm: recipe.bpm,
      timeSignature: '4/4',
      barsPerPhrase: 4,
      footPatternId: `${recipe.danceId}-feet-v1`,
      torsoPatternId: `${recipe.danceId}-torso-v1`,
      armPatternId: `${recipe.danceId}-arms-v1`,
      headAccentId: `${recipe.danceId}-head-v1`,
      pathPatternId: `${recipe.danceId}-path-v1`,
      attackBeats: [4, 12],
      vulnerableBeats: [2, 6, 10, 14],
      transitionIds: ['objective-clear', ...(recipe.waves !== undefined && recipe.waves > 1 ? ['next-wave'] : [])],
      visualIntensity: recipe.visualIntensity,
      reducedMotionPresetId: `${recipe.danceId}-reduced-v1`,
    },
    difficulty: { presetId: `standard-chapter-01-${suffix}` },
    economy: { presetId: `economy-chapter-01-${suffix}` },
    checkpoints: [{ presetId: `checkpoint-${suffix}` }],
    audio: { presetId: `audio-neon-workshop-${suffix}` },
    mastery: [{ presetId: `level-${suffix}-par-time` }, { presetId: `level-${suffix}-accuracy` }],
    agentValidation: {
      tier: recipe.tier ?? 'ordinary',
      owner: 'gameplay-qa',
      runs: [{
        id: 'standard-live',
        mode: 'live-agent',
        policyId: 'baseline-campaign-agent',
        policyVersion: 1,
        referenceReplayId: null,
        seed: `campaign-level-${suffix}-v1`,
        difficulty: 'Standard',
        assistProfileId: null,
        maxTicks: 6_000 + recipe.number * 300,
        stuckTimeoutTicks: 900,
        maxIllegalActions: 0,
        requiredObjectiveIds: [requiredObjectiveId],
        expectedCompletion: true,
        expectedChecksum: null,
        parTicks: 4_500 + recipe.number * 250,
        dependencyHashes: { ...GLOBAL_DEPENDENCIES, effectiveLevel: '0000000000000000' },
      }],
    },
    performance: {
      maxActiveRobots: peakRobots,
      maxActiveProjectiles: Math.min(64, 12 + peakRobots * 3),
      maxActivePickups: 5,
      maxHazards: recipe.hazard === undefined ? 0 : 1,
      maxMazeNodes: 8,
      maxRenderInstances: 512 + peakRobots * 64,
      expectedPeakDrawCalls: 8,
      expectedPeakMemoryMb: 192,
      benchmarkScenarioIds: [`level-${suffix}-standard-live`],
    },
    tags: ['chapter-01', 'workshop', 'pulse-gun', ...recipe.mechanicTags],
  };
  const normalized = {
    ...draft,
    agentValidation: {
      ...draft.agentValidation,
      runs: draft.agentValidation.runs.map((run) => ({
        ...run,
        dependencyHashes: {
          simulationSchema: '0000000000000000', effectiveLevel: '0000000000000000',
          simulationLevel: '0000000000000000', balanceData: '0000000000000000', policyOrReplay: '0000000000000000',
        },
      })),
    },
  };
  const effectiveLevel = checksumCanonicalContent(normalized);
  return {
    ...draft,
    agentValidation: {
      ...draft.agentValidation,
      runs: draft.agentValidation.runs.map((run) => ({
        ...run,
        dependencyHashes: { ...run.dependencyHashes, effectiveLevel },
      })),
    },
  };
}

export const LEVEL_002 = createChapter01Level({
  number: 2, nameSlug: 'grinning-hall', paletteId: 'neon-workshop-02', danceId: 'side-to-side-shuffle',
  bpm: 98, visualIntensity: 0.67, mechanicTags: ['branching'], branch: true,
  groups: [{ archetypeId: 'wobble-scout', count: 5 }],
});

export const LEVEL_003 = createChapter01Level({
  number: 3, nameSlug: 'coin-circuit', paletteId: 'neon-workshop-03', danceId: 'pocket-robot-pop',
  bpm: 100, visualIntensity: 0.69, mechanicTags: ['coin-banking'], branch: true,
  groups: [{ archetypeId: 'wobble-scout', count: 6, modifiers: ['coin-carrier'] }],
});

export const LEVEL_004 = createChapter01Level({
  number: 4, nameSlug: 'wrong-turn-boogie', paletteId: 'neon-workshop-04', danceId: 'corner-peek-groove',
  bpm: 102, visualIntensity: 0.72, mechanicTags: ['ambush', 'secret'], branch: true, secret: true,
  groups: [{ archetypeId: 'wobble-scout', count: 7, modifiers: ['ambusher'] }],
});

export const LEVEL_005 = createChapter01Level({
  number: 5, nameSlug: 'foremans-two-step', paletteId: 'neon-workshop-05', danceId: 'heavy-boot-two-step',
  bpm: 104, visualIntensity: 0.74, mechanicTags: ['elite-hunt'], branch: true, tier: 'named-elite',
  groups: [{ archetypeId: 'wobble-scout', count: 4 }, { archetypeId: 'red-firemouth', count: 1, rank: 'elite', modifiers: ['foreman'] }],
});

export const LEVEL_006 = createChapter01Level({
  number: 6, nameSlug: 'conveyor-conga', paletteId: 'neon-workshop-06', danceId: 'conveyor-conga',
  bpm: 106, visualIntensity: 0.76, mechanicTags: ['conveyor'], branch: true,
  hazard: { periodTicks: 180, activeTicks: 120, profileId: 'conveyor-lane-v1' },
  groups: [{ archetypeId: 'wobble-scout', count: 6 }],
});

export const LEVEL_007 = createChapter01Level({
  number: 7, nameSlug: 'lights-out-smiles-on', paletteId: 'neon-workshop-07', danceId: 'flashlight-freeze-dance',
  bpm: 108, visualIntensity: 0.6, mechanicTags: ['partial-darkness'], branch: true, secret: true,
  groups: [{ archetypeId: 'wobble-scout', count: 7, modifiers: ['reflective-eyes'] }],
});

export const LEVEL_008 = createChapter01Level({
  number: 8, nameSlug: 'shift-change', paletteId: 'neon-workshop-08', danceId: 'clockwork-charleston',
  bpm: 110, visualIntensity: 0.8, mechanicTags: ['timed-doors', 'mixed-scouts'], branch: true,
  groups: [{ archetypeId: 'wobble-scout', count: 5 }, { archetypeId: 'blue-slider', count: 3 }],
});

export const LEVEL_009 = createChapter01Level({
  number: 9, nameSlug: 'workshop-rush', paletteId: 'neon-workshop-09', danceId: 'turbo-tool-shuffle',
  bpm: 114, visualIntensity: 0.86, mechanicTags: ['multi-room', 'survival'], branch: true, secret: true, waves: 2,
  groups: [{ archetypeId: 'wobble-scout', count: 3 }, { archetypeId: 'yellow-spinner', count: 2 }],
});

export const LEVEL_010 = createChapter01Level({
  number: 10, nameSlug: 'chief-wobble', paletteId: 'neon-workshop-10', danceId: 'giant-wobble-breakdown',
  bpm: 116, visualIntensity: 0.92, mechanicTags: ['chapter-boss'], branch: false, tier: 'boss',
  groups: [{ archetypeId: 'invoice-overlord', count: 1, rank: 'boss', modifiers: ['chief-wobble'] }],
});

export const CHAPTER_01_LEVELS = [
  LEVEL_001, LEVEL_002, LEVEL_003, LEVEL_004, LEVEL_005,
  LEVEL_006, LEVEL_007, LEVEL_008, LEVEL_009, LEVEL_010,
] as const satisfies readonly LevelDefinition[];

export const CHAPTER_01_LEVEL_BY_ID: ReadonlyMap<Chapter01LevelId, LevelDefinition> = new Map(
  CHAPTER_01_LEVELS.map((level) => [level.id as Chapter01LevelId, level]),
);

export function isChapter01LevelId(value: string): value is Chapter01LevelId {
  return (CHAPTER_01_LEVEL_IDS as readonly string[]).includes(value);
}

export function chapter01Level(levelId: Chapter01LevelId): LevelDefinition {
  const level = CHAPTER_01_LEVEL_BY_ID.get(levelId);
  if (level === undefined) throw new Error(`Unknown Chapter 1 level ${levelId}`);
  return level;
}
