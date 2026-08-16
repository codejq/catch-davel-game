import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createDefaultProfile, parseProfile, serializeProfile } from '../src/storage/profile';
import { checksumCanonical } from '../src/sim/serialization';

describe('profile schema migrations', () => {
  it('verifies and migrates the frozen v1 fixture through every released profile contract', () => {
    const fixture = readFileSync(new URL('./fixtures/profile-v1.json', import.meta.url), 'utf8');
    const migrated = parseProfile(fixture);
    expect(migrated).toMatchObject({
      profileSchemaVersion: 9,
      profileId: 'migration-v1',
      totalCoins: 12,
      spendableCoins: 7,
      settings: {
        language: 'ar', reducedMotion: true, cameraMotion: 0, recoilMotion: 0, shakeMotion: 0, flashIntensity: 0,
        renderQuality: 'auto', textScale: 1, captions: true, photosensitivitySafe: false,
        touchControlScale: 1, touchControlOpacity: 0.82, touchVerticalOffset: 0,
        touchHandedness: 'right', touchDeadZone: 0.12, touchFireMode: 'hold',
        combatVolume: 1, worldVolume: 1, interfaceVolume: 1, dynamicRange: 'balanced', difficulty: 'standard',
        sprintMode: 'hold',
      },
    });
    expect(migrated.migrationHistory).toEqual([
      'created:v1', 'v1->v2:independent-motion-controls', 'v2->v3:render-quality-preference',
      'v3->v4:first-release-accessibility', 'v4->v5:touch-control-accessibility',
      'v5->v6:audio-mix-accessibility', 'v6->v7:complete-level-results', 'v7->v8:difficulty-selection',
      'v8->v9:sprint-controls',
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
    expect(migrated.profileSchemaVersion).toBe(9);
    expect(migrated.settings).toMatchObject({
      language: 'ar', reducedMotion: true, cameraMotion: 0, flashIntensity: 0, renderQuality: 'auto', difficulty: 'standard',
    });
    expect(migrated.settings.sprintMode).toBe('hold');
    expect(migrated.migrationHistory.slice(-7)).toEqual([
      'v2->v3:render-quality-preference', 'v3->v4:first-release-accessibility',
      'v4->v5:touch-control-accessibility', 'v5->v6:audio-mix-accessibility',
      'v6->v7:complete-level-results', 'v7->v8:difficulty-selection', 'v8->v9:sprint-controls',
    ]);
    const corrupted = JSON.parse(fixture) as Record<string, unknown>;
    corrupted.spendableCoins = 6;
    expect(() => parseProfile(JSON.stringify(corrupted))).toThrow(/checksum mismatch/);
  });

  it('verifies and migrates the frozen v3 fixture into first-release accessibility settings', () => {
    const fixture = readFileSync(new URL('./fixtures/profile-v3.json', import.meta.url), 'utf8');
    const migrated = parseProfile(fixture);
    expect(migrated.profileSchemaVersion).toBe(9);
    expect(migrated.settings).toMatchObject({
      renderQuality: 'auto', textScale: 1, captions: true, photosensitivitySafe: false, difficulty: 'standard',
    });
    expect(migrated.settings.sprintMode).toBe('hold');
    expect(migrated.migrationHistory.slice(-6)).toEqual([
      'v3->v4:first-release-accessibility', 'v4->v5:touch-control-accessibility',
      'v5->v6:audio-mix-accessibility', 'v6->v7:complete-level-results', 'v7->v8:difficulty-selection',
      'v8->v9:sprint-controls',
    ]);
    const corrupted = JSON.parse(fixture) as Record<string, unknown>;
    (corrupted.settings as Record<string, unknown>).renderQuality = 'high';
    expect(() => parseProfile(JSON.stringify(corrupted))).toThrow(/checksum mismatch/);
  });

  it('verifies and migrates the frozen v4 fixture into touch-control accessibility settings', () => {
    const fixture = readFileSync(new URL('./fixtures/profile-v4.json', import.meta.url), 'utf8');
    const migrated = parseProfile(fixture);
    expect(migrated.profileSchemaVersion).toBe(9);
    expect(migrated.settings).toMatchObject({
      language: 'ar', textScale: 1.2, captions: false, photosensitivitySafe: true,
      touchControlScale: 1, touchControlOpacity: 0.82, touchVerticalOffset: 0,
      touchHandedness: 'right', touchDeadZone: 0.12, touchFireMode: 'hold', difficulty: 'standard',
    });
    expect(migrated.settings.sprintMode).toBe('hold');
    expect(migrated.migrationHistory.slice(-5)).toEqual([
      'v4->v5:touch-control-accessibility', 'v5->v6:audio-mix-accessibility',
      'v6->v7:complete-level-results', 'v7->v8:difficulty-selection', 'v8->v9:sprint-controls',
    ]);
    const corrupted = JSON.parse(fixture) as Record<string, unknown>;
    (corrupted.settings as Record<string, unknown>).touchControlScale = 1.5;
    expect(() => parseProfile(JSON.stringify(corrupted))).toThrow(/checksum mismatch/);
  });

  it('verifies and migrates the frozen v5 fixture into independent audio buses', () => {
    const fixture = readFileSync(new URL('./fixtures/profile-v5.json', import.meta.url), 'utf8');
    const migrated = parseProfile(fixture);
    expect(migrated.profileSchemaVersion).toBe(9);
    expect(migrated.settings).toMatchObject({
      language: 'ar', touchControlScale: 1.25, touchControlOpacity: 0.7, touchVerticalOffset: 48,
      touchHandedness: 'left', touchDeadZone: 0.2, touchFireMode: 'toggle',
      combatVolume: 1, worldVolume: 1, interfaceVolume: 1, dynamicRange: 'balanced', difficulty: 'standard',
    });
    expect(migrated.settings.sprintMode).toBe('hold');
    expect(migrated.migrationHistory.slice(-4)).toEqual([
      'v5->v6:audio-mix-accessibility', 'v6->v7:complete-level-results', 'v7->v8:difficulty-selection',
      'v8->v9:sprint-controls',
    ]);
    const corrupted = JSON.parse(fixture) as Record<string, unknown>;
    (corrupted.settings as Record<string, unknown>).effectsVolume = 0.2;
    expect(() => parseProfile(JSON.stringify(corrupted))).toThrow(/checksum mismatch/);
  });

  it('migrates the frozen v6 profile into complete level-result storage', () => {
    const fixture = readFileSync(new URL('./fixtures/profile-v6.json', import.meta.url), 'utf8');
    const migrated = parseProfile(fixture);
    expect(migrated).toMatchObject({
      profileSchemaVersion: 9,
      profileId: 'migration-v6',
      settings: { language: 'ar', combatVolume: 0.6, worldVolume: 0.7, interfaceVolume: 0.8, difficulty: 'standard', sprintMode: 'hold' },
      levelProgress: [{
        bestScore: null, bestAccuracyPermille: null, leastDamageTaken: null,
        mostSecretsFound: 0, highestCombo: 0, lastResult: null,
      }],
    });
    expect(migrated.migrationHistory).toEqual([
      'created:v6', 'v6->v7:complete-level-results', 'v7->v8:difficulty-selection', 'v8->v9:sprint-controls',
    ]);
    expect(parseProfile(serializeProfile(migrated))).toEqual(migrated);
  });

  it('migrates an integrity-checked v7 profile and deliberately clears its incompatible checkpoint', () => {
    const current = createDefaultProfile('migration-v7');
    const { integrityChecksum: _checksum, ...currentBody } = current;
    const { difficulty: _difficulty, sprintMode: _sprintMode, ...legacySettings } = currentBody.settings;
    const legacyBody = {
      ...currentBody,
      profileSchemaVersion: 7,
      migrationHistory: ['created:v7'],
      settings: legacySettings,
      campaignCheckpoint: { obsoleteSimulationSchema: 14 },
    };
    const migrated = parseProfile(JSON.stringify({
      ...legacyBody, integrityChecksum: checksumCanonical(legacyBody),
    }));
    expect(migrated).toMatchObject({
      profileSchemaVersion: 9,
      settings: { difficulty: 'standard', sprintMode: 'hold' },
      campaignCheckpoint: null,
      migrationHistory: ['created:v7', 'v7->v8:difficulty-selection', 'v8->v9:sprint-controls'],
    });
  });

  it('migrates an integrity-checked v8 profile and clears its schema-16 checkpoint', () => {
    const current = createDefaultProfile('migration-v8');
    const { integrityChecksum: _checksum, ...currentBody } = current;
    const { sprintMode: _sprintMode, ...legacySettings } = currentBody.settings;
    const legacyBody = {
      ...currentBody,
      profileSchemaVersion: 8,
      migrationHistory: ['created:v8'],
      settings: legacySettings,
      campaignCheckpoint: { obsoleteSimulationSchema: 16 },
    };
    const migrated = parseProfile(JSON.stringify({
      ...legacyBody, integrityChecksum: checksumCanonical(legacyBody),
    }));
    expect(migrated).toMatchObject({
      profileSchemaVersion: 9,
      settings: { sprintMode: 'hold' },
      inputMappings: { sprint: 'ShiftLeft' },
      campaignCheckpoint: null,
      migrationHistory: ['created:v8', 'v8->v9:sprint-controls'],
    });
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
