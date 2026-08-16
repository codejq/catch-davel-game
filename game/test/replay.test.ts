import { describe, expect, it } from 'vitest';
import {
  ReplayRecorder, parseReplay, serializeReplay, verifyReplay, type ReplayFileV1,
} from '../src/replay/replay';
import { GameSimulation } from '../src/sim/game';
import type { PlayerCommand } from '../src/sim/player';
import { stateChecksum } from '../src/sim/serialization';

function scriptedCommand(tick: number): PlayerCommand {
  return {
    forward: tick < 90 || (tick >= 220 && tick < 280) ? 1 : 0,
    strafe: tick >= 120 && tick < 185 ? 1 : 0,
    yawDelta: tick % 41 === 0 ? -0.035 : 0,
    pitchDelta: tick % 173 === 0 ? 0.003 : 0,
    fire: tick % 67 === 0,
  };
}

function recordRun(ticks = 720): { simulation: GameSimulation; replay: ReplayFileV1 } {
  const simulation = new GameSimulation('replay-proof');
  const recorder = new ReplayRecorder(simulation);
  recorder.markAgentRun();
  for (let tick = 0; tick < ticks; tick += 1) {
    const command = scriptedCommand(tick);
    simulation.step(command);
    recorder.record(command);
  }
  return { simulation, replay: recorder.finish() };
}

describe('versioned deterministic replays', () => {
  it('records compressed commands and verifies every periodic checksum', () => {
    const { simulation, replay } = recordRun();
    expect(replay.agentRun).toBe(true);
    expect(replay.commandRuns.length).toBeLessThan(720);
    expect(replay.checksums.map((entry) => entry.tick)).toEqual([0, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660, 720]);
    const serialized = serializeReplay(replay);
    expect(serializeReplay(parseReplay(serialized))).toBe(serialized);
    const verified = verifyReplay(replay);
    expect(verified.ticksPlayed).toBe(720);
    expect(verified.finalChecksum).toBe(stateChecksum(simulation.state));
  });

  it('rejects command drift and stale dependencies', () => {
    const { replay } = recordRun(180);
    const drifted = structuredClone(replay);
    const firstCommand = drifted.commandRuns[0]!.command as { forward: number };
    firstCommand.forward = firstCommand.forward === 0 ? 1 : 0;
    expect(() => verifyReplay(drifted)).toThrow(/checksum drift/);
    const stale = structuredClone(replay);
    (stale.dependencyHashes as { balanceData: string }).balanceData = '0000000000000000';
    expect(() => verifyReplay(stale)).toThrow(/dependency mismatch: balanceData/);
  });

  it('rejects gaps, unknown fields, and missing final checksums', () => {
    const { replay } = recordRun(90);
    const gap = structuredClone(replay);
    (gap.commandRuns[0] as { startTick: number }).startTick = 1;
    expect(() => parseReplay(JSON.stringify(gap))).toThrow(/not contiguous/);
    const unknown = { ...replay, hiddenState: true };
    expect(() => parseReplay(JSON.stringify(unknown))).toThrow(/unknown or missing/);
    const incomplete = structuredClone(replay);
    (incomplete.checksums as unknown as unknown[]).pop();
    expect(() => parseReplay(JSON.stringify(incomplete))).toThrow(/final ticks/);
  });
});
