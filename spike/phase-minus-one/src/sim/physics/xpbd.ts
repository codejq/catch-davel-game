import {
  ARENA_HALF_EXTENT,
  FIXED_DT_SECONDS,
  GRAVITY_METERS_PER_SECOND_SQUARED,
  PARTICLE_COUNT,
  PARTICLES_PER_ROBOT,
  PHYSICS_SUBSTEPS,
  ROBOT_COUNT,
  ROBOT_PROXY_RADIUS,
  XPBD_ITERATIONS,
} from '../constants';
import type { SimulationState } from '../state';

const DAMPING = 0.996;
const MOTOR_COMPLIANCE = 2.5e-5;
const FLOOR_HEIGHT = 0.11;
const QUANTIZATION = 1_000_000;

function integrate(state: SimulationState, substepSeconds: number): void {
  const { particles } = state;
  const gravityStep = GRAVITY_METERS_PER_SECOND_SQUARED * substepSeconds * substepSeconds;
  for (let index = 0; index < PARTICLE_COUNT; index += 1) {
    const x = particles.x[index]!;
    const y = particles.y[index]!;
    const z = particles.z[index]!;
    const velocityX = (x - particles.previousX[index]!) * DAMPING;
    const velocityY = (y - particles.previousY[index]!) * DAMPING;
    const velocityZ = (z - particles.previousZ[index]!) * DAMPING;
    particles.previousX[index] = x;
    particles.previousY[index] = y;
    particles.previousZ[index] = z;
    particles.x[index] = x + velocityX;
    particles.y[index] = y + velocityY + gravityStep;
    particles.z[index] = z + velocityZ;
  }
}

function solveDistanceConstraints(state: SimulationState, inverseDtSquared: number): void {
  const { constraints, particles } = state;
  for (let index = 0; index < constraints.particleA.length; index += 1) {
    const particleA = constraints.particleA[index]!;
    const particleB = constraints.particleB[index]!;
    const deltaX = particles.x[particleB]! - particles.x[particleA]!;
    const deltaY = particles.y[particleB]! - particles.y[particleA]!;
    const deltaZ = particles.z[particleB]! - particles.z[particleA]!;
    const lengthSquared = deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ;
    if (lengthSquared < 1e-12) continue;
    const length = Math.sqrt(lengthSquared);
    const inverseLength = 1 / length;
    const weightA = particles.inverseMass[particleA]!;
    const weightB = particles.inverseMass[particleB]!;
    const alpha = constraints.compliance[index]! * inverseDtSquared;
    const constraintValue = length - constraints.restLength[index]!;
    const deltaLambda =
      (-constraintValue - alpha * constraints.lambda[index]!) / (weightA + weightB + alpha);
    constraints.lambda[index] = constraints.lambda[index]! + deltaLambda;
    const correctionX = deltaLambda * deltaX * inverseLength;
    const correctionY = deltaLambda * deltaY * inverseLength;
    const correctionZ = deltaLambda * deltaZ * inverseLength;
    particles.x[particleA] = particles.x[particleA]! - weightA * correctionX;
    particles.y[particleA] = particles.y[particleA]! - weightA * correctionY;
    particles.z[particleA] = particles.z[particleA]! - weightA * correctionZ;
    particles.x[particleB] = particles.x[particleB]! + weightB * correctionX;
    particles.y[particleB] = particles.y[particleB]! + weightB * correctionY;
    particles.z[particleB] = particles.z[particleB]! + weightB * correctionZ;
  }
}

function solveMotorAxis(
  position: Float64Array,
  target: Float64Array,
  inverseMass: Float64Array,
  lambda: Float64Array,
  alpha: number,
): void {
  for (let index = 0; index < PARTICLE_COUNT; index += 1) {
    const weight = inverseMass[index]!;
    const constraintValue = position[index]! - target[index]!;
    const deltaLambda = (-constraintValue - alpha * lambda[index]!) / (weight + alpha);
    lambda[index] = lambda[index]! + deltaLambda;
    position[index] = position[index]! + weight * deltaLambda;
  }
}

