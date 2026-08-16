import { BODY_POINT_COUNT } from '../sim/xpbd';
import type {
  RenderGameState, RenderPickupState, RenderPlayerBombState, RenderPlayerState, RenderProjectileState, RenderRobotState,
} from '../render/render-model';
import { WEAPON_IDS, type WeaponId } from '../sim/weapons';

export const TRANSPORT_CONTRACT_VERSION = 4;
export const MAX_RENDER_ROBOTS = 24;
export const MAX_RENDER_PROJECTILES = 64;
export const MAX_RENDER_PICKUPS = 8;
export const MAX_RENDER_PLAYER_BOMBS = 16;
export const RENDER_SNAPSHOT_HEADER_BYTES = 64;
export const RENDER_PLAYER_FLOATS = 9;
export const RENDER_ROBOT_FLOATS = 12 + BODY_POINT_COUNT * 3;
export const RENDER_PROJECTILE_FLOATS = 10;
export const RENDER_PICKUP_FLOATS = 5;
export const RENDER_LEVEL_FLOATS = 9;
export const RENDER_PLAYER_BOMB_FLOATS = 8;
export const RENDER_EFFECT_FLOATS = 2;
export const RENDER_SNAPSHOT_BYTES = RENDER_SNAPSHOT_HEADER_BYTES + (
  RENDER_PLAYER_FLOATS + MAX_RENDER_ROBOTS * RENDER_ROBOT_FLOATS + MAX_RENDER_PROJECTILES * RENDER_PROJECTILE_FLOATS
    + MAX_RENDER_PICKUPS * RENDER_PICKUP_FLOATS + MAX_RENDER_PLAYER_BOMBS * RENDER_PLAYER_BOMB_FLOATS
    + RENDER_LEVEL_FLOATS + RENDER_EFFECT_FLOATS
) * Float32Array.BYTES_PER_ELEMENT;

const HEADER_VERSION = 0;
const HEADER_TICK = 4;
const HEADER_ROBOT_COUNT = 8;
const HEADER_PROJECTILE_COUNT = 12;
const HEADER_FLAGS = 16;
const HEADER_COINS = 20;
const HEADER_EVENT_EPOCH = 24;
const HEADER_EVENT_HIGH_WATERMARK = 28;
const HEADER_RESYNC_REQUIRED = 32;
const HEADER_PICKUP_COUNT = 36;
const HEADER_LEVEL_FLAGS = 40;
const HEADER_PLAYER_WEAPON = 44;
const HEADER_UNLOCKED_WEAPON_MASK = 48;
const HEADER_PLAYER_BOMBS = 52;
const HEADER_PLAYER_BOMB_COUNT = 56;

function weaponCode(weapon: WeaponId): number { return WEAPON_IDS.indexOf(weapon); }
function decodeWeapon(code: number): WeaponId {
  const weapon = WEAPON_IDS[code];
  if (weapon === undefined) throw new Error(`Unknown render weapon code ${code}`);
  return weapon;
}

function combatStateCode(state: RenderRobotState['combatState']): number {
  if (state === 'patrol') return 0;
  if (state === 'telegraph') return 1;
  return 2;
}

function decodeCombatState(code: number): RenderRobotState['combatState'] {
  if (code === 0) return 'patrol';
  if (code === 1) return 'telegraph';
  if (code === 2) return 'recover';
  throw new Error(`Unknown robot combat state code ${code}`);
}

function projectileKindCode(kind: RenderProjectileState['kind']): number {
  if (kind === 'slider-bolt') return 0;
  if (kind === 'beat-bolt') return 1;
  return 2;
}

function decodeProjectileKind(code: number): RenderProjectileState['kind'] {
  if (code === 0) return 'slider-bolt';
  if (code === 1) return 'beat-bolt';
  if (code === 2) return 'fireball';
  throw new Error(`Unknown projectile kind code ${code}`);
}

