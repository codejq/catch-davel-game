import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const sourceRoot = resolve(import.meta.dirname, '../src');
const files = [];

function collect(directory) {
  for (const entry of readdirSync(directory).sort()) {
    const absolute = resolve(directory, entry);
    if (statSync(absolute).isDirectory()) collect(absolute);
    else if (entry.endsWith('.ts')) files.push(absolute);
  }
}

collect(sourceRoot);
const failures = [];
const chapterBoundaryFiles = new Set([
  'content/level-ids.ts',
  'content/levels/catalog.ts',
  'content/levels/chapter-01.ts',
  'qa/frozen-manifest.ts',
]);
for (const absolute of files) {
  const relative = absolute.slice(sourceRoot.length + 1).replaceAll('\\', '/');
  const text = readFileSync(absolute, 'utf8');
  const universalRules = [
    [/\bMath\.random\s*\(/, 'Math.random is forbidden; use a named deterministic RNG stream'],
    [/\bfrom\s+['"]three(?:\/[^'"]*)?['"]|\brequire\s*\(\s*['"]three/, 'Three.js is forbidden'],
    [/@ts-ignore|@ts-nocheck/, 'TypeScript suppression directives are forbidden'],
  ];
  for (const [pattern, message] of universalRules) if (pattern.test(text)) failures.push(`${relative}: ${message}`);
  if (!chapterBoundaryFiles.has(relative)
    && /\b(?:Chapter01LevelId|CHAPTER_01_LEVEL_IDS|CHAPTER_01_LEVELS|chapter01Level|isChapter01LevelId)\b/.test(text)) {
    failures.push(`${relative}: reusable runtime code must use the playable campaign-level registry`);
  }
  if (/^(sim|agent|replay|qa)\//.test(relative)) {
    for (const [pattern, message] of [
      [/\bDate\.now\s*\(/, 'wall-clock time is forbidden in authoritative code'],
      [/\bperformance\.now\s*\(/, 'frame time is forbidden in authoritative code'],
      [/\bcrypto\.getRandomValues\s*\(/, 'device randomness is forbidden in authoritative code'],
    ]) if (pattern.test(text)) failures.push(`${relative}: ${message}`);
  }
}

const browserRuntime = readFileSync(resolve(sourceRoot, 'runtime/browser-runtime.ts'), 'utf8');
if (/from\s+['"]\.\.\/sim\/game['"]/.test(browserRuntime)) {
  failures.push('runtime/browser-runtime.ts: browser entry may not instantiate authoritative GameSimulation');
}
if (failures.length > 0) throw new Error(`Architecture lint failed:\n${failures.join('\n')}`);
console.log(`Architecture lint passed: ${files.length} TypeScript source files`);
