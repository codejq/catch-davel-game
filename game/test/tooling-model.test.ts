import { describe, expect, it } from 'vitest';
import { PLAYABLE_LEVELS } from '../src/content/levels/catalog';
import { createLevelToolingReport } from '../src/tooling/tooling-model';

describe('content workbench model', () => {
  it('reports every playable campaign level with current dependencies and bounded content', () => {
    const reports = PLAYABLE_LEVELS.map(createLevelToolingReport);
    expect(reports).toHaveLength(11);
    expect(reports.every((report) => report.dependencyCurrent)).toBe(true);
    expect(reports.map((report) => report.totalRobotCount)).toEqual([6, 5, 6, 7, 5, 6, 7, 8, 10, 1, 8]);
    expect(reports[7]).toMatchObject({ hazardCount: 3, waveCount: 1, peakRobotCount: 8 });
    expect(reports[8]).toMatchObject({ waveCount: 2, totalRobotCount: 10, peakRobotCount: 5 });
  });

  it('accepts valid edits as stale and rejects structurally invalid edits', () => {
    const edited = structuredClone(PLAYABLE_LEVELS[7]!);
    (edited.dance as { bpm: number }).bpm = 111;
    expect(createLevelToolingReport(edited)).toMatchObject({ dependencyCurrent: false });
    const invalid: unknown = { ...edited, surprise: true };
    expect(() => createLevelToolingReport(invalid)).toThrow(/unknown or missing/);
  });
});
