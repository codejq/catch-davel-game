import type { XorShift32 } from './random';

export interface ParticleStore {
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly z: Float64Array;
  readonly previousX: Float64Array;
  readonly previousY: Float64Array;
  readonly previousZ: Float64Array;
  readonly targetX: Float64Array;
  readonly targetY: Float64Array;
  readonly targetZ: Float64Array;
  readonly inverseMass: Float64Array;
  readonly robotId: Uint8Array;
  readonly localId: Uint8Array;
  readonly motorLambdaX: Float64Array;
  readonly motorLambdaY: Float64Array;
  readonly motorLambdaZ: Float64Array;
}

export interface DistanceConstraintStore {
  readonly particleA: Uint16Array;
  readonly particleB: Uint16Array;
  readonly restLength: Float64Array;
  readonly compliance: Float64Array;
  readonly lambda: Float64Array;
}

export interface RobotStore {
  readonly homeX: Float64Array;
  readonly homeZ: Float64Array;
  readonly rootX: Float64Array;
  readonly rootZ: Float64Array;
  readonly phaseOffset: Uint16Array;
  readonly waypointIndex: Uint8Array;
  readonly health: Int16Array;
  readonly attackCooldown: Uint16Array;
}

export interface ProjectileStore {
  readonly active: Uint8Array;
  readonly ownerRobot: Uint8Array;
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly z: Float64Array;
  readonly velocityX: Float64Array;
  readonly velocityY: Float64Array;
  readonly velocityZ: Float64Array;
  cursor: number;
}

export interface SimulationState {
  readonly seed: string;
  tick: number;
  coins: number;
  objectivesCompleted: number;
  nextEventSequence: number;
  readonly rng: XorShift32;
  readonly particles: ParticleStore;
  readonly constraints: DistanceConstraintStore;
  readonly robots: RobotStore;
  readonly projectiles: ProjectileStore;
}

