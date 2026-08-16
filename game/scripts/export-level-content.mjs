import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CHAPTER_01_LEVELS } from '../src/content/levels/chapter-01.ts';

const outputDirectory = fileURLToPath(new URL('../src/content/export/', import.meta.url));

function sorted(value) {
  if (Array.isArray(value)) return value.map(sorted);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sorted(value[key])]));
  }
  return value;
}

mkdirSync(outputDirectory, { recursive: true });
for (const level of CHAPTER_01_LEVELS) {
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
