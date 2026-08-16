import { PLAYER_EYE_HEIGHT } from '../sim/constants';
import type { GameState } from '../sim/game';
import { isWallAtWorld, LEVEL_ROWS, worldCell } from '../sim/level';
import { ROBOT_DEFINITIONS } from '../sim/robots';

export interface RobotObservation {
  readonly id: number;
  readonly name: string;
  readonly dance: string;
  readonly relativeX: number;
  readonly relativeZ: number;
  readonly distance: number;
  readonly bearing: number;
  readonly heading: number;
  readonly health: number;
  readonly visible: boolean;
}

export interface AgentObservation {
  readonly schemaVersion: 1;
  readonly tick: number;
  readonly seed: string;
  readonly player: {
    readonly x: number;
    readonly z: number;
    readonly cellColumn: number;
    readonly cellRow: number;
    readonly yaw: number;
    readonly pitch: number;
    readonly health: number;
    readonly energy: number;
    readonly coins: number;
  };
  readonly robots: readonly RobotObservation[];
  readonly remainingRobots: number;
  readonly victory: boolean;
  readonly defeat: boolean;
  readonly hostileProjectiles: readonly {
    readonly id: number;
    readonly ownerRobotId: number;
    readonly relativeX: number;
    readonly relativeY: number;
    readonly relativeZ: number;
    readonly velocityX: number;
    readonly velocityY: number;
    readonly velocityZ: number;
  }[];
}

function round(value: number): number { return Math.round(value * 1_000) / 1_000; }

function normalizeAngle(value: number): number {
  let angle = value;
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function hasLineOfSight(originX: number, originZ: number, targetX: number, targetZ: number): boolean {
  const deltaX = targetX - originX;
  const deltaZ = targetZ - originZ;
  const distance = Math.hypot(deltaX, deltaZ);
  const steps = Math.max(1, Math.ceil(distance / 0.16));
  for (let step = 1; step < steps; step += 1) {
    const amount = step / steps;
    if (isWallAtWorld(originX + deltaX * amount, originZ + deltaZ * amount)) return false;
  }
  return true;
}

export function createObservation(state: GameState): AgentObservation {
  const playerCell = worldCell(state.player.x, state.player.z);
  const robots = state.robots.filter((robot) => robot.active).map((robot): RobotObservation => {
    const deltaX = robot.x - state.player.x;
    const deltaZ = robot.z - state.player.z;
    const absoluteBearing = Math.atan2(deltaX, -deltaZ);
    return {
      id: robot.id,
      name: ROBOT_DEFINITIONS[robot.id]!.name,
      dance: ROBOT_DEFINITIONS[robot.id]!.dance,
      relativeX: round(deltaX),
      relativeZ: round(deltaZ),
      distance: round(Math.hypot(deltaX, deltaZ)),
      bearing: round(normalizeAngle(absoluteBearing - state.player.yaw)),
      heading: round(robot.heading),
      health: robot.health,
      visible: hasLineOfSight(state.player.x, state.player.z, robot.x, robot.z),
    };
  });
  return {
    schemaVersion: 1,
    tick: state.tick,
    seed: state.seed,
    player: {
      x: round(state.player.x), z: round(state.player.z),
      cellColumn: playerCell.column, cellRow: playerCell.row,
      yaw: round(state.player.yaw), pitch: round(state.player.pitch),
      health: round(state.player.health), energy: round(state.player.energy), coins: state.player.coins,
    },
    robots,
    remainingRobots: robots.length,
    victory: state.victory,
    defeat: state.defeat,
    hostileProjectiles: state.projectiles.map((projectile) => ({
      id: projectile.id,
      ownerRobotId: projectile.ownerRobotId,
      relativeX: round(projectile.x - state.player.x),
      relativeY: round(projectile.y - PLAYER_EYE_HEIGHT),
      relativeZ: round(projectile.z - state.player.z),
      velocityX: round(projectile.velocityX),
      velocityY: round(projectile.velocityY),
      velocityZ: round(projectile.velocityZ),
    })),
  };
}

export function levelObservation(): { readonly rows: readonly string[]; readonly coordinateSystem: string } {
  return { rows: LEVEL_ROWS, coordinateSystem: `row/column grid; player eye y=${PLAYER_EYE_HEIGHT}` };
}
