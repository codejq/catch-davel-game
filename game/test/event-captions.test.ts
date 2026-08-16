import { describe, expect, it } from 'vitest';
import { captionForEvent, relativeCaptionDirection } from '../src/runtime/event-captions';
import { EVENT_CLASS, type DecodedGameEvent } from '../src/transport/event-channel';

function event(value: Pick<DecodedGameEvent, 'tick' | 'type'> & Partial<DecodedGameEvent>): DecodedGameEvent {
  return {
    eventId: 1, eventClass: EVENT_CLASS.presentationOnly, batchSequence: 1, lastInBatch: true,
    ...value,
  };
}

describe('semantic combat captions', () => {
  it('projects world positions into stable player-relative directions', () => {
    expect(relativeCaptionDirection(0, 0, 0, -3, 0)).toBe('left');
    expect(relativeCaptionDirection(0, 0, 0, 3, 0)).toBe('right');
    expect(relativeCaptionDirection(0, 0, 0, 0, -3)).toBe('center');
    expect(relativeCaptionDirection(0, 0, Math.PI, 3, 0)).toBe('left');
  });

  it('covers weapon and threatening Davel cues without captioning ambient state events', () => {
    expect(captionForEvent(event({ tick: 2, type: 'pulse-fired' }))).toMatchObject({ key: 'captionPulse' });
    expect(captionForEvent(event({ tick: 3, type: 'robot-telegraph', robotId: 4 }), 'right')).toEqual({
      key: 'captionAttackCharging', dedupeKey: 'robot-attack-4', direction: 'right',
    });
    expect(captionForEvent(event({ tick: 4, type: 'player-hit', robotId: 4 }), 'left')).toMatchObject({
      key: 'captionPlayerHit', direction: 'left',
    });
    expect(captionForEvent(event({ tick: 5, type: 'checkpoint-activated' }))).toBeNull();
  });
});
