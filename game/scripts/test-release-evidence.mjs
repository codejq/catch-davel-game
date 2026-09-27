import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArguments, REQUIRED_NOTICES, sha256File, verifyDistributedNotices } from './create-release-evidence.mjs';

const temporaryRoot = mkdtempSync(join(tmpdir(), 'zama-sniper-release-evidence-'));
try {
  const repositoryRoot = join(temporaryRoot, 'repository');
  const gameRoot = join(repositoryRoot, 'game');
  mkdirSync(join(gameRoot, 'dist', 'legal'), { recursive: true });
  for (const filename of REQUIRED_NOTICES) {
    const content = `${filename}\ncanonical notice\n`;
    writeFileSync(join(repositoryRoot, filename), content);
    writeFileSync(join(gameRoot, 'dist', 'legal', filename), content);
  }
  const notices = verifyDistributedNotices(gameRoot, repositoryRoot);
  assert.equal(notices.length, REQUIRED_NOTICES.length);
  assert.equal(notices[0].sha256, sha256File(join(repositoryRoot, REQUIRED_NOTICES[0])));

  const parsed = parseArguments([
    '--version', '0.1.0', '--source-url', 'https://example.com/quantum-zama-sniper/v0.1.0',
    '--artifact', 'windows-msi=release/game.msi',
    '--artifact', 'android-arm64=release/game.apk', '--output', 'release/evidence.json',
  ]);
  assert.equal(parsed.version, '0.1.0');
  assert.equal(parsed.sourceUrl, 'https://example.com/quantum-zama-sniper/v0.1.0');
  assert.deepEqual(parsed.artifacts, ['windows-msi=release/game.msi', 'android-arm64=release/game.apk']);
  assert.throws(() => parseArguments(['--version', 'latest', '--source-url', 'https://example.com/source', '--output', 'out.json', '--artifact', 'web=x.zip']));
  assert.throws(() => parseArguments(['--version', '0.1.0', '--source-url', 'http://example.com/source', '--output', 'out.json', '--artifact', 'web=x.zip']));
  assert.throws(() => parseArguments(['--version', '0.1.0', '--source-url', 'https://example.com/source', '--output', 'out.json']));

  writeFileSync(join(gameRoot, 'dist', 'legal', 'LICENSE'), 'tampered');
  assert.throws(() => verifyDistributedNotices(gameRoot, repositoryRoot), /differs from source/);
  console.log(`Release-evidence contract passed: ${REQUIRED_NOTICES.length} notices, strict arguments, tamper rejection`);
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
