import { PLAYABLE_LEVELS } from '../src/content/levels/catalog.ts';
import { validateContentSubmission } from '../src/content/submission-gates.ts';

const report = validateContentSubmission(PLAYABLE_LEVELS);
console.log(`CONTENT_SUBMISSION_REPORT=${JSON.stringify(report)}`);
