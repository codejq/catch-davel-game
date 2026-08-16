export interface PresetBinding<T extends object = Record<string, never>> {
  readonly presetId: string;
  readonly override?: Partial<T>;
}

export interface IntegerRange { readonly minimum: number; readonly maximum: number }

export interface MazeNodeSpec {
  readonly id: string;
  readonly role: 'entrance' | 'corridor' | 'arena' | 'checkpoint' | 'exit' | 'secret';
  readonly templateTags: readonly string[];
  readonly sizeClass: 'small' | 'medium' | 'large';
  readonly encounterIds: readonly string[];
  readonly pickupIds: readonly string[];
  readonly checkpointId: string | null;
  readonly storyIds: readonly string[];
  readonly criticalPath: boolean;
}

export interface MazeEdgeSpec {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly bidirectional: boolean;
  readonly requiredKeyId: string | null;
  readonly doorType: 'open' | 'workshop-lock' | 'arena-lock';
  readonly traversalCost: number;
  readonly stateTrigger: string | null;
}

export interface KeySpec { readonly id: string; readonly placementNodeId: string }
export interface HazardSpec {
  readonly id: string;
  readonly nodeId: string;
  readonly periodTicks: number;
  readonly activeTicks: number;
  readonly collisionProfileId: string;
}

export interface MazeSpec {
  readonly templateSetId: string;
  readonly generatorVersion: number;
  readonly criticalPathRooms: IntegerRange;
  readonly optionalRooms: IntegerRange;
  readonly maxBranchDepth: number;
  readonly secretCount: number;
  readonly entranceNodeId: string;
  readonly exitNodeId: string;
  readonly nodes: readonly MazeNodeSpec[];
  readonly edges: readonly MazeEdgeSpec[];
  readonly keys: readonly KeySpec[];
  readonly hazards: readonly HazardSpec[];
  readonly generationAttempts: number;
  readonly validationProfile: string;
}

export interface ObjectiveSpec {
  readonly id: string;
  readonly type: 'deactivate' | 'recover-keys' | 'shutdown' | 'survive' | 'hunt' | 'defend' | 'escape' | 'boss';
  readonly required: boolean;
  readonly titleKey: string;
  readonly targetIds: readonly string[];
  readonly targetCount: number | null;
  readonly durationTicks: number | null;
  readonly dependsOn: readonly string[];
  readonly completionMode: 'all' | 'any' | 'count' | 'timer' | 'reach';
  readonly markerPolicy: 'always' | 'discovered' | 'nearby' | 'none';
}

export interface SpawnGroupSpec {
  readonly id: string;
  readonly archetypeId: string;
  readonly count: number;
  readonly modifierIds: readonly string[];
  readonly spawnPointSetId: string;
  readonly dancePresetId: string;
  readonly aiProfileId: string;
  readonly rewardProfileId: string;
  readonly rngStream: string;
  readonly rank: 'normal' | 'elite' | 'boss';
  readonly accessibilityVerificationId: string;
}

export interface WaveSpec {
  readonly id: string;
  readonly startCondition: 'encounter-start' | 'previous-wave-complete' | 'timer';
  readonly startDelayTicks: number;
  readonly spawnGroups: readonly SpawnGroupSpec[];
  readonly maxConcurrentRobots: number;
  readonly interGroupDelayTicks: number;
  readonly danceTransitionId: string | null;
  readonly completion: 'all-defeated' | 'timer' | 'target-defeated';
  readonly invalidSpawnPolicy: 'fail-level';
}

export interface EncounterSpec {
  readonly id: string;
  readonly roomNodeId: string;
  readonly trigger: 'on-enter' | 'on-objective' | 'on-interact' | 'on-tick' | 'on-wave-complete';
  readonly triggerRef: string | null;
  readonly arenaLock: boolean;
  readonly waves: readonly WaveSpec[];
  readonly completion: 'all-defeated' | 'timer' | 'target-defeated' | 'objective-event';
  readonly rewardId: string | null;
  readonly checkpointOnComplete: string | null;
}

export interface DanceLevelSpec {
  readonly presetId: string;
  readonly grammarVersion: number;
  readonly bpm: number;
  readonly timeSignature: '4/4' | '3/4' | '7/8';
  readonly barsPerPhrase: number;
  readonly footPatternId: string;
  readonly torsoPatternId: string;
  readonly armPatternId: string;
  readonly headAccentId: string;
  readonly pathPatternId: string;
  readonly attackBeats: readonly number[];
  readonly vulnerableBeats: readonly number[];
  readonly transitionIds: readonly string[];
  readonly visualIntensity: number;
  readonly reducedMotionPresetId: string;
}

export interface AgentValidationRunSpec {
  readonly id: string;
  readonly mode: 'live-agent' | 'reference-replay';
  readonly policyId: string | null;
  readonly policyVersion: number | null;
  readonly referenceReplayId: string | null;
  readonly seed: string;
  readonly difficulty: 'Story' | 'Standard' | 'Hard';
  readonly assistProfileId: string | null;
  readonly maxTicks: number;
  readonly stuckTimeoutTicks: number;
  readonly maxIllegalActions: number;
  readonly requiredObjectiveIds: readonly string[];
  readonly expectedCompletion: boolean;
  readonly expectedChecksum: string | null;
  readonly parTicks: number;
  readonly dependencyHashes: {
    readonly simulationSchema: string;
    readonly effectiveLevel: string;
    readonly simulationLevel: string;
    readonly balanceData: string;
    readonly policyOrReplay: string;
  };
}

export interface AgentValidationSpec {
  readonly tier: 'ordinary' | 'boss' | 'named-elite';
  readonly runs: readonly AgentValidationRunSpec[];
  readonly owner: string;
}

export interface PerformanceSpec {
  readonly maxActiveRobots: number;
  readonly maxActiveProjectiles: number;
  readonly maxActivePickups: number;
  readonly maxHazards: number;
  readonly maxMazeNodes: number;
  readonly maxRenderInstances: number;
  readonly expectedPeakDrawCalls: number;
  readonly expectedPeakMemoryMb: number;
  readonly benchmarkScenarioIds: readonly string[];
}

export interface StorySpec {
  readonly introId: string | null;
  readonly outroId: string | null;
  readonly logIds: readonly string[];
  readonly dialogueCueIds: readonly string[];
  readonly localizationKeys: readonly string[];
  readonly skippable: boolean;
}

export interface LevelDefinition {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly number: number;
  readonly chapterId: string;
  readonly nameKey: string;
  readonly briefingKey: string;
  readonly seed: string;
  readonly palette: PresetBinding;
  readonly maze: MazeSpec;
  readonly objectives: readonly ObjectiveSpec[];
  readonly encounters: readonly EncounterSpec[];
  readonly dance: DanceLevelSpec;
  readonly difficulty: PresetBinding;
  readonly economy: PresetBinding;
  readonly checkpoints: readonly PresetBinding[];
  readonly audio: PresetBinding;
  readonly mastery: readonly PresetBinding[];
  readonly agentValidation: AgentValidationSpec;
  readonly performance: PerformanceSpec;
  readonly story?: StorySpec;
  readonly tags: readonly string[];
}
