import { isChapter01LevelId, type Chapter01LevelId } from '../content/level-ids';
import type { CampaignQaResult } from './campaign-runner';

type DependencyHashes = CampaignQaResult['dependencyHashes'];

export interface FrozenChecksumEntry {
  readonly levelId: Chapter01LevelId;
  readonly seed: string;
  readonly finalTick: number;
  readonly checksum: string;
  readonly dependencyHashes: DependencyHashes;
}

export interface FrozenChecksumManifest {
  readonly schemaVersion: 1;
  readonly suiteId: 'chapter-01-frozen-checksums';
  readonly suiteVersion: number;
  readonly policyId: 'baseline-campaign-agent';
  readonly policyVersion: 1;
  readonly levels: readonly FrozenChecksumEntry[];
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function exact(value: Record<string, unknown>, keys: readonly string[], label: string): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`${label} has unknown or missing fields`);
  }
}

function positiveInteger(value: unknown, label: string): number {
  if (!Number.isInteger(value) || (value as number) < 1) throw new Error(`${label} must be a positive integer`);
  return value as number;
}

function hash(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{16}$/.test(value)) throw new Error(`${label} must be a 16-digit lowercase hash`);
  return value;
}

function dependencies(value: unknown, label: string): DependencyHashes {
  const result = record(value, label);
  exact(result, ['simulationSchema', 'effectiveLevel', 'simulationLevel', 'balanceData', 'policyOrReplay'], label);
  return {
    simulationSchema: hash(result.simulationSchema, `${label}.simulationSchema`),
    effectiveLevel: hash(result.effectiveLevel, `${label}.effectiveLevel`),
    simulationLevel: hash(result.simulationLevel, `${label}.simulationLevel`),
    balanceData: hash(result.balanceData, `${label}.balanceData`),
    policyOrReplay: hash(result.policyOrReplay, `${label}.policyOrReplay`),
  };
}

export function parseFrozenChecksumManifest(value: unknown): FrozenChecksumManifest {
  const result = record(value, 'frozen checksum manifest');
  exact(result, ['schemaVersion', 'suiteId', 'suiteVersion', 'policyId', 'policyVersion', 'levels'], 'frozen checksum manifest');
  if (result.schemaVersion !== 1 || result.suiteId !== 'chapter-01-frozen-checksums'
    || result.policyId !== 'baseline-campaign-agent' || result.policyVersion !== 1) {
    throw new Error('frozen checksum manifest has an unsupported contract identity');
  }
  if (!Array.isArray(result.levels) || result.levels.length !== 6) {
    throw new Error('frozen checksum manifest must contain exactly six levels');
  }
  const levels = result.levels.map((valueEntry, index): FrozenChecksumEntry => {
    const entry = record(valueEntry, `frozen checksum manifest.levels[${index}]`);
    exact(entry, ['levelId', 'seed', 'finalTick', 'checksum', 'dependencyHashes'], `frozen checksum manifest.levels[${index}]`);
    if (typeof entry.levelId !== 'string' || !isChapter01LevelId(entry.levelId)) throw new Error(`frozen checksum manifest.levels[${index}].levelId is invalid`);
    if (typeof entry.seed !== 'string' || entry.seed.length === 0) throw new Error(`frozen checksum manifest.levels[${index}].seed is invalid`);
    return {
      levelId: entry.levelId, seed: entry.seed,
      finalTick: positiveInteger(entry.finalTick, `frozen checksum manifest.levels[${index}].finalTick`),
      checksum: hash(entry.checksum, `frozen checksum manifest.levels[${index}].checksum`),
      dependencyHashes: dependencies(entry.dependencyHashes, `frozen checksum manifest.levels[${index}].dependencyHashes`),
    };
  });
  if (new Set(levels.map((entry) => entry.levelId)).size !== levels.length) throw new Error('frozen checksum manifest level IDs must be unique');
  return {
    schemaVersion: 1, suiteId: 'chapter-01-frozen-checksums',
    suiteVersion: positiveInteger(result.suiteVersion, 'frozen checksum manifest.suiteVersion'),
    policyId: 'baseline-campaign-agent', policyVersion: 1, levels,
  };
}
