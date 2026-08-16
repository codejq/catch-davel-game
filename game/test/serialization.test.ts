import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../src/sim/game';
import type { PlayerCommand } from '../src/sim/player';
import {
  canonicalJson, createSimulationSnapshot, parseSimulationSnapshot, serializeSimulationSnapshot, stateChecksum,
} from '../src/sim/serialization';

function command(tick: number): PlayerCommand {
  return {
    forward: tick % 180 < 90 ? 1 : 0,
    strafe: tick % 240 >= 160 ? 0.7 : 0,
    yawDelta: tick % 47 === 0 ? 0.025 : 0,
    pitchDelta: tick % 211 === 0 ? -0.004 : 0,
    fire: tick % 53 === 0,
  };
}

describe('canonical simulation serialization', () => {
  it('round-trips complete authoritative state and continues without checksum drift', () => {
    const uninterrupted = new GameSimulation('snapshot-proof');
    const checkpointed = new GameSimulation('snapshot-proof');
    for (let tick = 0; tick < 420; tick += 1) {
      uninterrupted.step(command(tick));
      checkpointed.step(command(tick));
    }
    const serialized = serializeSimulationSnapshot(checkpointed.state);
    const parsed = parseSimulationSnapshot(serialized);
    expect(canonicalJson(parsed)).toBe(serialized);
    const resumed = GameSimulation.fromSnapshot(parsed);
    expect(stateChecksum(resumed.state)).toBe(stateChecksum(uninterrupted.state));
    for (let tick = 420; tick < 900; tick += 1) {
      uninterrupted.step(command(tick));
      resumed.step(command(tick));
    }
    expect(stateChecksum(resumed.state)).toBe(stateChecksum(uninterrupted.state));
    expect(createSimulationSnapshot(resumed.state)).toEqual(createSimulationSnapshot(uninterrupted.state));
  });

  it('produces a stable checksum independent of transient presentation events', () => {
    const first = new GameSimulation('checksum-proof');
    const second = new GameSimulation('checksum-proof');
    for (let tick = 0; tick < 600; tick += 1) {
      first.step(command(tick));
      second.step(command(tick));
    }
    second.state.events.push({ tick: second.state.tick, type: 'pulse-fired' });
    expect(stateChecksum(first.state)).toMatch(/^[0-9a-f]{16}$/);
    expect(stateChecksum(second.state)).toBe(stateChecksum(first.state));
  });

  it('rejects unknown fields, incompatible schemas, and malformed bodies', () => {
    const snapshot = createSimulationSnapshot(new GameSimulation('validation-proof').state);
    expect(() => parseSimulationSnapshot(JSON.stringify({ ...snapshot, surprise: true }))).toThrow(/unknown or missing/);
    expect(() => parseSimulationSnapshot(JSON.stringify({ ...snapshot, simulationSchemaVersion: 7 }))).toThrow(/schema/);
    const malformed = structuredClone(snapshot);
    (malformed.robots[0]!.body.positions as number[]).pop();
    expect(() => parseSimulationSnapshot(JSON.stringify(malformed))).toThrow(/33 numbers/);
  });
});
