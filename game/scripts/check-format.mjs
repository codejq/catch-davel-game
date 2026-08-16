import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const roots = ['src', 'test', 'scripts', 'index.html', 'README.md', 'package.json', 'tsconfig.json', 'vite.config.ts', 'vitest.config.ts'];
const extensions = new Set(['.ts', '.mjs', '.json', '.html', '.css', '.md']);
const files = [];

function collect(relative) {
  const absolute = resolve(root, relative);
  const stat = statSync(absolute);
  if (stat.isDirectory()) {
    for (const entry of readdirSync(absolute).sort()) collect(`${relative}/${entry}`);
    return;
  }
  const extension = relative.slice(relative.lastIndexOf('.'));
  if (extensions.has(extension)) files.push({ relative, absolute });
}

for (const entry of roots) collect(entry);
const failures = [];
for (const file of files) {
  const text = readFileSync(file.absolute, 'utf8');
  if (!text.endsWith('\n')) failures.push(`${file.relative}: missing final newline`);
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    if (/[ \t]+$/.test(lines[index])) failures.push(`${file.relative}:${index + 1}: trailing whitespace`);
  }
}
if (failures.length > 0) throw new Error(`Formatting gate failed:\n${failures.join('\n')}`);
console.log(`Formatting gate passed: ${files.length} text files`);
