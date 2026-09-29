import { describe, expect, it } from 'vitest';
import { LATER_DAYS, readChoice, shouldOffer } from '../src/ui/install-prompt';

const store = (value: string | null) => ({ getItem: () => value });

describe('install offer', () => {
  it('asks when nothing was answered yet', () => {
    expect(shouldOffer(readChoice(store(null)))).toBe(true);
    expect(shouldOffer(readChoice(store('{broken')))).toBe(true);
  });

  it('never asks again after No thanks or once installed', () => {
    expect(shouldOffer(readChoice(store('{"state":"never"}')))).toBe(false);
    expect(shouldOffer(readChoice(store('{"state":"installed"}')))).toBe(false);
  });

  it('waits a few days after Later, then asks again', () => {
    const now = 1_000_000;
    const until = now + LATER_DAYS * 86_400_000;
    const later = readChoice(store(JSON.stringify({ state: 'later', until })));
    expect(shouldOffer(later, now)).toBe(false);
    expect(shouldOffer(later, until + 1)).toBe(true);
  });
});
