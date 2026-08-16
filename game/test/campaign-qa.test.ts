import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runCampaignLevel, runChapter01CampaignQa } from '../src/qa/campaign-runner';
import { parseFrozenChecksumManifest } from '../src/qa/frozen-manifest';

const results = runChapter01CampaignQa();
const manifest = parseFrozenChecksumManifest(JSON.parse(readFileSync(
  new URL('../qa/frozen-checksum-manifest.json', import.meta.url), 'utf8',
)));

describe('one-command Chapter 1 campaign QA', () => {
  it('completes every declared live Standard run within its safety gates', () => {
    expect(results).toHaveLength(10);
    for (const result of results) {
      expect(result.failure, JSON.stringify(result)).toBeNull();
      expect(result.victory, JSON.stringify(result)).toBe(true);
      expect(result.defeat, JSON.stringify(result)).toBe(false);
      expect(result.remainingRobots, JSON.stringify(result)).toBe(0);
      expect(result.illegalActions, JSON.stringify(result)).toBe(0);
    }
  });

  it('repeats each final tick and checksum deterministically', () => {
    for (const result of results) {
      const repeated = runCampaignLevel(result.levelId);
      expect(repeated.finalTick, JSON.stringify(repeated)).toBe(result.finalTick);
      expect(repeated.checksum, JSON.stringify(repeated)).toBe(result.checksum);
    }
  });

  it('matches the six-level frozen checksum manifest and every replay dependency', () => {
    expect(manifest.levels.map((entry) => entry.levelId)).toEqual([
      'level-001', 'level-003', 'level-005', 'level-006', 'level-008', 'level-010',
    ]);
    for (const frozen of manifest.levels) {
      const result = results.find((candidate) => candidate.levelId === frozen.levelId)!;
      expect({
        levelId: result.levelId, seed: result.seed, finalTick: result.finalTick,
        checksum: result.checksum, dependencyHashes: result.dependencyHashes,
      }, frozen.levelId).toEqual(frozen);
    }
  });

  it('rejects malformed or silently extended frozen manifests', () => {
    expect(() => parseFrozenChecksumManifest({ ...manifest, surprise: true })).toThrow(/unknown or missing/);
    const invalid = structuredClone(manifest);
    (invalid.levels[0] as { checksum: string }).checksum = 'INVALID';
    expect(() => parseFrozenChecksumManifest(invalid)).toThrow(/lowercase hash/);
  });

  it('prints the canonical report for review tooling', () => {
    console.log(`CAMPAIGN_QA_REPORT=${JSON.stringify({ schemaVersion: 1, frozenSuiteVersion: manifest.suiteVersion, results })}`);
    expect(results.every((result) => /^[0-9a-f]{16}$/.test(result.checksum))).toBe(true);
  });
});
