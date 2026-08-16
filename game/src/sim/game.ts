import { createPlayer, stepPlayer, type PlayerCommand, type PlayerState } from './player';
import { createRobots, stepRobots, type EncounterId, type RobotState } from './robots';
import {
  BOMB_COOLDOWN_TICKS, LASER_BASE_DAMAGE, LASER_ENERGY_PER_TICK, LASER_HEAT_COOL_PER_TICK,
  LASER_HEAT_PER_TICK, LASER_MAX_FOCUS_BONUS, LASER_OVERHEAT_RECOVERY, SWORD_HEAT_COOL_PER_TICK,
  createThrownBomb, fireLaser, firePulse, stepPlayerBombs, swingSword, type ShotResult, type WeaponHit,
  LASER_HEAT_REDUCTION_PER_UPGRADE,
} from './combat';
import { stepEnemyCombat, type EnemyProjectile } from './enemy-combat';
import { restoreSimulationState, type SimulationSnapshotV1 } from './serialization';
import {
  closedDoorCells, collectLevelInteractions, completePrimaryObjective, createLevelRuntime,
  openNearbyDoor, queueNextEncounterWave, reachedUnlockedExit, stepEncounterWaves, stepLevelHazards,
  stepLevelHazardPhases,
  type LevelRuntimeState,
} from './interactions';
import { DEFAULT_LEVEL_SEED } from './constants';
import { quantizeSimulationState } from './quantization';
import {
  CAMPAIGN_LEVEL_1_WEAPON_MASK, DEFAULT_WEAPON_UPGRADES, type PlayerBomb, type WeaponUpgradeLevels,
} from './weapons';
import type { Chapter01LevelId } from '../content/levels/chapter-01';
import { activateKeyAmbush, freezeDanceWindow } from './level-mechanics';
import {
  createRunMetrics, recordDamageTaken, recordRangedAttack, recordRobotDefeat, type RunMetrics,
} from './run-metrics';

export interface GameEvent {
  readonly tick: number;
  readonly type: 'pulse-fired' | 'sword-swung' | 'sword-charged' | 'projectile-deflected'
    | 'bomb-thrown' | 'bomb-detonated' | 'laser-fired' | 'robot-hit' | 'robot-defeated' | 'robot-telegraph'
    | 'robot-fired' | 'robot-melee' | 'robot-buff' | 'boss-phase' | 'player-hit' | 'victory' | 'defeat'
    | 'key-collected' | 'health-collected' | 'energy-collected' | 'coin-collected' | 'door-opened' | 'checkpoint-activated'
    | 'objective-complete' | 'exit-unlocked' | 'ambush-triggered';
  readonly robotId?: number;
  readonly coins?: number;
  readonly value?: number;
}

export interface GameState {
  tick: number;
  readonly seed: string;
  readonly levelId: Chapter01LevelId;
  readonly encounter: EncounterId;
  readonly player: PlayerState;
  readonly robots: RobotState[];
  readonly events: GameEvent[];
  lastShotTick: number;
  shotSerial: number;
  victory: boolean;
  defeat: boolean;
  readonly projectiles: EnemyProjectile[];
  nextProjectileId: number;
  readonly playerBombs: PlayerBomb[];
  nextPlayerBombId: number;
  lastSwordTick: number;
  lastBombTick: number;
  laserFocusTicks: number;
  laserTargetRobotId: number | null;
  laserActive: boolean;
  laserBeamDistance: number;
  readonly level: LevelRuntimeState;
  readonly metrics: RunMetrics;
}

export class GameSimulation {
  state: GameState;

  constructor(
    seed = DEFAULT_LEVEL_SEED,
    unlockedWeaponMask = CAMPAIGN_LEVEL_1_WEAPON_MASK,
    weaponUpgrades: WeaponUpgradeLevels = DEFAULT_WEAPON_UPGRADES,
    encounter: EncounterId = 'campaign',
    levelId: Chapter01LevelId = 'level-001',
  ) {
    this.state = GameSimulation.initialState(seed, unlockedWeaponMask, weaponUpgrades, encounter, levelId);
  }

  static fromSnapshot(snapshot: SimulationSnapshotV1): GameSimulation {
    const simulation = new GameSimulation(snapshot.seed);
    simulation.loadSnapshot(snapshot);
    return simulation;
  }

  reset(
    seed = DEFAULT_LEVEL_SEED,
    unlockedWeaponMask = CAMPAIGN_LEVEL_1_WEAPON_MASK,
    weaponUpgrades: WeaponUpgradeLevels = DEFAULT_WEAPON_UPGRADES,
    encounter: EncounterId = 'campaign',
    levelId: Chapter01LevelId = 'level-001',
  ): void {
    this.state = GameSimulation.initialState(seed, unlockedWeaponMask, weaponUpgrades, encounter, levelId);
  }

  loadSnapshot(snapshot: SimulationSnapshotV1): void {
    this.state = restoreSimulationState(snapshot);
  }

