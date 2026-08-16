import { describe, expect, it } from 'vitest';
import { presentationFeedback } from '../src/runtime/presentation-feedback';

describe('presentation-only weapon and haptic feedback', () => {
  it('maps strong combat events to bounded feedback without affecting simulation', () => {
    expect(presentationFeedback('pulse-fired')).toMatchObject({
      classes: ['feedback-weapon-kick', 'feedback-shake-light'], durationMs: 130, vibration: 5,
    });
    expect(presentationFeedback('bomb-detonated')).toMatchObject({
      classes: ['feedback-shake-heavy'], durationMs: 320, vibration: 28,
    });
    expect(presentationFeedback('player-hit')?.vibration).toEqual([18, 12, 24]);
    expect(presentationFeedback('coin-collected')).toBeNull();
  });
});
