import { ARENA_HALF_EXTENT } from './constants';

const GRID_SIZE = 24;
const CELL_COUNT = GRID_SIZE * GRID_SIZE;
const CELL_SIZE = (ARENA_HALF_EXTENT * 2) / GRID_SIZE;
const NEIGHBOR_X = new Int8Array([0, 1, 0, -1]);
const NEIGHBOR_Z = new Int8Array([-1, 0, 1, 0]);

export interface NavigationStep {
  readonly x: number;
  readonly z: number;
  readonly reachable: boolean;
  readonly visitedCells: number;
}

function clampCell(value: number): number {
  return Math.max(0, Math.min(GRID_SIZE - 1, value));
}

function worldToCell(value: number): number {
  return clampCell(Math.floor((value + ARENA_HALF_EXTENT) / CELL_SIZE));
}

function cellToWorld(cell: number): number {
  return -ARENA_HALF_EXTENT + (cell + 0.5) * CELL_SIZE;
}

function isBlocked(x: number, z: number): boolean {
  const verticalBarrier = (x === 7 || x === 16) && z % 6 !== 2;
  const horizontalBarrier = z === 12 && x > 3 && x < 20 && x % 7 !== 4;
  return verticalBarrier || horizontalBarrier;
}

export class NavigationWorkspace {
  private readonly queue = new Uint16Array(CELL_COUNT);
  private readonly visited = new Uint16Array(CELL_COUNT);
  private readonly firstStep = new Uint16Array(CELL_COUNT);
  private generation = 1;

  findNextStep(startWorldX: number, startWorldZ: number, goalWorldX: number, goalWorldZ: number): NavigationStep {
    this.generation = (this.generation + 1) & 0xffff;
    if (this.generation === 0) {
      this.visited.fill(0);
      this.generation = 1;
    }

    const startX = worldToCell(startWorldX);
    const startZ = worldToCell(startWorldZ);
    const goalX = worldToCell(goalWorldX);
    const goalZ = worldToCell(goalWorldZ);
    const start = startZ * GRID_SIZE + startX;
    const goal = goalZ * GRID_SIZE + goalX;
    let head = 0;
    let tail = 1;
    this.queue[0] = start;
    this.visited[start] = this.generation;
    this.firstStep[start] = start;

    while (head < tail) {
      const current = this.queue[head++]!;
      if (current === goal) {
        const next = this.firstStep[current]!;
        return {
          x: cellToWorld(next % GRID_SIZE),
          z: cellToWorld(Math.floor(next / GRID_SIZE)),
          reachable: true,
          visitedCells: head,
        };
      }
      const currentX = current % GRID_SIZE;
      const currentZ = Math.floor(current / GRID_SIZE);
      for (let neighborIndex = 0; neighborIndex < 4; neighborIndex += 1) {
        const neighborX = currentX + NEIGHBOR_X[neighborIndex]!;
        const neighborZ = currentZ + NEIGHBOR_Z[neighborIndex]!;
        if (neighborX < 0 || neighborX >= GRID_SIZE || neighborZ < 0 || neighborZ >= GRID_SIZE) continue;
        if (isBlocked(neighborX, neighborZ) && !(neighborX === goalX && neighborZ === goalZ)) continue;
        const neighbor = neighborZ * GRID_SIZE + neighborX;
        if (this.visited[neighbor] === this.generation) continue;
        this.visited[neighbor] = this.generation;
        this.firstStep[neighbor] = current === start ? neighbor : this.firstStep[current]!;
        this.queue[tail++] = neighbor;
      }
    }

    return {
      x: startWorldX,
      z: startWorldZ,
      reachable: false,
      visitedCells: head,
    };
  }
}

