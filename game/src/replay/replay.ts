import { PULSE_COOLDOWN_TICKS, PULSE_DAMAGE, PULSE_ENERGY_COST, PULSE_MAX_RANGE } from '../sim/combat';
import { GAME_SCHEMA_VERSION, TICK_HZ } from '../sim/constants';
import { GameSimulation } from '../sim/game';
import { LEVEL_ROWS } from '../sim/level';
import type { PlayerCommand } from '../sim/player';
import { ROBOT_DEFINITIONS } from '../sim/robots';
import {
  canonicalJson, checksumCanonical, createSimulationSnapshot, parseSimulationSnapshot, stateChecksum,
  type SimulationSnapshotV1,
} from '../sim/serialization';
import { XPBD_ITERATIONS, XPBD_SUBSTEPS } from '../sim/xpbd';
import {
  ENEMY_ATTACK_RANGE, ENEMY_INITIAL_COOLDOWN_BASE, ENEMY_INITIAL_COOLDOWN_STEP,
  ENEMY_PROJECTILE_DAMAGE, ENEMY_PROJECTILE_SPEED, ENEMY_REPEAT_COOLDOWN_BASE, ENEMY_REPEAT_COOLDOWN_STEP,
  ROBOT_BASE_COIN_REWARD, ROBOT_COIN_REWARD_PER_ID, ROBOT_STARTING_HEALTH,
} from '../sim/balance';

export const REPLAY_FORMAT_VERSION = 1;
export const REPLAY_CHECKSUM_INTERVAL_TICKS = 60;
export const MAX_REPLAY_TICKS = 3_600_000;

export interface ReplayDependencyHashes {
  readonly simulationSchema: string;
  readonly levelData: string;
  readonly balanceData: string;
  readonly replayPolicy: string;
}

export interface ReplayCommandRun {
  readonly startTick: number;
  ticks: number;
  readonly command: PlayerCommand;
}

export interface ReplayChecksum {
  readonly tick: number;
  readonly checksum: string;
}

export interface ReplayFileV1 {
  readonly replayFormatVersion: 1;
  readonly simulationSchemaVersion: number;
  readonly levelId: 'level-001';
  readonly seed: string;
  readonly agentRun: boolean;
  readonly dependencyHashes: ReplayDependencyHashes;
  readonly initialSnapshot: SimulationSnapshotV1;
  readonly commandRuns: readonly ReplayCommandRun[];
  readonly checksums: readonly ReplayChecksum[];
}

function robotBalanceData(): unknown {
  return ROBOT_DEFINITIONS.map((definition) => ({
    dance: definition.dance,
    route: definition.route,
    scale: definition.scale,
    headScale: definition.headScale,
    torsoWidth: definition.torsoWidth,
    legScale: definition.legScale,
    speed: definition.speed,
    phaseOffset: definition.phaseOffset,
  }));
}

export function currentReplayDependencies(): ReplayDependencyHashes {
  return {
    simulationSchema: checksumCanonical({ GAME_SCHEMA_VERSION, TICK_HZ, XPBD_SUBSTEPS, XPBD_ITERATIONS }),
    levelData: checksumCanonical({ levelId: 'level-001', rows: LEVEL_ROWS }),
    balanceData: checksumCanonical({
      pulse: {
        PULSE_DAMAGE, PULSE_COOLDOWN_TICKS, PULSE_ENERGY_COST, PULSE_MAX_RANGE,
        ROBOT_BASE_COIN_REWARD, ROBOT_COIN_REWARD_PER_ID,
      },
      enemyProjectile: {
        ENEMY_PROJECTILE_DAMAGE, ENEMY_PROJECTILE_SPEED, ENEMY_ATTACK_RANGE,
        ENEMY_INITIAL_COOLDOWN_BASE, ENEMY_INITIAL_COOLDOWN_STEP,
        ENEMY_REPEAT_COOLDOWN_BASE, ENEMY_REPEAT_COOLDOWN_STEP,
      },
      robotStartingHealth: ROBOT_STARTING_HEALTH,
      robots: robotBalanceData(),
    }),
    replayPolicy: checksumCanonical({ replayFormatVersion: REPLAY_FORMAT_VERSION, checksumInterval: REPLAY_CHECKSUM_INTERVAL_TICKS }),
  };
}

function sameCommand(first: PlayerCommand, second: PlayerCommand): boolean {
  return first.forward === second.forward && first.strafe === second.strafe
    && first.yawDelta === second.yawDelta && first.pitchDelta === second.pitchDelta && first.fire === second.fire;
}

function copyCommand(command: PlayerCommand): PlayerCommand {
  return { ...command };
}

