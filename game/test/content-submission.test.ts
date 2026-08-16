import { describe, expect, it } from 'vitest';
import { CAMPAIGN_ASSET_PROVENANCE, type AssetProvenanceManifest } from '../src/content/assets/provenance';
import { PLAYABLE_LEVELS } from '../src/content/levels/catalog';
import {
  RELEASE_LOCALIZATION_CATALOGS, type LocalizationCatalog,
} from '../src/content/localization/catalogs';
import { validateContentSubmission, validateLevelSubmission } from '../src/content/submission-gates';

describe('content submission localization and provenance gates', () => {
  it('covers every playable visible key and referenced presentation asset', () => {
    const report = validateContentSubmission(PLAYABLE_LEVELS);
    expect(report.levels).toHaveLength(14);
    expect(report.releaseLocales).toEqual(['en', 'ar']);
    expect(report.localizationKeyCount).toBe(42);
    expect(report.referencedAssetCount).toBe(140);
    expect(report.provenanceRecordCount).toBe(14);
    expect(report.thirdPartyAssetCount).toBe(0);
  });

  it('blocks a level when any release locale is missing a visible string', () => {
    const catalogs = structuredClone(RELEASE_LOCALIZATION_CATALOGS) as unknown as LocalizationCatalog[];
    delete (catalogs[1]!.strings as Record<string, string>)['levels.001.briefing'];
    expect(() => validateLevelSubmission(PLAYABLE_LEVELS[0], catalogs)).toThrow(/catalog ar is missing.*levels\.001\.briefing/);
  });

  it('blocks export when referenced assets have no provenance', () => {
    const manifest = structuredClone(CAMPAIGN_ASSET_PROVENANCE) as unknown as AssetProvenanceManifest;
    (manifest.records[7]!.assetIds as string[]).splice(0, 1);
    expect(() => validateContentSubmission(PLAYABLE_LEVELS, undefined, manifest)).toThrow(/Assets without provenance.*neon-workshop-08/);
  });

  it('blocks export when an authored preset lacks a materialized runtime binding', () => {
    const level = structuredClone(PLAYABLE_LEVELS[6]!);
    (level.palette as { presetId: string }).presetId = 'missing-bright-palette';
    expect(() => validateLevelSubmission(level)).toThrow(/Unknown palette runtime preset/);
  });

  it('rejects ambiguous third-party intake before checking coverage', () => {
    const manifest = structuredClone(CAMPAIGN_ASSET_PROVENANCE) as unknown as { records: unknown[] };
    manifest.records.push({
      id: 'bad-download', assetIds: ['unused-download'], assetKind: 'audio-sample', sourceType: 'third-party',
      creator: 'Unknown', title: 'Unknown', licenseId: 'CC0-1.0', sourceUrl: 'http://example.test/file',
      retrievedDate: 'yesterday', originalSha256: 'unknown', shippedFiles: [], modifications: 'none', attribution: '',
    });
    expect(() => validateContentSubmission(
      PLAYABLE_LEVELS, undefined, manifest as unknown as AssetProvenanceManifest,
    )).toThrow(/incomplete source evidence/);
  });
});