function pickupKindCode(kind: RenderPickupState['kind']): number {
  if (kind === 'key') return 1;
  if (kind === 'health') return 2;
  return 3;
}

function decodePickupKind(code: number): RenderPickupState['kind'] {
  if (code === 1) return 'key';
  if (code === 2) return 'health';
  if (code === 3) return 'energy';
  throw new Error(`Unknown render pickup kind ${code}`);
}

export interface RenderSnapshotMetadata {
  readonly eventEpoch: number;
  readonly eventHighWatermark: number;
  readonly resyncRequired: boolean;
}

export interface DecodedRenderSnapshot {
  readonly state: RenderGameState;
  readonly metadata: RenderSnapshotMetadata;
}

function uint32(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff_ffff) throw new Error(`${label} must fit uint32`);
  return value;
}

function writePlayer(data: Float32Array, player: RenderPlayerState): void {
  data.set([
    player.x, player.z, player.yaw, player.pitch, player.health, player.energy, player.bobPhase,
    player.swordHeat, player.laserHeat,
  ], 0);
}

export function writeRenderSnapshot(
  buffer: ArrayBuffer,
  state: RenderGameState,
  metadata: RenderSnapshotMetadata = { eventEpoch: 0, eventHighWatermark: 0, resyncRequired: false },
): ArrayBuffer {
  if (buffer.byteLength !== RENDER_SNAPSHOT_BYTES) throw new Error(`RenderSnapshot buffer must be ${RENDER_SNAPSHOT_BYTES} bytes`);
  if (state.robots.length > MAX_RENDER_ROBOTS) throw new Error(`RenderSnapshot exceeds ${MAX_RENDER_ROBOTS} robots`);
  if (state.projectiles.length > MAX_RENDER_PROJECTILES) throw new Error(`RenderSnapshot exceeds ${MAX_RENDER_PROJECTILES} projectiles`);
  if (state.level.pickups.length > MAX_RENDER_PICKUPS) throw new Error(`RenderSnapshot exceeds ${MAX_RENDER_PICKUPS} pickups`);
  if (state.playerBombs.length > MAX_RENDER_PLAYER_BOMBS) throw new Error(`RenderSnapshot exceeds ${MAX_RENDER_PLAYER_BOMBS} player bombs`);
  new Uint8Array(buffer).fill(0);
  const header = new DataView(buffer, 0, RENDER_SNAPSHOT_HEADER_BYTES);
  header.setUint32(HEADER_VERSION, TRANSPORT_CONTRACT_VERSION, true);
  header.setUint32(HEADER_TICK, uint32(state.tick, 'state.tick'), true);
  header.setUint32(HEADER_ROBOT_COUNT, state.robots.length, true);
  header.setUint32(HEADER_PROJECTILE_COUNT, state.projectiles.length, true);
  header.setUint32(HEADER_FLAGS, (state.victory ? 1 : 0) | (state.defeat ? 2 : 0)
    | (state.laserActive ? 4 : 0) | (state.player.laserOverheated ? 8 : 0), true);
  header.setUint32(HEADER_COINS, uint32(state.player.coins, 'player.coins'), true);
  header.setUint32(HEADER_EVENT_EPOCH, uint32(metadata.eventEpoch, 'eventEpoch'), true);
  header.setUint32(HEADER_EVENT_HIGH_WATERMARK, uint32(metadata.eventHighWatermark, 'eventHighWatermark'), true);
  header.setUint32(HEADER_RESYNC_REQUIRED, metadata.resyncRequired ? 1 : 0, true);
  header.setUint32(HEADER_PICKUP_COUNT, state.level.pickups.length, true);
  header.setUint32(HEADER_LEVEL_FLAGS, (state.level.keyCollected ? 1 : 0) | (state.level.objectiveComplete ? 2 : 0), true);
  header.setUint32(HEADER_PLAYER_WEAPON, weaponCode(state.player.selectedWeapon), true);
  header.setUint32(HEADER_UNLOCKED_WEAPON_MASK, uint32(state.player.unlockedWeaponMask, 'player.unlockedWeaponMask'), true);
  header.setUint32(HEADER_PLAYER_BOMBS, uint32(state.player.bombs, 'player.bombs'), true);
  header.setUint32(HEADER_PLAYER_BOMB_COUNT, state.playerBombs.length, true);
  const data = new Float32Array(buffer, RENDER_SNAPSHOT_HEADER_BYTES);
  writePlayer(data, state.player);
  let offset = RENDER_PLAYER_FLOATS;
  for (const robot of state.robots) {
    data[offset] = robot.id;
    data[offset + 1] = robot.active ? 1 : 0;
    data[offset + 2] = robot.x;
    data[offset + 3] = robot.z;
    data[offset + 4] = robot.heading;
    data[offset + 5] = robot.health;
    data[offset + 6] = robot.hitFlashTicks;
    data[offset + 7] = robot.danceTime;
    data[offset + 8] = combatStateCode(robot.combatState);
    data[offset + 9] = robot.combatTicks;
    data[offset + 10] = robot.strafeDirection;
    data[offset + 11] = robot.tempoBuffTicks;
    if (robot.body.positions.length !== BODY_POINT_COUNT * 3) throw new Error(`Robot ${robot.id} has malformed render body`);
    for (let pointValue = 0; pointValue < BODY_POINT_COUNT * 3; pointValue += 1) {
      data[offset + 12 + pointValue] = robot.body.positions[pointValue]!;
    }
    offset += RENDER_ROBOT_FLOATS;
  }
  offset = RENDER_PLAYER_FLOATS + MAX_RENDER_ROBOTS * RENDER_ROBOT_FLOATS;
  for (const projectile of state.projectiles) {
    data.set([
      projectile.id, projectile.ownerRobotId, projectileKindCode(projectile.kind), projectile.x, projectile.y, projectile.z,
      projectile.velocityX, projectile.velocityY, projectile.velocityZ, projectile.lifeTicks,
    ], offset);
    offset += RENDER_PROJECTILE_FLOATS;
  }
  offset = RENDER_PLAYER_FLOATS + MAX_RENDER_ROBOTS * RENDER_ROBOT_FLOATS + MAX_RENDER_PROJECTILES * RENDER_PROJECTILE_FLOATS;
  for (const pickup of state.level.pickups) {
    data.set([pickupKindCode(pickup.kind), pickup.active ? 1 : 0, pickup.x, pickup.z, pickup.amount], offset);
    offset += RENDER_PICKUP_FLOATS;
  }
  offset = RENDER_PLAYER_FLOATS + MAX_RENDER_ROBOTS * RENDER_ROBOT_FLOATS + MAX_RENDER_PROJECTILES * RENDER_PROJECTILE_FLOATS
    + MAX_RENDER_PICKUPS * RENDER_PICKUP_FLOATS;
  for (const bomb of state.playerBombs) {
    data.set([
      bomb.id, bomb.x, bomb.y, bomb.z, bomb.velocityX, bomb.velocityY, bomb.velocityZ, bomb.fuseTicks,
    ], offset);
    offset += RENDER_PLAYER_BOMB_FLOATS;
  }
  offset = RENDER_PLAYER_FLOATS + MAX_RENDER_ROBOTS * RENDER_ROBOT_FLOATS + MAX_RENDER_PROJECTILES * RENDER_PROJECTILE_FLOATS
    + MAX_RENDER_PICKUPS * RENDER_PICKUP_FLOATS + MAX_RENDER_PLAYER_BOMBS * RENDER_PLAYER_BOMB_FLOATS;
  data.set([
    state.level.door.x, state.level.door.z, state.level.door.open ? 1 : 0,
    state.level.checkpoint.x, state.level.checkpoint.z, state.level.checkpoint.activated ? 1 : 0,
    state.level.exit.x, state.level.exit.z, state.level.objectiveComplete ? 1 : 0,
  ], offset);
  offset += RENDER_LEVEL_FLOATS;
  data.set([state.laserBeamDistance, state.laserFocusTicks], offset);
  return buffer;
}

