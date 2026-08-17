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

export const CHAPTER_04_LEVEL_IDS = ['level-031', 'level-032', 'level-033', 'level-034'] as const;

/** IDs with complete authored content and runtime validation in this build. */
export const PLAYABLE_LEVEL_IDS = [
  ...CHAPTER_01_LEVEL_IDS, ...CHAPTER_02_LEVEL_IDS, ...CHAPTER_03_LEVEL_IDS, ...CHAPTER_04_LEVEL_IDS,
] as const;

export const CAMPAIGN_LEVEL_IDS = [
  'level-001', 'level-002', 'level-003', 'level-004', 'level-005', 'level-006', 'level-007', 'level-008', 'level-009', 'level-010',
  'level-011', 'level-012', 'level-013', 'level-014', 'level-015', 'level-016', 'level-017', 'level-018', 'level-019', 'level-020',
  'level-021', 'level-022', 'level-023', 'level-024', 'level-025', 'level-026', 'level-027', 'level-028', 'level-029', 'level-030',
  'level-031', 'level-032', 'level-033', 'level-034', 'level-035', 'level-036', 'level-037', 'level-038', 'level-039', 'level-040',
  'level-041', 'level-042', 'level-043', 'level-044', 'level-045', 'level-046', 'level-047', 'level-048', 'level-049', 'level-050',
  'level-051', 'level-052', 'level-053', 'level-054', 'level-055', 'level-056', 'level-057', 'level-058', 'level-059', 'level-060',
  'level-061', 'level-062', 'level-063', 'level-064', 'level-065', 'level-066', 'level-067', 'level-068', 'level-069', 'level-070',
  'level-071', 'level-072', 'level-073', 'level-074', 'level-075', 'level-076', 'level-077', 'level-078', 'level-079', 'level-080',
  'level-081', 'level-082', 'level-083', 'level-084', 'level-085', 'level-086', 'level-087', 'level-088', 'level-089', 'level-090',
  'level-091', 'level-092', 'level-093', 'level-094', 'level-095', 'level-096', 'level-097', 'level-098', 'level-099', 'level-100',
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
