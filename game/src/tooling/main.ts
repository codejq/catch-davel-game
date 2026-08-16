import './tooling.css';
import { chapter01LevelTitle } from '../campaign/catalog';
import { CHAPTER_01_LEVEL_IDS, isChapter01LevelId, type Chapter01LevelId } from '../content/level-ids';
import { CHAPTER_01_LEVELS } from '../content/levels/chapter-01';
import type { LevelDefinition, MazeNodeSpec } from '../content/level-definition';
import { createLevelRuntime } from '../sim/interactions';
import { levelRows, worldCell } from '../sim/level';
import { createLevelToolingReport, type LevelToolingReport } from './tooling-model';
import { inspectReplay, type ReplayInspection } from './replay-inspector-model';
import { GameSimulation } from '../sim/game';
import { ReplayRecorder, serializeReplay } from '../replay/replay';
import { createChapter01BalanceReport } from '../qa/balance-harness';

function element<T extends Element>(selector: string): T {
  const result = document.querySelector<T>(selector);
  if (result === null) throw new Error(`Content Workbench is missing ${selector}`);
  return result;
}

const select = element<HTMLSelectElement>('#level-select');
const source = element<HTMLTextAreaElement>('#level-source');
const status = element<HTMLDivElement>('#validation-status');
const summary = element<HTMLDListElement>('#summary');
const maze = element<HTMLDivElement>('#maze');
const graph = element<SVGSVGElement>('#graph');
const danceHeading = element<HTMLDivElement>('#dance-heading');
const danceTimeline = element<HTMLDivElement>('#dance-timeline');
const waves = element<HTMLDivElement>('#waves');
const replaySource = element<HTMLTextAreaElement>('#replay-source');
const replayStatus = element<HTMLDivElement>('#replay-status');
const replaySummary = element<HTMLDListElement>('#replay-summary');
const replayDependencies = element<HTMLDivElement>('#replay-dependencies');
const replayChecksums = element<HTMLDivElement>('#replay-checksums');
const replayCommands = element<HTMLDivElement>('#replay-commands');
const balanceSummary = element<HTMLDivElement>('#balance-summary');
const balanceTableBody = element<HTMLTableSectionElement>('#balance-table tbody');

for (const levelId of CHAPTER_01_LEVEL_IDS) {
  const option = document.createElement('option');
  option.value = levelId;
  option.textContent = `${levelId.slice(-3)} · ${chapter01LevelTitle(levelId)}`;
  select.append(option);
}

function selectedLevelId(): Chapter01LevelId { return select.value as Chapter01LevelId; }

function authored(levelId: Chapter01LevelId): LevelDefinition {
  return CHAPTER_01_LEVELS.find((level) => level.id === levelId)!;
}

function load(levelId = selectedLevelId()): void {
  source.value = JSON.stringify(authored(levelId), null, 2);
  validate();
}

function addSummary(label: string, value: string): void {
  const term = document.createElement('dt');
  const description = document.createElement('dd');
  term.textContent = label;
  description.textContent = value;
  summary.append(term, description);
}

function renderSummary(report: LevelToolingReport): void {
  summary.replaceChildren();
  addSummary('Identity', `${report.level.id} · seed ${report.level.seed}`);
  addSummary('Content hash', report.contentHash);
  addSummary('Effective hash', report.effectiveLevelHash);
  addSummary('Dependency', report.dependencyCurrent ? 'CURRENT' : `STALE · declares ${report.declaredEffectiveLevelHash}`);
  addSummary('Maze', `${report.roomCount} rooms (${report.criticalRoomCount} critical / ${report.optionalRoomCount} optional), ${report.edgeCount} edges`);
  addSummary('Combat', `${report.encounterCount} encounter · ${report.waveCount} wave(s) · ${report.totalRobotCount} total / ${report.peakRobotCount} peak Davels`);
  addSummary('Resources', `${report.pickupIds.join(', ') || 'none'} · ${report.hazardCount} hazard(s)`);
  addSummary('Localization', report.localizationKeys.join(' · '));
}

function overlayMap(levelId: Chapter01LevelId): Map<string, string> {
  const runtime = createLevelRuntime(levelId);
  const overlay = new Map<string, string>();
  for (const pickup of runtime.pickups) {
    const cell = worldCell(pickup.x, pickup.z);
    overlay.set(`${cell.column},${cell.row}`, pickup.kind === 'key' ? 'K' : pickup.kind === 'health' ? '+' : pickup.kind === 'energy' ? '⚡' : '$');
  }
  overlay.set(`${runtime.door.column},${runtime.door.row}`, 'D');
  const checkpoint = worldCell(runtime.checkpoint.x, runtime.checkpoint.z);
  overlay.set(`${checkpoint.column},${checkpoint.row}`, 'C');
  for (const hazard of runtime.hazards) overlay.set(`${hazard.column},${hazard.row}`, hazard.kind === 'timed-door' ? '⏱' : '⇢');
  return overlay;
}

