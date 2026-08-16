import { describe, expect, it } from 'vitest';
import { CHAPTER_01_LEVELS, type Chapter01LevelId } from '../src/content/levels/chapter-01';
import { createChapter01DifficultyStaticReport } from '../src/qa/difficulty-qa';
import { runCampaignLevel } from '../src/qa/campaign-runner';

describe('Chapter 1 difficulty QA', () => {
  it('statically validates reachability, resources, timing, and default assists for all 30 level-mode pairs', () => {
    const report = createChapter01DifficultyStaticReport();
    expect(report).toHaveLength(30);
    for (const level of CHAPTER_01_LEVELS) {
      const entries = report.filter((entry) => entry.levelId === level.id);
      expect(entries.map((entry) => entry.difficulty)).toEqual(['story', 'standard', 'hard']);
      expect(entries.every((entry) => entry.graphAndObjectiveReachable)).toBe(true);
      expect(entries[0]!.totalRobotHealth).toBeLessThan(entries[1]!.totalRobotHealth);
      expect(entries[2]!.totalRobotHealth).toBeGreaterThan(entries[1]!.totalRobotHealth);
      expect(entries[0]!.interWaveDelayTicks).toBeGreaterThan(entries[1]!.interWaveDelayTicks);
      expect(entries[2]!.interWaveDelayTicks).toBeLessThan(entries[1]!.interWaveDelayTicks);
      expect(entries[0]!.conservativeMinimumTelegraphTicks).toBeGreaterThan(entries[1]!.conservativeMinimumTelegraphTicks);
      expect(entries[2]!.conservativeMinimumTelegraphTicks).toBeLessThan(entries[1]!.conservativeMinimumTelegraphTicks);
    }
  });

  it('passes every declared Story and Hard live-agent benchmark within its individual budget', () => {
    const results = CHAPTER_01_LEVELS.flatMap((level) => level.agentValidation.runs
      .filter((run) => run.mode === 'live-agent' && run.difficulty !== 'Standard')
      .map((run) => ({ run, result: runCampaignLevel(level.id as Chapter01LevelId, run.id) })));
    expect(results.map(({ run }) => `${run.difficulty}:${run.seed}`)).toEqual([
      'Story:campaign-level-001-v1', 'Hard:campaign-level-001-v1',
      'Story:campaign-level-009-v1', 'Hard:campaign-level-009-v1',
      'Story:campaign-level-010-v1', 'Hard:campaign-level-010-v1',
    ]);
    for (const { run, result } of results) {
      expect(result.failure, `${result.levelId}/${run.id}`).toBeNull();
      expect(result.victory, `${result.levelId}/${run.id}`).toBe(run.expectedCompletion);
      expect(result.illegalActions, `${result.levelId}/${run.id}`).toBeLessThanOrEqual(run.maxIllegalActions);
      expect(result.finalTick, `${result.levelId}/${run.id}`).toBeLessThanOrEqual(run.maxTicks);
      expect(result.maximumIdleProgressTicks, `${result.levelId}/${run.id}`).toBeLessThan(run.stuckTimeoutTicks);
      expect(result.checksum, `${result.levelId}/${run.id}`).toBe(run.expectedChecksum);
    }
    console.log(`DIFFICULTY_SPOT_CHECK_REPORT=${JSON.stringify(results.map(({ result }) => result) )}`);
  });
});
