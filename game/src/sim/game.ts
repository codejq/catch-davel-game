import { createPlayer, stepPlayer, type PlayerCommand, type PlayerState } from './player';
import { createRobots, stepRobots, type RobotState } from './robots';
import { firePulse, type ShotResult } from './combat';
import { stepEnemyCombat, type EnemyProjectile } from './enemy-combat';
import { restoreSimulationState, type SimulationSnapshotV1 } from './serialization';
import {
  closedDoorCells, collectLevelInteractions, completePrimaryObjective, createLevelRuntime,
  openNearbyDoor, reachedUnlockedExit, type LevelRuntimeState,
} from './interactions';
import { DEFAULT_LEVEL_SEED } from './constants';
import { quantizeSimulationState } from './quantization';

export interface GameEvent {
  readonly tick: number;
  readonly type: 'pulse-fired' | 'robot-hit' | 'robot-defeated' | 'robot-fired' | 'player-hit' | 'victory' | 'defeat'
    | 'key-collected' | 'health-collected' | 'energy-collected' | 'door-opened' | 'checkpoint-activated'
    | 'objective-complete' | 'exit-unlocked';
  readonly robotId?: number;
  readonly coins?: number;
  readonly value?: number;
}

export interface GameState {
  tick: number;
  readonly seed: string;
  readonly player: PlayerState;
  readonly robots: RobotState[];
  readonly events: GameEvent[];
  lastShotTick: number;
  shotSerial: number;
  victory: boolean;
  defeat: boolean;
  readonly projectiles: EnemyProjectile[];
  nextProjectileId: number;
  readonly level: LevelRuntimeState;
}

export class GameSimulation {
  state: GameState;

  constructor(seed = DEFAULT_LEVEL_SEED) {
    this.state = GameSimulation.initialState(seed);
  }

  static fromSnapshot(snapshot: SimulationSnapshotV1): GameSimulation {
    const simulation = new GameSimulation(snapshot.seed);
    simulation.loadSnapshot(snapshot);
    return simulation;
  }

  reset(seed = DEFAULT_LEVEL_SEED): void {
    this.state = GameSimulation.initialState(seed);
  }

  loadSnapshot(snapshot: SimulationSnapshotV1): void {
    this.state = restoreSimulationState(snapshot);
  }

  private static initialState(seed: string): GameState {
    const state: GameState = {
      tick: 0, seed, player: createPlayer(), robots: createRobots(), events: [],
      lastShotTick: -1_000, shotSerial: 0, victory: false,
      defeat: false, projectiles: [], nextProjectileId: 1,
      level: createLevelRuntime(),
    };
    quantizeSimulationState(state);
    return state;
  }

  step(command: PlayerCommand): void {
    this.state.events.length = 0;
    if (this.state.defeat || this.state.victory) {
      this.state.tick += 1;
      return;
    }
    const doorEvent = openNearbyDoor(this.state.player, this.state.level);
    if (doorEvent !== null) this.state.events.push({ tick: this.state.tick, ...doorEvent });
    stepPlayer(this.state.player, command, closedDoorCells(this.state.level));
    for (const interaction of collectLevelInteractions(this.state.player, this.state.level)) {
      this.state.events.push({ tick: this.state.tick, ...interaction });
    }
    if (reachedUnlockedExit(this.state.player, this.state.level)) {
      this.state.victory = true;
      this.state.events.push({ tick: this.state.tick, type: 'victory' });
      quantizeSimulationState(this.state);
      this.state.tick += 1;
      return;
    }
    stepRobots(this.state.robots, this.state.seed);
    const enemyCombat = stepEnemyCombat(
      this.state.player, this.state.robots, this.state.projectiles, this.state.nextProjectileId,
    );
    this.state.nextProjectileId = enemyCombat.nextProjectileId;
    for (const robotId of enemyCombat.firedRobotIds) this.state.events.push({ tick: this.state.tick, type: 'robot-fired', robotId });
    for (const robotId of enemyCombat.playerHitRobotIds) this.state.events.push({ tick: this.state.tick, type: 'player-hit', robotId });
    if (this.state.player.health <= 0 && !this.state.defeat) {
      this.state.defeat = true;
      this.state.events.push({ tick: this.state.tick, type: 'defeat' });
    }
    this.state.player.energy = Math.min(100, this.state.player.energy + 0.12);
    if (command.fire && !this.state.defeat && !this.state.victory) {
      this.applyShot(firePulse(this.state.player, this.state.robots, this.state.tick, this.state.lastShotTick));
    }
    quantizeSimulationState(this.state);
    this.state.tick += 1;
  }

  private applyShot(result: ShotResult): void {
    if (!result.fired) return;
    this.state.lastShotTick = this.state.tick;
    this.state.shotSerial += 1;
    this.state.events.push({ tick: this.state.tick, type: 'pulse-fired' });
    if (result.hitRobotId !== null) this.state.events.push({ tick: this.state.tick, type: 'robot-hit', robotId: result.hitRobotId });
    if (result.defeatedRobotId !== null) {
      this.state.events.push({
        tick: this.state.tick, type: 'robot-defeated', robotId: result.defeatedRobotId, coins: result.coinsAwarded,
      });
      if (this.state.robots.every((robot) => !robot.active)) {
        for (const interaction of completePrimaryObjective(this.state.level)) {
          this.state.events.push({ tick: this.state.tick, ...interaction });
        }
      }
    }
  }
}
