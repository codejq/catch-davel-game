import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LEVEL_001 } from '../src/content/levels/level-001.ts';

const output = fileURLToPath(new URL('../src/content/export/level-001.json', import.meta.url));

function sorted(value) {
  if (Array.isArray(value)) return value.map(sorted);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sorted(value[key])]));
  }
  return value;
}

const serialized = `${JSON.stringify(sorted(LEVEL_001), null, 2)}\n`;
if (process.argv.includes('--check')) {
  let existing = '';
  try { existing = readFileSync(output, 'utf8'); } catch { /* reported as stale below */ }
  if (existing !== serialized) {
    console.error('Canonical level-001.json is stale; run npm run content:export');
    process.exitCode = 1;
  }
} else {
  writeFileSync(output, serialized);
  console.log(`Wrote ${output}`);
}
