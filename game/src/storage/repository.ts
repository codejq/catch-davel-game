import { canonicalJson } from '../sim/serialization';
import { parseProfile, serializeProfile, type ProfileV1 } from './profile';

export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

interface ActivePointer {
  readonly pointerVersion: 1;
  readonly slot: 'a' | 'b';
  readonly revision: number;
}

interface ProfileEnvelope {
  readonly envelopeVersion: 1;
  readonly revision: number;
  readonly serializedProfile: string;
}

export function profileStorageKeys(profileId: string): { readonly active: string; readonly a: string; readonly b: string } {
  const prefix = `profile:${profileId}`;
  return { active: `${prefix}:active`, a: `${prefix}:a`, b: `${prefix}:b` };
}

function parsePointer(serialized: string | null): ActivePointer | null {
  if (serialized === null) return null;
  try {
    const value = JSON.parse(serialized) as Partial<ActivePointer>;
    if (value.pointerVersion !== 1 || (value.slot !== 'a' && value.slot !== 'b') || !Number.isSafeInteger(value.revision) || value.revision! < 1) return null;
    return { pointerVersion: 1, slot: value.slot, revision: value.revision! };
  } catch {
    return null;
  }
}

function parseEnvelope(serialized: string | null): { readonly revision: number; readonly profile: ProfileV1 } | null {
  if (serialized === null) return null;
  try {
    const value = JSON.parse(serialized) as Partial<ProfileEnvelope>;
    if (value.envelopeVersion !== 1 || !Number.isSafeInteger(value.revision) || value.revision! < 1 || typeof value.serializedProfile !== 'string') return null;
    return { revision: value.revision!, profile: parseProfile(value.serializedProfile) };
  } catch {
    return null;
  }
}

export class ProfileRepository {
  constructor(private readonly store: KeyValueStore) {}

  async load(profileId: string): Promise<ProfileV1 | null> {
    const keys = profileStorageKeys(profileId);
    const pointer = parsePointer(await this.store.get(keys.active));
    const preferred = pointer?.slot ?? 'a';
    const fallback = preferred === 'a' ? 'b' : 'a';
    const preferredEnvelope = parseEnvelope(await this.store.get(keys[preferred]));
    if (preferredEnvelope !== null && (pointer === null || preferredEnvelope.revision === pointer.revision)) return preferredEnvelope.profile;
    const fallbackEnvelope = parseEnvelope(await this.store.get(keys[fallback]));
    return fallbackEnvelope?.profile ?? preferredEnvelope?.profile ?? null;
  }

  async save(profileValue: ProfileV1): Promise<void> {
    const profile = parseProfile(serializeProfile(profileValue));
    const keys = profileStorageKeys(profile.profileId);
    const pointer = parsePointer(await this.store.get(keys.active));
    const nextSlot: 'a' | 'b' = pointer?.slot === 'a' ? 'b' : 'a';
    const revision = (pointer?.revision ?? 0) + 1;
    const envelope: ProfileEnvelope = { envelopeVersion: 1, revision, serializedProfile: serializeProfile(profile) };
    await this.store.set(keys[nextSlot], canonicalJson(envelope));
    const verified = parseEnvelope(await this.store.get(keys[nextSlot]));
    if (verified === null || verified.revision !== revision || verified.profile.integrityChecksum !== profile.integrityChecksum) {
      throw new Error('Profile write verification failed; active pointer was not changed');
    }
    const nextPointer: ActivePointer = { pointerVersion: 1, slot: nextSlot, revision };
    await this.store.set(keys.active, canonicalJson(nextPointer));
  }
}

export class MemoryKeyValueStore implements KeyValueStore {
  readonly values = new Map<string, string>();
  async get(key: string): Promise<string | null> { return this.values.get(key) ?? null; }
  async set(key: string, value: string): Promise<void> { this.values.set(key, value); }
}