  private static initialState(
    seed: string, unlockedWeaponMask: number, weaponUpgrades: WeaponUpgradeLevels, encounter: EncounterId,
    levelId: Chapter01LevelId,
  ): GameState {
    const state: GameState = {
      tick: 0, seed, levelId, encounter, player: createPlayer(unlockedWeaponMask, weaponUpgrades, levelId),
      robots: createRobots(encounter, levelId), events: [],
      lastShotTick: -1_000, shotSerial: 0, victory: false,
      defeat: false, projectiles: [], nextProjectileId: 1,
      playerBombs: [], nextPlayerBombId: 1, lastSwordTick: -1_000, lastBombTick: -1_000,
      laserFocusTicks: 0, laserTargetRobotId: null, laserActive: false, laserBeamDistance: 0,
      level: createLevelRuntime(levelId, encounter),
      metrics: createRunMetrics(),
    };
    quantizeSimulationState(state);
    return state;
  }

  step(command: PlayerCommand): void {
    this.state.events.length = 0;
    if (this.state.defeat || this.state.victory) {
      stepLevelHazardPhases(this.state.level, this.state.tick + 1);
      this.state.tick += 1;
      return;
    }
    stepEncounterWaves(this.state.robots, this.state.level, this.state.levelId);
    if (this.state.tick > this.state.metrics.comboExpiresTick) this.state.metrics.currentCombo = 0;
    const doorEvent = openNearbyDoor(this.state.player, this.state.level);
    if (doorEvent !== null) this.state.events.push({ tick: this.state.tick, ...doorEvent });
    stepLevelHazardPhases(this.state.level, this.state.tick);
    stepPlayer(this.state.player, command, closedDoorCells(this.state.level, this.state.player), this.state.levelId);
    stepLevelHazards(this.state.player, this.state.level, this.state.tick, this.state.levelId);
    const secretWasActive = this.state.level.pickups.some((pickup) => pickup.id === 'secret-coin-cache' && pickup.active);
    for (const interaction of collectLevelInteractions(this.state.player, this.state.level)) {
      this.state.events.push({ tick: this.state.tick, ...interaction });
    }
    if (secretWasActive && !this.state.level.pickups.some((pickup) => pickup.id === 'secret-coin-cache' && pickup.active)) {
      this.state.metrics.secretsFound += 1;
    }
    if (activateKeyAmbush(this.state.robots, this.state.levelId, this.state.level.keyCollected)) {
      this.state.events.push({ tick: this.state.tick, type: 'ambush-triggered' });
    }
    if (reachedUnlockedExit(this.state.player, this.state.level)) {
      this.state.victory = true;
      this.state.events.push({ tick: this.state.tick, type: 'victory' });
      stepLevelHazardPhases(this.state.level, this.state.tick + 1);
      quantizeSimulationState(this.state);
      this.state.tick += 1;
      return;
    }
    const robotsFrozen = freezeDanceWindow(this.state.levelId, this.state.tick).frozen;
    if (!robotsFrozen) stepRobots(this.state.robots, this.state.seed, this.state.player, this.state.levelId);
    this.coolWeapons();
    const healthBeforeEnemyCombat = this.state.player.health;
    const enemyCombat = stepEnemyCombat(
      this.state.player, this.state.robots, this.state.projectiles, this.state.nextProjectileId, this.state.levelId,
      robotsFrozen,
    );
    recordDamageTaken(this.state.metrics, healthBeforeEnemyCombat - this.state.player.health);
    this.state.nextProjectileId = enemyCombat.nextProjectileId;
    for (const robotId of enemyCombat.telegraphRobotIds) this.state.events.push({ tick: this.state.tick, type: 'robot-telegraph', robotId });
    for (const robotId of enemyCombat.firedRobotIds) this.state.events.push({ tick: this.state.tick, type: 'robot-fired', robotId });
    for (const robotId of enemyCombat.meleeRobotIds) this.state.events.push({ tick: this.state.tick, type: 'robot-melee', robotId });
    for (const robotId of enemyCombat.buffRobotIds) this.state.events.push({ tick: this.state.tick, type: 'robot-buff', robotId });
    for (const robotId of enemyCombat.bossPhaseRobotIds) {
      this.state.events.push({ tick: this.state.tick, type: 'boss-phase', robotId, value: this.state.robots.find((robot) => robot.id === robotId)!.bossPhase });
    }
    for (const robotId of enemyCombat.playerHitRobotIds) this.state.events.push({ tick: this.state.tick, type: 'player-hit', robotId });
    if (this.state.player.health <= 0 && !this.state.defeat) {
      this.state.defeat = true;
      this.state.events.push({ tick: this.state.tick, type: 'defeat' });
    }
    this.state.player.energy = Math.min(100, this.state.player.energy + 0.12);
    if (!this.state.defeat && !this.state.victory) this.stepSelectedWeapon(command);
    const detonatedBombs = stepPlayerBombs(this.state.player, this.state.robots, this.state.playerBombs, this.state.levelId);
    for (const bombId of detonatedBombs.detonatedBombIds) this.state.events.push({ tick: this.state.tick, type: 'bomb-detonated', value: bombId });
    for (const hit of detonatedBombs.hits) this.applyWeaponHit(hit);
    stepLevelHazardPhases(this.state.level, this.state.tick + 1);
    quantizeSimulationState(this.state);
    this.state.tick += 1;
  }

