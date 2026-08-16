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

export class SnapshotWriter {
  readonly buffer: ArrayBuffer;
  private readonly header: Uint32Array;
  private readonly particleData: Float32Array;
  private readonly robotData: Float32Array;

  constructor() {
    this.buffer = new ArrayBuffer(SNAPSHOT_BYTES);
    this.header = new Uint32Array(this.buffer, 0, HEADER_WORDS);
    const particleOffset = HEADER_WORDS * Uint32Array.BYTES_PER_ELEMENT;
    this.particleData = new Float32Array(
      this.buffer,
      particleOffset,
      PARTICLE_COUNT * PARTICLE_FLOATS,
    );
    const robotOffset = particleOffset + this.particleData.byteLength;
    this.robotData = new Float32Array(this.buffer, robotOffset, ROBOT_COUNT * ROBOT_FLOATS);
  }

  write(state: SimulationState, events: EventBuffer): ArrayBuffer {
    this.header[0] = TRANSPORT_CONTRACT_VERSION;
    this.header[1] = SIMULATION_SCHEMA_VERSION;
    this.header[2] = state.tick;
    this.header[3] = PARTICLE_COUNT;
    this.header[4] = ROBOT_COUNT;
    this.header[5] = events.count;
    this.header[6] = state.nextEventSequence - 1;
    this.header[7] = state.coins;
    this.header[8] = state.objectivesCompleted;
    this.header[9] = state.rng.state;

    for (let particle = 0; particle < PARTICLE_COUNT; particle += 1) {
      const offset = particle * PARTICLE_FLOATS;
      this.particleData[offset] = state.particles.x[particle]!;
      this.particleData[offset + 1] = state.particles.y[particle]!;
      this.particleData[offset + 2] = state.particles.z[particle]!;
      this.particleData[offset + 3] = state.particles.localId[particle]!;
    }
    for (let robot = 0; robot < ROBOT_COUNT; robot += 1) {
      const offset = robot * ROBOT_FLOATS;
      this.robotData[offset] = state.robots.health[robot]!;
      this.robotData[offset + 1] = state.robots.phaseOffset[robot]!;
      this.robotData[offset + 2] = state.robots.waypointIndex[robot]!;
      this.robotData[offset + 3] = robot;
    }
    return this.buffer;
  }
}

