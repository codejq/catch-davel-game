import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseProfile, serializeProfile } from '../src/storage/profile';
import { checksumCanonical } from '../src/sim/serialization';

describe('profile schema migrations', () => {
  it('verifies and migrates the frozen v1 fixture through v2 into the v3 quality contract', () => {
    const fixture = readFileSync(new URL('./fixtures/profile-v1.json', import.meta.url), 'utf8');
    const migrated = parseProfile(fixture);
    expect(migrated).toMatchObject({
      profileSchemaVersion: 3,
      profileId: 'migration-v1',
      totalCoins: 12,
      spendableCoins: 7,
      settings: {
        language: 'ar', reducedMotion: true, cameraMotion: 0, recoilMotion: 0, shakeMotion: 0, flashIntensity: 0,
        renderQuality: 'auto',
      },
    });
    expect(migrated.migrationHistory).toEqual([
      'created:v1', 'v1->v2:independent-motion-controls', 'v2->v3:render-quality-preference',
    ]);
    expect(parseProfile(serializeProfile(migrated))).toEqual(migrated);
    const corrupted = JSON.parse(fixture) as Record<string, unknown>;
    corrupted.totalCoins = 99;
    expect(() => parseProfile(JSON.stringify(corrupted))).toThrow(/checksum mismatch/);
  });

  it('maps an enabled v1 presentation profile to full independent motion scales', () => {
    const legacy = JSON.parse(readFileSync(new URL('./fixtures/profile-v1.json', import.meta.url), 'utf8')) as Record<string, unknown>;
    const settings = legacy.settings as Record<string, unknown>;
    settings.reducedMotion = false;
    delete legacy.integrityChecksum;
    legacy.integrityChecksum = checksumCanonical(legacy);
    expect(parseProfile(JSON.stringify(legacy)).settings).toMatchObject({
      reducedMotion: false, cameraMotion: 1, recoilMotion: 1, shakeMotion: 1, flashIntensity: 1,
    });
  });

  it('verifies and migrates the frozen v2 fixture without altering prior settings', () => {
    const fixture = readFileSync(new URL('./fixtures/profile-v2.json', import.meta.url), 'utf8');
    const migrated = parseProfile(fixture);
    expect(migrated.profileSchemaVersion).toBe(3);
    expect(migrated.settings).toMatchObject({
      language: 'ar', reducedMotion: true, cameraMotion: 0, flashIntensity: 0, renderQuality: 'auto',
    });
    expect(migrated.migrationHistory.at(-1)).toBe('v2->v3:render-quality-preference');
    const corrupted = JSON.parse(fixture) as Record<string, unknown>;
    corrupted.spendableCoins = 6;
    expect(() => parseProfile(JSON.stringify(corrupted))).toThrow(/checksum mismatch/);
  });

  it('rejects inconsistent legacy reduced-motion presets even with a recomputed checksum', () => {
    const migrated = parseProfile(readFileSync(new URL('./fixtures/profile-v1.json', import.meta.url), 'utf8'));
    const inconsistent = JSON.parse(serializeProfile(migrated)) as Record<string, unknown>;
    (inconsistent.settings as Record<string, unknown>).cameraMotion = 1;
    delete inconsistent.integrityChecksum;
    inconsistent.integrityChecksum = checksumCanonical(inconsistent);
    expect(() => parseProfile(JSON.stringify(inconsistent))).toThrow(/does not match/);
  });
});
