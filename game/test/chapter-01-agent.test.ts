import { describe, expect, it } from 'vitest';
import { CHAPTER_01_LEVELS } from '../src/content/levels/chapter-01';

describe('Chapter 1 agent-validation declarations', () => {
  for (const level of CHAPTER_01_LEVELS) {
    it(`binds ${level.id} to a live Standard policy and bounded budget`, () => {
      const validation = level.agentValidation.runs.find((run) => run.difficulty === 'Standard');
      expect(validation).toMatchObject({
        mode: 'live-agent', policyId: 'baseline-campaign-agent', policyVersion: 1,
        expectedCompletion: true, maxIllegalActions: 0,
      });
      expect(validation!.parTicks).toBeLessThan(validation!.maxTicks);
      expect(validation!.stuckTimeoutTicks).toBeLessThan(validation!.maxTicks);
    });
  }
});
