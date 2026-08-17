import { describe, expect, it } from 'vitest';
import { PLAYABLE_LEVELS } from '../src/content/levels/catalog';
import { createLevelToolingReport } from '../src/tooling/tooling-model';

describe('content workbench model', () => {
  it('reports every playable campaign level with current dependencies and bounded content', () => {
    const reports = PLAYABLE_LEVELS.map(createLevelToolingReport);
    expect(reports).toHaveLength(33);
    expect(reports.every((report) => report.dependencyCurrent)).toBe(true);
    expect(reports.map((report) => report.totalRobotCount)).toEqual([6, 5, 6, 7, 5, 6, 7, 8, 10, 1, 8, 9, 10, 10, 10, 10, 10, 10, 10, 1, 8, 9, 10, 10, 10, 10, 10, 10, 10, 1, 10, 10, 10]);
    expect(reports[7]).toMatchObject({ hazardCount: 3, waveCount: 1, peakRobotCount: 8 });
    expect(reports[8]).toMatchObject({ waveCount: 2, totalRobotCount: 10, peakRobotCount: 5 });
    expect(reports[11]).toMatchObject({ hazardCount: 2, waveCount: 2, totalRobotCount: 9, peakRobotCount: 5 });
    expect(reports[12]).toMatchObject({ hazardCount: 3, waveCount: 2, totalRobotCount: 10, peakRobotCount: 5 });
    expect(reports[13]).toMatchObject({ hazardCount: 3, waveCount: 3, totalRobotCount: 10, peakRobotCount: 4 });
    expect(reports[14]).toMatchObject({ hazardCount: 4, waveCount: 3, totalRobotCount: 10, peakRobotCount: 4 });
    expect(reports[15]).toMatchObject({ hazardCount: 3, waveCount: 3, totalRobotCount: 10, peakRobotCount: 4 });
    expect(reports[17]).toMatchObject({ hazardCount: 2, waveCount: 3, totalRobotCount: 10, peakRobotCount: 4 });
    expect(reports[18]).toMatchObject({ hazardCount: 4, waveCount: 3, totalRobotCount: 10, peakRobotCount: 4 });
    expect(reports[19]).toMatchObject({ hazardCount: 4, waveCount: 1, totalRobotCount: 1, peakRobotCount: 1 });
    expect(reports[20]).toMatchObject({ hazardCount: 3, waveCount: 2, totalRobotCount: 8, peakRobotCount: 4 });
    expect(reports[21]).toMatchObject({ hazardCount: 3, waveCount: 2, totalRobotCount: 9, peakRobotCount: 5 });
    expect(reports[22]).toMatchObject({ hazardCount: 3, waveCount: 3, totalRobotCount: 10, peakRobotCount: 4 });
    expect(reports[23]).toMatchObject({ hazardCount: 3, waveCount: 3, totalRobotCount: 10, peakRobotCount: 4 });
    expect(reports[24]).toMatchObject({ hazardCount: 4, waveCount: 3, totalRobotCount: 10, peakRobotCount: 4 });
    expect(reports[25]).toMatchObject({ hazardCount: 4, waveCount: 3, totalRobotCount: 10, peakRobotCount: 4 });
    expect(reports[26]).toMatchObject({ hazardCount: 3, waveCount: 3, totalRobotCount: 10, peakRobotCount: 4 });
    expect(reports[27]).toMatchObject({ hazardCount: 2, waveCount: 3, totalRobotCount: 10, peakRobotCount: 4 });
    expect(reports[28]).toMatchObject({ hazardCount: 4, waveCount: 3, totalRobotCount: 10, peakRobotCount: 4 });
    expect(reports[29]).toMatchObject({ hazardCount: 4, waveCount: 1, totalRobotCount: 1, peakRobotCount: 1 });
    expect(reports[30]).toMatchObject({ hazardCount: 3, waveCount: 3, totalRobotCount: 10, peakRobotCount: 4 });
    expect(reports[31]).toMatchObject({ hazardCount: 4, waveCount: 3, totalRobotCount: 10, peakRobotCount: 4 });
    expect(reports[32]).toMatchObject({ hazardCount: 3, waveCount: 3, totalRobotCount: 10, peakRobotCount: 4 });
  });

  it('accepts valid edits as stale and rejects structurally invalid edits', () => {
    const edited = structuredClone(PLAYABLE_LEVELS[7]!);
    (edited.dance as { bpm: number }).bpm = 111;
    expect(createLevelToolingReport(edited)).toMatchObject({ dependencyCurrent: false });
    const invalid: unknown = { ...edited, surprise: true };
    expect(() => createLevelToolingReport(invalid)).toThrow(/unknown or missing/);
  });
});
