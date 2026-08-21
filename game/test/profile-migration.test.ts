import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../src/sim/game';
import { createDefaultProfile, parseProfile, serializeProfile } from '../src/storage/profile';
import { checksumCanonical, createSimulationSnapshot } from '../src/sim/serialization';

function legacyGroupedAudioSettings(settings: ReturnType<typeof createDefaultProfile>['settings']) {
  const {
    weaponsVolume, robotsVolume: _robotsVolume, environmentVolume, voiceVolume: _voiceVolume, ...shared
  } = settings;
  return { ...shared, combatVolume: weaponsVolume, worldVolume: environmentVolume };
}

describe('profile schema migrations', () => {
  it('verifies and migrates the frozen v1 fixture through every released profile contract', () => {
    const fixture = readFileSync(new URL('./fixtures/profile-v1.json', import.meta.url), 'utf8');
    const migrated = parseProfile(fixture);
    expect(migrated).toMatchObject({
      profileSchemaVersion: 15,
      profileId: 'migration-v1',
      totalCoins: 12,
      spendableCoins: 7,
      settings: {
        language: 'ar', reducedMotion: true, cameraMotion: 0, recoilMotion: 0, shakeMotion: 0, flashIntensity: 0,
        renderQuality: 'auto', textScale: 1, captions: true, photosensitivitySafe: false,
        touchControlScale: 1, touchControlOpacity: 0.82, touchVerticalOffset: 0,
        touchHandedness: 'right', touchDeadZone: 0.12, touchFireMode: 'hold',
        weaponsVolume: 1, robotsVolume: 1, environmentVolume: 1, interfaceVolume: 1, voiceVolume: 1,
        dynamicRange: 'balanced', difficulty: 'standard',
        sprintMode: 'hold',
      },
    });
    expect(migrated.migrationHistory).toEqual([
      'created:v1', 'v1->v2:independent-motion-controls', 'v2->v3:render-quality-preference',
      'v3->v4:first-release-accessibility', 'v4->v5:touch-control-accessibility',
      'v5->v6:audio-mix-accessibility', 'v6->v7:complete-level-results', 'v7->v8:difficulty-selection',
      'v8->v9:sprint-controls', 'v9->v10:player-upgrades', 'v10->v11:granular-audio-buses',
      'v11->v12:dash-command', 'v12->v13:defense-objective', 'v13->v14:violet-shielder', 'v14->v15:arrow-key-defaults',
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
    expect(migrated.profileSchemaVersion).toBe(15);
    expect(migrated.settings).toMatchObject({
      language: 'ar', reducedMotion: true, cameraMotion: 0, flashIntensity: 0, renderQuality: 'auto', difficulty: 'standard',
    });
    expect(migrated.settings.sprintMode).toBe('hold');
    expect(migrated.migrationHistory.slice(-13)).toEqual([
      'v2->v3:render-quality-preference', 'v3->v4:first-release-accessibility',
      'v4->v5:touch-control-accessibility', 'v5->v6:audio-mix-accessibility',
      'v6->v7:complete-level-results', 'v7->v8:difficulty-selection', 'v8->v9:sprint-controls',
      'v9->v10:player-upgrades', 'v10->v11:granular-audio-buses', 'v11->v12:dash-command',
      'v12->v13:defense-objective', 'v13->v14:violet-shielder', 'v14->v15:arrow-key-defaults',
    ]);
    const corrupted = JSON.parse(fixture) as Record<string, unknown>;
    corrupted.spendableCoins = 6;
    expect(() => parseProfile(JSON.stringify(corrupted))).toThrow(/checksum mismatch/);
  });

  it('verifies and migrates the frozen v3 fixture into first-release accessibility settings', () => {
    const fixture = readFileSync(new URL('./fixtures/profile-v3.json', import.meta.url), 'utf8');
    const migrated = parseProfile(fixture);
    expect(migrated.profileSchemaVersion).toBe(15);
    expect(migrated.settings).toMatchObject({
      renderQuality: 'auto', textScale: 1, captions: true, photosensitivitySafe: false, difficulty: 'standard',
    });
    expect(migrated.settings.sprintMode).toBe('hold');
    expect(migrated.migrationHistory.slice(-12)).toEqual([
      'v3->v4:first-release-accessibility', 'v4->v5:touch-control-accessibility',
      'v5->v6:audio-mix-accessibility', 'v6->v7:complete-level-results', 'v7->v8:difficulty-selection',
      'v8->v9:sprint-controls', 'v9->v10:player-upgrades', 'v10->v11:granular-audio-buses',
      'v11->v12:dash-command', 'v12->v13:defense-objective', 'v13->v14:violet-shielder', 'v14->v15:arrow-key-defaults',
    ]);
    const corrupted = JSON.parse(fixture) as Record<string, unknown>;
    (corrupted.settings as Record<string, unknown>).renderQuality = 'high';
    expect(() => parseProfile(JSON.stringify(corrupted))).toThrow(/checksum mismatch/);
  });

  it('verifies and migrates the frozen v4 fixture into touch-control accessibility settings', () => {
    const fixture = readFileSync(new URL('./fixtures/profile-v4.json', import.meta.url), 'utf8');
    const migrated = parseProfile(fixture);
    expect(migrated.profileSchemaVersion).toBe(15);
    expect(migrated.settings).toMatchObject({
      language: 'ar', textScale: 1.2, captions: false, photosensitivitySafe: true,
      touchControlScale: 1, touchControlOpacity: 0.82, touchVerticalOffset: 0,
      touchHandedness: 'right', touchDeadZone: 0.12, touchFireMode: 'hold', difficulty: 'standard',
    });
    expect(migrated.settings.sprintMode).toBe('hold');
    expect(migrated.migrationHistory.slice(-11)).toEqual([
      'v4->v5:touch-control-accessibility', 'v5->v6:audio-mix-accessibility',
      'v6->v7:complete-level-results', 'v7->v8:difficulty-selection', 'v8->v9:sprint-controls',
      'v9->v10:player-upgrades', 'v10->v11:granular-audio-buses', 'v11->v12:dash-command',
      'v12->v13:defense-objective', 'v13->v14:violet-shielder', 'v14->v15:arrow-key-defaults',
    ]);
    const corrupted = JSON.parse(fixture) as Record<string, unknown>;
    (corrupted.settings as Record<string, unknown>).touchControlScale = 1.5;
    expect(() => parseProfile(JSON.stringify(corrupted))).toThrow(/checksum mismatch/);
  });

  it('verifies and migrates the frozen v5 fixture into independent audio buses', () => {
    const fixture = readFileSync(new URL('./fixtures/profile-v5.json', import.meta.url), 'utf8');
    const migrated = parseProfile(fixture);
    expect(migrated.profileSchemaVersion).toBe(15);
    expect(migrated.settings).toMatchObject({
      language: 'ar', touchControlScale: 1.25, touchControlOpacity: 0.7, touchVerticalOffset: 48,
      touchHandedness: 'left', touchDeadZone: 0.2, touchFireMode: 'toggle',
      weaponsVolume: 1, robotsVolume: 1, environmentVolume: 1, interfaceVolume: 1, voiceVolume: 1,
      dynamicRange: 'balanced', difficulty: 'standard',
    });
    expect(migrated.settings.sprintMode).toBe('hold');
    expect(migrated.migrationHistory.slice(-10)).toEqual([
      'v5->v6:audio-mix-accessibility', 'v6->v7:complete-level-results', 'v7->v8:difficulty-selection',
      'v8->v9:sprint-controls', 'v9->v10:player-upgrades', 'v10->v11:granular-audio-buses',
      'v11->v12:dash-command', 'v12->v13:defense-objective', 'v13->v14:violet-shielder', 'v14->v15:arrow-key-defaults',
    ]);
    const corrupted = JSON.parse(fixture) as Record<string, unknown>;
    (corrupted.settings as Record<string, unknown>).effectsVolume = 0.2;
    expect(() => parseProfile(JSON.stringify(corrupted))).toThrow(/checksum mismatch/);
  });

  it('migrates the frozen v6 profile into complete level-result storage', () => {
    const fixture = readFileSync(new URL('./fixtures/profile-v6.json', import.meta.url), 'utf8');
    const migrated = parseProfile(fixture);
    expect(migrated).toMatchObject({
      profileSchemaVersion: 15,
      profileId: 'migration-v6',
      settings: {
        language: 'ar', weaponsVolume: 0.6, robotsVolume: 0.6, environmentVolume: 0.7,
        interfaceVolume: 0.8, voiceVolume: 0.7, difficulty: 'standard', sprintMode: 'hold',
      },
      levelProgress: [{
        bestScore: null, bestAccuracyPermille: null, leastDamageTaken: null,
        mostSecretsFound: 0, highestCombo: 0, lastResult: null,
      }],
    });
    expect(migrated.migrationHistory).toEqual([
      'created:v6', 'v6->v7:complete-level-results', 'v7->v8:difficulty-selection', 'v8->v9:sprint-controls',
      'v9->v10:player-upgrades', 'v10->v11:granular-audio-buses', 'v11->v12:dash-command',
      'v12->v13:defense-objective', 'v13->v14:violet-shielder', 'v14->v15:arrow-key-defaults',
    ]);
    expect(parseProfile(serializeProfile(migrated))).toEqual(migrated);
  });

  it('migrates an integrity-checked v7 profile and deliberately clears its incompatible checkpoint', () => {
    const current = createDefaultProfile('migration-v7');
    const { integrityChecksum: _checksum, ...currentBody } = current;
    const groupedSettings = legacyGroupedAudioSettings(currentBody.settings);
    const { difficulty: _difficulty, sprintMode: _sprintMode, ...legacySettings } = groupedSettings;
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
      profileSchemaVersion: 15,
      settings: { difficulty: 'standard', sprintMode: 'hold' },
      campaignCheckpoint: null,
      migrationHistory: [
        'created:v7', 'v7->v8:difficulty-selection', 'v8->v9:sprint-controls', 'v9->v10:player-upgrades',
        'v10->v11:granular-audio-buses', 'v11->v12:dash-command', 'v12->v13:defense-objective', 'v13->v14:violet-shielder', 'v14->v15:arrow-key-defaults',
      ],
    });
  });

  it('migrates an integrity-checked v8 profile and clears its schema-16 checkpoint', () => {
    const current = createDefaultProfile('migration-v8');
    const { integrityChecksum: _checksum, ...currentBody } = current;
    const groupedSettings = legacyGroupedAudioSettings(currentBody.settings);
    const { sprintMode: _sprintMode, ...legacySettings } = groupedSettings;
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
      profileSchemaVersion: 15,
      settings: { sprintMode: 'hold' },
      inputMappings: { sprint: 'ShiftLeft' },
      campaignCheckpoint: null,
      migrationHistory: [
        'created:v8', 'v8->v9:sprint-controls', 'v9->v10:player-upgrades',
        'v10->v11:granular-audio-buses', 'v11->v12:dash-command', 'v12->v13:defense-objective', 'v13->v14:violet-shielder', 'v14->v15:arrow-key-defaults',
      ],
    });
  });

  it('migrates v9 upgrade storage into the bounded authoritative player-upgrade contract', () => {
    const current = createDefaultProfile('migration-v9');
    const { integrityChecksum: _checksum, ...currentBody } = current;
    const legacyBody = {
      ...currentBody,
      profileSchemaVersion: 9,
      migrationHistory: ['created:v9'],
      settings: legacyGroupedAudioSettings(currentBody.settings),
      playerUpgrades: { maxHealth: 2, maxEnergy: 1 },
      campaignCheckpoint: { obsoleteSimulationSchema: 17 },
    };
    const migrated = parseProfile(JSON.stringify({
      ...legacyBody, integrityChecksum: checksumCanonical(legacyBody),
    }));
    expect(migrated).toMatchObject({
      profileSchemaVersion: 15,
      playerUpgrades: { maxHealth: 2, maxEnergy: 1 },
      campaignCheckpoint: null,
      migrationHistory: [
        'created:v9', 'v9->v10:player-upgrades', 'v10->v11:granular-audio-buses', 'v11->v12:dash-command',
        'v12->v13:defense-objective', 'v13->v14:violet-shielder', 'v14->v15:arrow-key-defaults',
      ],
    });
  });

  it('maps grouped v10 audio settings, then clears its incompatible checkpoints through v13', () => {
    const current = createDefaultProfile('migration-v10');
    const { integrityChecksum: _checksum, ...currentBody } = current;
    const checkpoint = createSimulationSnapshot(new GameSimulation('profile-v10-audio-migration').state);
    const legacySettings = {
      ...legacyGroupedAudioSettings(currentBody.settings),
      combatVolume: 0.35,
      worldVolume: 0.55,
      interfaceVolume: 0.75,
    };
    const legacyBody = {
      ...currentBody,
      profileSchemaVersion: 10,
      migrationHistory: ['created:v10'],
      settings: legacySettings,
      campaignCheckpoint: checkpoint,
    };
    const migrated = parseProfile(JSON.stringify({
      ...legacyBody, integrityChecksum: checksumCanonical(legacyBody),
    }));
    expect(migrated).toMatchObject({
      profileSchemaVersion: 15,
      settings: {
        weaponsVolume: 0.35,
        robotsVolume: 0.35,
        environmentVolume: 0.55,
        interfaceVolume: 0.75,
        voiceVolume: 0.55,
      },
      campaignCheckpoint: null,
      migrationHistory: [
        'created:v10', 'v10->v11:granular-audio-buses', 'v11->v12:dash-command',
        'v12->v13:defense-objective', 'v13->v14:violet-shielder', 'v14->v15:arrow-key-defaults',
      ],
    });
    expect(migrated.campaignCheckpoint).toBeNull();

    expect(migrated.inputMappings.dash).toBe('Space');

    const invalidBody = {
      ...legacyBody,
      settings: { ...legacySettings, combatVolume: 1.01 },
    };
    expect(() => parseProfile(JSON.stringify({
      ...invalidBody, integrityChecksum: checksumCanonical(invalidBody),
    }))).toThrow(/outside bounds/);
  });

  it('adds the dash binding and clears a v11 simulation checkpoint', () => {
    const current = createDefaultProfile('migration-v11');
    const { integrityChecksum: _checksum, ...currentBody } = current;
    const { dash: _dash, ...legacyInputMappings } = currentBody.inputMappings;
    const legacyBody = {
      ...currentBody,
      profileSchemaVersion: 11,
      migrationHistory: ['created:v11'],
      inputMappings: legacyInputMappings,
      campaignCheckpoint: { obsoleteSimulationSchema: 18 },
    };
    const migrated = parseProfile(JSON.stringify({
      ...legacyBody, integrityChecksum: checksumCanonical(legacyBody),
    }));
    expect(migrated).toMatchObject({
      profileSchemaVersion: 15,
      migrationHistory: ['created:v11', 'v11->v12:dash-command', 'v12->v13:defense-objective', 'v13->v14:violet-shielder', 'v14->v15:arrow-key-defaults'],
      inputMappings: { dash: 'Space' },
      campaignCheckpoint: null,
    });
  });

  it('migrates v12 to v13 and clears its schema-19 checkpoint for defense state', () => {
    const current = createDefaultProfile('migration-v12');
    const { integrityChecksum: _checksum, ...currentBody } = current;
    const legacyBody = {
      ...currentBody,
      profileSchemaVersion: 12,
      migrationHistory: ['created:v12'],
      campaignCheckpoint: { obsoleteSimulationSchema: 19 },
    };
    const migrated = parseProfile(JSON.stringify({
      ...legacyBody, integrityChecksum: checksumCanonical(legacyBody),
    }));
    expect(migrated).toMatchObject({
      profileSchemaVersion: 15,
      migrationHistory: ['created:v12', 'v12->v13:defense-objective', 'v13->v14:violet-shielder', 'v14->v15:arrow-key-defaults'],
      campaignCheckpoint: null,
    });
  });

  it('migrates v13 through v15 and clears its schema-20 checkpoint for shielder state', () => {
    const current = createDefaultProfile('migration-v13');
    const { integrityChecksum: _checksum, ...currentBody } = current;
    const legacyBody = {
      ...currentBody,
      profileSchemaVersion: 13,
      migrationHistory: ['created:v13'],
      campaignCheckpoint: { obsoleteSimulationSchema: 20 },
    };
    const migrated = parseProfile(JSON.stringify({
      ...legacyBody, integrityChecksum: checksumCanonical(legacyBody),
    }));
    expect(migrated).toMatchObject({
      profileSchemaVersion: 15,
      migrationHistory: ['created:v13', 'v13->v14:violet-shielder', 'v14->v15:arrow-key-defaults'],
      campaignCheckpoint: null,
    });
  });

  it('migrates only the old default WASD movement quartet to arrow keys in v15', () => {
    const current = createDefaultProfile('migration-v14');
    const { integrityChecksum: _checksum, ...currentBody } = current;
    const oldDefaults = {
      ...currentBody.inputMappings,
      forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD',
    };
    const legacyBody = {
      ...currentBody,
      profileSchemaVersion: 14,
      migrationHistory: ['created:v14'],
      inputMappings: oldDefaults,
    };
    const migrated = parseProfile(JSON.stringify({
      ...legacyBody, integrityChecksum: checksumCanonical(legacyBody),
    }));
    expect(migrated).toMatchObject({
      profileSchemaVersion: 15,
      migrationHistory: ['created:v14', 'v14->v15:arrow-key-defaults'],
      inputMappings: {
        forward: 'ArrowUp', back: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight',
      },
    });

    const customizedBody = {
      ...legacyBody,
      inputMappings: { ...oldDefaults, forward: 'KeyI' },
    };
    const customized = parseProfile(JSON.stringify({
      ...customizedBody, integrityChecksum: checksumCanonical(customizedBody),
    }));
    expect(customized.inputMappings).toMatchObject({
      forward: 'KeyI', back: 'KeyS', left: 'KeyA', right: 'KeyD',
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
