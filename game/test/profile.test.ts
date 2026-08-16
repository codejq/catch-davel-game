import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../src/sim/game';
import { createSimulationSnapshot } from '../src/sim/serialization';
import { createDefaultProfile, parseProfile, serializeProfile, updateProfile, validateProfile } from '../src/storage/profile';
import { MemoryKeyValueStore, ProfileRepository, profileStorageKeys } from '../src/storage/repository';
import { purchaseWeaponUpgrade, weaponUpgradeCost } from '../src/storage/economy';

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
    expect(() => validateProfile({ ...profile, profileSchemaVersion: 2 })).toThrow(/newer than supported/);
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
});
