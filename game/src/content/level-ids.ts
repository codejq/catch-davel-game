export const CHAPTER_01_LEVEL_IDS = [
  'level-001', 'level-002', 'level-003', 'level-004', 'level-005',
  'level-006', 'level-007', 'level-008', 'level-009', 'level-010',
] as const;

export const CHAPTER_02_LEVEL_IDS = [
  'level-011', 'level-012', 'level-013', 'level-014', 'level-015', 'level-016', 'level-017', 'level-018', 'level-019', 'level-020',
] as const;

export const CHAPTER_03_LEVEL_IDS = [
  'level-021', 'level-022', 'level-023', 'level-024', 'level-025', 'level-026', 'level-027', 'level-028', 'level-029', 'level-030',
] as const;

export const CHAPTER_04_LEVEL_IDS = ['level-031', 'level-032', 'level-033', 'level-034', 'level-035'] as const;

/** IDs with complete authored content and runtime validation in this build. */
export const PLAYABLE_LEVEL_IDS = [
  ...CHAPTER_01_LEVEL_IDS, ...CHAPTER_02_LEVEL_IDS, ...CHAPTER_03_LEVEL_IDS, ...CHAPTER_04_LEVEL_IDS,
] as const;

export const CAMPAIGN_LEVEL_IDS = [
  'level-001', 'level-002', 'level-003', 'level-004', 'level-005', 'level-006', 'level-007', 'level-008', 'level-009', 'level-010',
  'level-011', 'level-012', 'level-013', 'level-014', 'level-015', 'level-016', 'level-017', 'level-018', 'level-019', 'level-020',
  'level-021', 'level-022', 'level-023', 'level-024', 'level-025', 'level-026', 'level-027', 'level-028', 'level-029', 'level-030',
  'level-031', 'level-032', 'level-033', 'level-034', 'level-035', 'level-036',
] as const;

export type Chapter01LevelId = typeof CHAPTER_01_LEVEL_IDS[number];
export type Chapter02LevelId = typeof CHAPTER_02_LEVEL_IDS[number];
export type Chapter03LevelId = typeof CHAPTER_03_LEVEL_IDS[number];
export type Chapter04LevelId = typeof CHAPTER_04_LEVEL_IDS[number];
export type PlayableLevelId = typeof PLAYABLE_LEVEL_IDS[number];
export type CampaignLevelId = typeof CAMPAIGN_LEVEL_IDS[number];

export function isChapter01LevelId(value: string): value is Chapter01LevelId {
  return (CHAPTER_01_LEVEL_IDS as readonly string[]).includes(value);
}

export function isChapter02LevelId(value: string): value is Chapter02LevelId {
  return (CHAPTER_02_LEVEL_IDS as readonly string[]).includes(value);
}

export function isChapter03LevelId(value: string): value is Chapter03LevelId {
  return (CHAPTER_03_LEVEL_IDS as readonly string[]).includes(value);
}

export function isChapter04LevelId(value: string): value is Chapter04LevelId {
  return (CHAPTER_04_LEVEL_IDS as readonly string[]).includes(value);
}

export function isPlayableLevelId(value: string): value is PlayableLevelId {
  return (PLAYABLE_LEVEL_IDS as readonly string[]).includes(value);
}

export function isCampaignLevelId(value: string): value is CampaignLevelId {
  return (CAMPAIGN_LEVEL_IDS as readonly string[]).includes(value);
}
