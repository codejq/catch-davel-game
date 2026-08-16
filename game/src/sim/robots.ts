import { FIXED_DT_SECONDS } from './constants';
import { cellAt, cellCenter, type CellCoordinate } from './level';
import { decision, hashSeed } from './random';

export type DanceId = 'rubber-chicken' | 'moonwalker' | 'tiny-tyrant' | 'big-bouncer' | 'broken-marionette' | 'disco-menace';

export interface RobotDefinition {
  readonly name: string;
  readonly dance: DanceId;
  readonly route: readonly CellCoordinate[];
  readonly scale: number;
  readonly headScale: number;
  readonly torsoWidth: number;
  readonly legScale: number;
  readonly speed: number;
  readonly phaseOffset: number;
  readonly bodyColor: readonly [number, number, number];
  readonly accentColor: readonly [number, number, number];
  readonly eyeColor: readonly [number, number, number];
}

export interface RobotState {
  readonly id: number;
  x: number;
  z: number;
  heading: number;
  targetIndex: number;
  routeDirection: 1 | -1;
  holdTicks: number;
  arrivalCount: number;
  danceTime: number;
  health: number;
  active: boolean;
}

const cells = (...coordinates: readonly [number, number][]): readonly CellCoordinate[] => coordinates.map(([column, row]) => ({ column, row }));

export const ROBOT_DEFINITIONS: readonly RobotDefinition[] = [
  {
    name: 'Clucky-7', dance: 'rubber-chicken', scale: 0.92, headScale: 1.2, torsoWidth: 0.82, legScale: 0.88,
    speed: 1.35, phaseOffset: 0.15, bodyColor: [1, 0.28, 0.44], accentColor: [1, 0.86, 0.2], eyeColor: [0.2, 1, 0.95],
    route: cells([1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [5, 2], [5, 3], [5, 4], [5, 5]),
  },
  {
    name: 'Velvet Slide', dance: 'moonwalker', scale: 1.08, headScale: 0.98, torsoWidth: 0.72, legScale: 1.28,
    speed: 1.05, phaseOffset: 1.4, bodyColor: [0.49, 0.3, 1], accentColor: [0.18, 0.92, 1], eyeColor: [1, 0.36, 0.82],
    route: cells([7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [13, 2], [13, 3], [13, 4], [13, 5]),
  },
  {
    name: 'Tiny Tyrant', dance: 'tiny-tyrant', scale: 0.68, headScale: 1.5, torsoWidth: 1.05, legScale: 0.65,
    speed: 1.72, phaseOffset: 2.7, bodyColor: [1, 0.48, 0.12], accentColor: [1, 0.95, 0.34], eyeColor: [0.64, 0.04, 0.09],
    route: cells([1, 5], [2, 5], [3, 5], [3, 4], [3, 3], [2, 3], [1, 3]),
  },
  {
    name: 'Big Bouncer', dance: 'big-bouncer', scale: 1.35, headScale: 1.08, torsoWidth: 1.18, legScale: 0.82,
    speed: 0.84, phaseOffset: 3.5, bodyColor: [0.13, 0.83, 0.65], accentColor: [0.78, 1, 0.3], eyeColor: [0.08, 0.18, 0.25],
    route: cells([5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [9, 6], [9, 7], [8, 7], [7, 7]),
  },
  {
    name: 'Loose Screw', dance: 'broken-marionette', scale: 0.98, headScale: 1.16, torsoWidth: 0.66, legScale: 1.1,
    speed: 1.2, phaseOffset: 4.8, bodyColor: [0.2, 0.66, 1], accentColor: [1, 0.35, 0.69], eyeColor: [1, 0.88, 0.2],
    route: cells([1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [5, 8], [5, 9], [4, 9], [3, 9], [3, 10], [3, 11], [4, 11], [5, 11], [6, 11], [7, 11], [7, 12], [7, 13]),
  },
  {
    name: 'DJ Grin', dance: 'disco-menace', scale: 1.15, headScale: 1.0, torsoWidth: 0.94, legScale: 1.03,
    speed: 1.46, phaseOffset: 5.7, bodyColor: [0.95, 0.16, 0.72], accentColor: [0.1, 1, 0.95], eyeColor: [1, 0.94, 0.24],
    route: cells([7, 9], [8, 9], [9, 9], [10, 9], [11, 9], [11, 10], [11, 11], [10, 11], [9, 11], [9, 12], [9, 13], [10, 13], [11, 13], [12, 13], [13, 13]),
  },
] as const;

export function validateRobotDefinitions(): void {
  for (const definition of ROBOT_DEFINITIONS) {
    if (definition.route.length < 2) throw new Error(`${definition.name} needs at least two route cells`);
    for (let index = 0; index < definition.route.length; index += 1) {
      const cell = definition.route[index]!;
      if (cellAt(cell.column, cell.row) === '#') throw new Error(`${definition.name} route enters a wall`);
      if (index > 0) {
        const previous = definition.route[index - 1]!;
        if (Math.abs(previous.column - cell.column) + Math.abs(previous.row - cell.row) !== 1) {
          throw new Error(`${definition.name} route has a disconnected step`);
        }
      }
    }
  }
}

export function createRobots(): RobotState[] {
  validateRobotDefinitions();
  return ROBOT_DEFINITIONS.map((definition, id) => {
    const startIndex = Math.min(definition.route.length - 2, 2 + (id % 3));
    const start = definition.route[startIndex]!;
    const position = cellCenter(start.column, start.row);
    return {
      id, x: position.x, z: position.z, heading: id * 0.83, targetIndex: startIndex + 1,
      routeDirection: 1, holdTicks: id * 7, arrivalCount: 0, danceTime: definition.phaseOffset,
      health: 100, active: true,
    };
  });
}

export function stepRobots(robots: RobotState[], seedText: string): void {
  const seed = hashSeed(seedText);
  for (const robot of robots) {
    if (!robot.active) continue;
    const definition = ROBOT_DEFINITIONS[robot.id]!;
    robot.danceTime += FIXED_DT_SECONDS * (1.4 + robot.id * 0.13);
    if (robot.holdTicks > 0) {
      robot.holdTicks -= 1;
      continue;
    }
    const targetCell = definition.route[robot.targetIndex]!;
    const target = cellCenter(targetCell.column, targetCell.row);
    const deltaX = target.x - robot.x;
    const deltaZ = target.z - robot.z;
    const distance = Math.hypot(deltaX, deltaZ);
    const stepDistance = definition.speed * FIXED_DT_SECONDS;
    if (distance > stepDistance) {
      robot.x += (deltaX / distance) * stepDistance;
      robot.z += (deltaZ / distance) * stepDistance;
      robot.heading = Math.atan2(deltaX, deltaZ);
      continue;
    }
    robot.x = target.x;
    robot.z = target.z;
    robot.arrivalCount += 1;
    const roll = decision(seed, robot.id, robot.arrivalCount);
    robot.holdTicks = 4 + (roll & 31) + (robot.id === 2 ? 0 : (roll >>> 8) & 15);
    const atStart = robot.targetIndex === 0;
    const atEnd = robot.targetIndex === definition.route.length - 1;
    if (atStart || atEnd || ((roll >>> 16) & 3) === 0) robot.routeDirection = robot.routeDirection === 1 ? -1 : 1;
    robot.targetIndex += robot.routeDirection;
  }
}
