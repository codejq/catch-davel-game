import { describe, expect, it } from 'vitest';
import {
  comboHeatTier, HypeAnnouncer, lowHealthIntensity, MULTI_CATCH_WINDOW_TICKS,
} from '../src/runtime/hype-announcer';

describe('hype announcer', () => {
  it('celebrates the first catch and escalates rapid multi-catches', () => {
    const announcer = new HypeAnnouncer();
    expect(announcer.robotDefeated(100, 1)?.key).toBe('hypeFirstCatch');
    expect(announcer.robotDefeated(150, 1)).toMatchObject({ key: 'hypeDoubleCatch', tier: 2, streak: 2 });
    expect(announcer.robotDefeated(200, 1)).toMatchObject({ key: 'hypeTripleCatch', streak: 3 });
    expect(announcer.robotDefeated(250, 1)).toMatchObject({ key: 'hypeQuadCatch', tier: 3, streak: 4 });
    expect(announcer.robotDefeated(300, 1)).toMatchObject({ key: 'hypeFrenzy', tier: 3, streak: 5 });
    expect(announcer.robotDefeated(301, 1)?.key).toBe('hypeFrenzy');
  });

  it('breaks the streak outside the multi-catch window and stays quiet for routine catches', () => {
    const announcer = new HypeAnnouncer();
    announcer.robotDefeated(0, 1);
    expect(announcer.robotDefeated(MULTI_CATCH_WINDOW_TICKS + 1, 1)).toBeNull();
    expect(announcer.currentStreak).toBe(1);
  });

  it('calls out clutch catches at low health', () => {
    const announcer = new HypeAnnouncer();
    announcer.robotDefeated(0, 1);
    expect(announcer.robotDefeated(1_000, 0.2)).toMatchObject({ key: 'hypeClutch', tier: 2 });
    expect(announcer.robotDefeated(2_000, 0)).toBeNull();
  });

  it('announces the last Davel once when the count drops to one', () => {
    const announcer = new HypeAnnouncer();
    expect(announcer.remainingChanged(4, 4)).toBeNull();
    expect(announcer.remainingChanged(2, 4)).toBeNull();
    expect(announcer.remainingChanged(1, 4)?.key).toBe('hypeLastDavel');
    expect(announcer.remainingChanged(1, 4)).toBeNull();
    const duel = new HypeAnnouncer();
    duel.remainingChanged(2, 2);
    expect(duel.remainingChanged(1, 2)).toBeNull();
  });

  it('fires each combo milestone once per combo chain', () => {
    const announcer = new HypeAnnouncer();
    expect(announcer.comboChanged(4)).toBeNull();
    expect(announcer.comboChanged(5)).toMatchObject({ key: 'hypeComboFire', tier: 1 });
    expect(announcer.comboChanged(6)).toBeNull();
    expect(announcer.comboChanged(12)).toMatchObject({ key: 'hypeComboBlaze', tier: 2 });
    expect(announcer.comboChanged(25)).toMatchObject({ key: 'hypeComboLegend', tier: 3 });
    expect(announcer.comboChanged(0)).toBeNull();
    expect(announcer.comboChanged(5)?.key).toBe('hypeComboFire');
  });

  it('resets all run state', () => {
    const announcer = new HypeAnnouncer();
    announcer.robotDefeated(0, 1);
    announcer.comboChanged(5);
    announcer.reset();
    expect(announcer.robotDefeated(10, 1)?.key).toBe('hypeFirstCatch');
    expect(announcer.comboChanged(5)?.key).toBe('hypeComboFire');
  });
});

describe('combo heat and heartbeat', () => {
  it('maps combos to heat tiers', () => {
    expect([0, 2, 3, 5, 9, 10, 40].map(comboHeatTier)).toEqual([0, 0, 1, 2, 2, 3, 3]);
  });

  it('ramps heartbeat intensity only at low health', () => {
    expect(lowHealthIntensity(100, 100)).toBe(0);
    expect(lowHealthIntensity(35, 100)).toBe(0);
    expect(lowHealthIntensity(22.5, 100)).toBe(0.5);
    expect(lowHealthIntensity(5, 100)).toBe(1);
    expect(lowHealthIntensity(0, 100)).toBe(0);
    expect(lowHealthIntensity(10, 0)).toBe(0);
  });
});
