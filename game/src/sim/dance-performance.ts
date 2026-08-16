import type { Chapter01LevelId } from '../content/level-ids';

export type LevelDanceMotif =
  | 'wobble-march'
  | 'side-shuffle'
  | 'robot-pop'
  | 'corner-peek'
  | 'heavy-two-step'
  | 'conveyor-conga'
  | 'freeze-dance'
  | 'clockwork-charleston'
  | 'turbo-shuffle'
  | 'giant-breakdown';

export interface LevelDancePerformance {
  readonly presetId: string;
  readonly bpm: number;
  readonly visualIntensity: number;
  readonly motif: LevelDanceMotif;
}

export const CHAPTER_01_DANCE_PERFORMANCES: Readonly<Record<Chapter01LevelId, LevelDancePerformance>> = {
  'level-001': { presetId: 'wobble-march', bpm: 96, visualIntensity: 0.65, motif: 'wobble-march' },
  'level-002': { presetId: 'side-to-side-shuffle', bpm: 98, visualIntensity: 0.67, motif: 'side-shuffle' },
  'level-003': { presetId: 'pocket-robot-pop', bpm: 100, visualIntensity: 0.69, motif: 'robot-pop' },
  'level-004': { presetId: 'corner-peek-groove', bpm: 102, visualIntensity: 0.72, motif: 'corner-peek' },
  'level-005': { presetId: 'heavy-boot-two-step', bpm: 104, visualIntensity: 0.74, motif: 'heavy-two-step' },
  'level-006': { presetId: 'conveyor-conga', bpm: 106, visualIntensity: 0.76, motif: 'conveyor-conga' },
  'level-007': { presetId: 'flashlight-freeze-dance', bpm: 108, visualIntensity: 0.6, motif: 'freeze-dance' },
  'level-008': { presetId: 'clockwork-charleston', bpm: 110, visualIntensity: 0.8, motif: 'clockwork-charleston' },
  'level-009': { presetId: 'turbo-tool-shuffle', bpm: 114, visualIntensity: 0.86, motif: 'turbo-shuffle' },
  'level-010': { presetId: 'giant-wobble-breakdown', bpm: 116, visualIntensity: 0.92, motif: 'giant-breakdown' },
};

export function levelDancePerformance(levelId: Chapter01LevelId): LevelDancePerformance {
  return CHAPTER_01_DANCE_PERFORMANCES[levelId];
}
