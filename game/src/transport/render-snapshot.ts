import { BODY_POINT_COUNT } from '../sim/xpbd';
import type { RenderGameState, RenderPlayerState, RenderProjectileState, RenderRobotState } from '../render/render-model';

export const TRANSPORT_CONTRACT_VERSION = 1;
export const MAX_RENDER_ROBOTS = 24;
export const MAX_RENDER_PROJECTILES = 64;
export const RENDER_SNAPSHOT_HEADER_BYTES = 64;
export const RENDER_PLAYER_FLOATS = 7;
export const RENDER_ROBOT_FLOATS = 8 + BODY_POINT_COUNT * 3;
export const RENDER_PROJECTILE_FLOATS = 9;
export const RENDER_SNAPSHOT_BYTES = RENDER_SNAPSHOT_HEADER_BYTES + (
  RENDER_PLAYER_FLOATS + MAX_RENDER_ROBOTS * RENDER_ROBOT_FLOATS + MAX_RENDER_PROJECTILES * RENDER_PROJECTILE_FLOATS
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
  data.set([player.x, player.z, player.yaw, player.pitch, player.health, player.energy, player.bobPhase], 0);
}

export function writeRenderSnapshot(
  buffer: ArrayBuffer,
  state: RenderGameState,
  metadata: RenderSnapshotMetadata = { eventEpoch: 0, eventHighWatermark: 0, resyncRequired: false },
): ArrayBuffer {
  if (buffer.byteLength !== RENDER_SNAPSHOT_BYTES) throw new Error(`RenderSnapshot buffer must be ${RENDER_SNAPSHOT_BYTES} bytes`);
  if (state.robots.length > MAX_RENDER_ROBOTS) throw new Error(`RenderSnapshot exceeds ${MAX_RENDER_ROBOTS} robots`);
  if (state.projectiles.length > MAX_RENDER_PROJECTILES) throw new Error(`RenderSnapshot exceeds ${MAX_RENDER_PROJECTILES} projectiles`);
  new Uint8Array(buffer).fill(0);
  const header = new DataView(buffer, 0, RENDER_SNAPSHOT_HEADER_BYTES);
  header.setUint32(HEADER_VERSION, TRANSPORT_CONTRACT_VERSION, true);
  header.setUint32(HEADER_TICK, uint32(state.tick, 'state.tick'), true);
  header.setUint32(HEADER_ROBOT_COUNT, state.robots.length, true);
  header.setUint32(HEADER_PROJECTILE_COUNT, state.projectiles.length, true);
  header.setUint32(HEADER_FLAGS, (state.victory ? 1 : 0) | (state.defeat ? 2 : 0), true);
  header.setUint32(HEADER_COINS, uint32(state.player.coins, 'player.coins'), true);
  header.setUint32(HEADER_EVENT_EPOCH, uint32(metadata.eventEpoch, 'eventEpoch'), true);
  header.setUint32(HEADER_EVENT_HIGH_WATERMARK, uint32(metadata.eventHighWatermark, 'eventHighWatermark'), true);
  header.setUint32(HEADER_RESYNC_REQUIRED, metadata.resyncRequired ? 1 : 0, true);
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
    if (robot.body.positions.length !== BODY_POINT_COUNT * 3) throw new Error(`Robot ${robot.id} has malformed render body`);
    for (let pointValue = 0; pointValue < BODY_POINT_COUNT * 3; pointValue += 1) {
      data[offset + 8 + pointValue] = robot.body.positions[pointValue]!;
    }
    offset += RENDER_ROBOT_FLOATS;
  }
  offset = RENDER_PLAYER_FLOATS + MAX_RENDER_ROBOTS * RENDER_ROBOT_FLOATS;
  for (const projectile of state.projectiles) {
    data.set([
      projectile.id, projectile.ownerRobotId, projectile.x, projectile.y, projectile.z,
      projectile.velocityX, projectile.velocityY, projectile.velocityZ, projectile.lifeTicks,
    ], offset);
    offset += RENDER_PROJECTILE_FLOATS;
  }
  return buffer;
}

function readPlayer(data: Float32Array, coins: number): RenderPlayerState {
  return {
    x: data[0]!, z: data[1]!, yaw: data[2]!, pitch: data[3]!,
    health: data[4]!, energy: data[5]!, coins, bobPhase: data[6]!,
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
  if (robotCount > MAX_RENDER_ROBOTS || projectileCount > MAX_RENDER_PROJECTILES) throw new Error('RenderSnapshot count exceeds fixed capacity');
  const data = new Float32Array(sourceBuffer, byteOffset + RENDER_SNAPSHOT_HEADER_BYTES, (byteLength - RENDER_SNAPSHOT_HEADER_BYTES) / 4);
  const robots: RenderRobotState[] = [];
  let offset = RENDER_PLAYER_FLOATS;
  for (let index = 0; index < robotCount; index += 1) {
    const positions = new Float32Array(BODY_POINT_COUNT * 3);
    positions.set(data.subarray(offset + 8, offset + RENDER_ROBOT_FLOATS));
    robots.push({
      id: data[offset]!, active: data[offset + 1] === 1,
      x: data[offset + 2]!, z: data[offset + 3]!, heading: data[offset + 4]!,
      health: data[offset + 5]!, hitFlashTicks: data[offset + 6]!, danceTime: data[offset + 7]!,
      body: { positions },
    });
    offset += RENDER_ROBOT_FLOATS;
  }
  const projectiles: RenderProjectileState[] = [];
  offset = RENDER_PLAYER_FLOATS + MAX_RENDER_ROBOTS * RENDER_ROBOT_FLOATS;
  for (let index = 0; index < projectileCount; index += 1) {
    projectiles.push({
      id: data[offset]!, ownerRobotId: data[offset + 1]!,
      x: data[offset + 2]!, y: data[offset + 3]!, z: data[offset + 4]!,
      velocityX: data[offset + 5]!, velocityY: data[offset + 6]!, velocityZ: data[offset + 7]!,
      lifeTicks: data[offset + 8]!,
    });
    offset += RENDER_PROJECTILE_FLOATS;
  }
  const flags = header.getUint32(HEADER_FLAGS, true);
  return {
    state: {
      tick: header.getUint32(HEADER_TICK, true),
      player: readPlayer(data, header.getUint32(HEADER_COINS, true)),
      robots,
      projectiles,
      victory: (flags & 1) !== 0,
      defeat: (flags & 2) !== 0,
    },
    metadata: {
      eventEpoch: header.getUint32(HEADER_EVENT_EPOCH, true),
      eventHighWatermark: header.getUint32(HEADER_EVENT_HIGH_WATERMARK, true),
      resyncRequired: header.getUint32(HEADER_RESYNC_REQUIRED, true) === 1,
    },
  };
}
