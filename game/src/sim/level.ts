import { CELL_SIZE, PLAYER_RADIUS } from './constants';

export const LEVEL_ROWS = [
  '###############',
  '#S....#.......#',
  '#.###.#.#####.#',
  '#...#.#.....#.#',
  '###.#.#####.#.#',
  '#...#.....#.#.#',
  '#.#######.#.#.#',
  '#.....#...#...#',
  '#.###.#.#####.#',
  '#.#...#.....#.#',
  '#.#.#######.#.#',
  '#.#.....#...#.#',
  '#.#####.#.###.#',
  '#.......#....E#',
  '###############',
] as const;

export const LEVEL_WIDTH = LEVEL_ROWS[0].length;
export const LEVEL_HEIGHT = LEVEL_ROWS.length;
export const LEVEL_ORIGIN_X = -(LEVEL_WIDTH * CELL_SIZE) / 2;
export const LEVEL_ORIGIN_Z = -(LEVEL_HEIGHT * CELL_SIZE) / 2;

export interface CellCoordinate {
  readonly column: number;
  readonly row: number;
}

export interface WorldPoint {
  readonly x: number;
  readonly z: number;
}

export function cellAt(column: number, row: number): string {
  return LEVEL_ROWS[row]?.[column] ?? '#';
}

export function cellCenter(column: number, row: number): WorldPoint {
  return {
    x: LEVEL_ORIGIN_X + (column + 0.5) * CELL_SIZE,
    z: LEVEL_ORIGIN_Z + (row + 0.5) * CELL_SIZE,
  };
}

export function worldCell(x: number, z: number): CellCoordinate {
  return {
    column: Math.floor((x - LEVEL_ORIGIN_X) / CELL_SIZE),
    row: Math.floor((z - LEVEL_ORIGIN_Z) / CELL_SIZE),
  };
}

export function findCell(marker: 'S' | 'E'): CellCoordinate {
  for (let row = 0; row < LEVEL_HEIGHT; row += 1) {
    const column = LEVEL_ROWS[row]!.indexOf(marker);
    if (column >= 0) return { column, row };
  }
  throw new Error(`Level marker ${marker} is missing`);
}

export function isWallAtWorld(x: number, z: number): boolean {
  const cell = worldCell(x, z);
  return cellAt(cell.column, cell.row) === '#';
}

export function isPlayerPositionValid(x: number, z: number, radius = PLAYER_RADIUS): boolean {
  return isPlayerPositionValidWithBlockers(x, z, radius, []);
}

export function isPlayerPositionValidWithBlockers(
  x: number,
  z: number,
  radius: number,
  blockedCells: readonly CellCoordinate[],
): boolean {
  const validCorner = (cornerX: number, cornerZ: number): boolean => {
    if (isWallAtWorld(cornerX, cornerZ)) return false;
    const cell = worldCell(cornerX, cornerZ);
    return !blockedCells.some((blocked) => blocked.column === cell.column && blocked.row === cell.row);
  };
  return validCorner(x - radius, z - radius)
    && validCorner(x + radius, z - radius)
    && validCorner(x - radius, z + radius)
    && validCorner(x + radius, z + radius);
}

export function wallCells(): CellCoordinate[] {
  const result: CellCoordinate[] = [];
  for (let row = 0; row < LEVEL_HEIGHT; row += 1) {
    for (let column = 0; column < LEVEL_WIDTH; column += 1) {
      if (cellAt(column, row) === '#') result.push({ column, row });
    }
  }
  return result;
}