function renderMaze(level: LevelDefinition): void {
  maze.replaceChildren();
  if (!isChapter01LevelId(level.id)) {
    maze.textContent = 'Runtime grid preview is reserved for Chapter 1 stable IDs.';
    return;
  }
  const overlay = overlayMap(level.id);
  for (const [rowIndex, row] of levelRows(level.id).entries()) {
    for (const [columnIndex, cell] of [...row].entries()) {
      const tile = document.createElement('span');
      const marker = overlay.get(`${columnIndex},${rowIndex}`) ?? cell;
      tile.textContent = marker === '.' ? '' : marker;
      tile.className = `maze-cell ${cell === '#' ? 'wall' : 'floor'} marker-${marker.replace(/[^a-z0-9]/gi, 'symbol')}`;
      tile.title = `${columnIndex},${rowIndex}${overlay.has(`${columnIndex},${rowIndex}`) ? ` · ${marker}` : ''}`;
      maze.append(tile);
    }
  }
}

function svg<K extends keyof SVGElementTagNameMap>(name: K): SVGElementTagNameMap[K] {
  return document.createElementNS('http://www.w3.org/2000/svg', name);
}

function nodePosition(node: MazeNodeSpec, index: number, criticalIndex: number, optionalIndex: number): { x: number; y: number } {
  return node.criticalPath ? { x: 85 + criticalIndex * 175, y: 85 } : { x: 170 + optionalIndex * 220, y: 225 };
}

function renderGraph(level: LevelDefinition): void {
  graph.replaceChildren();
  const positions = new Map<string, { x: number; y: number }>();
  let criticalIndex = 0;
  let optionalIndex = 0;
  level.maze.nodes.forEach((node, index) => {
    positions.set(node.id, nodePosition(node, index, criticalIndex, optionalIndex));
    if (node.criticalPath) criticalIndex += 1; else optionalIndex += 1;
  });
  for (const edge of level.maze.edges) {
    const from = positions.get(edge.from)!;
    const to = positions.get(edge.to)!;
    const line = svg('line');
    line.setAttribute('x1', String(from.x)); line.setAttribute('y1', String(from.y));
    line.setAttribute('x2', String(to.x)); line.setAttribute('y2', String(to.y));
    line.classList.add(edge.requiredKeyId === null ? 'edge-open' : 'edge-locked');
    graph.append(line);
    if (edge.requiredKeyId !== null || edge.stateTrigger !== null) {
      const label = svg('text');
      label.setAttribute('x', String((from.x + to.x) / 2)); label.setAttribute('y', String((from.y + to.y) / 2 - 7));
      label.textContent = edge.requiredKeyId ?? edge.stateTrigger ?? '';
      label.classList.add('edge-label');
      graph.append(label);
    }
  }
  for (const node of level.maze.nodes) {
    const position = positions.get(node.id)!;
    const box = svg('rect');
    box.setAttribute('x', String(position.x - 67)); box.setAttribute('y', String(position.y - 28));
    box.setAttribute('width', '134'); box.setAttribute('height', '56'); box.setAttribute('rx', '14');
    box.classList.add(node.criticalPath ? 'node-critical' : 'node-optional');
    const label = svg('text');
    label.setAttribute('x', String(position.x)); label.setAttribute('y', String(position.y - 3));
    label.classList.add('node-label'); label.textContent = node.id.replace('room-', '');
    const detail = svg('text');
    detail.setAttribute('x', String(position.x)); detail.setAttribute('y', String(position.y + 16));
    detail.classList.add('node-detail'); detail.textContent = `${node.role}${node.encounterIds.length > 0 ? ' · encounter' : ''}`;
    graph.append(box, label, detail);
  }
}