function solveMotorConstraints(state: SimulationState, inverseDtSquared: number): void {
  const { particles } = state;
  const alpha = MOTOR_COMPLIANCE * inverseDtSquared;
  solveMotorAxis(
    particles.x,
    particles.targetX,
    particles.inverseMass,
    particles.motorLambdaX,
    alpha,
  );
  solveMotorAxis(
    particles.y,
    particles.targetY,
    particles.inverseMass,
    particles.motorLambdaY,
    alpha,
  );
  solveMotorAxis(
    particles.z,
    particles.targetZ,
    particles.inverseMass,
    particles.motorLambdaZ,
    alpha,
  );
}

function solveEnvironmentCollisions(state: SimulationState): void {
  const { particles } = state;
  for (let index = 0; index < PARTICLE_COUNT; index += 1) {
    if (particles.y[index]! < FLOOR_HEIGHT) particles.y[index] = FLOOR_HEIGHT;
    particles.x[index] = Math.max(-ARENA_HALF_EXTENT, Math.min(ARENA_HALF_EXTENT, particles.x[index]!));
    particles.z[index] = Math.max(-ARENA_HALF_EXTENT, Math.min(ARENA_HALF_EXTENT, particles.z[index]!));
  }
}

function solveRobotProxyCollisions(state: SimulationState): void {
  const { particles } = state;
  const minimumDistance = ROBOT_PROXY_RADIUS * 2;
  const minimumDistanceSquared = minimumDistance * minimumDistance;
  for (let robotA = 0; robotA < ROBOT_COUNT; robotA += 1) {
    const pelvisA = robotA * PARTICLES_PER_ROBOT + 2;
    for (let robotB = robotA + 1; robotB < ROBOT_COUNT; robotB += 1) {
      const pelvisB = robotB * PARTICLES_PER_ROBOT + 2;
      const deltaX = particles.x[pelvisB]! - particles.x[pelvisA]!;
      const deltaZ = particles.z[pelvisB]! - particles.z[pelvisA]!;
      const distanceSquared = deltaX * deltaX + deltaZ * deltaZ;
      if (distanceSquared >= minimumDistanceSquared || distanceSquared < 1e-12) continue;
      const distance = Math.sqrt(distanceSquared);
      const correction = (minimumDistance - distance) * 0.5 / distance;
      particles.x[pelvisA] = particles.x[pelvisA]! - deltaX * correction;
      particles.z[pelvisA] = particles.z[pelvisA]! - deltaZ * correction;
      particles.x[pelvisB] = particles.x[pelvisB]! + deltaX * correction;
      particles.z[pelvisB] = particles.z[pelvisB]! + deltaZ * correction;
    }
  }
}

function quantizeState(state: SimulationState): void {
  const { particles } = state;
  for (let index = 0; index < PARTICLE_COUNT; index += 1) {
    particles.x[index] = Math.round(particles.x[index]! * QUANTIZATION) / QUANTIZATION;
    particles.y[index] = Math.round(particles.y[index]! * QUANTIZATION) / QUANTIZATION;
    particles.z[index] = Math.round(particles.z[index]! * QUANTIZATION) / QUANTIZATION;
    particles.previousX[index] = Math.round(particles.previousX[index]! * QUANTIZATION) / QUANTIZATION;
    particles.previousY[index] = Math.round(particles.previousY[index]! * QUANTIZATION) / QUANTIZATION;
    particles.previousZ[index] = Math.round(particles.previousZ[index]! * QUANTIZATION) / QUANTIZATION;
  }
}

export function stepPhysics(state: SimulationState): void {
  const substepSeconds = FIXED_DT_SECONDS / PHYSICS_SUBSTEPS;
  const inverseDtSquared = 1 / (substepSeconds * substepSeconds);
  for (let substep = 0; substep < PHYSICS_SUBSTEPS; substep += 1) {
    integrate(state, substepSeconds);
    state.constraints.lambda.fill(0);
    state.particles.motorLambdaX.fill(0);
    state.particles.motorLambdaY.fill(0);
    state.particles.motorLambdaZ.fill(0);
    for (let iteration = 0; iteration < XPBD_ITERATIONS; iteration += 1) {
      solveDistanceConstraints(state, inverseDtSquared);
      solveMotorConstraints(state, inverseDtSquared);
      solveEnvironmentCollisions(state);
      solveRobotProxyCollisions(state);
    }
  }
  quantizeState(state);
}
