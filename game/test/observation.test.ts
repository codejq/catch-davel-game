import { describe, expect, it } from 'vitest';
import { createObservation, levelObservation } from '../src/agent/observation';
import { GameSimulation } from '../src/sim/game';

describe('agent observation contract', () => {
  it('provides stable structured state and a machine-readable maze', () => {
    const first = new GameSimulation('agent-proof');
    const second = new GameSimulation('agent-proof');
    expect(createObservation(first.state)).toEqual(createObservation(second.state));
    const observation = createObservation(first.state);
    expect(observation.schemaVersion).toBe(19);
    expect(observation.difficulty).toBe('standard');
    expect(observation.run).toEqual({
      elapsedTicks: 0, score: 0, rangedAttacksFired: 0, rangedAttacksHit: 0, accuracyPermille: null,
      damageTaken: 0, robotsDefeated: 0, coinsCollected: 0, secretsFound: 0,
      currentCombo: 0, highestCombo: 0,
    });
    expect(observation.dancePerformance).toEqual({
      presetId: 'wobble-march', bpm: 96, visualIntensity: 0.65, motif: 'wobble-march',
      absoluteStep: 0, barStep: 0, phase: 'neutral',
    });
    expect(observation.encounter).toEqual({ waveIndex: 0, waveCount: 1, pendingTicks: 0 });
    expect(observation.levelMechanic).toEqual({
      kind: 'standard', phase: 'active', robotsFrozen: false, ticksUntilPhaseChange: null,
    });
    expect(observation.levelId).toBe('level-001');
    expect(observation.player.selectedWeapon).toBe('pulse');
    expect(observation.player.unlockedWeapons).toEqual(['pulse']);
    expect(observation.player).toMatchObject({
      maxHealth: 100, maxEnergy: 100, playerUpgrades: { maxHealth: 0, maxEnergy: 0 },
      pulseBurstShots: 0, pulseSpreadRadians: 0,
      dash: { unlocked: false, cooldownTicks: 0, maximumCooldownTicks: 48, energyCost: 24 },
    });
    expect(observation.playerBombs).toEqual([]);
    expect(observation.robots).toHaveLength(6);
    expect(observation.robots.map((robot) => robot.id)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(observation.robots[0]!.weakPoint).toMatchObject({
      active: false, damageMultiplier: 1.5, coinMultiplier: 2,
    });
    expect(observation.robots[0]!.shield).toEqual({ active: false, damageMultiplier: 0.25 });
    expect(observation.pickups.map((pickup) => pickup.id)).toEqual(['repair-kit', 'workshop-key', 'pulse-cell']);
    expect(observation.objective).toEqual({ id: 'deactivate-davels', complete: false, exitUnlocked: false });
    expect(observation.door).toMatchObject({ id: 'workshop-lock', open: false, requiresKey: true });
    expect(levelObservation().rows.every((row) => row.length === 15)).toBe(true);
  });

  it('exposes the Chapter 2 dash unlock and cooldown without hidden state', () => {
    const game = new GameSimulation('agent-dash', undefined, undefined, 'campaign', 'level-011');
    game.state.player.dashCooldownTicks = 31;
    expect(createObservation(game.state).player.dash).toEqual({
      unlocked: true, cooldownTicks: 31, maximumCooldownTicks: 48, energyCost: 24,
    });
  });

  it('exposes the exact active weak-point target without hidden state', () => {
    const game = new GameSimulation('agent-weak-point');
    game.state.tick = 19;
    const observation = createObservation(game.state);
    expect(observation.dancePerformance).toMatchObject({ barStep: 2, phase: 'vulnerable' });
    expect(observation.robots.every((robot) => robot.weakPoint.active)).toBe(true);
    expect(observation.robots[0]!.weakPoint).toMatchObject({
      radius: 0.221, damageMultiplier: 1.5, coinMultiplier: 2,
    });
  });

  it('exposes ambush and freeze-dance phases without hidden agent state', () => {
    const ambush = new GameSimulation('agent-ambush', undefined, undefined, 'campaign', 'level-004');
    expect(createObservation(ambush.state)).toMatchObject({
      remainingRobots: 0,
      levelMechanic: { kind: 'key-ambush', phase: 'armed', robotsFrozen: false, ticksUntilPhaseChange: null },
    });
    const key = ambush.state.level.pickups.find((pickup) => pickup.kind === 'key')!;
    ambush.state.player.x = key.x;
    ambush.state.player.z = key.z;
    ambush.step({ forward: 0, strafe: 0, yawDelta: 0, pitchDelta: 0, fire: false });
    expect(createObservation(ambush.state)).toMatchObject({
      remainingRobots: 7,
      levelMechanic: { kind: 'key-ambush', phase: 'ambush', robotsFrozen: false, ticksUntilPhaseChange: null },
    });

    const freeze = new GameSimulation('agent-freeze', undefined, undefined, 'campaign', 'level-007');
    expect(createObservation(freeze.state).levelMechanic).toEqual({
      kind: 'freeze-dance', phase: 'freeze', robotsFrozen: true, ticksUntilPhaseChange: 60,
    });
    freeze.state.tick = 60;
    expect(createObservation(freeze.state).levelMechanic).toEqual({
      kind: 'freeze-dance', phase: 'hunt', robotsFrozen: false, ticksUntilPhaseChange: 120,
    });
  });

  it('exposes the Level 17 defense target and its immediate threats', () => {
    const game = new GameSimulation('agent-defense', undefined, undefined, 'campaign', 'level-017');
    const target = game.state.level.defense!;
    game.state.level.keyCollected = true;
    game.state.robots[0]!.x = target.x;
    game.state.robots[0]!.z = target.z;
    expect(createObservation(game.state)).toMatchObject({
      objective: { id: 'defend-prize-bank', complete: false },
      defense: {
        id: 'prize-bank', health: 360, maxHealth: 360,
        threatenedByRobotIds: [game.state.robots[0]!.id],
      },
    });
  });

  it('exposes the Level 18 key-driven route reversal without hidden state', () => {
    const game = new GameSimulation('agent-backtrack', undefined, undefined, 'campaign', 'level-018');
    expect(createObservation(game.state)).toMatchObject({
      levelMechanic: { kind: 'branch-route', phase: 'armed' },
      hazards: [
        { id: 'backtrack-forward-gate', active: false, ticksUntilToggle: 0 },
        { id: 'backtrack-return-gate', active: true, ticksUntilToggle: 0 },
      ],
    });
    const key = game.state.level.pickups.find((pickup) => pickup.kind === 'key')!;
    game.state.player.x = key.x;
    game.state.player.z = key.z;
    game.step({ forward: 0, strafe: 0, yawDelta: 0, pitchDelta: 0, fire: false });
    expect(createObservation(game.state)).toMatchObject({
      levelMechanic: { kind: 'branch-route', phase: 'active' },
      hazards: [
        { id: 'backtrack-forward-gate', active: true, ticksUntilToggle: 0 },
        { id: 'backtrack-return-gate', active: false, ticksUntilToggle: 0 },
      ],
    });
  });
});
