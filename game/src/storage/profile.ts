import { canonicalJson, checksumCanonical, parseSimulationSnapshot, type SimulationSnapshotV1 } from '../sim/serialization';
import { normalizeWeaponUpgradeLevels } from '../sim/weapons';

export const PROFILE_SCHEMA_VERSION = 1;

export interface LevelProgressV1 {
  readonly levelId: string;
  readonly completed: boolean;
  readonly medals: readonly string[];
  readonly bestTicks: number | null;
  readonly bestReplayId: string | null;
  readonly attempts: number;
  readonly defeats: number;
  readonly robotsDefeated: number;
}

export interface ProfileBodyV1 {
  readonly profileSchemaVersion: 1;
  readonly migrationHistory: readonly string[];
  readonly profileId: string;
  readonly displayName: string;
  readonly unlockedLevelIds: readonly string[];
  readonly levelProgress: readonly LevelProgressV1[];
  readonly totalCoins: number;
  readonly spendableCoins: number;
  readonly weaponUpgrades: Readonly<Record<string, number>>;
  readonly playerUpgrades: Readonly<Record<string, number>>;
  readonly cosmetics: readonly string[];
  readonly achievements: readonly string[];
  readonly settings: {
    readonly language: string;
    readonly masterVolume: number;
    readonly musicVolume: number;
    readonly effectsVolume: number;
    readonly mouseSensitivity: number;
    readonly reducedMotion: boolean;
    readonly highContrast: boolean;
  };
  readonly inputMappings: Readonly<Record<string, string>>;
  readonly campaignCheckpoint: SimulationSnapshotV1 | null;
  readonly lastCleanShutdown: boolean;
}

export interface ProfileV1 extends ProfileBodyV1 {
  readonly integrityChecksum: string;
}

function profileBody(profile: ProfileV1): ProfileBodyV1 {
  const { integrityChecksum: _integrityChecksum, ...body } = profile;
  return body;
}

export function sealProfile(body: ProfileBodyV1): ProfileV1 {
  return { ...body, integrityChecksum: checksumCanonical(body) };
}

