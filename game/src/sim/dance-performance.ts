import { CHAPTER_01_LEVEL_IDS, type Chapter01LevelId } from '../content/level-ids';
import { chapter01Level } from '../content/levels/chapter-01';
import { danceRuntimeMotif, type DanceRuntimeMotif } from '../content/runtime-manifests';

export type LevelDanceMotif = DanceRuntimeMotif;

export interface LevelDancePerformance {
  readonly presetId: string;
  readonly bpm: number;
  readonly visualIntensity: number;
  readonly motif: LevelDanceMotif;
}

export const CHAPTER_01_DANCE_PERFORMANCES: Readonly<Record<Chapter01LevelId, LevelDancePerformance>> =
  Object.fromEntries(CHAPTER_01_LEVEL_IDS.map((levelId) => {
    const dance = chapter01Level(levelId).dance;
    return [levelId, {
      presetId: dance.presetId,
      bpm: dance.bpm,
      visualIntensity: dance.visualIntensity,
      motif: danceRuntimeMotif(dance.presetId),
    }];
  })) as Readonly<Record<Chapter01LevelId, LevelDancePerformance>>;

export function levelDancePerformance(levelId: Chapter01LevelId): LevelDancePerformance {
  return CHAPTER_01_DANCE_PERFORMANCES[levelId];
}
