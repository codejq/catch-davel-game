import {
  DISTANCE_CONSTRAINT_COUNT,
  LINKS_PER_ROBOT,
  PARTICLE_COUNT,
  PARTICLES_PER_ROBOT,
  ROBOT_COUNT,
} from './constants';
import { XorShift32 } from './random';
import type {
  DistanceConstraintStore,
  ParticleStore,
  ProjectileStore,
  RobotStore,
  SimulationState,
} from './state';

export const BASE_POSE = [
  [0, 2.95, 0],
  [0, 2.25, 0],
  [0, 1.5, 0],
  [-0.52, 2.28, 0],
  [0.52, 2.28, 0],
  [-0.84, 1.82, 0],
  [0.84, 1.82, 0],
  [-1.02, 1.34, 0.04],
  [1.02, 1.34, 0.04],
  [-0.3, 1.47, 0],
  [0.3, 1.47, 0],
  [-0.3, 0.79, 0.02],
  [0.3, 0.79, 0.02],
  [-0.3, 0.14, 0.16],
  [0.3, 0.14, 0.16],
] as const;

export const LINK_PAIRS = [
  [0, 1],
  [1, 2],
  [1, 3],
  [1, 4],
  [3, 5],
  [4, 6],
  [5, 7],
  [6, 8],
  [2, 9],
  [2, 10],
  [9, 11],
  [10, 12],
  [11, 13],
  [12, 14],
] as const;

function createParticles(): ParticleStore {
  return {
    x: new Float64Array(PARTICLE_COUNT),
    y: new Float64Array(PARTICLE_COUNT),
    z: new Float64Array(PARTICLE_COUNT),
    previousX: new Float64Array(PARTICLE_COUNT),
    previousY: new Float64Array(PARTICLE_COUNT),
    previousZ: new Float64Array(PARTICLE_COUNT),
    targetX: new Float64Array(PARTICLE_COUNT),
    targetY: new Float64Array(PARTICLE_COUNT),
    targetZ: new Float64Array(PARTICLE_COUNT),
    inverseMass: new Float64Array(PARTICLE_COUNT),
    robotId: new Uint8Array(PARTICLE_COUNT),
    localId: new Uint8Array(PARTICLE_COUNT),
    motorLambdaX: new Float64Array(PARTICLE_COUNT),
    motorLambdaY: new Float64Array(PARTICLE_COUNT),
    motorLambdaZ: new Float64Array(PARTICLE_COUNT),
  };
}

function createConstraints(): DistanceConstraintStore {
  return {
    particleA: new Uint16Array(DISTANCE_CONSTRAINT_COUNT),
    particleB: new Uint16Array(DISTANCE_CONSTRAINT_COUNT),
    restLength: new Float64Array(DISTANCE_CONSTRAINT_COUNT),
    compliance: new Float64Array(DISTANCE_CONSTRAINT_COUNT),
    lambda: new Float64Array(DISTANCE_CONSTRAINT_COUNT),
  };
}

function createRobots(): RobotStore {
  return {
    homeX: new Float64Array(ROBOT_COUNT),
    homeZ: new Float64Array(ROBOT_COUNT),
    rootX: new Float64Array(ROBOT_COUNT),
    rootZ: new Float64Array(ROBOT_COUNT),
    phaseOffset: new Uint16Array(ROBOT_COUNT),
    waypointIndex: new Uint8Array(ROBOT_COUNT),
    health: new Int16Array(ROBOT_COUNT),
    attackCooldown: new Uint16Array(ROBOT_COUNT),
  };
}

function createProjectiles(): ProjectileStore {
  const capacity = 128;
  return {
    active: new Uint8Array(capacity),
    ownerRobot: new Uint8Array(capacity),
    x: new Float64Array(capacity),
    y: new Float64Array(capacity),
    z: new Float64Array(capacity),
    velocityX: new Float64Array(capacity),
    velocityY: new Float64Array(capacity),
    velocityZ: new Float64Array(capacity),
    cursor: 0,
  };
}

export function createScenario(seed = 'phase-minus-one-v1'): SimulationState {
  const rng = new XorShift32(seed);
  const particles = createParticles();
  const constraints = createConstraints();
  const robots = createRobots();

  for (let robotId = 0; robotId < ROBOT_COUNT; robotId += 1) {
    const column = robotId % 6;
    const row = Math.floor(robotId / 6);
    const rootX = (column - 2.5) * 3.15;
    const rootZ = (row - 1.5) * 3.15;
    robots.homeX[robotId] = rootX;
    robots.homeZ[robotId] = rootZ;
    robots.rootX[robotId] = rootX;
    robots.rootZ[robotId] = rootZ;
    robots.phaseOffset[robotId] = rng.nextUint32() % 120;
    robots.waypointIndex[robotId] = rng.nextUint32() % 4;
    robots.health[robotId] = 100;
    robots.attackCooldown[robotId] = rng.nextUint32() % 30;

    const particleBase = robotId * PARTICLES_PER_ROBOT;
    for (let localId = 0; localId < PARTICLES_PER_ROBOT; localId += 1) {
      const particleIndex = particleBase + localId;
      const pose = BASE_POSE[localId];
      if (pose === undefined) throw new Error(`Missing base pose ${localId}`);
      const x = rootX + pose[0];
      const y = pose[1];
      const z = rootZ + pose[2];
      particles.x[particleIndex] = x;
      particles.y[particleIndex] = y;
      particles.z[particleIndex] = z;
      particles.previousX[particleIndex] = x;
      particles.previousY[particleIndex] = y;
      particles.previousZ[particleIndex] = z;
      particles.targetX[particleIndex] = x;
      particles.targetY[particleIndex] = y;
      particles.targetZ[particleIndex] = z;
      particles.inverseMass[particleIndex] = localId === 2 ? 0.55 : 1;
      particles.robotId[particleIndex] = robotId;
      particles.localId[particleIndex] = localId;
    }

    const constraintBase = robotId * LINKS_PER_ROBOT;
    for (let linkId = 0; linkId < LINKS_PER_ROBOT; linkId += 1) {
      const pair = LINK_PAIRS[linkId];
      if (pair === undefined) throw new Error(`Missing link pair ${linkId}`);
      const constraintIndex = constraintBase + linkId;
      const particleA = particleBase + pair[0];
      const particleB = particleBase + pair[1];
      const deltaX = particles.x[particleB]! - particles.x[particleA]!;
      const deltaY = particles.y[particleB]! - particles.y[particleA]!;
      const deltaZ = particles.z[particleB]! - particles.z[particleA]!;
      constraints.particleA[constraintIndex] = particleA;
      constraints.particleB[constraintIndex] = particleB;
      constraints.restLength[constraintIndex] = Math.hypot(deltaX, deltaY, deltaZ);
      constraints.compliance[constraintIndex] = 1e-7;
    }
  }

  return {
    seed,
    tick: 0,
    coins: 0,
    objectivesCompleted: 0,
    nextEventSequence: 1,
    rng,
    particles,
    constraints,
    robots,
    projectiles: createProjectiles(),
  };
}

