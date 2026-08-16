export const SIMULATION_SCHEMA_VERSION = 1;
export const TRANSPORT_CONTRACT_VERSION = 1;

export const TICK_HZ = 60;
export const FIXED_DT_SECONDS = 1 / TICK_HZ;
export const PHYSICS_SUBSTEPS = 2;
export const XPBD_ITERATIONS = 8;

export const ROBOT_COUNT = 24;
export const PARTICLES_PER_ROBOT = 15;
export const LINKS_PER_ROBOT = 14;
export const PARTICLE_COUNT = ROBOT_COUNT * PARTICLES_PER_ROBOT;
export const DISTANCE_CONSTRAINT_COUNT = ROBOT_COUNT * LINKS_PER_ROBOT;

export const ARENA_HALF_EXTENT = 10;
export const PARTICLE_RADIUS = 0.11;
export const ROBOT_PROXY_RADIUS = 0.58;
export const GRAVITY_METERS_PER_SECOND_SQUARED = -9.81;

export const PROVISIONAL_EVENT_RECORD_CAP = 256;
export const PROVISIONAL_EVENT_BYTE_CAP = 64 * 1024;
export const PROVISIONAL_BATCH_RECORD_CAP = 64;
export const PROVISIONAL_BATCH_BYTE_CAP = 16 * 1024;
export const PROVISIONAL_CREDIT_WINDOW = 1;

export function assertApprovedScenarioConstants(): void {
  if (TICK_HZ !== 60 || PHYSICS_SUBSTEPS !== 2 || XPBD_ITERATIONS !== 8 || ROBOT_COUNT !== 24) {
    throw new Error('Phase -1 approved scenario constants were changed');
  }
}