  private coolWeapons(): void {
    const player = this.state.player;
    player.swordHeat = Math.max(0, player.swordHeat - SWORD_HEAT_COOL_PER_TICK);
    if (!this.state.laserActive) player.laserHeat = Math.max(0, player.laserHeat - LASER_HEAT_COOL_PER_TICK);
    if (player.laserOverheated && player.laserHeat <= LASER_OVERHEAT_RECOVERY) player.laserOverheated = false;
    this.state.laserActive = false;
  }

  private stepSelectedWeapon(command: PlayerCommand): void {
    if (!command.fire) {
      this.state.laserFocusTicks = 0;
      this.state.laserTargetRobotId = null;
      return;
    }
    const player = this.state.player;
    if (player.selectedWeapon === 'pulse') {
      this.applyShot(firePulse(player, this.state.robots, this.state.tick, this.state.lastShotTick, this.state.levelId));
      return;
    }
    if (player.selectedWeapon === 'sword') {
      const result = swingSword(
        player, this.state.robots, this.state.projectiles, this.state.tick, this.state.lastSwordTick,
        command.altFire === true, this.state.levelId,
      );
      if (!result.activated) return;
      this.state.lastSwordTick = this.state.tick;
      this.state.shotSerial += 1;
      this.state.events.push({ tick: this.state.tick, type: result.charged ? 'sword-charged' : 'sword-swung' });
      for (const projectileId of result.deflectedProjectileIds) this.state.events.push({ tick: this.state.tick, type: 'projectile-deflected', value: projectileId });
      if (result.hit !== null) this.applyWeaponHit(result.hit);
      return;
    }
    if (player.selectedWeapon === 'bomb') {
      if (this.state.tick - this.state.lastBombTick < BOMB_COOLDOWN_TICKS || player.bombs <= 0) return;
      const bomb = createThrownBomb(player, this.state.nextPlayerBombId);
      this.state.nextPlayerBombId += 1;
      this.state.lastBombTick = this.state.tick;
      player.bombs -= 1;
      this.state.playerBombs.push(bomb);
      this.state.shotSerial += 1;
      this.state.events.push({ tick: this.state.tick, type: 'bomb-thrown', value: bomb.id });
      return;
    }
    if (player.laserOverheated || player.energy < LASER_ENERGY_PER_TICK) return;
    player.energy -= LASER_ENERGY_PER_TICK;
    const laserHeat = LASER_HEAT_PER_TICK * (1 - player.weaponUpgrades.laserCooling * LASER_HEAT_REDUCTION_PER_UPGRADE);
    player.laserHeat = Math.min(100, player.laserHeat + laserHeat);
    if (player.laserHeat >= 100) player.laserOverheated = true;
    const focus = Math.min(1, this.state.laserFocusTicks / 90);
    const result = fireLaser(
      player, this.state.robots, LASER_BASE_DAMAGE + LASER_MAX_FOCUS_BONUS * focus, this.state.levelId,
    );
    recordRangedAttack(this.state.metrics, result.hit !== null);
    this.state.laserActive = true;
    this.state.laserBeamDistance = result.beamDistance;
    this.state.shotSerial += 1;
    this.state.events.push(result.hit === null
      ? { tick: this.state.tick, type: 'laser-fired' }
      : { tick: this.state.tick, type: 'laser-fired', robotId: result.hit.robotId });
    if (result.hit === null) {
      this.state.laserFocusTicks = 0;
      this.state.laserTargetRobotId = null;
    } else {
      this.state.laserFocusTicks = this.state.laserTargetRobotId === result.hit.robotId ? this.state.laserFocusTicks + 1 : 1;
      this.state.laserTargetRobotId = result.hit.robotId;
      this.applyWeaponHit(result.hit);
    }
  }

  private applyShot(result: ShotResult): void {
    if (!result.fired) return;
    recordRangedAttack(this.state.metrics, result.hitRobotId !== null);
    this.state.lastShotTick = this.state.tick;
    this.state.shotSerial += 1;
    this.state.events.push({ tick: this.state.tick, type: 'pulse-fired' });
    if (result.hitRobotId !== null) this.applyWeaponHit({
      robotId: result.hitRobotId, defeated: result.defeatedRobotId === result.hitRobotId, coinsAwarded: result.coinsAwarded,
    });
  }

  private applyWeaponHit(hit: WeaponHit): void {
    this.state.events.push({ tick: this.state.tick, type: 'robot-hit', robotId: hit.robotId });
    if (!hit.defeated) return;
    recordRobotDefeat(this.state.metrics, hit.robotId, this.state.tick);
    this.state.events.push({ tick: this.state.tick, type: 'robot-defeated', robotId: hit.robotId, coins: hit.coinsAwarded });
    if (this.state.robots.every((robot) => !robot.active)) {
      if (this.state.level.encounter.pendingTicks > 0) return;
      if (queueNextEncounterWave(this.state.level)) return;
      for (const interaction of completePrimaryObjective(this.state.level)) this.state.events.push({ tick: this.state.tick, ...interaction });
    }
  }
}