function renderDance(level: LevelDefinition): void {
  danceHeading.textContent = `${level.dance.presetId} · ${level.dance.bpm} BPM · ${level.dance.timeSignature} · intensity ${level.dance.visualIntensity}`;
  danceTimeline.replaceChildren();
  const beatsPerBar = level.dance.timeSignature === '4/4' ? 4 : level.dance.timeSignature === '3/4' ? 3 : 7;
  const beatCount = beatsPerBar * level.dance.barsPerPhrase;
  for (let beat = 0; beat < beatCount; beat += 1) {
    const cell = document.createElement('span');
    cell.textContent = String(beat + 1);
    if (level.dance.attackBeats.includes(beat)) cell.classList.add('attack');
    if (level.dance.vulnerableBeats.includes(beat)) cell.classList.add('vulnerable');
    if (beat % beatsPerBar === 0) cell.classList.add('bar-start');
    danceTimeline.append(cell);
  }
}

function renderWaves(level: LevelDefinition): void {
  waves.replaceChildren();
  for (const encounter of level.encounters) {
    const heading = document.createElement('h3');
    heading.textContent = `${encounter.id} · ${encounter.trigger} · ${encounter.arenaLock ? 'arena lock' : 'open arena'}`;
    waves.append(heading);
    for (const [index, wave] of encounter.waves.entries()) {
      const card = document.createElement('section');
      const title = document.createElement('b');
      title.textContent = `Wave ${index + 1} · delay ${wave.startDelayTicks} ticks · peak ${wave.maxConcurrentRobots}`;
      const list = document.createElement('ul');
      for (const group of wave.spawnGroups) {
        const item = document.createElement('li');
        item.textContent = `${group.count}× ${group.archetypeId} · ${group.rank}${group.modifierIds.length > 0 ? ` · ${group.modifierIds.join(', ')}` : ''}`;
        list.append(item);
      }
      card.append(title, list);
      waves.append(card);
    }
  }
  const budget = document.createElement('p');
  budget.className = 'budget';
  budget.textContent = `Budgets · ${level.performance.maxActiveRobots} robots · ${level.performance.maxActiveProjectiles} projectiles · ${level.performance.maxHazards} hazards · ${level.performance.maxRenderInstances} render instances`;
  waves.append(budget);
}

function validate(): LevelToolingReport | null {
  try {
    const report = createLevelToolingReport(JSON.parse(source.value));
    renderSummary(report); renderMaze(report.level); renderGraph(report.level); renderDance(report.level); renderWaves(report.level);
    status.className = report.dependencyCurrent ? 'valid' : 'warning';
    status.textContent = report.dependencyCurrent
      ? 'VALID · schema, graph, key order, references, budgets, and dependency hash agree'
      : 'VALID CONTENT, STALE DEPENDENCY · update review hashes and frozen references before export';
    return report;
  } catch (error) {
    status.className = 'invalid';
    status.textContent = `INVALID · ${error instanceof Error ? error.message : String(error)}`;
    return null;
  }
}

function addReplaySummary(label: string, value: string): void {
  const term = document.createElement('dt');
  const description = document.createElement('dd');
  term.textContent = label; description.textContent = value;
  replaySummary.append(term, description);
}

function renderReplayInspection(inspection: ReplayInspection): void {
  replaySummary.replaceChildren(); replayDependencies.replaceChildren();
  replayChecksums.replaceChildren(); replayCommands.replaceChildren();
  replayStatus.className = inspection.verified ? 'valid' : 'invalid';
  replayStatus.textContent = inspection.verified
    ? 'VERIFIED · strict parse, dependencies, periodic checksums, and final checksum agree'
    : `NOT VERIFIED · ${inspection.verificationError}`;
  addReplaySummary('Identity', `${inspection.replay.levelId} · ${inspection.replay.seed} · ${inspection.replay.agentRun ? 'agent' : 'human'} run`);
  addReplaySummary('Ticks', `${inspection.initialTick} → ${inspection.finalTick} · ${inspection.ticksPlayed} played`);
  addReplaySummary('Compression', `${inspection.commandRunCount} command runs · ${inspection.compressionRatio.toFixed(2)} ticks/run`);
  addReplaySummary('Activity', `${inspection.movementTicks} movement ticks · ${inspection.fireTicks} fire ticks`);
  addReplaySummary('Weapons', Object.entries(inspection.weaponSelectionTicks).map(([weapon, ticks]) => `${weapon} ${ticks}`).join(' · '));
  addReplaySummary('Final checksum', `${inspection.declaredFinalChecksum}${inspection.verifiedFinalChecksum === null ? '' : ' · re-simulated match'}`);
  for (const dependency of inspection.dependencies) {
    const row = document.createElement('div');
    row.className = dependency.matches ? 'dependency-match' : 'dependency-mismatch';
    row.textContent = `${dependency.name} · ${dependency.recorded}${dependency.matches ? ' ✓' : ` ≠ ${dependency.current}`}`;
    replayDependencies.append(row);
  }
  for (const checksum of inspection.replay.checksums) {
    const cell = document.createElement('span');
    cell.textContent = `${checksum.tick}\n${checksum.checksum}`;
    replayChecksums.append(cell);
  }
  for (const [index, run] of inspection.replay.commandRuns.entries()) {
    const row = document.createElement('div');
    const command = run.command;
    row.textContent = `${index + 1}. ticks ${run.startTick}–${run.startTick + run.ticks} (${run.ticks}) · move ${command.forward.toFixed(2)}/${command.strafe.toFixed(2)} · look ${command.yawDelta.toFixed(3)}/${command.pitchDelta.toFixed(3)} · ${command.fire ? 'FIRE' : 'hold'}${command.weapon === null || command.weapon === undefined ? '' : ` · ${command.weapon}`}`;
    replayCommands.append(row);
  }
}

