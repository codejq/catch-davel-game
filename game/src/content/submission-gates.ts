import type { AssetProvenanceManifest, AssetProvenanceRecord } from './assets/provenance.ts';
import { CHAPTER_01_ASSET_PROVENANCE } from './assets/provenance.ts';
import type { LevelDefinition } from './level-definition.ts';
import type { LocalizationCatalog, ReleaseLocale } from './localization/catalogs.ts';
import { RELEASE_LOCALES, RELEASE_LOCALIZATION_CATALOGS } from './localization/catalogs.ts';
import { validateLevelDefinition } from './validate-level.ts';

const ID = /^[a-z0-9][a-z0-9._-]*$/;
const SHA256 = /^[0-9a-f]{64}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface ContentSubmissionLevelReport {
  readonly levelId: string;
  readonly localizationKeys: readonly string[];
  readonly assetIds: readonly string[];
}

export interface ContentSubmissionReport {
  readonly schemaVersion: 1;
  readonly releaseLocales: readonly ReleaseLocale[];
  readonly localizationKeyCount: number;
  readonly referencedAssetCount: number;
  readonly provenanceRecordCount: number;
  readonly thirdPartyAssetCount: number;
  readonly levels: readonly ContentSubmissionLevelReport[];
}

function requiredLocalizationKeys(level: LevelDefinition): string[] {
  return [...new Set([
    level.nameKey,
    level.briefingKey,
    ...level.objectives.map((objective) => objective.titleKey),
    ...(level.story?.localizationKeys ?? []),
  ])].sort();
}

function referencedAssetIds(level: LevelDefinition): string[] {
  return [...new Set([
    level.palette.presetId,
    level.maze.templateSetId,
    level.audio.presetId,
    level.dance.presetId,
    level.dance.footPatternId,
    level.dance.torsoPatternId,
    level.dance.armPatternId,
    level.dance.headAccentId,
    level.dance.pathPatternId,
    level.dance.reducedMotionPresetId,
    ...level.encounters.flatMap((encounter) => encounter.waves.flatMap(
      (wave) => wave.spawnGroups.map((group) => group.dancePresetId),
    )),
  ])].sort();
}

function validateCatalogs(
  requiredKeys: ReadonlySet<string>,
  catalogs: readonly LocalizationCatalog[],
  releaseLocales: readonly ReleaseLocale[],
): void {
  if (new Set(releaseLocales).size !== releaseLocales.length || releaseLocales.length === 0) {
    throw new Error('Release locales must be a non-empty unique list');
  }
  const catalogsByLocale = new Map<string, LocalizationCatalog>();
  for (const catalog of catalogs) {
    if (catalog.schemaVersion !== 1) throw new Error(`Localization catalog ${catalog.locale} has an unsupported schema`);
    if (catalog.locale !== 'en' && catalog.locale !== 'ar') throw new Error(`Localization catalog ${String(catalog.locale)} is not supported`);
    if (catalog.direction !== (catalog.locale === 'ar' ? 'rtl' : 'ltr')) throw new Error(`Localization catalog ${catalog.locale} has the wrong text direction`);
    if (catalogsByLocale.has(catalog.locale)) throw new Error(`Duplicate localization catalog ${catalog.locale}`);
    catalogsByLocale.set(catalog.locale, catalog);
  }
  for (const locale of releaseLocales) {
    const catalog = catalogsByLocale.get(locale);
    if (catalog === undefined) throw new Error(`Missing release localization catalog ${locale}`);
    if (catalog.fallbackLocale !== null && !releaseLocales.includes(catalog.fallbackLocale)) {
      throw new Error(`Localization catalog ${locale} has an unavailable fallback ${catalog.fallbackLocale}`);
    }
    const missing = [...requiredKeys].filter((key) => {
      const value = catalog.strings[key];
      return typeof value !== 'string' || value.trim().length === 0;
    });
    if (missing.length > 0) throw new Error(`Localization catalog ${locale} is missing: ${missing.join(', ')}`);
  }
}

