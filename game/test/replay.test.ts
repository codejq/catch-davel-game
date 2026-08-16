import { describe, expect, it } from 'vitest';
import {
  ReplayRecorder, parseReplay, serializeReplay, verifyReplay, type ReplayFile,
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
    sprint: tick >= 220 && tick < 280,
    fire: tick % 67 === 0,
  };
}

function recordRun(ticks = 720): { simulation: GameSimulation; replay: ReplayFile } {
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
    expect(replay.replayFormatVersion).toBe(2);
    expect(replay.commandRuns.some((run) => run.command.sprint)).toBe(true);
    expect(serializeReplay(parseReplay(serialized))).toBe(serialized);
    const verified = verifyReplay(replay);
    expect(verified.ticksPlayed).toBe(720);
    expect(verified.finalChecksum).toBe(stateChecksum(simulation.state));
  });

  it('uses an explicit incompatible-v1 policy after the authoritative sprint schema change', () => {
    const { replay } = recordRun(90);
    const legacy = { ...structuredClone(replay), replayFormatVersion: 1 };
    expect(() => parseReplay(JSON.stringify(legacy))).toThrow(/Unsupported replay format version/);
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

  it('binds Chapter 1 replays to their authoritative level definition', () => {
    const simulation = new GameSimulation('level-five-replay', undefined, undefined, 'campaign', 'level-005');
    const recorder = new ReplayRecorder(simulation);
    simulation.step(scriptedCommand(0));
    recorder.record(scriptedCommand(0));
    const replay = recorder.finish();
    expect(replay.levelId).toBe('level-005');
    expect(verifyReplay(replay).simulation.state.levelId).toBe('level-005');
    const substituted = { ...replay, levelId: 'level-006' as const };
    expect(() => verifyReplay(substituted)).toThrow(/level does not match/);
  });
});
