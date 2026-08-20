import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const REQUIRED_NOTICES = [
  'LICENSE', 'CREDITS.md', 'PRIVACY.md', 'SECURITY.md', 'SOURCE.md', 'TRADEMARKS.md',
  'THIRD_PARTY_ASSETS.md',
];

const GAME_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPOSITORY_ROOT = resolve(GAME_ROOT, '..');

function fail(message) {
  throw new Error(message);
}

export function parseArguments(argv) {
  const options = { artifacts: [], allowDirty: false, force: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--allow-dirty') options.allowDirty = true;
    else if (argument === '--force') options.force = true;
    else if (argument === '--version' || argument === '--source-url' || argument === '--output' || argument === '--artifact') {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith('--')) fail(`${argument} requires a value`);
      index += 1;
      if (argument === '--artifact') options.artifacts.push(value);
      else if (argument === '--source-url') options.sourceUrl = value;
      else options[argument.slice(2)] = value;
    } else fail(`Unknown argument: ${argument}`);
  }
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(options.version ?? '')) {
    fail('--version must be an explicit semantic version');
  }
  try {
    const sourceUrl = new URL(options.sourceUrl ?? '');
    if (sourceUrl.protocol !== 'https:') fail('--source-url must use HTTPS');
  } catch {
    fail('--source-url must be an absolute HTTPS URL');
  }
  if (options.output === undefined) fail('--output is required');
  if (options.artifacts.length === 0) fail('At least one --artifact target=path is required');
  return options;
}

export function sha256File(path) {
  const hash = createHash('sha256');
  hash.update(readFileSync(path));
  return hash.digest('hex');
}

export function verifyDistributedNotices(gameRoot = GAME_ROOT, repositoryRoot = REPOSITORY_ROOT) {
  return REQUIRED_NOTICES.map((filename) => {
    const source = resolve(repositoryRoot, filename);
    const distributed = resolve(gameRoot, 'dist', 'legal', filename);
    if (!existsSync(source)) fail(`Required source notice is missing: ${source}`);
    if (!existsSync(distributed)) fail(`Built package notice is missing: ${distributed}`);
    const sourceHash = sha256File(source);
    const distributedHash = sha256File(distributed);
    if (sourceHash !== distributedHash) fail(`Built notice differs from source: ${filename}`);
    return { path: `legal/${filename}`, sha256: sourceHash, sizeBytes: statSync(source).size };
  });
}

function gitText(args, repositoryRoot) {
  return execFileSync('git', args, { cwd: repositoryRoot, encoding: 'utf8' }).trim();
}

export function createEvidence(options, roots = { gameRoot: GAME_ROOT, repositoryRoot: REPOSITORY_ROOT }) {
  const { gameRoot, repositoryRoot } = roots;
  const dirty = gitText(['status', '--porcelain', '--untracked-files=no'], repositoryRoot) !== '';
  if (dirty && !options.allowDirty) fail('Release evidence requires a clean tracked worktree');
  const artifacts = options.artifacts.map((specification) => {
    const separator = specification.indexOf('=');
    if (separator < 1 || separator === specification.length - 1) {
      fail(`Artifact must use target=path syntax: ${specification}`);
    }
    const target = specification.slice(0, separator);
    const path = resolve(repositoryRoot, specification.slice(separator + 1));
    if (!/^[a-z0-9][a-z0-9._-]*$/.test(target)) fail(`Invalid artifact target: ${target}`);
    if (!existsSync(path) || !statSync(path).isFile()) fail(`Artifact is not a file: ${path}`);
    return {
      target,
      filename: basename(path),
      repositoryPath: relative(repositoryRoot, path).replaceAll('\\', '/'),
      sizeBytes: statSync(path).size,
      sha256: sha256File(path),
    };
  }).sort((left, right) => left.target.localeCompare(right.target) || left.filename.localeCompare(right.filename));
  if (new Set(artifacts.map((artifact) => artifact.target)).size !== artifacts.length) {
    fail('Each artifact target must be unique');
  }
  return {
    schemaVersion: 1,
    product: 'Quantum Catch Davel',
    version: options.version,
    sourceUrl: options.sourceUrl,
    gitCommit: gitText(['rev-parse', 'HEAD'], repositoryRoot),
    trackedWorktreeDirty: dirty,
    notices: verifyDistributedNotices(gameRoot, repositoryRoot),
    artifacts,
  };
}

export function run(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  const output = resolve(REPOSITORY_ROOT, options.output);
  if (existsSync(output) && !options.force) fail(`Output already exists; pass --force to replace it: ${output}`);
  const evidence = createEvidence(options);
  writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: 'utf8', flag: options.force ? 'w' : 'wx' });
  console.log(`Release evidence written: ${output}`);
  console.log(`Commit ${evidence.gitCommit} · ${evidence.artifacts.length} artifact(s) · ${evidence.notices.length} notices`);
  return evidence;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    run();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
