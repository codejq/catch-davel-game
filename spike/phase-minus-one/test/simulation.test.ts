import { describe, expect, it } from 'vitest';
import { PARTICLE_COUNT } from '../src/sim/constants';
import { Simulation } from '../src/sim/simulation';
import { SNAPSHOT_BYTES } from '../src/sim/snapshot';

describe('authoritative simulation', () => {
  it('produces identical checksums for the same seed and tick stream', () => {
    const first = new Simulation('determinism');
    const second = new Simulation('determinism');
    for (let tick = 0; tick < 600; tick += 1) {
      expect(first.step().checksum).toBe(second.step().checksum);
    }
  });

  it('matches the frozen schema-v1 smoke checksum', () => {
    const simulation = new Simulation('phase-minus-one-determinism-smoke');
    for (let tick = 0; tick < 600; tick += 1) simulation.step();
    expect(simulation.checksum()).toBe('1f7b580c');
  });

  it('produces different evolved state for a different seed', () => {
    const first = new Simulation('seed-a');
    const second = new Simulation('seed-b');
    for (let tick = 0; tick < 120; tick += 1) {
      first.step();
      second.step();
    }
    expect(first.checksum()).not.toBe(second.checksum());
  });

  it('keeps every particle finite and inside the arena', () => {
    const simulation = new Simulation('finite');
    for (let tick = 0; tick < 600; tick += 1) simulation.step();
    for (let particle = 0; particle < PARTICLE_COUNT; particle += 1) {
      expect(Number.isFinite(simulation.state.particles.x[particle])).toBe(true);
      expect(Number.isFinite(simulation.state.particles.y[particle])).toBe(true);
      expect(Number.isFinite(simulation.state.particles.z[particle])).toBe(true);
      expect(simulation.state.particles.y[particle]!).toBeGreaterThanOrEqual(0.11);
    }
  });

  it('writes a self-contained fixed-size snapshot every tick', () => {
    const simulation = new Simulation('snapshot');
    const result = simulation.step();
    expect(result.snapshot.byteLength).toBe(SNAPSHOT_BYTES);
    const header = new Uint32Array(result.snapshot, 0, 16);
    expect(header[0]).toBe(1);
    expect(header[1]).toBe(1);
    expect(header[2]).toBe(1);
    expect(header[3]).toBe(360);
    expect(header[4]).toBe(24);
  });

  it('exercises a burst larger than one provisional 64-record batch', () => {
    const simulation = new Simulation('bomb-squad');
    let burstEvents = 0;
    for (let tick = 0; tick <= 120; tick += 1) burstEvents = simulation.step().eventCount;
    expect(burstEvents).toBeGreaterThan(64);
  });
});
