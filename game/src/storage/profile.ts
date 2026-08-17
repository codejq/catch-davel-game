import { canonicalJson, checksumCanonical, parseSimulationSnapshot, type SimulationSnapshotV1 } from '../sim/serialization';
import { normalizeWeaponUpgradeLevels } from '../sim/weapons';
import { DEFAULT_INPUT_BINDINGS } from './input-bindings';
import { isCampaignLevelId } from '../content/level-ids';
import { normalizeRenderQuality, type RenderQualityPreference } from '../render/quality';
import { isDifficultyId, type DifficultyId } from '../sim/difficulty';
import { normalizePlayerUpgradeLevels, type PlayerUpgradeLevels } from '../sim/player-upgrades';

export const PROFILE_SCHEMA_VERSION = 14;

export type TouchHandedness = 'right' | 'left';
export type TouchFireMode = 'hold' | 'toggle';
export type SprintMode = 'hold' | 'toggle';
export type AudioDynamicRange = 'wide' | 'balanced' | 'night';
export type CampaignMedalTier = 'bronze' | 'silver' | 'gold' | 'quantum';

export interface StoredLevelResultV1 {
  readonly completionTicks: number;
  readonly score: number;
  readonly accuracyPermille: number | null;
  readonly damageTaken: number;
  readonly robotsByArchetype: Readonly<Record<string, number>>;
  readonly coinsCollected: number;
  readonly secretsFound: number;
  readonly totalSecrets: number;
  readonly highestCombo: number;
  readonly optionalObjectives: readonly { readonly id: string; readonly achieved: boolean }[];
  readonly medalTier: CampaignMedalTier;
  readonly seed: string;
  readonly replayChecksum: string;
  readonly replayId: string;
}

export interface LevelProgressV1 {
  readonly levelId: string;
  readonly completed: boolean;
  readonly medals: readonly string[];
  readonly bestTicks: number | null;
  readonly bestReplayId: string | null;
  readonly attempts: number;
  readonly defeats: number;
  readonly robotsDefeated: number;
  readonly bestScore: number | null;
  readonly bestAccuracyPermille: number | null;
  readonly leastDamageTaken: number | null;
  readonly mostSecretsFound: number;
  readonly highestCombo: number;
  readonly lastResult: StoredLevelResultV1 | null;
}

export interface ProfileBodyV14 {
  readonly profileSchemaVersion: 14;
  readonly migrationHistory: readonly string[];
  readonly profileId: string;
  readonly displayName: string;
  readonly unlockedLevelIds: readonly string[];
  readonly levelProgress: readonly LevelProgressV1[];
  readonly totalCoins: number;
  readonly spendableCoins: number;
  readonly weaponUpgrades: Readonly<Record<string, number>>;
  readonly playerUpgrades: PlayerUpgradeLevels;
  readonly cosmetics: readonly string[];
  readonly achievements: readonly string[];
  readonly settings: {
    readonly difficulty: DifficultyId;
    readonly language: string;
    readonly masterVolume: number;
    readonly musicVolume: number;
    readonly effectsVolume: number;
    readonly weaponsVolume: number;
    readonly robotsVolume: number;
    readonly environmentVolume: number;
    readonly interfaceVolume: number;
    readonly voiceVolume: number;
    readonly dynamicRange: AudioDynamicRange;
    readonly mouseSensitivity: number;
    readonly reducedMotion: boolean;
    readonly cameraMotion: number;
    readonly recoilMotion: number;
    readonly shakeMotion: number;
    readonly flashIntensity: number;
    readonly highContrast: boolean;
    readonly renderQuality: RenderQualityPreference;
    readonly textScale: number;
    readonly captions: boolean;
    readonly photosensitivitySafe: boolean;
    readonly touchControlScale: number;
    readonly touchControlOpacity: number;
    readonly touchVerticalOffset: number;
    readonly touchHandedness: TouchHandedness;
    readonly touchDeadZone: number;
    readonly touchFireMode: TouchFireMode;
    readonly sprintMode: SprintMode;
  };
  readonly inputMappings: Readonly<Record<string, string>>;
  readonly campaignCheckpoint: SimulationSnapshotV1 | null;
  readonly lastCleanShutdown: boolean;
}

export interface ProfileV14 extends ProfileBodyV14 {
  readonly integrityChecksum: string;
}

/** @deprecated Source-compatibility aliases; persisted profiles use schema v14. */
export type ProfileBodyV13 = ProfileBodyV14;
export type ProfileV13 = ProfileV14;
export type ProfileBodyV12 = ProfileBodyV14;
export type ProfileV12 = ProfileV14;

function profileBody(profile: ProfileV14): ProfileBodyV14 {
  const { integrityChecksum: _integrityChecksum, ...body } = profile;
  return body;
}

export function sealProfile(body: ProfileBodyV14): ProfileV14 {
  return { ...body, integrityChecksum: checksumCanonical(body) };
}

