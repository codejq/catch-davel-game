import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PLAYABLE_LEVELS } from '../src/content/levels/catalog.ts';
import { validateContentSubmission } from '../src/content/submission-gates.ts';
import { CAMPAIGN_RUNTIME_MANIFEST } from '../src/content/runtime-manifests.ts';

const outputDirectory = fileURLToPath(new URL('../src/content/export/', import.meta.url));

function sorted(value) {
  if (Array.isArray(value)) return value.map(sorted);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sorted(value[key])]));
  }
  return value;
}

const submission = validateContentSubmission(PLAYABLE_LEVELS);
console.log(`Submission gate passed: ${submission.levels.length} levels, ${submission.localizationKeyCount} localized strings × ${submission.releaseLocales.length} locales, ${submission.referencedAssetCount} assets with provenance`);
mkdirSync(outputDirectory, { recursive: true });
const runtimeOutput = fileURLToPath(new URL('../src/content/export/campaign-runtime-manifest.json', import.meta.url));
const runtimeSerialized = `${JSON.stringify(sorted(CAMPAIGN_RUNTIME_MANIFEST), null, 2)}\n`;
if (process.argv.includes('--check')) {
  let existing = '';
  try { existing = readFileSync(runtimeOutput, 'utf8'); } catch { /* reported as stale below */ }
  if (existing !== runtimeSerialized) {
    console.error('Canonical campaign-runtime-manifest.json is stale; run npm run content:export');
    process.exitCode = 1;
  }
} else {
  writeFileSync(runtimeOutput, runtimeSerialized);
  console.log(`Wrote ${runtimeOutput}`);
}
for (const level of PLAYABLE_LEVELS) {
  const output = fileURLToPath(new URL(`../src/content/export/${level.id}.json`, import.meta.url));
  const serialized = `${JSON.stringify(sorted(level), null, 2)}\n`;
  if (process.argv.includes('--check')) {
    let existing = '';
    try { existing = readFileSync(output, 'utf8'); } catch { /* reported as stale below */ }
    if (existing !== serialized) {
      console.error(`Canonical ${level.id}.json is stale; run npm run content:export`);
      process.exitCode = 1;
    }
  } else {
    writeFileSync(output, serialized);
    console.log(`Wrote ${output}`);
  }
}
