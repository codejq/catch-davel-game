import {
  PARTICLE_COUNT,
  ROBOT_COUNT,
  SIMULATION_SCHEMA_VERSION,
  TRANSPORT_CONTRACT_VERSION,
} from './constants';
import type { EventBuffer } from './events';
import type { SimulationState } from './state';

const HEADER_WORDS = 16;
const PARTICLE_FLOATS = 4;
const ROBOT_FLOATS = 4;
export const SNAPSHOT_BYTES =
  HEADER_WORDS * Uint32Array.BYTES_PER_ELEMENT +
  PARTICLE_COUNT * PARTICLE_FLOATS * Float32Array.BYTES_PER_ELEMENT +
  ROBOT_COUNT * ROBOT_FLOATS * Float32Array.BYTES_PER_ELEMENT;

export interface SnapshotTransportMetadata {
  readonly eventEpoch: number;
  readonly resyncRequired: boolean;
}

export function writeSnapshotToBuffer(
  buffer: ArrayBuffer,
  state: SimulationState,
  events: EventBuffer,
  metadata: SnapshotTransportMetadata = { eventEpoch: 0, resyncRequired: false },
): ArrayBuffer {
  if (buffer.byteLength !== SNAPSHOT_BYTES) {
    throw new Error(`Snapshot buffer must be exactly ${SNAPSHOT_BYTES} bytes`);
  }
  const header = new Uint32Array(buffer, 0, HEADER_WORDS);
  const particleOffset = HEADER_WORDS * Uint32Array.BYTES_PER_ELEMENT;
  const particleData = new Float32Array(buffer, particleOffset, PARTICLE_COUNT * PARTICLE_FLOATS);
  const robotOffset = particleOffset + particleData.byteLength;
  const robotData = new Float32Array(buffer, robotOffset, ROBOT_COUNT * ROBOT_FLOATS);

  header[0] = TRANSPORT_CONTRACT_VERSION;
  header[1] = SIMULATION_SCHEMA_VERSION;
  header[2] = state.tick;
  header[3] = PARTICLE_COUNT;
  header[4] = ROBOT_COUNT;
  header[5] = events.count;
  header[6] = state.nextEventSequence - 1;
  header[7] = state.coins;
  header[8] = state.objectivesCompleted;
  header[9] = state.rng.state;
  header[10] = metadata.eventEpoch;
  header[11] = metadata.resyncRequired ? 1 : 0;

  for (let particle = 0; particle < PARTICLE_COUNT; particle += 1) {
    const offset = particle * PARTICLE_FLOATS;
    particleData[offset] = state.particles.x[particle]!;
    particleData[offset + 1] = state.particles.y[particle]!;
    particleData[offset + 2] = state.particles.z[particle]!;
    particleData[offset + 3] = state.particles.localId[particle]!;
  }
  for (let robot = 0; robot < ROBOT_COUNT; robot += 1) {
    const offset = robot * ROBOT_FLOATS;
    robotData[offset] = state.robots.health[robot]!;
    robotData[offset + 1] = state.robots.phaseOffset[robot]!;
    robotData[offset + 2] = state.robots.waypointIndex[robot]!;
    robotData[offset + 3] = robot;
  }
  return buffer;
}

export class SnapshotWriter {
  readonly buffer: ArrayBuffer;

  constructor() {
    this.buffer = new ArrayBuffer(SNAPSHOT_BYTES);
  }

  write(state: SimulationState, events: EventBuffer): ArrayBuffer {
    return writeSnapshotToBuffer(this.buffer, state, events);
  }
}
