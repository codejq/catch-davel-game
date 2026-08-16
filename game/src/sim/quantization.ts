import type { GameState } from './game';

export const AUTHORITATIVE_DECIMAL_PLACES = 8;
const SCALE = 10 ** AUTHORITATIVE_DECIMAL_PLACES;

export function quantizeAuthoritativeNumber(value: number): number {
  const quantized = Math.round(value * SCALE) / SCALE;
  return Object.is(quantized, -0) ? 0 : quantized;
}

function quantizeArray(values: Float64Array): void {
  for (let index = 0; index < values.length; index += 1) values[index] = quantizeAuthoritativeNumber(values[index]!);
}

export function quantizeSimulationState(state: GameState): void {
  const player = state.player;
  player.x = quantizeAuthoritativeNumber(player.x);
  player.z = quantizeAuthoritativeNumber(player.z);
  player.yaw = quantizeAuthoritativeNumber(player.yaw);
  player.pitch = quantizeAuthoritativeNumber(player.pitch);
  player.health = quantizeAuthoritativeNumber(player.health);
  player.energy = quantizeAuthoritativeNumber(player.energy);
  player.bobPhase = quantizeAuthoritativeNumber(player.bobPhase);
  player.swordHeat = quantizeAuthoritativeNumber(player.swordHeat);
  player.laserHeat = quantizeAuthoritativeNumber(player.laserHeat);
  for (const robot of state.robots) {
    robot.x = quantizeAuthoritativeNumber(robot.x);
    robot.z = quantizeAuthoritativeNumber(robot.z);
    robot.heading = quantizeAuthoritativeNumber(robot.heading);
    robot.danceTime = quantizeAuthoritativeNumber(robot.danceTime);
    robot.health = quantizeAuthoritativeNumber(robot.health);
    robot.knockbackX = quantizeAuthoritativeNumber(robot.knockbackX);
    robot.knockbackZ = quantizeAuthoritativeNumber(robot.knockbackZ);
    quantizeArray(robot.body.positions);
    quantizeArray(robot.body.previous);
    quantizeArray(robot.body.restLengths);
  }
  for (const projectile of state.projectiles) {
    projectile.x = quantizeAuthoritativeNumber(projectile.x);
    projectile.y = quantizeAuthoritativeNumber(projectile.y);
    projectile.z = quantizeAuthoritativeNumber(projectile.z);
    projectile.velocityX = quantizeAuthoritativeNumber(projectile.velocityX);
    projectile.velocityY = quantizeAuthoritativeNumber(projectile.velocityY);
    projectile.velocityZ = quantizeAuthoritativeNumber(projectile.velocityZ);
  }
  for (const bomb of state.playerBombs) {
    bomb.x = quantizeAuthoritativeNumber(bomb.x);
    bomb.y = quantizeAuthoritativeNumber(bomb.y);
    bomb.z = quantizeAuthoritativeNumber(bomb.z);
    bomb.velocityX = quantizeAuthoritativeNumber(bomb.velocityX);
    bomb.velocityY = quantizeAuthoritativeNumber(bomb.velocityY);
    bomb.velocityZ = quantizeAuthoritativeNumber(bomb.velocityZ);
  }
  state.laserBeamDistance = quantizeAuthoritativeNumber(state.laserBeamDistance);
}
