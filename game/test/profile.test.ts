import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../src/sim/game';
import { createSimulationSnapshot } from '../src/sim/serialization';
import { createDefaultProfile, parseProfile, serializeProfile, updateProfile, validateProfile } from '../src/storage/profile';
import { MemoryKeyValueStore, ProfileRepository, profileStorageKeys } from '../src/storage/repository';
import { purchaseWeaponUpgrade, weaponUpgradeCost } from '../src/storage/economy';
import {
  bankCampaignCoins, completeCampaignLevel, recordCampaignAttempt, recordCampaignDefeat, recordCampaignRobotDefeat,
} from '../src/campaign/progression';

describe('versioned profile persistence', () => {
  it('exports human-readable canonical JSON with a verified checkpoint and integrity checksum', () => {
    const simulation = new GameSimulation('profile-checkpoint');
    for (let tick = 0; tick < 75; tick += 1) {
      simulation.step({ forward: 1, strafe: 0, yawDelta: 0.002, pitchDelta: 0, fire: tick % 30 === 0 });
    }
    const profile = updateProfile(createDefaultProfile('ranger-1', 'Quantum Ranger'), {
      totalCoins: 19,
      spendableCoins: 19,
      campaignCheckpoint: createSimulationSnapshot(simulation.state),
      lastCleanShutdown: false,
    });
    const serialized = serializeProfile(profile);
    const parsed = parseProfile(serialized);
    expect(serializeProfile(parsed)).toBe(serialized);
    expect(parsed.campaignCheckpoint?.tick).toBe(75);
    expect(parsed.integrityChecksum).toMatch(/^[0-9a-f]{16}$/);
  });

  it('alternates records and recovers the previous known-good profile', async () => {
    const store = new MemoryKeyValueStore();
    const repository = new ProfileRepository(store);
    const original = createDefaultProfile('recovery-proof');
    await repository.save(original);
    const updated = updateProfile(original, { totalCoins: 10, spendableCoins: 10 });
    await repository.save(updated);
    expect((await repository.load('recovery-proof'))?.spendableCoins).toBe(10);
    const keys = profileStorageKeys('recovery-proof');
    store.values.set(keys.b, '{"corrupt":true}');
    const recovered = await repository.load('recovery-proof');
    expect(recovered?.spendableCoins).toBe(0);
    expect(recovered?.integrityChecksum).toBe(original.integrityChecksum);
  });

  it('rejects corruption and never silently accepts a newer schema', () => {
    const profile = createDefaultProfile('validation-proof');
    expect(() => validateProfile({ ...profile, spendableCoins: 1 })).toThrow(/checksum mismatch/);
    expect(() => validateProfile({ ...profile, profileSchemaVersion: 4 })).toThrow(/newer than supported/);
    expect(() => updateProfile(profile, { settings: { ...profile.settings, renderQuality: 'ultra' as 'high' } })).toThrow(/quality/);
    expect(() => updateProfile(profile, { spendableCoins: 5 })).toThrow(/cannot exceed/);
    expect(() => updateProfile(profile, { weaponUpgrades: { ...profile.weaponUpgrades, laserCooling: 4 } })).toThrow(/0 to 3/);
  });

  it('spends coins on bounded weapon upgrades and invalidates stale checkpoints', () => {
    const simulation = new GameSimulation('upgrade-checkpoint');
    const funded = updateProfile(createDefaultProfile('upgrade-proof'), {
      totalCoins: 40, spendableCoins: 40, campaignCheckpoint: createSimulationSnapshot(simulation.state),
    });
    const upgraded = purchaseWeaponUpgrade(funded, 'pulseDamage');
    expect(weaponUpgradeCost('pulseDamage', 0)).toBe(5);
    expect(upgraded.spendableCoins).toBe(35);
    expect(upgraded.weaponUpgrades.pulseDamage).toBe(1);
    expect(upgraded.campaignCheckpoint).toBeNull();
    expect(() => purchaseWeaponUpgrade(updateProfile(upgraded, {
      spendableCoins: 0, weaponUpgrades: { ...upgraded.weaponUpgrades, pulseDamage: 3 },
    }), 'pulseDamage')).toThrow(/cannot be upgraded/);
  });

  it('records attempts, defeats, robot totals, best times, and sequential unlocks', () => {
    let profile = createDefaultProfile('campaign-proof');
    profile = recordCampaignAttempt(profile, 'level-001');
    profile = recordCampaignRobotDefeat(profile, 'level-001');
    profile = recordCampaignDefeat(profile, 'level-001');
    profile = completeCampaignLevel(profile, 'level-001', 5_000);
    profile = completeCampaignLevel(profile, 'level-001', 5_400);
    profile = completeCampaignLevel(profile, 'level-001', 4_700);
    expect(profile.unlockedLevelIds).toEqual(['level-001', 'level-002']);
    expect(profile.levelProgress[0]).toEqual(expect.objectContaining({
      levelId: 'level-001', completed: true, attempts: 1, defeats: 1, robotsDefeated: 1, bestTicks: 4_700,
    }));
    expect(() => completeCampaignLevel(profile, 'level-002', 0)).toThrow(/positive/);
  });

  it('banks authoritative run coins exactly once and rejects backward balances', () => {
    const funded = updateProfile(createDefaultProfile('banking-proof'), { totalCoins: 20, spendableCoins: 7 });
    const banked = bankCampaignCoins(funded, 12);
    expect(banked).toMatchObject({ totalCoins: 25, spendableCoins: 12 });
    expect(bankCampaignCoins(banked, 12)).toBe(banked);
    expect(() => bankCampaignCoins(banked, 11)).toThrow(/cannot move backward/);
    expect(() => bankCampaignCoins(banked, 1.5)).toThrow(/safe-integer/);
  });

  it('reserves stable save identifiers through Level 100 and rejects IDs outside the campaign envelope', () => {
    const profile = createDefaultProfile('reservation-proof');
    const future = updateProfile(profile, { unlockedLevelIds: ['level-001', 'level-100'] });
    expect(parseProfile(serializeProfile(future)).unlockedLevelIds).toContain('level-100');
    expect(() => updateProfile(profile, { unlockedLevelIds: ['level-001', 'level-101'] })).toThrow(/unreserved/);
    expect(() => updateProfile(profile, {
      levelProgress: [{ ...profile.levelProgress[0]!, levelId: 'level-000' }],
    })).toThrow(/reserved campaign/);
  });
});
