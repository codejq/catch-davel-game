import { describe, expect, it } from 'vitest';
import { cellAt, findCell, LEVEL_HEIGHT, LEVEL_WIDTH, levelRows, worldCell, type CellCoordinate } from '../src/sim/level';
import { PLAYABLE_LEVEL_IDS } from '../src/content/levels/catalog';
import { createLevelRuntime } from '../src/sim/interactions';

function reachable(levelId: (typeof PLAYABLE_LEVEL_IDS)[number], blocked: readonly CellCoordinate[]): Set<string> {
  const start = findCell('S', levelId);
  const pending = [start];
  const visited = new Set([`${start.column},${start.row}`]);
  while (pending.length > 0) {
    const current = pending.shift()!;
    for (const [deltaColumn, deltaRow] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const column = current.column + deltaColumn;
      const row = current.row + deltaRow;
      const key = `${column},${row}`;
      if (cellAt(column, row, levelId) === '#' || visited.has(key)
        || blocked.some((cell) => cell.column === column && cell.row === row)) continue;
      visited.add(key);
      pending.push({ column, row });
    }
  }
  return visited;
}

describe('first playable maze', () => {
  it('is bounded by walls and has exactly one start and exit', () => {
    for (let column = 0; column < LEVEL_WIDTH; column += 1) {
      expect(cellAt(column, 0)).toBe('#');
      expect(cellAt(column, LEVEL_HEIGHT - 1)).toBe('#');
    }
    for (let row = 0; row < LEVEL_HEIGHT; row += 1) {
      expect(cellAt(0, row)).toBe('#');
      expect(cellAt(LEVEL_WIDTH - 1, row)).toBe('#');
    }
    expect(findCell('S')).toEqual({ column: 1, row: 1 });
    expect(findCell('E')).toEqual({ column: 13, row: 13 });
  });

  it('provides a reachable route from start to exit', () => {
    for (const levelId of PLAYABLE_LEVEL_IDS) {
      const start = findCell('S', levelId);
      const exit = findCell('E', levelId);
      const pending = [start];
      const visited = new Set([`${start.column},${start.row}`]);
      while (pending.length > 0) {
        const current = pending.shift()!;
        for (const [deltaColumn, deltaRow] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const column = current.column + deltaColumn;
          const row = current.row + deltaRow;
          const key = `${column},${row}`;
          if (cellAt(column, row, levelId) === '#' || visited.has(key)) continue;
          visited.add(key);
          pending.push({ column, row });
        }
      }
      expect(visited.has(`${exit.column},${exit.row}`), levelId).toBe(true);
    }
    expect(new Set(PLAYABLE_LEVEL_IDS.map((levelId) => levelRows(levelId).join('\n'))).size).toBe(21);
  });

  it('keeps the key reachable before the lock and every interaction reachable after it opens', () => {
    for (const levelId of PLAYABLE_LEVEL_IDS) {
      const level = createLevelRuntime(levelId);
      const beforeUnlock = reachable(levelId, [{ column: level.door.column, row: level.door.row }]);
      const key = level.pickups.find((pickup) => pickup.kind === 'key')!;
      const keyCell = worldCell(key.x, key.z);
      expect(beforeUnlock.has(`${keyCell.column},${keyCell.row}`), `${levelId} key route`).toBe(true);

      const afterUnlock = reachable(levelId, []);
      const required = [
        ...level.pickups.map((pickup) => worldCell(pickup.x, pickup.z)),
        worldCell(level.checkpoint.x, level.checkpoint.z), worldCell(level.exit.x, level.exit.z),
      ];
      for (const cell of required) {
        expect(afterUnlock.has(`${cell.column},${cell.row}`), `${levelId} interaction ${cell.column},${cell.row}`).toBe(true);
      }
    }
  });
});
