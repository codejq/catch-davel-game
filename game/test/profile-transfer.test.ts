import { describe, expect, it } from 'vitest';
import { createDefaultProfile, updateProfile } from '../src/storage/profile';
import {
  PROFILE_TRANSFER_MAX_BYTES, parseProfileExport, serializeProfileExport,
} from '../src/storage/profile-transfer';

describe('cross-platform profile transfer', () => {
  it('round-trips a human-readable integrity-checked default profile', () => {
    const profile = createDefaultProfile();
    const serialized = serializeProfileExport(profile);
    expect(serialized).toContain('\n  "profileSchemaVersion": 1,');
    expect(parseProfileExport(serialized)).toEqual(profile);
  });

  it('rejects corruption, unknown fields, and non-default profile replacement', () => {
    const profile = createDefaultProfile();
    expect(() => parseProfileExport(serializeProfileExport({ ...profile, spendableCoins: 2 }))).toThrow(/checksum/);
    expect(() => parseProfileExport(JSON.stringify({ ...profile, surprise: true }))).toThrow(/unknown or missing/);
    const alternate = updateProfile(profile, { profileId: 'someone-else' });
    expect(() => parseProfileExport(serializeProfileExport(alternate))).toThrow(/default/);
  });

  it('enforces the transfer byte bound before JSON parsing', () => {
    expect(() => parseProfileExport('')).toThrow(/1 byte/);
    expect(() => parseProfileExport('x'.repeat(PROFILE_TRANSFER_MAX_BYTES + 1))).toThrow(/4 MiB/);
  });
});
