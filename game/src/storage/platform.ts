import { invoke, isTauri } from '@tauri-apps/api/core';
import { createBrowserProfileRepository } from './indexeddb';
import { parseProfile, serializeProfile, type ProfileV5 } from './profile';

export interface ProfileStorageRepository {
  load(profileId: string): Promise<ProfileV5 | null>;
  save(profile: ProfileV5): Promise<void>;
}

interface PackagedProfileCandidates {
  readonly current: string | null;
  readonly previous: string | null;
}

export type ProfileCommandInvoker = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

export class PackagedProfileRepository implements ProfileStorageRepository {
  constructor(private readonly command: ProfileCommandInvoker = invoke) {}

  async load(profileId: string): Promise<ProfileV5 | null> {
    if (profileId !== 'default') throw new Error('The packaged shell currently reserves only the default profile');
    const candidates = await this.command<PackagedProfileCandidates>('load_packaged_profile');
    for (const serialized of [candidates.current, candidates.previous]) {
      if (serialized === null) continue;
      try { return parseProfile(serialized); } catch { /* attempt the recovery copy */ }
    }
    return null;
  }

  async save(profile: ProfileV5): Promise<void> {
    const serializedProfile = serializeProfile(profile);
    await this.command<void>('store_packaged_profile', { serializedProfile });
    const candidates = await this.command<PackagedProfileCandidates>('load_packaged_profile');
    if (candidates.current === null || parseProfile(candidates.current).integrityChecksum !== profile.integrityChecksum) {
      throw new Error('Packaged profile write verification failed');
    }
  }
}

export function createPlatformProfileRepository(): {
  readonly repository: ProfileStorageRepository;
  readonly backend: 'indexeddb' | 'tauri-app-data';
} {
  return isTauri()
    ? { repository: new PackagedProfileRepository(), backend: 'tauri-app-data' }
    : { repository: createBrowserProfileRepository(), backend: 'indexeddb' };
}
