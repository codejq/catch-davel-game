/// <reference lib="webworker" />

import { GameSimulation } from '../sim/game';
import { FIXED_DT_SECONDS } from '../sim/constants';
import type { PlayerCommand } from '../sim/player';
import { stateChecksum } from '../sim/serialization';
import { writeRenderSnapshot } from '../transport/render-snapshot';
import { SnapshotProducerPool } from '../transport/snapshot-pool';
import { EventProducerChannel } from '../transport/event-channel';
import type {
  SimulationWorkerRequest, SimulationWorkerResponse, WorkerEventBatchMessage, WorkerEventConsumerMessage,
  WorkerReturnSnapshotMessage, WorkerSnapshotMessage,
} from './simulation-worker-protocol';

const scope = self as DedicatedWorkerGlobalScope;
let simulation: GameSimulation | null = null;
let snapshotPort: MessagePort | null = null;
let eventPort: MessagePort | null = null;
let snapshotPool = new SnapshotProducerPool();
let eventChannel = new EventProducerChannel();
let generation = 0;
let stagedTick = -1;
let publishedTick = -1;
let mode: 'manual' | 'realtime' = 'manual';
let timer: ReturnType<typeof setTimeout> | null = null;
let nextTickDeadline = 0;
let lastInputSequence = -1;
let movementForward = 0;
let movementStrafe = 0;
let pendingYawDelta = 0;
let pendingPitchDelta = 0;
let fireLatched = false;

function post(message: SimulationWorkerResponse): void { scope.postMessage(message); }
function realmTimestamp(): number { return performance.timeOrigin + performance.now(); }

function bounded(value: number, minimum: number, maximum: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
  return Math.max(minimum, Math.min(maximum, value));
}

function publishStaged(): void {
  if (snapshotPort === null || stagedTick <= publishedTick || !snapshotPool.canPublish) return;
  const published = snapshotPool.publish(stagedTick);
  if (published === null) return;
  publishedTick = published.tick;
  const message: WorkerSnapshotMessage = {
    type: 'snapshot', generation, slotId: published.slotId, tick: published.tick,
    sentAt: realmTimestamp(), buffer: published.buffer,
  };
  snapshotPort.postMessage(message, [published.buffer]);
  eventChannel.markSnapshotPublished();
}

function publishEventBatches(): void {
  if (eventPort === null) return;
  let batch = eventChannel.createBatch();
  while (batch !== null) {
    const message: WorkerEventBatchMessage = {
      type: 'event-batch', generation, batchSequence: batch.batchSequence, eventEpoch: batch.eventEpoch,
      sentAt: realmTimestamp(), buffer: batch.buffer,
    };
    eventPort.postMessage(message, [batch.buffer]);
    batch = eventChannel.createBatch();
  }
}

function stageSnapshot(): void {
  if (simulation === null) throw new Error('Simulation Worker is not initialized');
  writeRenderSnapshot(snapshotPool.stagingBuffer, simulation.state, eventChannel.snapshotMetadata());
  stagedTick = simulation.state.tick;
  if (snapshotPool.canPublish) publishStaged();
  else snapshotPool.publish(stagedTick);
}

function configurePorts(snapshotMessagePort: MessagePort, eventMessagePort: MessagePort): void {
  snapshotPort?.close();
  eventPort?.close();
  snapshotPort = snapshotMessagePort;
  eventPort = eventMessagePort;
  snapshotMessagePort.onmessage = (event: MessageEvent<WorkerReturnSnapshotMessage>) => {
    const message = event.data;
    if (message.type !== 'return-snapshot' || message.generation !== generation) return;
    try {
      snapshotPool.returnBuffer(message.slotId, message.buffer);
      publishStaged();
    } catch (error) {
      post({ type: 'failure', requestId: null, message: error instanceof Error ? error.message : String(error) });
    }
  };
  eventMessagePort.onmessage = (event: MessageEvent<WorkerEventConsumerMessage>) => {
    const message = event.data;
    if (message.generation !== generation) return;
    if (message.type === 'event-ack') eventChannel.acknowledge(message.highestContiguousBatchSequence);
    else eventChannel.requestResync();
    publishEventBatches();
  };
  snapshotMessagePort.start();
  eventMessagePort.start();
}