export function createDefaultProfile(profileId = 'default', displayName = 'Ranger'): ProfileV14 {
  return sealProfile({
    profileSchemaVersion: PROFILE_SCHEMA_VERSION,
    migrationHistory: ['created:v14'],
    profileId,
    displayName,
    unlockedLevelIds: ['level-001'],
    levelProgress: [{
      levelId: 'level-001', completed: false, medals: [], bestTicks: null, bestReplayId: null,
      attempts: 0, defeats: 0, robotsDefeated: 0,
      bestScore: null, bestAccuracyPermille: null, leastDamageTaken: null,
      mostSecretsFound: 0, highestCombo: 0, lastResult: null,
    }],
    totalCoins: 0,
    spendableCoins: 0,
    weaponUpgrades: { pulseDamage: 0, pulseEfficiency: 0, swordCooling: 0, bombCapacity: 0, laserCooling: 0 },
    playerUpgrades: { maxHealth: 0, maxEnergy: 0 },
    cosmetics: [],
    achievements: [],
    settings: {
      difficulty: 'standard',
      language: 'en', masterVolume: 1, musicVolume: 0.75, effectsVolume: 0.9,
      weaponsVolume: 1, robotsVolume: 1, environmentVolume: 1, interfaceVolume: 1, voiceVolume: 1,
      dynamicRange: 'balanced',
      mouseSensitivity: 1, reducedMotion: false,
      cameraMotion: 1, recoilMotion: 1, shakeMotion: 1, flashIntensity: 1,
      highContrast: false, renderQuality: 'auto', textScale: 1, captions: true, photosensitivitySafe: false,
      touchControlScale: 1, touchControlOpacity: 0.82, touchVerticalOffset: 0,
      touchHandedness: 'right', touchDeadZone: 0.12, touchFireMode: 'hold',
      sprintMode: 'hold',
    },
    inputMappings: DEFAULT_INPUT_BINDINGS,
    campaignCheckpoint: null,
    lastCleanShutdown: true,
  });
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[], label: string): void {
  const actualKeys = Object.keys(value).sort();
  const expectedKeys = [...expected].sort();
  if (actualKeys.length !== expectedKeys.length || actualKeys.some((key, index) => key !== expectedKeys[index])) {
    throw new Error(`${label} has unknown or missing fields`);
  }
}

function text(value: unknown, label: string, maximumLength = 128): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > maximumLength) throw new Error(`${label} is invalid`);
  return value;
}

function integer(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error(`${label} must be a non-negative safe integer`);
  return value;
}

function bounded(value: unknown, label: string, minimum: number, maximum: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) throw new Error(`${label} is outside bounds`);
  return value;
}

