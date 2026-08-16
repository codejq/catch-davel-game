import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../src/sim/game';
import { createSimulationSnapshot } from '../src/sim/serialization';
import { createDefaultProfile, parseProfile, serializeProfile, updateProfile, validateProfile } from '../src/storage/profile';
import { MemoryKeyValueStore, ProfileRepository, profileStorageKeys } from '../src/storage/repository';

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
  });
});
