import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../src/sim/game';
import { TRAINING_WEAPON_MASK } from '../src/sim/weapons';
import { campaignLevel } from '../src/content/levels/catalog';
import { WORLD_AUDIO_DISTANT_REPORT_START } from '../src/audio/spatial-audio';

const idle = { forward: 0, strafe: 0, yawDelta: 0, pitchDelta: 0, fire: false } as const;

// verify-production-runtime.mjs relies on this geometry to produce a deterministic distant audio report.
describe('Level 1 spawn-corridor bomb', () => {
  it('detonates beyond the distant-report threshold for any throw tick and small aim error', () => {
    for (const yawError of [-0.25, 0, 0.25]) {
      for (const throwTick of [1, 240, 900]) {
        const simulation = new GameSimulation(
          campaignLevel('level-001').seed, TRAINING_WEAPON_MASK, undefined, 'campaign', 'level-001', 'standard',
        );
        expect(simulation.state.player.yaw).toBeCloseTo(Math.PI);
        for (let tick = 0; tick < throwTick; tick += 1) simulation.step(idle);
        simulation.step({ ...idle, weapon: 'bomb', yawDelta: -Math.PI / 2 + yawError });
        simulation.step({ ...idle, weapon: 'bomb', fire: true });
        let distance: number | null = null;
        for (let tick = 0; tick < 200 && distance === null; tick += 1) {
          simulation.step(idle);
          const detonation = simulation.state.events.find((event) => event.type === 'bomb-detonated');
          if (detonation !== undefined) {
            distance = Math.hypot(detonation.x! - simulation.state.player.x, detonation.z! - simulation.state.player.z);
          }
        }
        expect(distance).not.toBeNull();
        expect(distance!).toBeGreaterThan(WORLD_AUDIO_DISTANT_REPORT_START + 2);
      }
    }
  });
});