function inspectReplaySource(): void {
  try {
    renderReplayInspection(inspectReplay(replaySource.value));
  } catch (error) {
    replayStatus.className = 'invalid';
    replayStatus.textContent = `INVALID REPLAY · ${error instanceof Error ? error.message : String(error)}`;
  }
}

function createSampleReplay(): void {
  const levelId = selectedLevelId();
  const level = authored(levelId);
  const simulation = new GameSimulation(level.seed, undefined, undefined, 'campaign', levelId);
  const recorder = new ReplayRecorder(simulation);
  recorder.markAgentRun();
  for (let tick = 0; tick < 180; tick += 1) {
    const command = {
      forward: tick < 90 ? 0.8 : 0, strafe: tick >= 90 ? 0.4 : 0,
      yawDelta: tick % 30 === 0 ? 0.04 : 0, pitchDelta: 0,
      fire: tick % 24 === 0, altFire: false, weapon: null,
    } as const;
    simulation.step(command); recorder.record(command);
  }
  replaySource.value = serializeReplay(recorder.finish());
  inspectReplaySource();
}

function renderBalanceHarness(): void {
  const report = createChapter01BalanceReport();
  balanceSummary.textContent = `Guaranteed ${report.guaranteedChapterCoins} coins · optional caches ${report.optionalCacheCoins} · maximum ${report.maximumChapterCoins} · full upgrade catalog ${report.fullUpgradeCatalogCost} · guaranteed affordable by Level ${report.fullCatalogGuaranteedAffordableLevel ?? '—'}`;
  balanceTableBody.replaceChildren();
  for (const level of report.levels) {
    const row = document.createElement('tr');
    const values = [
      level.levelId, level.waves.length, level.objectiveTargetCount, level.totalRobotHealth,
      Math.max(...level.waves.map((wave) => wave.pressureScore)), level.guaranteedCoins,
      level.optionalCacheCoins, level.cumulativeGuaranteedCoins,
    ];
    for (const value of values) {
      const cell = document.createElement('td'); cell.textContent = String(value); row.append(cell);
    }
    balanceTableBody.append(row);
  }
}

element<HTMLButtonElement>('#load-level').addEventListener('click', () => load());
element<HTMLButtonElement>('#validate-level').addEventListener('click', () => validate());
element<HTMLButtonElement>('#format-level').addEventListener('click', () => {
  const report = validate();
  if (report !== null) source.value = JSON.stringify(JSON.parse(report.canonicalJson), null, 2);
});
element<HTMLButtonElement>('#copy-level').addEventListener('click', async () => {
  const report = validate();
  if (report === null) return;
  await navigator.clipboard.writeText(report.canonicalJson);
  status.textContent = 'VALID · canonical JSON copied';
});
element<HTMLButtonElement>('#download-level').addEventListener('click', () => {
  const report = validate();
  if (report === null) return;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([`${report.canonicalJson}\n`], { type: 'application/json' }));
  link.download = `${report.level.id}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
});
select.addEventListener('change', () => load());
source.addEventListener('input', () => { status.className = 'dirty'; status.textContent = 'EDITED · validate before review or export'; });
element<HTMLButtonElement>('#sample-replay').addEventListener('click', createSampleReplay);
element<HTMLButtonElement>('#inspect-replay').addEventListener('click', inspectReplaySource);
element<HTMLInputElement>('#replay-file').addEventListener('change', async (event) => {
  const file = (event.currentTarget as HTMLInputElement).files?.[0];
  if (file === undefined) return;
  replaySource.value = await file.text(); inspectReplaySource();
});

load('level-001');
renderBalanceHarness();