function validateProvenanceRecord(record: AssetProvenanceRecord): void {
  if (!ID.test(record.id)) throw new Error(`Provenance record has invalid ID ${record.id}`);
  if (record.assetIds.length === 0 || new Set(record.assetIds).size !== record.assetIds.length || record.assetIds.some((id) => !ID.test(id))) {
    throw new Error(`Provenance record ${record.id} has invalid or duplicate asset IDs`);
  }
  if (record.creator.trim().length === 0 || record.modifications.trim().length === 0) {
    throw new Error(`Provenance record ${record.id} is missing creator or modification notes`);
  }
  if (record.sourceType === 'project-original') {
    if (record.licenseId !== 'MIT' || !record.sourcePath.startsWith('game/src/')) {
      throw new Error(`Project-original provenance ${record.id} must use MIT and a repository source path`);
    }
    return;
  }
  if (record.licenseId !== 'CC0-1.0' && record.licenseId !== 'CC-BY-4.0') {
    throw new Error(`Third-party provenance ${record.id} has an unapproved license`);
  }
  if (!/^https:\/\//.test(record.sourceUrl) || !ISO_DATE.test(record.retrievedDate) || !SHA256.test(record.originalSha256)) {
    throw new Error(`Third-party provenance ${record.id} has incomplete source evidence`);
  }
  if (record.shippedFiles.length === 0 || record.shippedFiles.some((file) => file.path.length === 0 || !SHA256.test(file.sha256))) {
    throw new Error(`Third-party provenance ${record.id} has invalid shipped-file checksums`);
  }
  if (record.licenseId === 'CC-BY-4.0' && record.attribution.trim().length === 0) {
    throw new Error(`CC BY provenance ${record.id} requires attribution text`);
  }
}

function provenanceIndex(manifest: AssetProvenanceManifest): Map<string, AssetProvenanceRecord> {
  if (manifest.schemaVersion !== 1 || manifest.scope !== 'chapter-01-level-content') {
    throw new Error('Asset provenance manifest has an unsupported contract');
  }
  const records = new Set<string>();
  const assets = new Map<string, AssetProvenanceRecord>();
  for (const record of manifest.records) {
    validateProvenanceRecord(record);
    if (records.has(record.id)) throw new Error(`Duplicate provenance record ${record.id}`);
    records.add(record.id);
    for (const assetId of record.assetIds) {
      if (assets.has(assetId)) throw new Error(`Asset ${assetId} has multiple provenance records`);
      assets.set(assetId, record);
    }
  }
  return assets;
}

export function validateLevelSubmission(
  value: unknown,
  catalogs: readonly LocalizationCatalog[] = RELEASE_LOCALIZATION_CATALOGS,
  manifest: AssetProvenanceManifest = CHAPTER_01_ASSET_PROVENANCE,
  releaseLocales: readonly ReleaseLocale[] = RELEASE_LOCALES,
): ContentSubmissionLevelReport {
  const level = validateLevelDefinition(value);
  const localizationKeys = requiredLocalizationKeys(level);
  validateCatalogs(new Set(localizationKeys), catalogs, releaseLocales);
  const assetIds = referencedAssetIds(level);
  const provenance = provenanceIndex(manifest);
  const missingAssets = assetIds.filter((assetId) => !provenance.has(assetId));
  if (missingAssets.length > 0) throw new Error(`Level ${level.id} has assets without provenance: ${missingAssets.join(', ')}`);
  return { levelId: level.id, localizationKeys, assetIds };
}

export function validateContentSubmission(
  values: readonly unknown[],
  catalogs: readonly LocalizationCatalog[] = RELEASE_LOCALIZATION_CATALOGS,
  manifest: AssetProvenanceManifest = CHAPTER_01_ASSET_PROVENANCE,
  releaseLocales: readonly ReleaseLocale[] = RELEASE_LOCALES,
): ContentSubmissionReport {
  if (values.length === 0) throw new Error('Content submission has no levels');
  const levels = values.map((value) => validateLevelDefinition(value));
  const ids = levels.map((level) => level.id);
  if (new Set(ids).size !== ids.length) throw new Error('Content submission contains duplicate level IDs');
  levels.forEach((level, index) => {
    if (level.number !== index + 1) throw new Error(`Content submission levels must be contiguous; found ${level.id} at position ${index + 1}`);
  });
  const requiredKeys = new Set(levels.flatMap(requiredLocalizationKeys));
  validateCatalogs(requiredKeys, catalogs, releaseLocales);
  const provenance = provenanceIndex(manifest);
  const reports = levels.map((level) => ({
    levelId: level.id,
    localizationKeys: requiredLocalizationKeys(level),
    assetIds: referencedAssetIds(level),
  }));
  const requiredAssets = new Set(reports.flatMap((report) => report.assetIds));
  const missingAssets = [...requiredAssets].filter((assetId) => !provenance.has(assetId));
  if (missingAssets.length > 0) throw new Error(`Assets without provenance: ${missingAssets.sort().join(', ')}`);
  const unreferencedAssets = [...provenance.keys()].filter((assetId) => !requiredAssets.has(assetId));
  if (unreferencedAssets.length > 0) throw new Error(`Stale provenance asset IDs: ${unreferencedAssets.sort().join(', ')}`);
  return {
    schemaVersion: 1,
    releaseLocales: [...releaseLocales],
    localizationKeyCount: requiredKeys.size,
    referencedAssetCount: requiredAssets.size,
    provenanceRecordCount: manifest.records.length,
    thirdPartyAssetCount: manifest.records.filter((record) => record.sourceType === 'third-party').length,
    levels: reports,
  };
}
