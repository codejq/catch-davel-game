import './tooling.css';
import { chapter01LevelTitle } from '../campaign/catalog';
import { CHAPTER_01_LEVEL_IDS, isChapter01LevelId, type Chapter01LevelId } from '../content/level-ids';
import { CHAPTER_01_LEVELS } from '../content/levels/chapter-01';
import type { LevelDefinition, MazeNodeSpec } from '../content/level-definition';
import { createLevelRuntime } from '../sim/interactions';
import { levelRows, worldCell } from '../sim/level';
import { createLevelToolingReport, type LevelToolingReport } from './tooling-model';

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

load('level-001');