function readPlayer(data: Float32Array, header: DataView, coins: number): RenderPlayerState {
  return {
    x: data[0]!, z: data[1]!, yaw: data[2]!, pitch: data[3]!,
    health: data[4]!, energy: data[5]!, coins, bobPhase: data[6]!,
    selectedWeapon: decodeWeapon(header.getUint32(HEADER_PLAYER_WEAPON, true)),
    unlockedWeaponMask: header.getUint32(HEADER_UNLOCKED_WEAPON_MASK, true),
    bombs: header.getUint32(HEADER_PLAYER_BOMBS, true),
    swordHeat: data[7]!, laserHeat: data[8]!,
    laserOverheated: (header.getUint32(HEADER_FLAGS, true) & 8) !== 0,
  };
}

export function decodeRenderSnapshot(buffer: ArrayBuffer | ArrayBufferView): DecodedRenderSnapshot {
  const sourceBuffer = ArrayBuffer.isView(buffer) ? buffer.buffer : buffer;
  const byteOffset = ArrayBuffer.isView(buffer) ? buffer.byteOffset : 0;
  const byteLength = ArrayBuffer.isView(buffer) ? buffer.byteLength : buffer.byteLength;
  if (byteLength !== RENDER_SNAPSHOT_BYTES) throw new Error(`RenderSnapshot has ${byteLength} bytes; expected ${RENDER_SNAPSHOT_BYTES}`);
  const header = new DataView(sourceBuffer, byteOffset, RENDER_SNAPSHOT_HEADER_BYTES);
  const version = header.getUint32(HEADER_VERSION, true);
  if (version !== TRANSPORT_CONTRACT_VERSION) throw new Error(`Unsupported transport contract version ${version}`);
  const robotCount = header.getUint32(HEADER_ROBOT_COUNT, true);
  const projectileCount = header.getUint32(HEADER_PROJECTILE_COUNT, true);
  const pickupCount = header.getUint32(HEADER_PICKUP_COUNT, true);
  const playerBombCount = header.getUint32(HEADER_PLAYER_BOMB_COUNT, true);
  if (robotCount > MAX_RENDER_ROBOTS || projectileCount > MAX_RENDER_PROJECTILES || pickupCount > MAX_RENDER_PICKUPS
    || playerBombCount > MAX_RENDER_PLAYER_BOMBS) {
    throw new Error('RenderSnapshot count exceeds fixed capacity');
  }
  const data = new Float32Array(sourceBuffer, byteOffset + RENDER_SNAPSHOT_HEADER_BYTES, (byteLength - RENDER_SNAPSHOT_HEADER_BYTES) / 4);
  const robots: RenderRobotState[] = [];
  let offset = RENDER_PLAYER_FLOATS;
  for (let index = 0; index < robotCount; index += 1) {
    const positions = new Float32Array(BODY_POINT_COUNT * 3);
    positions.set(data.subarray(offset + 12, offset + RENDER_ROBOT_FLOATS));
    robots.push({
      id: data[offset]!, active: data[offset + 1] === 1,
      x: data[offset + 2]!, z: data[offset + 3]!, heading: data[offset + 4]!,
      health: data[offset + 5]!, hitFlashTicks: data[offset + 6]!, danceTime: data[offset + 7]!,
      combatState: decodeCombatState(data[offset + 8]!), combatTicks: data[offset + 9]!,
      strafeDirection: data[offset + 10] === -1 ? -1 : 1, tempoBuffTicks: data[offset + 11]!,
      body: { positions },
    });
    offset += RENDER_ROBOT_FLOATS;
  }
  const projectiles: RenderProjectileState[] = [];
  offset = RENDER_PLAYER_FLOATS + MAX_RENDER_ROBOTS * RENDER_ROBOT_FLOATS;
  for (let index = 0; index < projectileCount; index += 1) {
    projectiles.push({
      id: data[offset]!, ownerRobotId: data[offset + 1]!, kind: decodeProjectileKind(data[offset + 2]!),
      x: data[offset + 3]!, y: data[offset + 4]!, z: data[offset + 5]!,
      velocityX: data[offset + 6]!, velocityY: data[offset + 7]!, velocityZ: data[offset + 8]!,
      lifeTicks: data[offset + 9]!,
    });
    offset += RENDER_PROJECTILE_FLOATS;
  }
  const pickups: RenderPickupState[] = [];
  offset = RENDER_PLAYER_FLOATS + MAX_RENDER_ROBOTS * RENDER_ROBOT_FLOATS + MAX_RENDER_PROJECTILES * RENDER_PROJECTILE_FLOATS;
  for (let index = 0; index < pickupCount; index += 1) {
    const kind = decodePickupKind(data[offset]!);
    pickups.push({
      id: `${kind}-${index}`,
      kind,
      active: data[offset + 1] === 1,
      x: data[offset + 2]!, z: data[offset + 3]!, amount: data[offset + 4]!,
    });
    offset += RENDER_PICKUP_FLOATS;
  }
  offset = RENDER_PLAYER_FLOATS + MAX_RENDER_ROBOTS * RENDER_ROBOT_FLOATS + MAX_RENDER_PROJECTILES * RENDER_PROJECTILE_FLOATS
    + MAX_RENDER_PICKUPS * RENDER_PICKUP_FLOATS;
  const playerBombs: RenderPlayerBombState[] = [];
  for (let index = 0; index < playerBombCount; index += 1) {
    playerBombs.push({
      id: data[offset]!, x: data[offset + 1]!, y: data[offset + 2]!, z: data[offset + 3]!,
      velocityX: data[offset + 4]!, velocityY: data[offset + 5]!, velocityZ: data[offset + 6]!, fuseTicks: data[offset + 7]!,
    });
    offset += RENDER_PLAYER_BOMB_FLOATS;
  }
  offset = RENDER_PLAYER_FLOATS + MAX_RENDER_ROBOTS * RENDER_ROBOT_FLOATS + MAX_RENDER_PROJECTILES * RENDER_PROJECTILE_FLOATS
    + MAX_RENDER_PICKUPS * RENDER_PICKUP_FLOATS + MAX_RENDER_PLAYER_BOMBS * RENDER_PLAYER_BOMB_FLOATS;
  const levelFlags = header.getUint32(HEADER_LEVEL_FLAGS, true);
  const flags = header.getUint32(HEADER_FLAGS, true);
  const effectOffset = offset + RENDER_LEVEL_FLOATS;
  return {
    state: {
      tick: header.getUint32(HEADER_TICK, true),
      player: readPlayer(data, header, header.getUint32(HEADER_COINS, true)),
      robots,
      projectiles,
      playerBombs,
      laserActive: (flags & 4) !== 0,
      laserBeamDistance: data[effectOffset]!,
      laserFocusTicks: data[effectOffset + 1]!,
      victory: (flags & 1) !== 0,
      defeat: (flags & 2) !== 0,
      level: {
        pickups,
        door: { x: data[offset]!, z: data[offset + 1]!, open: data[offset + 2] === 1 },
        checkpoint: { x: data[offset + 3]!, z: data[offset + 4]!, activated: data[offset + 5] === 1 },
        exit: { x: data[offset + 6]!, z: data[offset + 7]! },
        keyCollected: (levelFlags & 1) !== 0,
        objectiveComplete: (levelFlags & 2) !== 0,
      },
    },
    metadata: {
      eventEpoch: header.getUint32(HEADER_EVENT_EPOCH, true),
      eventHighWatermark: header.getUint32(HEADER_EVENT_HIGH_WATERMARK, true),
      resyncRequired: header.getUint32(HEADER_RESYNC_REQUIRED, true) === 1,
    },
  };
}
