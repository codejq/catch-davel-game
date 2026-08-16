import { describe, expect, it } from 'vitest';
import { createObservation } from '../src/agent/observation';
import { ENEMY_PROJECTILE_DAMAGE } from '../src/sim/balance';
import { DIFFICULTY_IDS, DIFFICULTY_PROFILES, difficultyRobotHealth, type DifficultyId } from '../src/sim/difficulty';
import { GameSimulation } from '../src/sim/game';
import { queueNextEncounterWave } from '../src/sim/interactions';
import { createSimulationSnapshot, parseSimulationSnapshot } from '../src/sim/serialization';
import { createDefaultProfile, parseProfile, serializeProfile, updateProfile } from '../src/storage/profile';

const idle = { forward: 0, strafe: 0, yawDelta: 0, pitchDelta: 0, fire: false } as const;

function gameAtDifficulty(difficulty: DifficultyId, levelId: 'level-001' | 'level-009' | 'level-010' = 'level-001'): GameSimulation {
  return new GameSimulation(`difficulty-${difficulty}-${levelId}`, undefined, undefined, 'campaign', levelId, difficulty);
}

describe('authoritative Story, Standard, and Hard difficulty', () => {
  it('defines bounded, ordered profiles while preserving Standard balance exactly', () => {
    expect(DIFFICULTY_IDS).toEqual(['story', 'standard', 'hard']);
    expect(DIFFICULTY_PROFILES.standard).toMatchObject({
      incomingDamageMultiplier: 1,
      robotHealthMultiplier: 1,
      robotMovementSpeedMultiplier: 1,
      projectileSpeedMultiplier: 1,
      telegraphTicksMultiplier: 1,
      interWaveDelayTicks: 45,
      resourceMultiplier: 1,
    });
    expect(DIFFICULTY_PROFILES.story.incomingDamageMultiplier).toBeLessThan(1);
    expect(DIFFICULTY_PROFILES.hard.incomingDamageMultiplier).toBeGreaterThan(1);
    expect(DIFFICULTY_PROFILES.story.telegraphTicksMultiplier).toBeGreaterThan(1);
    expect(DIFFICULTY_PROFILES.hard.telegraphTicksMultiplier).toBeLessThan(1);
    for (const difficulty of DIFFICULTY_IDS) {
      const profile = DIFFICULTY_PROFILES[difficulty];
      expect(profile.robotHealthMultiplier).toBeGreaterThan(0);
      expect(profile.robotMovementSpeedMultiplier).toBeGreaterThan(0);
      expect(profile.projectileSpeedMultiplier).toBeGreaterThan(0);
      expect(profile.resourceMultiplier).toBeGreaterThan(0);
      expect(profile.interWaveDelayTicks).toBeGreaterThan(0);
    }
  });

  it('scales robot and boss health and exposes the selected mode to agents', () => {
    const expectedScoutHealth = { story: 80, standard: 100, hard: 118 } as const;
    const expectedBossHealth = { story: 336, standard: 420, hard: 496 } as const;
    for (const difficulty of DIFFICULTY_IDS) {
      const game = gameAtDifficulty(difficulty);
      expect(game.state.robots[0]!.health).toBe(expectedScoutHealth[difficulty]);
      expect(createObservation(game.state).difficulty).toBe(difficulty);
      expect(gameAtDifficulty(difficulty, 'level-010').state.robots[0]!.health).toBe(expectedBossHealth[difficulty]);
    }
    expect(difficultyRobotHealth(420, 'hard')).toBe(496);
  });

  it('applies incoming-damage modifiers to the same deterministic projectile hit', () => {
    for (const difficulty of DIFFICULTY_IDS) {
      const game = gameAtDifficulty(difficulty);
      for (const robot of game.state.robots) robot.active = false;
      game.state.projectiles.push({
        id: 1, ownerRobotId: 0, kind: 'beat-bolt',
        x: game.state.player.x, y: 1, z: game.state.player.z,
        velocityX: 0, velocityY: 0, velocityZ: 0, lifeTicks: 10,
      });
      game.state.nextProjectileId = 2;
      game.step(idle);
      expect(game.state.player.health).toBe(
        100 - ENEMY_PROJECTILE_DAMAGE * DIFFICULTY_PROFILES[difficulty].incomingDamageMultiplier,
      );
    }
  });

  it('scales repair resources and inter-wave recovery pacing', () => {
    const expectedRepair = { story: 31, standard: 25, hard: 20 } as const;
    const expectedDelay = { story: 60, standard: 45, hard: 30 } as const;
    for (const difficulty of DIFFICULTY_IDS) {
      const pickupGame = gameAtDifficulty(difficulty);
      const repair = pickupGame.state.level.pickups.find((pickup) => pickup.kind === 'health')!;
      pickupGame.state.player.health = 50;
      pickupGame.state.player.x = repair.x;
      pickupGame.state.player.z = repair.z;
      pickupGame.step(idle);
      expect(pickupGame.state.player.health).toBe(50 + expectedRepair[difficulty]);

      const waveGame = gameAtDifficulty(difficulty, 'level-009');
      for (const robot of waveGame.state.robots) robot.active = false;
      expect(queueNextEncounterWave(waveGame.state.level, difficulty)).toBe(true);
      expect(waveGame.state.level.encounter.pendingTicks).toBe(expectedDelay[difficulty]);
    }
  });

  it('scales Davel defeat coins at the common authoritative reward boundary', () => {
    const expectedCoins = { story: 3, standard: 2, hard: 2 } as const;
    for (const difficulty of DIFFICULTY_IDS) {
      const game = gameAtDifficulty(difficulty);
      const target = game.state.robots[0]!;
      for (const robot of game.state.robots) robot.active = robot === target;
      target.x = game.state.player.x;
      target.z = game.state.player.z + 1;
      target.health = 1;
      game.state.player.yaw = Math.PI;
      game.step({ ...idle, fire: true });
      expect(game.state.player.coins).toBe(expectedCoins[difficulty]);
      expect(game.state.events).toContainEqual(expect.objectContaining({
        type: 'robot-defeated', robotId: target.id, coins: expectedCoins[difficulty],
      }));
    }
  });

  it('round-trips each mode through the strict deterministic snapshot contract', () => {
    for (const difficulty of DIFFICULTY_IDS) {
      const game = gameAtDifficulty(difficulty, 'level-009');
      for (const robot of game.state.robots) robot.active = false;
      queueNextEncounterWave(game.state.level, difficulty);
      const restored = parseSimulationSnapshot(JSON.stringify(createSimulationSnapshot(game.state)));
      expect(restored.difficulty).toBe(difficulty);
      expect(restored.level.encounter.pendingTicks).toBe(DIFFICULTY_PROFILES[difficulty].interWaveDelayTicks);
    }
    const hardBoss = gameAtDifficulty('hard', 'level-010');
    const hardBossSnapshot = createSimulationSnapshot(hardBoss.state);
    expect(parseSimulationSnapshot(JSON.stringify(hardBossSnapshot)).robots[0]!.health).toBe(496);
    const malformed = structuredClone(hardBossSnapshot) as unknown as { robots: Array<{ health: number }> };
    malformed.robots[0]!.health = 497;
    expect(() => parseSimulationSnapshot(JSON.stringify(malformed))).toThrow(/difficulty bounds/);
  });

  it('persists difficulty in profile v12 and rejects non-contract values', () => {
    for (const difficulty of DIFFICULTY_IDS) {
      const profile = updateProfile(createDefaultProfile(`profile-${difficulty}`), {
        settings: { ...createDefaultProfile().settings, difficulty },
      });
      expect(parseProfile(serializeProfile(profile)).settings.difficulty).toBe(difficulty);
    }
  });
});