function booleanValue(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${label} must be boolean`);
  return value;
}

function strings(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length > 1_000) throw new Error(`${label} must be a bounded array`);
  return value.map((entry, index) => text(entry, `${label}[${index}]`, 256));
}

function numericRecord(value: unknown, label: string): Record<string, number> {
  const source = object(value, label);
  const result: Record<string, number> = {};
  for (const key of Object.keys(source).sort()) result[text(key, `${label} key`, 64)] = integer(source[key], `${label}.${key}`);
  return result;
}

function stringRecord(value: unknown, label: string): Record<string, string> {
  const source = object(value, label);
  const result: Record<string, string> = {};
  for (const key of Object.keys(source).sort()) result[text(key, `${label} key`, 64)] = text(source[key], `${label}.${key}`, 64);
  return result;
}

type LegacyLevelProgressV6 = Omit<LevelProgressV1,
  'bestScore' | 'bestAccuracyPermille' | 'leastDamageTaken' | 'mostSecretsFound' | 'highestCombo' | 'lastResult'>;

function levelProgressV6(value: unknown, index: number, bestReplayMaximumLength = 128): LegacyLevelProgressV6 {
  const progress = object(value, `levelProgress[${index}]`);
  exactKeys(progress, ['levelId', 'completed', 'medals', 'bestTicks', 'bestReplayId', 'attempts', 'defeats', 'robotsDefeated'], `levelProgress[${index}]`);
  const bestTicks = progress.bestTicks === null ? null : integer(progress.bestTicks, `levelProgress[${index}].bestTicks`);
  const bestReplayId = progress.bestReplayId === null ? null
    : text(progress.bestReplayId, `levelProgress[${index}].bestReplayId`, bestReplayMaximumLength);
  const levelId = text(progress.levelId, `levelProgress[${index}].levelId`, 64);
  if (!isCampaignLevelId(levelId)) throw new Error(`levelProgress[${index}].levelId is not a reserved campaign level ID`);
  return {
    levelId,
    completed: booleanValue(progress.completed, `levelProgress[${index}].completed`),
    medals: strings(progress.medals, `levelProgress[${index}].medals`),
    bestTicks,
    bestReplayId,
    attempts: integer(progress.attempts, `levelProgress[${index}].attempts`),
    defeats: integer(progress.defeats, `levelProgress[${index}].defeats`),
    robotsDefeated: integer(progress.robotsDefeated, `levelProgress[${index}].robotsDefeated`),
  };
}

const RESULT_ARCHETYPES = [
  'wobble-scout', 'blue-slider', 'yellow-spinner', 'red-firemouth', 'cyan-dj', 'violet-shielder', 'invoice-overlord',
] as const;

function storedLevelResult(value: unknown, label: string): StoredLevelResultV1 {
  const result = object(value, label);
  exactKeys(result, [
    'completionTicks', 'score', 'accuracyPermille', 'damageTaken', 'robotsByArchetype', 'coinsCollected',
    'secretsFound', 'totalSecrets', 'highestCombo', 'optionalObjectives', 'medalTier', 'seed',
    'replayChecksum', 'replayId',
  ], label);
  const robots = object(result.robotsByArchetype, `${label}.robotsByArchetype`);
  exactKeys(robots, RESULT_ARCHETYPES, `${label}.robotsByArchetype`);
  const robotsByArchetype: Record<string, number> = {};
  for (const archetype of RESULT_ARCHETYPES) {
    robotsByArchetype[archetype] = integer(robots[archetype], `${label}.robotsByArchetype.${archetype}`);
  }
  if (!Array.isArray(result.optionalObjectives) || result.optionalObjectives.length > 16) {
    throw new Error(`${label}.optionalObjectives must be a bounded array`);
  }
  const optionalObjectives = result.optionalObjectives.map((entry, index) => {
    const objective = object(entry, `${label}.optionalObjectives[${index}]`);
    exactKeys(objective, ['id', 'achieved'], `${label}.optionalObjectives[${index}]`);
    return {
      id: text(objective.id, `${label}.optionalObjectives[${index}].id`, 128),
      achieved: booleanValue(objective.achieved, `${label}.optionalObjectives[${index}].achieved`),
    };
  });
  const accuracyPermille = result.accuracyPermille === null ? null
    : bounded(result.accuracyPermille, `${label}.accuracyPermille`, 0, 1_000);
  if (accuracyPermille !== null && !Number.isInteger(accuracyPermille)) throw new Error(`${label}.accuracyPermille must be an integer`);
  if (result.medalTier !== 'bronze' && result.medalTier !== 'silver'
    && result.medalTier !== 'gold' && result.medalTier !== 'quantum') throw new Error(`${label}.medalTier is invalid`);
  const replayChecksum = text(result.replayChecksum, `${label}.replayChecksum`, 16);
  if (!/^[0-9a-f]{16}$/.test(replayChecksum)) throw new Error(`${label}.replayChecksum is invalid`);
  const completionTicks = integer(result.completionTicks, `${label}.completionTicks`);
  if (completionTicks === 0) throw new Error(`${label}.completionTicks must be positive`);
  const score = integer(result.score, `${label}.score`);
  const coinsCollected = integer(result.coinsCollected, `${label}.coinsCollected`);
  const secretsFound = integer(result.secretsFound, `${label}.secretsFound`);
  const totalSecrets = integer(result.totalSecrets, `${label}.totalSecrets`);
  if (secretsFound > totalSecrets) throw new Error(`${label}.secretsFound cannot exceed totalSecrets`);
  const seed = text(result.seed, `${label}.seed`, 256);
  const replayId = text(result.replayId, `${label}.replayId`, 512);
  if (!replayId.endsWith(`:${seed}:${replayChecksum}`)) {
    throw new Error(`${label}.replayId does not match its seed and checksum`);
  }
  return {
    completionTicks,
    score,
    accuracyPermille,
    damageTaken: bounded(result.damageTaken, `${label}.damageTaken`, 0, 1_000_000),
    robotsByArchetype,
    coinsCollected,
    secretsFound,
    totalSecrets,
    highestCombo: integer(result.highestCombo, `${label}.highestCombo`),
    optionalObjectives,
    medalTier: result.medalTier,
    seed,
    replayChecksum,
    replayId,
  };
}

function levelProgress(value: unknown, index: number): LevelProgressV1 {
  const progress = object(value, `levelProgress[${index}]`);
  exactKeys(progress, [
    'levelId', 'completed', 'medals', 'bestTicks', 'bestReplayId', 'attempts', 'defeats', 'robotsDefeated',
    'bestScore', 'bestAccuracyPermille', 'leastDamageTaken', 'mostSecretsFound', 'highestCombo', 'lastResult',
  ], `levelProgress[${index}]`);
  const legacy = levelProgressV6(Object.fromEntries(Object.entries(progress).filter(([key]) => ![
    'bestScore', 'bestAccuracyPermille', 'leastDamageTaken', 'mostSecretsFound', 'highestCombo', 'lastResult',
  ].includes(key))), index, 512);
  const bestAccuracyPermille = progress.bestAccuracyPermille === null ? null
    : bounded(progress.bestAccuracyPermille, `levelProgress[${index}].bestAccuracyPermille`, 0, 1_000);
  if (bestAccuracyPermille !== null && !Number.isInteger(bestAccuracyPermille)) {
    throw new Error(`levelProgress[${index}].bestAccuracyPermille must be an integer`);
  }
  const lastResult = progress.lastResult === null ? null
    : storedLevelResult(progress.lastResult, `levelProgress[${index}].lastResult`);
  if (lastResult !== null && !lastResult.replayId.startsWith(`${legacy.levelId}:`)) {
    throw new Error(`levelProgress[${index}].lastResult does not match its level ID`);
  }
  return {
    ...legacy,
    bestScore: progress.bestScore === null ? null : integer(progress.bestScore, `levelProgress[${index}].bestScore`),
    bestAccuracyPermille,
    leastDamageTaken: progress.leastDamageTaken === null ? null
      : bounded(progress.leastDamageTaken, `levelProgress[${index}].leastDamageTaken`, 0, 1_000_000),
    mostSecretsFound: integer(progress.mostSecretsFound, `levelProgress[${index}].mostSecretsFound`),
    highestCombo: integer(progress.highestCombo, `levelProgress[${index}].highestCombo`),
    lastResult,
  };
}

function verifyProfileIntegrity(profile: Record<string, unknown>): void {
  if (typeof profile.integrityChecksum !== 'string' || !/^[0-9a-f]{16}$/.test(profile.integrityChecksum)) {
    throw new Error('Profile integrity checksum is invalid');
  }
  const sourceBody = { ...profile };
  delete sourceBody.integrityChecksum;
  if (profile.integrityChecksum !== checksumCanonical(sourceBody)) throw new Error('Profile integrity checksum mismatch');
}

function touchHandedness(value: unknown): TouchHandedness {
  if (value !== 'right' && value !== 'left') throw new Error('profile.settings.touchHandedness is invalid');
  return value;
}

function touchFireMode(value: unknown): TouchFireMode {
  if (value !== 'hold' && value !== 'toggle') throw new Error('profile.settings.touchFireMode is invalid');
  return value;
}

function sprintMode(value: unknown): SprintMode {
  if (value !== 'hold' && value !== 'toggle') throw new Error('profile.settings.sprintMode is invalid');
  return value;
}

function audioDynamicRange(value: unknown): AudioDynamicRange {
  if (value !== 'wide' && value !== 'balanced' && value !== 'night') {
    throw new Error('profile.settings.dynamicRange is invalid');
  }
  return value;
}

function profileDifficulty(value: unknown): DifficultyId {
  if (!isDifficultyId(value)) throw new Error('profile.settings.difficulty is invalid');
  return value;
}

function validateProfileV14(profile: Record<string, unknown>): ProfileV14 {
  exactKeys(profile, [
    'profileSchemaVersion', 'migrationHistory', 'profileId', 'displayName', 'unlockedLevelIds', 'levelProgress',
    'totalCoins', 'spendableCoins', 'weaponUpgrades', 'playerUpgrades', 'cosmetics', 'achievements', 'settings',
    'inputMappings', 'campaignCheckpoint', 'lastCleanShutdown', 'integrityChecksum',
  ], 'profile');
  if (profile.profileSchemaVersion !== PROFILE_SCHEMA_VERSION) throw new Error('Unsupported profile schema version');
  verifyProfileIntegrity(profile);
  if (!Array.isArray(profile.levelProgress)) throw new Error('profile.levelProgress must be an array');
  const settings = object(profile.settings, 'profile.settings');
  exactKeys(settings, [
    'difficulty', 'language', 'masterVolume', 'musicVolume', 'effectsVolume', 'weaponsVolume', 'robotsVolume',
    'environmentVolume', 'interfaceVolume', 'voiceVolume', 'dynamicRange', 'mouseSensitivity', 'reducedMotion',
    'cameraMotion', 'recoilMotion', 'shakeMotion', 'flashIntensity', 'highContrast', 'renderQuality',
    'textScale', 'captions', 'photosensitivitySafe',
    'touchControlScale', 'touchControlOpacity', 'touchVerticalOffset', 'touchHandedness', 'touchDeadZone',
    'touchFireMode', 'sprintMode',
  ], 'profile.settings');
  const checkpoint = profile.campaignCheckpoint === null
    ? null
    : parseSimulationSnapshot(canonicalJson(profile.campaignCheckpoint));
  const unlockedLevelIds = strings(profile.unlockedLevelIds, 'profile.unlockedLevelIds');
  if (unlockedLevelIds.some((levelId) => !isCampaignLevelId(levelId))) {
    throw new Error('profile.unlockedLevelIds contains an unreserved campaign level ID');
  }
  const reducedMotion = booleanValue(settings.reducedMotion, 'profile.settings.reducedMotion');
  const cameraMotion = bounded(settings.cameraMotion, 'profile.settings.cameraMotion', 0, 1);
  const recoilMotion = bounded(settings.recoilMotion, 'profile.settings.recoilMotion', 0, 1);
  const shakeMotion = bounded(settings.shakeMotion, 'profile.settings.shakeMotion', 0, 1);
  const flashIntensity = bounded(settings.flashIntensity, 'profile.settings.flashIntensity', 0, 1);
  if (reducedMotion !== (cameraMotion === 0 && recoilMotion === 0 && shakeMotion === 0)) {
    throw new Error('profile.settings.reducedMotion does not match the three motion scales');
  }
  const result = sealProfile({
    profileSchemaVersion: 14,
    migrationHistory: strings(profile.migrationHistory, 'profile.migrationHistory'),
    profileId: text(profile.profileId, 'profile.profileId', 64),
    displayName: text(profile.displayName, 'profile.displayName', 64),
    unlockedLevelIds,
    levelProgress: profile.levelProgress.map(levelProgress),
    totalCoins: integer(profile.totalCoins, 'profile.totalCoins'),
    spendableCoins: integer(profile.spendableCoins, 'profile.spendableCoins'),
    weaponUpgrades: numericRecord(profile.weaponUpgrades, 'profile.weaponUpgrades'),
    playerUpgrades: normalizePlayerUpgradeLevels(numericRecord(profile.playerUpgrades, 'profile.playerUpgrades')),
    cosmetics: strings(profile.cosmetics, 'profile.cosmetics'),
    achievements: strings(profile.achievements, 'profile.achievements'),
    settings: {
      difficulty: profileDifficulty(settings.difficulty),
      language: text(settings.language, 'profile.settings.language', 16),
      masterVolume: bounded(settings.masterVolume, 'profile.settings.masterVolume', 0, 1),
      musicVolume: bounded(settings.musicVolume, 'profile.settings.musicVolume', 0, 1),
      effectsVolume: bounded(settings.effectsVolume, 'profile.settings.effectsVolume', 0, 1),
      weaponsVolume: bounded(settings.weaponsVolume, 'profile.settings.weaponsVolume', 0, 1),
      robotsVolume: bounded(settings.robotsVolume, 'profile.settings.robotsVolume', 0, 1),
      environmentVolume: bounded(settings.environmentVolume, 'profile.settings.environmentVolume', 0, 1),
      interfaceVolume: bounded(settings.interfaceVolume, 'profile.settings.interfaceVolume', 0, 1),
      voiceVolume: bounded(settings.voiceVolume, 'profile.settings.voiceVolume', 0, 1),
      dynamicRange: audioDynamicRange(settings.dynamicRange),
      mouseSensitivity: bounded(settings.mouseSensitivity, 'profile.settings.mouseSensitivity', 0.1, 5),
      reducedMotion,
      cameraMotion,
      recoilMotion,
      shakeMotion,
      flashIntensity,
      highContrast: booleanValue(settings.highContrast, 'profile.settings.highContrast'),
      renderQuality: normalizeRenderQuality(settings.renderQuality),
      textScale: bounded(settings.textScale, 'profile.settings.textScale', 0.8, 1.5),
      captions: booleanValue(settings.captions, 'profile.settings.captions'),
      photosensitivitySafe: booleanValue(settings.photosensitivitySafe, 'profile.settings.photosensitivitySafe'),
      touchControlScale: bounded(settings.touchControlScale, 'profile.settings.touchControlScale', 0.75, 1.5),
      touchControlOpacity: bounded(settings.touchControlOpacity, 'profile.settings.touchControlOpacity', 0.35, 1),
      touchVerticalOffset: bounded(settings.touchVerticalOffset, 'profile.settings.touchVerticalOffset', 0, 160),
      touchHandedness: touchHandedness(settings.touchHandedness),
      touchDeadZone: bounded(settings.touchDeadZone, 'profile.settings.touchDeadZone', 0.05, 0.4),
      touchFireMode: touchFireMode(settings.touchFireMode),
      sprintMode: sprintMode(settings.sprintMode),
    },
    inputMappings: stringRecord(profile.inputMappings, 'profile.inputMappings'),
    campaignCheckpoint: checkpoint,
    lastCleanShutdown: booleanValue(profile.lastCleanShutdown, 'profile.lastCleanShutdown'),
  });
  if (result.spendableCoins > result.totalCoins) throw new Error('Spendable coins cannot exceed total coins');
  normalizeWeaponUpgradeLevels(result.weaponUpgrades);
  if (new Set(result.unlockedLevelIds).size !== result.unlockedLevelIds.length) throw new Error('Unlocked level IDs must be unique');
  return result;
}

function migrateProfileV13(profile: Record<string, unknown>): ProfileV14 {
  exactKeys(profile, [
    'profileSchemaVersion', 'migrationHistory', 'profileId', 'displayName', 'unlockedLevelIds', 'levelProgress',
    'totalCoins', 'spendableCoins', 'weaponUpgrades', 'playerUpgrades', 'cosmetics', 'achievements', 'settings',
    'inputMappings', 'campaignCheckpoint', 'lastCleanShutdown', 'integrityChecksum',
  ], 'profile');
  verifyProfileIntegrity(profile);
  const { integrityChecksum: _integrityChecksum, ...legacyBody } = profile;
  const migratedBody = {
    ...legacyBody,
    profileSchemaVersion: 14 as const,
    migrationHistory: [...strings(profile.migrationHistory, 'profile.migrationHistory'), 'v13->v14:violet-shielder'],
    // Simulation schema v21 adds authoritative shield damage semantics, so v20 checkpoints cannot resume.
    campaignCheckpoint: null,
  };
  return validateProfileV14({ ...migratedBody, integrityChecksum: checksumCanonical(migratedBody) });
}

function migrateProfileV12(profile: Record<string, unknown>): ProfileV14 {
  exactKeys(profile, [
    'profileSchemaVersion', 'migrationHistory', 'profileId', 'displayName', 'unlockedLevelIds', 'levelProgress',
    'totalCoins', 'spendableCoins', 'weaponUpgrades', 'playerUpgrades', 'cosmetics', 'achievements', 'settings',
    'inputMappings', 'campaignCheckpoint', 'lastCleanShutdown', 'integrityChecksum',
  ], 'profile');
  verifyProfileIntegrity(profile);
  const { integrityChecksum: _integrityChecksum, ...legacyBody } = profile;
  const migratedBody = {
    ...legacyBody,
    profileSchemaVersion: 13 as const,
    migrationHistory: [...strings(profile.migrationHistory, 'profile.migrationHistory'), 'v12->v13:defense-objective'],
    // Simulation schema v20 adds authoritative defense-target state, so v19 checkpoints cannot resume.
    campaignCheckpoint: null,
  };
  return migrateProfileV13({ ...migratedBody, integrityChecksum: checksumCanonical(migratedBody) });
}

function migrateProfileV11(profile: Record<string, unknown>): ProfileV13 {
  exactKeys(profile, [
    'profileSchemaVersion', 'migrationHistory', 'profileId', 'displayName', 'unlockedLevelIds', 'levelProgress',
    'totalCoins', 'spendableCoins', 'weaponUpgrades', 'playerUpgrades', 'cosmetics', 'achievements', 'settings',
    'inputMappings', 'campaignCheckpoint', 'lastCleanShutdown', 'integrityChecksum',
  ], 'profile');
  verifyProfileIntegrity(profile);
  const inputMappings = stringRecord(profile.inputMappings, 'profile.inputMappings');
  const { integrityChecksum: _integrityChecksum, ...legacyBody } = profile;
  const migratedBody = {
    ...legacyBody,
    profileSchemaVersion: 12 as const,
    migrationHistory: [...strings(profile.migrationHistory, 'profile.migrationHistory'), 'v11->v12:dash-command'],
    inputMappings: { ...inputMappings, dash: inputMappings.dash ?? DEFAULT_INPUT_BINDINGS.dash },
    // Simulation schema v19 adds authoritative dash cooldown state, so v18 checkpoints cannot resume.
    campaignCheckpoint: null,
  };
  return migrateProfileV12({ ...migratedBody, integrityChecksum: checksumCanonical(migratedBody) });
}

function migrateProfileV10(profile: Record<string, unknown>): ProfileV12 {
  exactKeys(profile, [
    'profileSchemaVersion', 'migrationHistory', 'profileId', 'displayName', 'unlockedLevelIds', 'levelProgress',
    'totalCoins', 'spendableCoins', 'weaponUpgrades', 'playerUpgrades', 'cosmetics', 'achievements', 'settings',
    'inputMappings', 'campaignCheckpoint', 'lastCleanShutdown', 'integrityChecksum',
  ], 'profile');
  verifyProfileIntegrity(profile);
  const settings = object(profile.settings, 'profile.settings');
  exactKeys(settings, [
    'difficulty', 'language', 'masterVolume', 'musicVolume', 'effectsVolume', 'combatVolume', 'worldVolume',
    'interfaceVolume', 'dynamicRange', 'mouseSensitivity', 'reducedMotion',
    'cameraMotion', 'recoilMotion', 'shakeMotion', 'flashIntensity', 'highContrast', 'renderQuality',
    'textScale', 'captions', 'photosensitivitySafe',
    'touchControlScale', 'touchControlOpacity', 'touchVerticalOffset', 'touchHandedness', 'touchDeadZone',
    'touchFireMode', 'sprintMode',
  ], 'profile.settings');
  const combatVolume = bounded(settings.combatVolume, 'profile.settings.combatVolume', 0, 1);
  const worldVolume = bounded(settings.worldVolume, 'profile.settings.worldVolume', 0, 1);
  const interfaceVolume = bounded(settings.interfaceVolume, 'profile.settings.interfaceVolume', 0, 1);
  const { combatVolume: _combatVolume, worldVolume: _worldVolume, ...sharedSettings } = settings;
  const { integrityChecksum: _integrityChecksum, ...legacyBody } = profile;
  const migratedBody = {
    ...legacyBody,
    profileSchemaVersion: 11 as const,
    migrationHistory: [...strings(profile.migrationHistory, 'profile.migrationHistory'), 'v10->v11:granular-audio-buses'],
    settings: {
      ...sharedSettings,
      weaponsVolume: combatVolume,
      robotsVolume: combatVolume,
      environmentVolume: worldVolume,
      interfaceVolume,
      voiceVolume: worldVolume,
    },
  };
  return migrateProfileV11({ ...migratedBody, integrityChecksum: checksumCanonical(migratedBody) });
}

function migrateProfileV9(profile: Record<string, unknown>): ProfileV12 {
  exactKeys(profile, [
    'profileSchemaVersion', 'migrationHistory', 'profileId', 'displayName', 'unlockedLevelIds', 'levelProgress',
    'totalCoins', 'spendableCoins', 'weaponUpgrades', 'playerUpgrades', 'cosmetics', 'achievements', 'settings',
    'inputMappings', 'campaignCheckpoint', 'lastCleanShutdown', 'integrityChecksum',
  ], 'profile');
  verifyProfileIntegrity(profile);
  const playerUpgrades = normalizePlayerUpgradeLevels(
    numericRecord(profile.playerUpgrades, 'profile.playerUpgrades'),
  );
  const { integrityChecksum: _integrityChecksum, ...legacyBody } = profile;
  const migratedBody = {
    ...legacyBody,
    profileSchemaVersion: 10 as const,
    migrationHistory: [...strings(profile.migrationHistory, 'profile.migrationHistory'), 'v9->v10:player-upgrades'],
    playerUpgrades,
    campaignCheckpoint: null,
  };
  return migrateProfileV10({ ...migratedBody, integrityChecksum: checksumCanonical(migratedBody) });
}

function migrateProfileV8(profile: Record<string, unknown>): ProfileV12 {
  exactKeys(profile, [
    'profileSchemaVersion', 'migrationHistory', 'profileId', 'displayName', 'unlockedLevelIds', 'levelProgress',
    'totalCoins', 'spendableCoins', 'weaponUpgrades', 'playerUpgrades', 'cosmetics', 'achievements', 'settings',
    'inputMappings', 'campaignCheckpoint', 'lastCleanShutdown', 'integrityChecksum',
  ], 'profile');
  verifyProfileIntegrity(profile);
  const settings = object(profile.settings, 'profile.settings');
  const inputMappings = stringRecord(profile.inputMappings, 'profile.inputMappings');
  exactKeys(settings, [
    'difficulty', 'language', 'masterVolume', 'musicVolume', 'effectsVolume', 'combatVolume', 'worldVolume',
    'interfaceVolume', 'dynamicRange', 'mouseSensitivity', 'reducedMotion',
    'cameraMotion', 'recoilMotion', 'shakeMotion', 'flashIntensity', 'highContrast', 'renderQuality',
    'textScale', 'captions', 'photosensitivitySafe',
    'touchControlScale', 'touchControlOpacity', 'touchVerticalOffset', 'touchHandedness', 'touchDeadZone',
    'touchFireMode',
  ], 'profile.settings');
  const { integrityChecksum: _integrityChecksum, ...legacyBody } = profile;
  const migratedBody = {
    ...legacyBody,
    profileSchemaVersion: 9 as const,
    migrationHistory: [...strings(profile.migrationHistory, 'profile.migrationHistory'), 'v8->v9:sprint-controls'],
    settings: { ...settings, sprintMode: 'hold' as const },
    inputMappings: { ...inputMappings, sprint: inputMappings.sprint ?? DEFAULT_INPUT_BINDINGS.sprint },
    campaignCheckpoint: null,
  };
  return migrateProfileV9({ ...migratedBody, integrityChecksum: checksumCanonical(migratedBody) });
}

function migrateProfileV7(profile: Record<string, unknown>): ProfileV12 {
  exactKeys(profile, [
    'profileSchemaVersion', 'migrationHistory', 'profileId', 'displayName', 'unlockedLevelIds', 'levelProgress',
    'totalCoins', 'spendableCoins', 'weaponUpgrades', 'playerUpgrades', 'cosmetics', 'achievements', 'settings',
    'inputMappings', 'campaignCheckpoint', 'lastCleanShutdown', 'integrityChecksum',
  ], 'profile');
  verifyProfileIntegrity(profile);
  const settings = object(profile.settings, 'profile.settings');
  exactKeys(settings, [
    'language', 'masterVolume', 'musicVolume', 'effectsVolume', 'combatVolume', 'worldVolume',
    'interfaceVolume', 'dynamicRange', 'mouseSensitivity', 'reducedMotion',
    'cameraMotion', 'recoilMotion', 'shakeMotion', 'flashIntensity', 'highContrast', 'renderQuality',
    'textScale', 'captions', 'photosensitivitySafe',
    'touchControlScale', 'touchControlOpacity', 'touchVerticalOffset', 'touchHandedness', 'touchDeadZone',
    'touchFireMode',
  ], 'profile.settings');
  const { integrityChecksum: _integrityChecksum, ...legacyBody } = profile;
  const migratedBody = {
    ...legacyBody,
    profileSchemaVersion: 8 as const,
    migrationHistory: [...strings(profile.migrationHistory, 'profile.migrationHistory'), 'v7->v8:difficulty-selection'],
    settings: { ...settings, difficulty: 'standard' as const },
    campaignCheckpoint: null,
  };
  return migrateProfileV8({ ...migratedBody, integrityChecksum: checksumCanonical(migratedBody) });
}

function migrateProfileV6(profile: Record<string, unknown>): ProfileV12 {
  exactKeys(profile, [
    'profileSchemaVersion', 'migrationHistory', 'profileId', 'displayName', 'unlockedLevelIds', 'levelProgress',
    'totalCoins', 'spendableCoins', 'weaponUpgrades', 'playerUpgrades', 'cosmetics', 'achievements', 'settings',
    'inputMappings', 'campaignCheckpoint', 'lastCleanShutdown', 'integrityChecksum',
  ], 'profile');
  verifyProfileIntegrity(profile);
  if (!Array.isArray(profile.levelProgress)) throw new Error('profile.levelProgress must be an array');
  const settings = object(profile.settings, 'profile.settings');
  exactKeys(settings, [
    'language', 'masterVolume', 'musicVolume', 'effectsVolume', 'combatVolume', 'worldVolume',
    'interfaceVolume', 'dynamicRange', 'mouseSensitivity', 'reducedMotion', 'cameraMotion', 'recoilMotion',
    'shakeMotion', 'flashIntensity', 'highContrast', 'renderQuality', 'textScale', 'captions',
    'photosensitivitySafe', 'touchControlScale', 'touchControlOpacity', 'touchVerticalOffset',
    'touchHandedness', 'touchDeadZone', 'touchFireMode',
  ], 'profile.settings');
  const { integrityChecksum: _integrityChecksum, ...legacyBody } = profile;
  const migratedBody = {
    ...legacyBody,
    profileSchemaVersion: 7 as const,
    migrationHistory: [...strings(profile.migrationHistory, 'profile.migrationHistory'), 'v6->v7:complete-level-results'],
    levelProgress: profile.levelProgress.map((entry, index) => ({
      ...levelProgressV6(entry, index),
      bestScore: null,
      bestAccuracyPermille: null,
      leastDamageTaken: null,
      mostSecretsFound: 0,
      highestCombo: 0,
      lastResult: null,
    })),
  };
  return migrateProfileV7({ ...migratedBody, integrityChecksum: checksumCanonical(migratedBody) });
}

function migrateProfileV5(profile: Record<string, unknown>): ProfileV12 {
  exactKeys(profile, [
    'profileSchemaVersion', 'migrationHistory', 'profileId', 'displayName', 'unlockedLevelIds', 'levelProgress',
    'totalCoins', 'spendableCoins', 'weaponUpgrades', 'playerUpgrades', 'cosmetics', 'achievements', 'settings',
    'inputMappings', 'campaignCheckpoint', 'lastCleanShutdown', 'integrityChecksum',
  ], 'profile');
  verifyProfileIntegrity(profile);
  const settings = object(profile.settings, 'profile.settings');
  exactKeys(settings, [
    'language', 'masterVolume', 'musicVolume', 'effectsVolume', 'mouseSensitivity', 'reducedMotion',
    'cameraMotion', 'recoilMotion', 'shakeMotion', 'flashIntensity', 'highContrast', 'renderQuality',
    'textScale', 'captions', 'photosensitivitySafe', 'touchControlScale', 'touchControlOpacity',
    'touchVerticalOffset', 'touchHandedness', 'touchDeadZone', 'touchFireMode',
  ], 'profile.settings');
  const { integrityChecksum: _integrityChecksum, ...legacyBody } = profile;
  const migratedBody = {
    ...legacyBody,
    profileSchemaVersion: 6 as const,
    migrationHistory: [...strings(profile.migrationHistory, 'profile.migrationHistory'), 'v5->v6:audio-mix-accessibility'],
    settings: {
      ...settings,
      combatVolume: 1,
      worldVolume: 1,
      interfaceVolume: 1,
      dynamicRange: 'balanced' as const,
    },
  };
  return migrateProfileV6({ ...migratedBody, integrityChecksum: checksumCanonical(migratedBody) });
}

function migrateProfileV4(profile: Record<string, unknown>): ProfileV12 {
  exactKeys(profile, [
    'profileSchemaVersion', 'migrationHistory', 'profileId', 'displayName', 'unlockedLevelIds', 'levelProgress',
    'totalCoins', 'spendableCoins', 'weaponUpgrades', 'playerUpgrades', 'cosmetics', 'achievements', 'settings',
    'inputMappings', 'campaignCheckpoint', 'lastCleanShutdown', 'integrityChecksum',
  ], 'profile');
  verifyProfileIntegrity(profile);
  const settings = object(profile.settings, 'profile.settings');
  exactKeys(settings, [
    'language', 'masterVolume', 'musicVolume', 'effectsVolume', 'mouseSensitivity', 'reducedMotion',
    'cameraMotion', 'recoilMotion', 'shakeMotion', 'flashIntensity', 'highContrast', 'renderQuality',
    'textScale', 'captions', 'photosensitivitySafe',
  ], 'profile.settings');
  const { integrityChecksum: _integrityChecksum, ...legacyBody } = profile;
  const migratedBody = {
    ...legacyBody,
    profileSchemaVersion: 5 as const,
    migrationHistory: [...strings(profile.migrationHistory, 'profile.migrationHistory'), 'v4->v5:touch-control-accessibility'],
    settings: {
      ...settings,
      touchControlScale: 1,
      touchControlOpacity: 0.82,
      touchVerticalOffset: 0,
      touchHandedness: 'right' as const,
      touchDeadZone: 0.12,
      touchFireMode: 'hold' as const,
    },
  };
  return migrateProfileV5({ ...migratedBody, integrityChecksum: checksumCanonical(migratedBody) });
}

function migrateProfileV3(profile: Record<string, unknown>): ProfileV12 {
  exactKeys(profile, [
    'profileSchemaVersion', 'migrationHistory', 'profileId', 'displayName', 'unlockedLevelIds', 'levelProgress',
    'totalCoins', 'spendableCoins', 'weaponUpgrades', 'playerUpgrades', 'cosmetics', 'achievements', 'settings',
    'inputMappings', 'campaignCheckpoint', 'lastCleanShutdown', 'integrityChecksum',
  ], 'profile');
  verifyProfileIntegrity(profile);
  const settings = object(profile.settings, 'profile.settings');
  exactKeys(settings, [
    'language', 'masterVolume', 'musicVolume', 'effectsVolume', 'mouseSensitivity', 'reducedMotion',
    'cameraMotion', 'recoilMotion', 'shakeMotion', 'flashIntensity', 'highContrast', 'renderQuality',
  ], 'profile.settings');
  const { integrityChecksum: _integrityChecksum, ...legacyBody } = profile;
  const migratedBody = {
    ...legacyBody,
    profileSchemaVersion: 4 as const,
    migrationHistory: [...strings(profile.migrationHistory, 'profile.migrationHistory'), 'v3->v4:first-release-accessibility'],
    settings: { ...settings, textScale: 1, captions: true, photosensitivitySafe: false },
  };
  return migrateProfileV4({ ...migratedBody, integrityChecksum: checksumCanonical(migratedBody) });
}

function migrateProfileV2(profile: Record<string, unknown>): ProfileV12 {
  exactKeys(profile, [
    'profileSchemaVersion', 'migrationHistory', 'profileId', 'displayName', 'unlockedLevelIds', 'levelProgress',
    'totalCoins', 'spendableCoins', 'weaponUpgrades', 'playerUpgrades', 'cosmetics', 'achievements', 'settings',
    'inputMappings', 'campaignCheckpoint', 'lastCleanShutdown', 'integrityChecksum',
  ], 'profile');
  verifyProfileIntegrity(profile);
  const settings = object(profile.settings, 'profile.settings');
  exactKeys(settings, [
    'language', 'masterVolume', 'musicVolume', 'effectsVolume', 'mouseSensitivity', 'reducedMotion',
    'cameraMotion', 'recoilMotion', 'shakeMotion', 'flashIntensity', 'highContrast',
  ], 'profile.settings');
  const { integrityChecksum: _integrityChecksum, ...legacyBody } = profile;
  const migratedBody = {
    ...legacyBody,
    profileSchemaVersion: 3 as const,
    migrationHistory: [...strings(profile.migrationHistory, 'profile.migrationHistory'), 'v2->v3:render-quality-preference'],
    settings: { ...settings, renderQuality: 'auto' as const },
  };
  return migrateProfileV3({ ...migratedBody, integrityChecksum: checksumCanonical(migratedBody) });
}

function migrateProfileV1(profile: Record<string, unknown>): ProfileV12 {
  exactKeys(profile, [
    'profileSchemaVersion', 'migrationHistory', 'profileId', 'displayName', 'unlockedLevelIds', 'levelProgress',
    'totalCoins', 'spendableCoins', 'weaponUpgrades', 'playerUpgrades', 'cosmetics', 'achievements', 'settings',
    'inputMappings', 'campaignCheckpoint', 'lastCleanShutdown', 'integrityChecksum',
  ], 'profile');
  verifyProfileIntegrity(profile);
  const settings = object(profile.settings, 'profile.settings');
  exactKeys(settings, [
    'language', 'masterVolume', 'musicVolume', 'effectsVolume', 'mouseSensitivity', 'reducedMotion', 'highContrast',
  ], 'profile.settings');
  const reducedMotion = booleanValue(settings.reducedMotion, 'profile.settings.reducedMotion');
  const { integrityChecksum: _integrityChecksum, ...legacyBody } = profile;
  const migratedBody = {
    ...legacyBody,
    profileSchemaVersion: 2,
    migrationHistory: [...strings(profile.migrationHistory, 'profile.migrationHistory'), 'v1->v2:independent-motion-controls'],
    settings: {
      ...settings,
      cameraMotion: reducedMotion ? 0 : 1,
      recoilMotion: reducedMotion ? 0 : 1,
      shakeMotion: reducedMotion ? 0 : 1,
      flashIntensity: reducedMotion ? 0 : 1,
    },
  };
  return migrateProfileV2({ ...migratedBody, integrityChecksum: checksumCanonical(migratedBody) });
}

export function validateProfile(value: unknown): ProfileV14 {
  const profile = object(value, 'profile');
  if (typeof profile.profileSchemaVersion === 'number' && profile.profileSchemaVersion > PROFILE_SCHEMA_VERSION) {
    throw new Error(`Profile schema ${profile.profileSchemaVersion} is newer than supported schema ${PROFILE_SCHEMA_VERSION}`);
  }
  if (profile.profileSchemaVersion === 1) return migrateProfileV1(profile);
  if (profile.profileSchemaVersion === 2) return migrateProfileV2(profile);
  if (profile.profileSchemaVersion === 3) return migrateProfileV3(profile);
  if (profile.profileSchemaVersion === 4) return migrateProfileV4(profile);
  if (profile.profileSchemaVersion === 5) return migrateProfileV5(profile);
  if (profile.profileSchemaVersion === 6) return migrateProfileV6(profile);
  if (profile.profileSchemaVersion === 7) return migrateProfileV7(profile);
  if (profile.profileSchemaVersion === 8) return migrateProfileV8(profile);
  if (profile.profileSchemaVersion === 9) return migrateProfileV9(profile);
  if (profile.profileSchemaVersion === 10) return migrateProfileV10(profile);
  if (profile.profileSchemaVersion === 11) return migrateProfileV11(profile);
  if (profile.profileSchemaVersion === 12) return migrateProfileV12(profile);
  if (profile.profileSchemaVersion === 13) return migrateProfileV13(profile);
  return validateProfileV14(profile);
}

export function serializeProfile(profile: ProfileV14): string {
  return canonicalJson(validateProfile(profile));
}

export function parseProfile(serialized: string): ProfileV14 {
  return validateProfile(JSON.parse(serialized) as unknown);
}

export function updateProfile(profile: ProfileV14, changes: Partial<ProfileBodyV14>): ProfileV14 {
  return validateProfile(sealProfile({ ...profileBody(profile), ...changes }));
}
