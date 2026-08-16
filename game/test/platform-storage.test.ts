import { describe, expect, it } from 'vitest';
import { createDefaultProfile, serializeProfile, updateProfile } from '../src/storage/profile';
import { PackagedProfileRepository, type ProfileCommandInvoker } from '../src/storage/platform';

describe('Tauri app-data profile repository', () => {
  it('loads the previous verified copy when the current file is corrupt', async () => {
    const expected = createDefaultProfile();
    const invoke: ProfileCommandInvoker = async <T>() => ({
      current: '{"broken":true}', previous: serializeProfile(expected),
    } as T);
    await expect(new PackagedProfileRepository(invoke).load('default')).resolves.toEqual(expected);
  });

  it('writes canonical profile JSON and verifies the activated copy', async () => {
    const expected = updateProfile(createDefaultProfile(), { totalCoins: 9, spendableCoins: 9 });
    let current: string | null = null;
    const invoke: ProfileCommandInvoker = async <T>(command: string, args?: Record<string, unknown>) => {
      if (command === 'store_packaged_profile') {
        current = args?.serializedProfile as string;
        return undefined as T;
      }
      return { current, previous: null } as T;
    };
    const repository = new PackagedProfileRepository(invoke);
    await repository.save(expected);
    await expect(repository.load('default')).resolves.toEqual(expected);
    expect(current).toBe(serializeProfile(expected));
  });

  it('rejects profile IDs outside the fixed packaged path contract', async () => {
    const repository = new PackagedProfileRepository(async <T>() => ({ current: null, previous: null }) as T);
    await expect(repository.load('../escape')).rejects.toThrow(/reserves only the default profile/);
  });
});