function resetRuntime(seed: string): void {
  if (seed.length === 0 || seed.length > 256) throw new Error('Worker seed must contain 1 to 256 characters');
  simulation = new GameSimulation(seed);
  generation += 1;
  snapshotPool = new SnapshotProducerPool();
  eventChannel = new EventProducerChannel();
  stagedTick = -1;
  publishedTick = -1;
  lastInputSequence = -1;
  movementForward = 0;
  movementStrafe = 0;
  pendingYawDelta = 0;
  pendingPitchDelta = 0;
  fireLatched = false;
  stageSnapshot();
}

function executeTick(command: PlayerCommand): void {
  if (simulation === null) throw new Error('Simulation Worker is not initialized');
  simulation.step(command);
  eventChannel.enqueue(simulation.state.events);
  stageSnapshot();
  publishEventBatches();
}

function realtimeCommand(): PlayerCommand {
  const command: PlayerCommand = {
    forward: movementForward,
    strafe: movementStrafe,
    yawDelta: pendingYawDelta,
    pitchDelta: pendingPitchDelta,
    fire: fireLatched,
  };
  pendingYawDelta = 0;
  pendingPitchDelta = 0;
  fireLatched = false;
  return command;
}

function pump(): void {
  if (mode !== 'realtime' || simulation === null) return;
  const now = performance.now();
  let steps = 0;
  while (now >= nextTickDeadline && steps < 4) {
    executeTick(realtimeCommand());
    nextTickDeadline += FIXED_DT_SECONDS * 1_000;
    steps += 1;
  }
  if (now - nextTickDeadline > 250) nextTickDeadline = now + FIXED_DT_SECONDS * 1_000;
  timer = setTimeout(pump, Math.max(0, nextTickDeadline - performance.now()));
}

function setMode(nextMode: 'manual' | 'realtime'): void {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  mode = nextMode;
  if (mode === 'realtime') {
    nextTickDeadline = performance.now();
    pump();
  }
}

function postComplete(requestId: number): void {
  if (simulation === null) throw new Error('Simulation Worker is not initialized');
  post({
    type: 'complete', requestId, generation, tick: simulation.state.tick, mode,
    checksum: stateChecksum(simulation.state), transport: snapshotPool.metrics(), events: eventChannel.metrics(),
  });
}

scope.onmessage = (event: MessageEvent<SimulationWorkerRequest>) => {
  const request = event.data;
  try {
    if (request.type === 'initialize') {
      configurePorts(request.snapshotPort, request.eventPort);
      resetRuntime(request.seed);
      setMode(request.mode ?? 'manual');
      post({ type: 'ready', generation, tick: simulation!.state.tick, mode });
      return;
    }
    if (simulation === null || snapshotPort === null) throw new Error('Simulation Worker received a request before initialization');
    if (request.type === 'input') {
      if (mode !== 'realtime') return;
      if (!Number.isSafeInteger(request.sequence) || request.sequence <= lastInputSequence) return;
      lastInputSequence = request.sequence;
      movementForward = bounded(request.forward, -1, 1, 'input.forward');
      movementStrafe = bounded(request.strafe, -1, 1, 'input.strafe');
      pendingYawDelta = bounded(pendingYawDelta + request.yawDelta, -2, 2, 'input.yawDelta');
      pendingPitchDelta = bounded(pendingPitchDelta + request.pitchDelta, -1, 1, 'input.pitchDelta');
      fireLatched ||= request.fire;
      return;
    }
    if (request.type === 'set-mode') {
      setMode(request.mode);
      postComplete(request.requestId);
      return;
    }
    if (request.type === 'reset') {
      resetRuntime(request.seed);
    } else if (request.type === 'load-snapshot') {
      simulation.loadSnapshot(request.snapshot);
      generation += 1;
      snapshotPool = new SnapshotProducerPool();
      eventChannel = new EventProducerChannel();
      stagedTick = -1;
      publishedTick = -1;
      stageSnapshot();
    } else if (request.type === 'step') {
      if (mode !== 'manual') throw new Error('Explicit Worker steps require manual mode');
      if (!Number.isInteger(request.ticks) || request.ticks < 1 || request.ticks > 600) throw new Error('Worker step ticks must be an integer from 1 to 600');
      for (let tick = 0; tick < request.ticks; tick += 1) {
        executeTick(request.command);
      }
    }
    postComplete(request.requestId);
  } catch (error) {
    post({
      type: 'failure', requestId: 'requestId' in request ? request.requestId : null,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
