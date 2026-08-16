import { describe, expect, it } from 'vitest';
import { ReplayRecorder } from '../src/replay/replay';
import { GameSimulation } from '../src/sim/game';
import { inspectReplay } from '../src/tooling/replay-inspector-model';

function recordedReplay() {
  const simulation = new GameSimulation('replay-inspector-proof');
  const recorder = new ReplayRecorder(simulation);
  recorder.markAgentRun();
  for (let tick = 0; tick < 180; tick += 1) {
    const command = {
      forward: tick < 60 ? 1 : 0, strafe: tick >= 60 && tick < 120 ? 0.5 : 0,
      yawDelta: tick % 30 === 0 ? 0.03 : 0, pitchDelta: 0,
      fire: tick >= 120, altFire: false, weapon: null,
    } as const;
    simulation.step(command); recorder.record(command);
  }
  return recorder.finish();
}

describe('replay inspector model', () => {
  it('strictly parses and re-simulates a replay with activity diagnostics', () => {
    const inspection = inspectReplay(recordedReplay());
    expect(inspection).toMatchObject({
      verified: true, dependenciesCurrent: true, initialTick: 0, finalTick: 180,
      ticksPlayed: 180, movementTicks: 120, fireTicks: 60, checksumCount: 4,
    });
    expect(inspection.verifiedFinalChecksum).toBe(inspection.declaredFinalChecksum);
    expect(inspection.commandRunCount).toBeLessThan(inspection.ticksPlayed);
  });

  it('reports stale dependencies and checksum drift without hiding parsed diagnostics', () => {
    const stale = structuredClone(recordedReplay());
    (stale.dependencyHashes as { levelData: string }).levelData = '0000000000000000';
    expect(inspectReplay(stale)).toMatchObject({ verified: false, dependenciesCurrent: false });
    const drift = structuredClone(recordedReplay());
    (drift.checksums[drift.checksums.length - 1] as { checksum: string }).checksum = '0000000000000000';
    const inspection = inspectReplay(drift);
    expect(inspection.verified).toBe(false);
    expect(inspection.verificationError).toMatch(/checksum drift/);
  });
});
