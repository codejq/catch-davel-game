import { createPlayer, stepPlayer, type PlayerCommand, type PlayerState } from './player';
import { createRobots, stepRobots, type RobotState } from './robots';
import { firePulse, type ShotResult } from './combat';
import { stepEnemyCombat, type EnemyProjectile } from './enemy-combat';

export interface GameEvent {
  readonly tick: number;
  readonly type: 'pulse-fired' | 'robot-hit' | 'robot-defeated' | 'robot-fired' | 'player-hit' | 'victory' | 'defeat';
  readonly robotId?: number;
  readonly coins?: number;
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
}

export class GameSimulation {
  readonly state: GameState;

  constructor(seed = 'first-playable-v1') {
    this.state = {
      tick: 0, seed, player: createPlayer(), robots: createRobots(), events: [],
      lastShotTick: -1_000, shotSerial: 0, victory: false,
      defeat: false, projectiles: [], nextProjectileId: 1,
    };
  }

  step(command: PlayerCommand): void {
    this.state.events.length = 0;
    if (!this.state.defeat && !this.state.victory) stepPlayer(this.state.player, command);
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
        this.state.victory = true;
        this.state.events.push({ tick: this.state.tick, type: 'victory' });
      }
    }
  }
}
