import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SIMULATION_SCHEMA_VERSION, TRANSPORT_CONTRACT_VERSION } from '../sim/constants';

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const simulationDirectory = join(packageDirectory, 'src', 'sim');
const runsDirectory = join(packageDirectory, 'artifacts', 'runs');
const forbiddenSimulationTokens = [
  /\bMath\.random\b/,
  /\bDate\.now\b/,
  /\bperformance\b/,
  /\bdocument\b/,
  /\bwindow\b/,
  /\bWebGL\w*\b/,
  /\bWorker\b/,
  /\bsetTimeout\b/,
  /\bsetInterval\b/,
] as const;

function filesBelow(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : [path];
  });
}

function parseJsonLines(path: string): number {
  const contents = readFileSync(path, 'utf8').trim();
  if (contents.length === 0) return 0;
  const lines = contents.split(/\r?\n/);
  for (const line of lines) JSON.parse(line) as unknown;
  return lines.length;
}

function verifySimulationBoundary(): number {
  let inspected = 0;
  for (const path of filesBelow(simulationDirectory)) {
    if (extname(path) !== '.ts') continue;
    inspected += 1;
    const contents = readFileSync(path, 'utf8');
    for (const forbidden of forbiddenSimulationTokens) {
      if (forbidden.test(contents)) throw new Error(`Forbidden authoritative dependency ${forbidden} in ${path}`);
    }
  }
  return inspected;
}

function verifyRendererDependencies(): void {
  const packageJson = JSON.parse(readFileSync(join(packageDirectory, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const names = [...Object.keys(packageJson.dependencies ?? {}), ...Object.keys(packageJson.devDependencies ?? {})];
  const forbidden = names.find((name) => name.toLowerCase() === 'three' || name.toLowerCase().startsWith('@react-three/'));
  if (forbidden !== undefined) throw new Error(`Forbidden renderer dependency: ${forbidden}`);
}

function verifyArtifacts(): { runs: number; sampleLines: number; errorLines: number } {
  if (!existsSync(runsDirectory)) return { runs: 0, sampleLines: 0, errorLines: 0 };
  const directories = readdirSync(runsDirectory, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  let sampleLines = 0;
  let errorLines = 0;
  for (const directory of directories) {
    const root = join(runsDirectory, directory.name);
    const required = ['run.json', 'samples.jsonl', 'summary.json', 'errors.jsonl'];
    for (const name of required) {
      if (!existsSync(join(root, name))) throw new Error(`Artifact ${directory.name} is missing ${name}`);
    }
    const manifest = JSON.parse(readFileSync(join(root, 'run.json'), 'utf8')) as {
      configuration?: { simulationSchemaVersion?: number; transportContractVersion?: number };
    };
    if (manifest.configuration?.simulationSchemaVersion !== SIMULATION_SCHEMA_VERSION) {
      throw new Error(`Artifact ${directory.name} has the wrong simulation schema`);
    }
    if (manifest.configuration.transportContractVersion !== TRANSPORT_CONTRACT_VERSION) {
      throw new Error(`Artifact ${directory.name} has the wrong transport contract`);
    }
    JSON.parse(readFileSync(join(root, 'summary.json'), 'utf8')) as unknown;
    sampleLines += parseJsonLines(join(root, 'samples.jsonl'));
    errorLines += parseJsonLines(join(root, 'errors.jsonl'));
  }
  return { runs: directories.length, sampleLines, errorLines };
}

const result = {
  simulationFilesInspected: verifySimulationBoundary(),
  rendererDependencyAudit: 'passed',
  artifacts: verifyArtifacts(),
};
verifyRendererDependencies();
process.stdout.write(`${JSON.stringify(result)}\n`);
