import { describe, expect, it } from 'vitest';
import { bossPresentation } from '../src/runtime/boss-presentation';
import type { RenderRobotState } from '../src/render/render-model';

function robot(overrides: Partial<RenderRobotState> = {}): RenderRobotState {
  return {
    id: 6, x: 0, z: 0, heading: 0, health: 420, active: true, hitFlashTicks: 0, danceTime: 0,
    combatState: 'patrol', combatTicks: 0, strafeDirection: 1, tempoBuffTicks: 0, bossPhase: 1,
    body: { positions: new Float64Array(33) }, ...overrides,
  };
}

describe('snapshot-derived boss presentation', () => {
  it('projects stable health and phase values without adding authority', () => {
    expect(bossPresentation([robot()])).toEqual({
      robotId: 6, health: 420, maxHealth: 420, healthRatio: 1, phase: 1,
    });
    expect(bossPresentation([robot({ health: 210, bossPhase: 2 })])).toMatchObject({
      health: 210, healthRatio: 0.5, phase: 2,
    });
  });

  it('hides for inactive bosses and ordinary Davels', () => {
    expect(bossPresentation([robot({ active: false })])).toBeNull();
    expect(bossPresentation([robot({ id: 0, bossPhase: 0 })])).toBeNull();
  });
});
