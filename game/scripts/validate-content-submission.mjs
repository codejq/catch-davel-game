import { CHAPTER_01_LEVELS } from '../src/content/levels/chapter-01.ts';
import { validateContentSubmission } from '../src/content/submission-gates.ts';

const report = validateContentSubmission(CHAPTER_01_LEVELS);
console.log(`CONTENT_SUBMISSION_REPORT=${JSON.stringify(report)}`);
