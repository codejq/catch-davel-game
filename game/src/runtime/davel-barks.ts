import { ROBOT_DEFINITIONS, type RobotArchetype } from '../sim/robots';

export type DavelBarkOccasion = 'telegraph' | 'defeated' | 'boss-phase';

export interface DavelBarkRequest {
  readonly speakerKey: string;
  readonly lineKey: string;
}

const SPEAKER_KEYS: Readonly<Record<RobotArchetype, string>> = {
  'wobble-scout': 'davels.wobble_scout',
  'blue-slider': 'davels.blue_slider',
  'yellow-spinner': 'davels.yellow_spinner',
  'red-firemouth': 'davels.red_firemouth',
  'cyan-dj': 'davels.cyan_dj',
  'violet-shielder': 'davels.violet_shielder',
  'invoice-overlord': 'davels.invoice_overlord',
};

const BARK_KEYS: Readonly<Record<RobotArchetype, Readonly<Record<DavelBarkOccasion, readonly string[]>>>> = {
  'wobble-scout': {
    telegraph: ['barks.wobble_scout.telegraph_1', 'barks.wobble_scout.telegraph_2'],
    defeated: ['barks.wobble_scout.defeated'],
    'boss-phase': ['barks.wobble_scout.telegraph_1'],
  },
  'blue-slider': {
    telegraph: ['barks.blue_slider.telegraph_1', 'barks.blue_slider.telegraph_2'],
    defeated: ['barks.blue_slider.defeated'],
    'boss-phase': ['barks.blue_slider.telegraph_1'],
  },
  'yellow-spinner': {
    telegraph: ['barks.yellow_spinner.telegraph_1', 'barks.yellow_spinner.telegraph_2'],
    defeated: ['barks.yellow_spinner.defeated'],
    'boss-phase': ['barks.yellow_spinner.telegraph_1'],
  },
  'red-firemouth': {
    telegraph: ['barks.red_firemouth.telegraph_1', 'barks.red_firemouth.telegraph_2'],
    defeated: ['barks.red_firemouth.defeated'],
    'boss-phase': ['barks.red_firemouth.telegraph_1'],
  },
  'cyan-dj': {
    telegraph: ['barks.cyan_dj.telegraph_1', 'barks.cyan_dj.telegraph_2'],
    defeated: ['barks.cyan_dj.defeated'],
    'boss-phase': ['barks.cyan_dj.telegraph_1'],
  },
  'violet-shielder': {
    telegraph: ['barks.violet_shielder.telegraph_1', 'barks.violet_shielder.telegraph_2'],
    defeated: ['barks.violet_shielder.defeated'],
    'boss-phase': ['barks.violet_shielder.telegraph_1'],
  },
  'invoice-overlord': {
    telegraph: ['barks.invoice_overlord.telegraph_1', 'barks.invoice_overlord.telegraph_2'],
    defeated: ['barks.invoice_overlord.defeated'],
    'boss-phase': [
      'barks.invoice_overlord.phase_1', 'barks.invoice_overlord.phase_2', 'barks.invoice_overlord.phase_3',
    ],
  },
};

export function davelBarkRequest(
  robotId: number | undefined,
  tick: number,
  occasion: DavelBarkOccasion,
  phase = 0,
): DavelBarkRequest | null {
  if (robotId === undefined || !Number.isSafeInteger(tick) || tick < 0) return null;
  const definition = ROBOT_DEFINITIONS[robotId];
  if (definition === undefined) return null;
  const keys = BARK_KEYS[definition.archetype][occasion];
  const index = occasion === 'boss-phase' && definition.archetype === 'invoice-overlord'
    ? Math.max(0, Math.min(keys.length - 1, phase - 1))
    : (Math.imul(robotId + 1, 31) + tick) % keys.length;
  return { speakerKey: SPEAKER_KEYS[definition.archetype], lineKey: keys[index]! };
}
