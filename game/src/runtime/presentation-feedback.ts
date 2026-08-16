import type { GameEvent } from '../sim/game';

export type FeedbackClass = 'feedback-weapon-kick' | 'feedback-sword-swing'
  | 'feedback-shake-light' | 'feedback-shake-heavy' | 'feedback-muzzle-flash';

export interface PresentationFeedback {
  readonly classes: readonly FeedbackClass[];
  readonly durationMs: number;
  readonly vibration: number | readonly number[] | null;
}

const FEEDBACK: Partial<Record<GameEvent['type'], PresentationFeedback>> = {
  'pulse-fired': {
    classes: ['feedback-weapon-kick', 'feedback-shake-light', 'feedback-muzzle-flash'],
    durationMs: 130,
    vibration: 5,
  },
  'sword-swung': { classes: ['feedback-sword-swing'], durationMs: 180, vibration: 6 },
  'sword-charged': { classes: ['feedback-sword-swing', 'feedback-shake-light'], durationMs: 260, vibration: 12 },
  'projectile-deflected': { classes: ['feedback-shake-light'], durationMs: 110, vibration: 8 },
  'bomb-thrown': { classes: ['feedback-weapon-kick'], durationMs: 170, vibration: 7 },
  'bomb-detonated': { classes: ['feedback-shake-heavy'], durationMs: 320, vibration: 28 },
  'robot-hit': { classes: [], durationMs: 70, vibration: 4 },
  'player-hit': { classes: ['feedback-shake-heavy'], durationMs: 260, vibration: [18, 12, 24] },
  'boss-phase': { classes: ['feedback-shake-heavy'], durationMs: 420, vibration: [18, 35, 18] },
  'ambush-triggered': { classes: ['feedback-shake-heavy'], durationMs: 360, vibration: [12, 28, 12] },
  victory: { classes: ['feedback-shake-light'], durationMs: 260, vibration: [18, 35, 18] },
  defeat: { classes: ['feedback-shake-heavy'], durationMs: 420, vibration: 38 },
};

export function presentationFeedback(eventType: GameEvent['type']): PresentationFeedback | null {
  return FEEDBACK[eventType] ?? null;
}
