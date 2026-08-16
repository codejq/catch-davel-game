export const CHAPTER_01_LEVEL_IDS = [
  'level-001', 'level-002', 'level-003', 'level-004', 'level-005',
  'level-006', 'level-007', 'level-008', 'level-009', 'level-010',
] as const;

export type Chapter01LevelId = typeof CHAPTER_01_LEVEL_IDS[number];

export function isChapter01LevelId(value: string): value is Chapter01LevelId {
  return (CHAPTER_01_LEVEL_IDS as readonly string[]).includes(value);
}
