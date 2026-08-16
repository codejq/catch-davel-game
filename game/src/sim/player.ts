import { FIXED_DT_SECONDS, PLAYER_RADIUS, PLAYER_SPEED } from './constants';
import { cellCenter, findCell, isPlayerPositionValidWithBlockers, type CellCoordinate } from './level';
import {
  CAMPAIGN_LEVEL_1_WEAPON_MASK, DEFAULT_WEAPON_UPGRADES, normalizeWeaponUpgradeLevels, weaponUnlocked,
  type WeaponId, type WeaponUpgradeLevels,
} from './weapons';

export interface PlayerState {
  x: number;
  z: number;
  yaw: number;
  pitch: number;
  health: number;
  energy: number;
  coins: number;
  bobPhase: number;
  selectedWeapon: WeaponId;
  unlockedWeaponMask: number;
  bombs: number;
  swordHeat: number;
  laserHeat: number;
  laserOverheated: boolean;
  readonly weaponUpgrades: WeaponUpgradeLevels;
}

export interface PlayerCommand {
  readonly forward: number;
  readonly strafe: number;
  readonly yawDelta: number;
  readonly pitchDelta: number;
  readonly fire: boolean;
  readonly altFire?: boolean;
  readonly weapon?: WeaponId | null;
}

export function createPlayer(
  unlockedWeaponMask = CAMPAIGN_LEVEL_1_WEAPON_MASK,
  weaponUpgrades: WeaponUpgradeLevels = DEFAULT_WEAPON_UPGRADES,
): PlayerState {
  const start = findCell('S');
  const point = cellCenter(start.column, start.row);
  return {
    x: point.x, z: point.z, yaw: Math.PI, pitch: 0, health: 100, energy: 100, coins: 0, bobPhase: 0,
    selectedWeapon: 'pulse', unlockedWeaponMask, bombs: 3 + weaponUpgrades.bombCapacity,
    swordHeat: 0, laserHeat: 0, laserOverheated: false,
    weaponUpgrades: normalizeWeaponUpgradeLevels(weaponUpgrades),
  };
}

export function stepPlayer(player: PlayerState, command: PlayerCommand, blockedCells: readonly CellCoordinate[] = []): void {
  if (command.weapon !== undefined && command.weapon !== null && weaponUnlocked(player.unlockedWeaponMask, command.weapon)) player.selectedWeapon = command.weapon;
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
  if (isPlayerPositionValidWithBlockers(player.x + deltaX, player.z, PLAYER_RADIUS, blockedCells)) player.x += deltaX;
  if (isPlayerPositionValidWithBlockers(player.x, player.z + deltaZ, PLAYER_RADIUS, blockedCells)) player.z += deltaZ;
  const movement = Math.hypot(deltaX, deltaZ);
  if (movement > 0.0001) player.bobPhase += movement * 2.8;
}