export class ReplayRecorder {
  private readonly initialSnapshot: SimulationSnapshotV1;
  private readonly commandRuns: ReplayCommandRun[] = [];
  private readonly checksums: ReplayChecksum[] = [];
  private nextTick: number;
  private agentRun = false;

  constructor(private readonly simulation: GameSimulation) {
    this.initialSnapshot = createSimulationSnapshot(simulation.state);
    this.nextTick = simulation.state.tick;
    this.checksums.push({ tick: simulation.state.tick, checksum: stateChecksum(simulation.state) });
  }

  markAgentRun(): void { this.agentRun = true; }

  record(command: PlayerCommand): void {
    if (this.simulation.state.tick !== this.nextTick + 1) throw new Error('Replay recorder missed or duplicated a simulation tick');
    const last = this.commandRuns.at(-1);
    if (last !== undefined && last.startTick + last.ticks === this.nextTick && sameCommand(last.command, command)) {
      last.ticks += 1;
    } else {
      this.commandRuns.push({ startTick: this.nextTick, ticks: 1, command: copyCommand(command) });
    }
    this.nextTick += 1;
    if (this.simulation.state.tick % REPLAY_CHECKSUM_INTERVAL_TICKS === 0) {
      this.checksums.push({ tick: this.simulation.state.tick, checksum: stateChecksum(this.simulation.state) });
    }
  }

  finish(): ReplayFileV1 {
    const finalTick = this.simulation.state.tick;
    const finalChecksums = this.checksums.map((checksum) => ({ ...checksum }));
    if (finalChecksums.at(-1)?.tick !== finalTick) finalChecksums.push({ tick: finalTick, checksum: stateChecksum(this.simulation.state) });
    return {
      replayFormatVersion: REPLAY_FORMAT_VERSION,
      simulationSchemaVersion: GAME_SCHEMA_VERSION,
      levelId: 'level-001',
      seed: this.initialSnapshot.seed,
      agentRun: this.agentRun,
      dependencyHashes: currentReplayDependencies(),
      initialSnapshot: this.initialSnapshot,
      commandRuns: this.commandRuns.map((run) => ({ ...run, command: copyCommand(run.command) })),
      checksums: finalChecksums,
    };
  }
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[], label: string): void {
  const actualKeys = Object.keys(value).sort();
  const expectedKeys = [...expected].sort();
  if (actualKeys.length !== expectedKeys.length || actualKeys.some((key, index) => key !== expectedKeys[index])) {
    throw new Error(`${label} has unknown or missing fields`);
  }
}

function integer(value: unknown, label: string, minimum = 0): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum) throw new Error(`${label} must be an integer >= ${minimum}`);
  return value;
}

