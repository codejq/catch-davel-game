import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../src/sim/game';
import {
  decodeRenderSnapshot, MAX_RENDER_PROJECTILES, RENDER_SNAPSHOT_BYTES, TRANSPORT_CONTRACT_VERSION, writeRenderSnapshot,
} from '../src/transport/render-snapshot';
import { TRAINING_WEAPON_MASK } from '../src/sim/weapons';

const idle = { forward: 0, strafe: 0, yawDelta: 0, pitchDelta: 0, fire: false } as const;

describe('self-contained RenderSnapshot v13', () => {
  it('round-trips the complete presentation projection in a fixed buffer', () => {
    const simulation = new GameSimulation('render-snapshot-proof');
    simulation.state.player.coins = 123;
    for (let tick = 0; tick < 90; tick += 1) simulation.step(idle);
    simulation.state.metrics.highestCombo = 3;
    simulation.state.metrics.currentCombo = 2;
    simulation.state.lastShotTick = simulation.state.tick;
    simulation.state.pulseBurstShots = 3;
    const buffer = new ArrayBuffer(RENDER_SNAPSHOT_BYTES);
    writeRenderSnapshot(buffer, simulation.state, { eventEpoch: 3, eventHighWatermark: 77, resyncRequired: true });
    const decoded = decodeRenderSnapshot(buffer);
    expect(RENDER_SNAPSHOT_BYTES).toBe(9_872);
    expect(TRANSPORT_CONTRACT_VERSION).toBe(13);
    expect(decoded.state.difficulty).toBe('standard');
    expect(decoded.state.tick).toBe(simulation.state.tick);
    expect(decoded.state.player.coins).toBe(123);
    expect(decoded.state.player).toMatchObject({ maxHealth: 100, maxEnergy: 100 });
    expect(decoded.state.run).toEqual({ score: 1_455, currentCombo: 2, highestCombo: 3 });
    expect(decoded.state.player.selectedWeapon).toBe('pulse');
    expect(decoded.state.pulseBurstShots).toBe(3);
    expect(decoded.state.pulseSpreadRadians).toBeCloseTo(0.018);
    expect(decoded.state.playerBombs).toEqual([]);
    expect(decoded.state.robots).toHaveLength(6);
    expect(decoded.state.projectiles).toHaveLength(simulation.state.projectiles.length);
    expect(decoded.state.level.pickups).toHaveLength(3);
    expect(decoded.state.level.door.open).toBe(false);
    expect(decoded.state.level.objectiveComplete).toBe(false);
    expect(decoded.state.level.encounter).toEqual({ waveIndex: 0, waveCount: 1, pendingTicks: 0 });
    expect(decoded.state.robots[0]!.body.positions).toHaveLength(33);
    expect(decoded.state.robots[0]!.combatState).toBe(simulation.state.robots[0]!.combatState);
    expect(decoded.state.robots[0]!.body.positions[0]).toBeCloseTo(simulation.state.robots[0]!.body.positions[0]!, 4);
    expect(decoded.metadata).toEqual({ eventEpoch: 3, eventHighWatermark: 77, resyncRequired: true });
  });

  it('rejects malformed versions, byte lengths, and capacity overflow', () => {
    expect(() => decodeRenderSnapshot(new ArrayBuffer(10))).toThrow(/expected/);
    const wrongVersion = new ArrayBuffer(RENDER_SNAPSHOT_BYTES);
    new DataView(wrongVersion).setUint32(0, 99, true);
    expect(() => decodeRenderSnapshot(wrongVersion)).toThrow(/version/);
    const simulation = new GameSimulation();
    const projectile = {
      id: 1, ownerRobotId: 0, kind: 'beat-bolt' as const, x: 0, y: 1, z: 0,
      velocityX: 0, velocityY: 0, velocityZ: 0, lifeTicks: 1,
    };
    simulation.state.projectiles.push(...Array.from({ length: MAX_RENDER_PROJECTILES + 1 }, (_, id) => ({ ...projectile, id: id + 1 })));
    expect(() => writeRenderSnapshot(new ArrayBuffer(RENDER_SNAPSHOT_BYTES), simulation.state)).toThrow(/projectiles/);
  });

  it('carries complete training-arsenal presentation state without deltas', () => {
    const simulation = new GameSimulation('render-arsenal-proof', TRAINING_WEAPON_MASK);
    simulation.step({ ...idle, weapon: 'bomb', fire: true });
    simulation.step({ ...idle, weapon: 'laser', fire: true });
    const decoded = decodeRenderSnapshot(writeRenderSnapshot(new ArrayBuffer(RENDER_SNAPSHOT_BYTES), simulation.state));
    expect(decoded.state.player.selectedWeapon).toBe('laser');
    expect(decoded.state.player.bombs).toBe(2);
    expect(decoded.state.player.laserHeat).toBeGreaterThan(0);
    expect(decoded.state.playerBombs).toHaveLength(1);
    expect(decoded.state.laserActive).toBe(true);
  });

  it('carries the selected maze identity without changing the fixed byte budget', () => {
    const simulation = new GameSimulation('render-level-eight', undefined, undefined, 'campaign', 'level-008');
    const decoded = decodeRenderSnapshot(writeRenderSnapshot(new ArrayBuffer(RENDER_SNAPSHOT_BYTES), simulation.state));
    expect(decoded.state.levelId).toBe('level-008');
    expect(decoded.state.robots).toHaveLength(8);
  });

  it('carries the Level 6 conveyor as self-contained presentation state', () => {
    const simulation = new GameSimulation('render-conveyor', undefined, undefined, 'campaign', 'level-006');
    const decoded = decodeRenderSnapshot(writeRenderSnapshot(new ArrayBuffer(RENDER_SNAPSHOT_BYTES), simulation.state));
    expect(decoded.state.level.hazards).toEqual([expect.objectContaining({ kind: 'conveyor', active: true, directionX: 0, directionZ: 1 })]);
  });

  it('carries all three typed Level 8 clockwork gates', () => {
    const simulation = new GameSimulation('render-clockwork-gates', undefined, undefined, 'campaign', 'level-008');
    const decoded = decodeRenderSnapshot(writeRenderSnapshot(new ArrayBuffer(RENDER_SNAPSHOT_BYTES), simulation.state));
    expect(decoded.state.level.hazards).toHaveLength(3);
    expect(decoded.state.level.hazards.every((hazard) => hazard.kind === 'timed-door')).toBe(true);
    expect(decoded.state.level.hazards.map((hazard) => hazard.active)).toEqual([true, true, false]);
  });

  it('carries staged-wave timing in the fixed header', () => {
    const simulation = new GameSimulation('render-wave', undefined, undefined, 'campaign', 'level-009');
    for (const robot of simulation.state.robots) robot.active = false;
    simulation.state.level.encounter.pendingTicks = 45;
    const decoded = decodeRenderSnapshot(writeRenderSnapshot(new ArrayBuffer(RENDER_SNAPSHOT_BYTES), simulation.state));
    expect(decoded.state.level.encounter).toEqual({ waveIndex: 0, waveCount: 2, pendingTicks: 45 });
  });

  it('carries branch and secret coin caches without changing the fixed byte budget', () => {
    const simulation = new GameSimulation('render-cache', undefined, undefined, 'campaign', 'level-004');
    const decoded = decodeRenderSnapshot(writeRenderSnapshot(new ArrayBuffer(RENDER_SNAPSHOT_BYTES), simulation.state));
    expect(decoded.state.level.pickups.filter((pickup) => pickup.kind === 'coin')).toHaveLength(2);
    expect(RENDER_SNAPSHOT_BYTES).toBe(9_872);
  });
});
