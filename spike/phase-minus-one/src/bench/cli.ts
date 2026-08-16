import { performance } from 'node:perf_hooks';
import {
  PROVISIONAL_BATCH_BYTE_CAP,
  PROVISIONAL_BATCH_RECORD_CAP,
  PROVISIONAL_EVENT_BYTE_CAP,
  PROVISIONAL_EVENT_RECORD_CAP,
  PHYSICS_SUBSTEPS,
  ROBOT_COUNT,
  SIMULATION_SCHEMA_VERSION,
  TICK_HZ,
  TRANSPORT_CONTRACT_VERSION,
  XPBD_ITERATIONS,
} from '../sim/constants';
import { detonateRepresentativeBombSquad } from '../sim/bomb-squad';
import { EventBuffer } from '../sim/events';
import { createScenario } from '../sim/scenario';
import { Simulation, type TickTimings } from '../sim/simulation';
import { EventProducerChannel, type EventTransportConfig } from '../transport/event-channel';
import { summarize, summarizeTimings } from './metrics';

interface BenchmarkResult {
  readonly label: 'development-only';
  readonly scenario: string;
  readonly seed: string;
  readonly configuration: {
    readonly simulationSchemaVersion: number;
    readonly transportContractVersion: number;
    readonly tickHz: number;
    readonly substeps: number;
    readonly iterations: number;
    readonly robots: number;
    readonly warmupTicks: number;
    readonly measuredTicks: number;
  };
  readonly timings: ReturnType<typeof summarizeTimings>;
  readonly eventsPerTick: ReturnType<typeof summarize>;
  readonly eventBytesPerTick: ReturnType<typeof summarize>;
  readonly finalChecksum: string;
  readonly runtime: {
    readonly node: string;
    readonly platform: NodeJS.Platform;
    readonly architecture: string;
  };
}

function positiveIntegerFromEnvironment(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
}

function runPerformanceBenchmark(): BenchmarkResult {
  const seed = process.env.SPIKE_SEED ?? 'phase-minus-one-perf-sim-v1';
  const warmupTicks = positiveIntegerFromEnvironment('SPIKE_WARMUP_TICKS', 600);
  const measuredTicks = positiveIntegerFromEnvironment('SPIKE_MEASURED_TICKS', 6_000);
  const simulation = new Simulation(seed, () => performance.now());
  for (let tick = 0; tick < warmupTicks; tick += 1) simulation.step();

  const timings: TickTimings[] = [];
  const eventCounts: number[] = [];
  const eventBytes: number[] = [];
  for (let tick = 0; tick < measuredTicks; tick += 1) {
    const result = simulation.step();
    timings.push(result.timings);
    eventCounts.push(result.eventCount);
    eventBytes.push(result.eventBytes);
  }

  return {
    label: 'development-only',
    scenario: 'perf:sim',
    seed,
    configuration: {
      simulationSchemaVersion: SIMULATION_SCHEMA_VERSION,
      transportContractVersion: TRANSPORT_CONTRACT_VERSION,
      tickHz: TICK_HZ,
      substeps: PHYSICS_SUBSTEPS,
      iterations: XPBD_ITERATIONS,
      robots: ROBOT_COUNT,
      warmupTicks,
      measuredTicks,
    },
    timings: summarizeTimings(timings),
    eventsPerTick: summarize(eventCounts),
    eventBytesPerTick: summarize(eventBytes),
    finalChecksum: simulation.checksum(),
    runtime: {
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
    },
  };
}

function runDeterminismSmoke(): void {
  const first = new Simulation('phase-minus-one-determinism-smoke');
  const second = new Simulation('phase-minus-one-determinism-smoke');
  for (let tick = 0; tick < 600; tick += 1) {
    const firstResult = first.step();
    const secondResult = second.step();
    if (firstResult.checksum !== secondResult.checksum) {
      throw new Error(`Determinism mismatch at tick ${firstResult.tick}`);
    }
  }
  process.stdout.write(`${JSON.stringify({ scenario: 'determinism:smoke', ticks: 600, checksum: first.checksum() })}\n`);
}

function runBombSquadBenchmark(): unknown {
  const state = createScenario('phase-minus-one-bomb-squad-v1');
  const events = new EventBuffer();
  detonateRepresentativeBombSquad(state, events);
  const candidates = [];
  for (let creditWindow = 1; creditWindow <= 4; creditWindow += 1) {
    const configuration: EventTransportConfig = {
      queueRecordCap: PROVISIONAL_EVENT_RECORD_CAP,
      queueByteCap: PROVISIONAL_EVENT_BYTE_CAP,
      batchRecordCap: PROVISIONAL_BATCH_RECORD_CAP,
      batchByteCap: PROVISIONAL_BATCH_BYTE_CAP,
      creditWindow,
    };
    const producer = new EventProducerChannel(configuration);
    producer.enqueue(events);
    let acknowledgementRounds = 0;
    let batches = 0;
    let maximumInFlight = 0;
    while (producer.metrics().pendingRecords > 0) {
      let highestBatch = 0;
      let batch = producer.createBatch();
      while (batch !== null) {
        highestBatch = batch.batchSequence;
        batches += 1;
        maximumInFlight = Math.max(maximumInFlight, producer.metrics().inFlightBatches);
        batch = producer.createBatch();
      }
      producer.acknowledge(highestBatch);
      acknowledgementRounds += 1;
    }
    candidates.push({
      creditWindow,
      batches,
      acknowledgementRounds,
      maximumInFlight,
      presentationDrops: producer.metrics().presentationDrops,
      stateCriticalResyncs: producer.metrics().stateCriticalResyncs,
    });
  }
  return {
    label: 'development-only',
    scenario: 'perf:bomb-squad',
    scenarioVersion: 1,
    seed: state.seed,
    peakRecordsPerTick: events.count,
    peakBytesPerTick: events.byteLength,
    candidates,
    recommendation: {
      status: 'provisional until baseline-device browser acknowledgement measurements complete',
      queueRecordCap: 320,
      queueByteCap: PROVISIONAL_EVENT_BYTE_CAP,
      batchRecordCap: 128,
      batchByteCap: PROVISIONAL_BATCH_BYTE_CAP,
      creditWindow: 2,
      reasoning: 'A 320-record ring gives 2.19x measured burst headroom; two 128-record credits drain the full burst without an acknowledgement turn.',
    },
  };
}

const command = process.argv[2];
if (command === 'perf:sim') {
  process.stdout.write(`${JSON.stringify(runPerformanceBenchmark(), null, 2)}\n`);
} else if (command === 'determinism:smoke') {
  runDeterminismSmoke();
} else if (command === 'perf:bomb-squad') {
  process.stdout.write(`${JSON.stringify(runBombSquadBenchmark(), null, 2)}\n`);
} else {
  throw new Error(`Unknown Phase -1 benchmark command: ${command ?? '(missing)'}`);
}
