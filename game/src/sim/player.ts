import { FIXED_DT_SECONDS, PLAYER_SPEED } from './constants';
import { cellCenter, findCell, isPlayerPositionValid } from './level';

export interface PlayerState {
  x: number;
  z: number;
  yaw: number;
  pitch: number;
  health: number;
  energy: number;
  coins: number;
  bobPhase: number;
}

export interface PlayerCommand {
  readonly forward: number;
  readonly strafe: number;
  readonly yawDelta: number;
  readonly pitchDelta: number;
  readonly fire: boolean;
}

export function createPlayer(): PlayerState {
  const start = findCell('S');
  const point = cellCenter(start.column, start.row);
  return { x: point.x, z: point.z, yaw: Math.PI, pitch: 0, health: 100, energy: 100, coins: 0, bobPhase: 0 };
}

export function stepPlayer(player: PlayerState, command: PlayerCommand): void {
  player.yaw += command.yawDelta;
  player.pitch = Math.max(-1.25, Math.min(1.25, player.pitch + command.pitchDelta));
  const inputLength = Math.hypot(command.forward, command.strafe);
  const forward = inputLength > 1 ? command.forward / inputLength : command.forward;
  const strafe = inputLength > 1 ? command.strafe / inputLength : command.strafe;
  const sinYaw = Math.sin(player.yaw);
  const cosYaw = Math.cos(player.yaw);
  const distance = PLAYER_SPEED * FIXED_DT_SECONDS;
  const deltaX = (sinYaw * forward + cosYaw * strafe) * distance;
  const deltaZ = (-cosYaw * forward + sinYaw * strafe) * distance;
  if (isPlayerPositionValid(player.x + deltaX, player.z)) player.x += deltaX;
  if (isPlayerPositionValid(player.x, player.z + deltaZ)) player.z += deltaZ;
  const movement = Math.hypot(deltaX, deltaZ);
  if (movement > 0.0001) player.bobPhase += movement * 2.8;
}
