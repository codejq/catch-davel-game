import { PLAYABLE_LEVEL_IDS, type PlayableLevelId } from '../content/level-ids';
import { campaignLevel } from '../content/levels/catalog';
import { danceRuntimeMotif, type DanceRuntimeMotif } from '../content/runtime-manifests';

export type LevelDanceMotif = DanceRuntimeMotif;

export interface LevelDancePerformance {
  readonly presetId: string;
  readonly bpm: number;
  readonly visualIntensity: number;
  readonly motif: LevelDanceMotif;
}

export const CHAPTER_01_DANCE_PERFORMANCES: Readonly<Record<PlayableLevelId, LevelDancePerformance>> =
  Object.fromEntries(PLAYABLE_LEVEL_IDS.map((levelId) => {
    const dance = campaignLevel(levelId).dance;
    return [levelId, {
      presetId: dance.presetId,
      bpm: dance.bpm,
      visualIntensity: dance.visualIntensity,
      motif: danceRuntimeMotif(dance.presetId),
    }];
  })) as Readonly<Record<PlayableLevelId, LevelDancePerformance>>;

export function levelDancePerformance(levelId: PlayableLevelId): LevelDancePerformance {
  return CHAPTER_01_DANCE_PERFORMANCES[levelId];
}
