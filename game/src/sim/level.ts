import { CELL_SIZE, PLAYER_RADIUS } from './constants';
import { CHAPTER_01_LEVEL_IDS, type Chapter01LevelId } from '../content/level-ids';
import { chapter01Level } from '../content/levels/chapter-01';
import { mazeRuntimeProfile, type RuntimeGridCell } from '../content/runtime-manifests';

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

function openedRows(openings: readonly RuntimeGridCell[]): readonly string[] {
  const rows = LEVEL_ROWS.map((row) => [...row]);
  for (const opening of openings) {
    if (rows[opening.row]?.[opening.column] !== '#') throw new Error(`Level opening ${opening.column},${opening.row} is not a wall`);
    rows[opening.row]![opening.column] = '.';
  }
  return rows.map((row) => row.join(''));
}

export const LEVEL_ROWS_BY_ID: Readonly<Record<Chapter01LevelId, readonly string[]>> = Object.fromEntries(
  CHAPTER_01_LEVEL_IDS.map((levelId) => [
    levelId,
    openedRows(mazeRuntimeProfile(chapter01Level(levelId).maze.templateSetId).openings),
  ]),
) as Readonly<Record<Chapter01LevelId, readonly string[]>>;

export function levelRows(levelId: Chapter01LevelId = 'level-001'): readonly string[] {
  return LEVEL_ROWS_BY_ID[levelId];
}

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

export function cellAt(column: number, row: number, levelId: Chapter01LevelId = 'level-001'): string {
  return levelRows(levelId)[row]?.[column] ?? '#';
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

export function findCell(marker: 'S' | 'E', levelId: Chapter01LevelId = 'level-001'): CellCoordinate {
  for (let row = 0; row < LEVEL_HEIGHT; row += 1) {
    const column = levelRows(levelId)[row]!.indexOf(marker);
    if (column >= 0) return { column, row };
  }
  throw new Error(`Level marker ${marker} is missing`);
}

export function isWallAtWorld(x: number, z: number, levelId: Chapter01LevelId = 'level-001'): boolean {
  const cell = worldCell(x, z);
  return cellAt(cell.column, cell.row, levelId) === '#';
}

export function isPlayerPositionValid(
  x: number, z: number, radius = PLAYER_RADIUS, levelId: Chapter01LevelId = 'level-001',
): boolean {
  return isPlayerPositionValidWithBlockers(x, z, radius, [], levelId);
}

export function isPlayerPositionValidWithBlockers(
  x: number,
  z: number,
  radius: number,
  blockedCells: readonly CellCoordinate[],
  levelId: Chapter01LevelId = 'level-001',
): boolean {
  const validCorner = (cornerX: number, cornerZ: number): boolean => {
    if (isWallAtWorld(cornerX, cornerZ, levelId)) return false;
    const cell = worldCell(cornerX, cornerZ);
    return !blockedCells.some((blocked) => blocked.column === cell.column && blocked.row === cell.row);
  };
  return validCorner(x - radius, z - radius)
    && validCorner(x + radius, z - radius)
    && validCorner(x - radius, z + radius)
    && validCorner(x + radius, z + radius);
}

export function wallCells(levelId: Chapter01LevelId = 'level-001'): CellCoordinate[] {
  const result: CellCoordinate[] = [];
  for (let row = 0; row < LEVEL_HEIGHT; row += 1) {
    for (let column = 0; column < LEVEL_WIDTH; column += 1) {
      if (cellAt(column, row, levelId) === '#') result.push({ column, row });
    }
  }
  return result;
}
