import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { LEVEL_002 } from '../src/content/levels/chapter-01.ts';
import {
  levelDefinitionDependencyHash, serializeLevelDefinition, validateLevelDefinition,
} from '../src/content/validate-level.ts';
import { validateLevelSubmission } from '../src/content/submission-gates.ts';

const WORKING_DAY_MINUTES = 8 * 60;
const startedAt = new Date().toISOString();
const started = performance.now();

function runStage(script) {
  const stageStarted = performance.now();
  const npmEntry = process.env.npm_execpath;
  if (npmEntry === undefined) throw new Error('Authoring dry run must be launched through npm');
  const result = spawnSync(process.execPath, [npmEntry, 'run', script], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
    windowsHide: true,
  });
  const elapsedMs = Math.round(performance.now() - stageStarted);
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  if (result.error !== undefined || result.status !== 0) {
    const detail = output.split(/\r?\n/).slice(-24).join('\n');
    throw new Error(`${script} failed after ${elapsedMs} ms${result.error === undefined ? '' : `: ${result.error.message}`}\n${detail}`);
  }
  console.log(`AUTHORING_GATE_STAGE=${JSON.stringify({ script, elapsedMs, passed: true })}`);
  return { script, elapsedMs, passed: true };
}

const candidateStarted = performance.now();
const candidate = structuredClone(LEVEL_002);
candidate.seed = 'authoring-dry-run-level-002-v1';
candidate.dance.bpm = 99;
candidate.agentValidation.runs[0].seed = candidate.seed;
candidate.agentValidation.runs[0].parTicks += 60;
const validatedCandidate = validateLevelDefinition(candidate);
const submission = validateLevelSubmission(validatedCandidate);
const canonicalJson = serializeLevelDefinition(validatedCandidate);
const effectiveLevelHash = levelDefinitionDependencyHash(validatedCandidate);
const dependencyCurrent = validatedCandidate.agentValidation.runs.every(
  (run) => run.dependencyHashes.effectiveLevel === effectiveLevelHash,
);
if (dependencyCurrent) throw new Error('Representative authoritative edit did not expose a stale dependency');
if (serializeLevelDefinition(validateLevelDefinition(JSON.parse(canonicalJson))) !== canonicalJson) {
  throw new Error('Representative edit did not round-trip as canonical review JSON');
}
const candidateStage = {
  script: 'representative-edit-preflight',
  elapsedMs: Math.round(performance.now() - candidateStarted),
  passed: true,
};
console.log(`AUTHORING_GATE_STAGE=${JSON.stringify(candidateStage)}`);

const stages = [candidateStage];
for (const script of [
  'content:schema:check',
  'content:submission',
  'content:export:check',
  'qa:campaign',
  'qa:balance',
  'test',
  'build',
]) stages.push(runStage(script));

const elapsedMs = Math.round(performance.now() - started);
const report = {
  schemaVersion: 1,
  gateId: 'phase-6.5-one-working-day-authoring',
  runKind: 'internal-automation-and-handoff-dry-run',
  startedAt,
  workingDayBudgetMinutes: WORKING_DAY_MINUTES,
  automatedElapsedMs: elapsedMs,
  automatedElapsedMinutes: Math.round(elapsedMs / 600) / 100,
  automatedGatePassed: true,
  humanDesignerTimingStatus: 'requires-trained-content-designer-session',
  scope: 'Representative existing-asset edit, strict preflight, stale-dependency detection, and complete checked-in integration pipeline; excludes creative authoring and human training time.',
  candidate: {
    sourceLevelId: LEVEL_002.id,
    editedSeed: candidate.seed,
    editedBpm: candidate.dance.bpm,
    editedParTicks: candidate.agentValidation.runs[0].parTicks,
    canonicalBytes: Buffer.byteLength(canonicalJson),
    staleDependencyDetected: !dependencyCurrent,
    localizationKeys: submission.localizationKeys.length,
    provenanceAssets: submission.assetIds.length,
    totalRobots: validatedCandidate.encounters.flatMap((encounter) => encounter.waves)
      .reduce((total, wave) => total + wave.spawnGroups.reduce((sum, group) => sum + group.count, 0), 0),
  },
  stages,
};
console.log(`AUTHORING_GATE_REPORT=${JSON.stringify(report)}`);