function finite(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label} must be finite`);
  return value;
}

function parseCommand(value: unknown, label: string): PlayerCommand {
  const command = record(value, label);
  exactKeys(command, ['forward', 'strafe', 'yawDelta', 'pitchDelta', 'fire'], label);
  const forward = finite(command.forward, `${label}.forward`);
  const strafe = finite(command.strafe, `${label}.strafe`);
  const yawDelta = finite(command.yawDelta, `${label}.yawDelta`);
  const pitchDelta = finite(command.pitchDelta, `${label}.pitchDelta`);
  if (Math.abs(forward) > 1 || Math.abs(strafe) > 1) throw new Error(`${label} movement is outside [-1,1]`);
  if (Math.abs(yawDelta) > 10 || Math.abs(pitchDelta) > 10) throw new Error(`${label} look delta is outside replay bounds`);
  if (typeof command.fire !== 'boolean') throw new Error(`${label}.fire must be boolean`);
  return { forward, strafe, yawDelta, pitchDelta, fire: command.fire };
}

function parseDependencies(value: unknown): ReplayDependencyHashes {
  const dependencies = record(value, 'replay.dependencyHashes');
  exactKeys(dependencies, ['simulationSchema', 'levelData', 'balanceData', 'replayPolicy'], 'replay.dependencyHashes');
  for (const [key, hash] of Object.entries(dependencies)) {
    if (typeof hash !== 'string' || !/^[0-9a-f]{16}$/.test(hash)) throw new Error(`replay dependency ${key} is not a checksum`);
  }
  return dependencies as unknown as ReplayDependencyHashes;
}

export function parseReplay(serialized: string): ReplayFileV1 {
  const value = record(JSON.parse(serialized) as unknown, 'replay');
  exactKeys(value, [
    'replayFormatVersion', 'simulationSchemaVersion', 'levelId', 'seed', 'agentRun', 'dependencyHashes',
    'initialSnapshot', 'commandRuns', 'checksums',
  ], 'replay');
  if (value.replayFormatVersion !== REPLAY_FORMAT_VERSION) throw new Error('Unsupported replay format version');
  if (value.simulationSchemaVersion !== GAME_SCHEMA_VERSION) throw new Error('Unsupported replay simulation schema');
  if (value.levelId !== 'level-001') throw new Error('Unsupported replay level');
  if (typeof value.seed !== 'string' || value.seed.length === 0) throw new Error('replay.seed is invalid');
  if (typeof value.agentRun !== 'boolean') throw new Error('replay.agentRun must be boolean');
  const initialSnapshot = parseSimulationSnapshot(canonicalJson(value.initialSnapshot));
  if (initialSnapshot.seed !== value.seed) throw new Error('Replay seed does not match its initial snapshot');
  if (!Array.isArray(value.commandRuns)) throw new Error('replay.commandRuns must be an array');
  let expectedTick = initialSnapshot.tick;
  const commandRuns = value.commandRuns.map((entry, index): ReplayCommandRun => {
    const run = record(entry, `commandRuns[${index}]`);
    exactKeys(run, ['startTick', 'ticks', 'command'], `commandRuns[${index}]`);
    const startTick = integer(run.startTick, `commandRuns[${index}].startTick`);
    const ticks = integer(run.ticks, `commandRuns[${index}].ticks`, 1);
    if (startTick !== expectedTick) throw new Error(`Replay command runs are not contiguous at tick ${expectedTick}`);
    expectedTick += ticks;
    if (expectedTick - initialSnapshot.tick > MAX_REPLAY_TICKS) throw new Error(`Replay exceeds ${MAX_REPLAY_TICKS} ticks`);
    return { startTick, ticks, command: parseCommand(run.command, `commandRuns[${index}].command`) };
  });
  if (!Array.isArray(value.checksums) || value.checksums.length === 0) throw new Error('replay.checksums must be non-empty');
  let previousChecksumTick = -1;
  const checksums = value.checksums.map((entry, index): ReplayChecksum => {
    const checksum = record(entry, `checksums[${index}]`);
    exactKeys(checksum, ['tick', 'checksum'], `checksums[${index}]`);
    const tick = integer(checksum.tick, `checksums[${index}].tick`);
    if (tick <= previousChecksumTick || tick < initialSnapshot.tick || tick > expectedTick) throw new Error('Replay checksum ticks are invalid');
    if (typeof checksum.checksum !== 'string' || !/^[0-9a-f]{16}$/.test(checksum.checksum)) throw new Error('Replay checksum is invalid');
    previousChecksumTick = tick;
    return { tick, checksum: checksum.checksum };
  });
  if (checksums[0]!.tick !== initialSnapshot.tick || checksums.at(-1)!.tick !== expectedTick) {
    throw new Error('Replay must checksum its initial and final ticks');
  }
  return {
    replayFormatVersion: 1,
    simulationSchemaVersion: GAME_SCHEMA_VERSION,
    levelId: 'level-001',
    seed: value.seed,
    agentRun: value.agentRun,
    dependencyHashes: parseDependencies(value.dependencyHashes),
    initialSnapshot,
    commandRuns,
    checksums,
  };
}

export function serializeReplay(replay: ReplayFileV1): string {
  return canonicalJson(replay);
}

export interface ReplayVerification {
  readonly simulation: GameSimulation;
  readonly ticksPlayed: number;
  readonly finalChecksum: string;
}

export function verifyReplay(replayValue: ReplayFileV1): ReplayVerification {
  const replay = parseReplay(serializeReplay(replayValue));
  const expectedDependencies = currentReplayDependencies();
  for (const key of Object.keys(expectedDependencies) as (keyof ReplayDependencyHashes)[]) {
    if (replay.dependencyHashes[key] !== expectedDependencies[key]) throw new Error(`Replay dependency mismatch: ${key}`);
  }
  const simulation = GameSimulation.fromSnapshot(replay.initialSnapshot);
  const checksumByTick = new Map(replay.checksums.map((entry) => [entry.tick, entry.checksum]));
  const verifyTick = (): void => {
    const expected = checksumByTick.get(simulation.state.tick);
    if (expected !== undefined) {
      const actual = stateChecksum(simulation.state);
      if (actual !== expected) throw new Error(`Replay checksum drift at tick ${simulation.state.tick}: expected ${expected}, got ${actual}`);
    }
  };
  verifyTick();
  for (const run of replay.commandRuns) {
    for (let tick = 0; tick < run.ticks; tick += 1) {
      simulation.step(run.command);
      verifyTick();
    }
  }
  return {
    simulation,
    ticksPlayed: simulation.state.tick - replay.initialSnapshot.tick,
    finalChecksum: stateChecksum(simulation.state),
  };
}