export function createDefaultProfile(profileId = 'default', displayName = 'Ranger'): ProfileV1 {
  return sealProfile({
    profileSchemaVersion: PROFILE_SCHEMA_VERSION,
    migrationHistory: ['created:v1'],
    profileId,
    displayName,
    unlockedLevelIds: ['level-001'],
    levelProgress: [{
      levelId: 'level-001', completed: false, medals: [], bestTicks: null, bestReplayId: null,
      attempts: 0, defeats: 0, robotsDefeated: 0,
    }],
    totalCoins: 0,
    spendableCoins: 0,
    weaponUpgrades: { pulseDamage: 0, pulseEfficiency: 0, swordCooling: 0, bombCapacity: 0, laserCooling: 0 },
    playerUpgrades: { maxHealth: 0, maxEnergy: 0 },
    cosmetics: [],
    achievements: [],
    settings: {
      language: 'en', masterVolume: 1, musicVolume: 0.75, effectsVolume: 0.9,
      mouseSensitivity: 1, reducedMotion: false, highContrast: false,
    },
    inputMappings: { forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD', fire: 'Mouse0' },
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

function levelProgress(value: unknown, index: number): LevelProgressV1 {
  const progress = object(value, `levelProgress[${index}]`);
  exactKeys(progress, ['levelId', 'completed', 'medals', 'bestTicks', 'bestReplayId', 'attempts', 'defeats', 'robotsDefeated'], `levelProgress[${index}]`);
  const bestTicks = progress.bestTicks === null ? null : integer(progress.bestTicks, `levelProgress[${index}].bestTicks`);
  const bestReplayId = progress.bestReplayId === null ? null : text(progress.bestReplayId, `levelProgress[${index}].bestReplayId`, 128);
  return {
    levelId: text(progress.levelId, `levelProgress[${index}].levelId`, 64),
    completed: booleanValue(progress.completed, `levelProgress[${index}].completed`),
    medals: strings(progress.medals, `levelProgress[${index}].medals`),
    bestTicks,
    bestReplayId,
    attempts: integer(progress.attempts, `levelProgress[${index}].attempts`),
    defeats: integer(progress.defeats, `levelProgress[${index}].defeats`),
    robotsDefeated: integer(progress.robotsDefeated, `levelProgress[${index}].robotsDefeated`),
  };
}

export function validateProfile(value: unknown): ProfileV1 {
  const profile = object(value, 'profile');
  if (typeof profile.profileSchemaVersion === 'number' && profile.profileSchemaVersion > PROFILE_SCHEMA_VERSION) {
    throw new Error(`Profile schema ${profile.profileSchemaVersion} is newer than supported schema ${PROFILE_SCHEMA_VERSION}`);
  }
  exactKeys(profile, [
    'profileSchemaVersion', 'migrationHistory', 'profileId', 'displayName', 'unlockedLevelIds', 'levelProgress',
    'totalCoins', 'spendableCoins', 'weaponUpgrades', 'playerUpgrades', 'cosmetics', 'achievements', 'settings',
    'inputMappings', 'campaignCheckpoint', 'lastCleanShutdown', 'integrityChecksum',
  ], 'profile');
  if (profile.profileSchemaVersion !== PROFILE_SCHEMA_VERSION) throw new Error('Unsupported profile schema version');
  if (typeof profile.integrityChecksum !== 'string' || !/^[0-9a-f]{16}$/.test(profile.integrityChecksum)) throw new Error('Profile integrity checksum is invalid');
  const sourceBody = { ...profile };
  delete sourceBody.integrityChecksum;
  const expectedChecksum = checksumCanonical(sourceBody);
  if (profile.integrityChecksum !== expectedChecksum) throw new Error('Profile integrity checksum mismatch');
  if (!Array.isArray(profile.levelProgress)) throw new Error('profile.levelProgress must be an array');
  const settings = object(profile.settings, 'profile.settings');
  exactKeys(settings, ['language', 'masterVolume', 'musicVolume', 'effectsVolume', 'mouseSensitivity', 'reducedMotion', 'highContrast'], 'profile.settings');
  const checkpoint = profile.campaignCheckpoint === null
    ? null
    : parseSimulationSnapshot(canonicalJson(profile.campaignCheckpoint));
  const result = sealProfile({
    profileSchemaVersion: 1,
    migrationHistory: strings(profile.migrationHistory, 'profile.migrationHistory'),
    profileId: text(profile.profileId, 'profile.profileId', 64),
    displayName: text(profile.displayName, 'profile.displayName', 64),
    unlockedLevelIds: strings(profile.unlockedLevelIds, 'profile.unlockedLevelIds'),
    levelProgress: profile.levelProgress.map(levelProgress),
    totalCoins: integer(profile.totalCoins, 'profile.totalCoins'),
    spendableCoins: integer(profile.spendableCoins, 'profile.spendableCoins'),
    weaponUpgrades: numericRecord(profile.weaponUpgrades, 'profile.weaponUpgrades'),
    playerUpgrades: numericRecord(profile.playerUpgrades, 'profile.playerUpgrades'),
    cosmetics: strings(profile.cosmetics, 'profile.cosmetics'),
    achievements: strings(profile.achievements, 'profile.achievements'),
    settings: {
      language: text(settings.language, 'profile.settings.language', 16),
      masterVolume: bounded(settings.masterVolume, 'profile.settings.masterVolume', 0, 1),
      musicVolume: bounded(settings.musicVolume, 'profile.settings.musicVolume', 0, 1),
      effectsVolume: bounded(settings.effectsVolume, 'profile.settings.effectsVolume', 0, 1),
      mouseSensitivity: bounded(settings.mouseSensitivity, 'profile.settings.mouseSensitivity', 0.1, 5),
      reducedMotion: booleanValue(settings.reducedMotion, 'profile.settings.reducedMotion'),
      highContrast: booleanValue(settings.highContrast, 'profile.settings.highContrast'),
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

export function serializeProfile(profile: ProfileV1): string {
  return canonicalJson(validateProfile(profile));
}

export function parseProfile(serialized: string): ProfileV1 {
  return validateProfile(JSON.parse(serialized) as unknown);
}

export function updateProfile(profile: ProfileV1, changes: Partial<ProfileBodyV1>): ProfileV1 {
  return validateProfile(sealProfile({ ...profileBody(profile), ...changes }));
}
