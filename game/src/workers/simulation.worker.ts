/// <reference lib="webworker" />

import { GameSimulation } from '../sim/game';
import { FIXED_DT_SECONDS } from '../sim/constants';
import type { PlayerCommand } from '../sim/player';
import { CAMPAIGN_LEVEL_1_WEAPON_MASK, isWeaponId, type WeaponId } from '../sim/weapons';
import { createObservation } from '../agent/observation';
import { ReplayRecorder, parseReplay, verifyReplay } from '../replay/replay';
import { createSimulationSnapshot, stateChecksum } from '../sim/serialization';
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
let altFireLatched = false;
let pendingWeapon: WeaponId | null = null;
let recorder: ReplayRecorder | null = null;
let checkpointSnapshot: ReturnType<typeof createSimulationSnapshot> | null = null;

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

function resetRuntime(seed: string, initialCoins = 0, agentRun = false, unlockedWeaponMask = CAMPAIGN_LEVEL_1_WEAPON_MASK): void {
  if (seed.length === 0 || seed.length > 256) throw new Error('Worker seed must contain 1 to 256 characters');
  if (!Number.isSafeInteger(initialCoins) || initialCoins < 0) throw new Error('Worker initial coins must be a non-negative safe integer');
  if (!Number.isSafeInteger(unlockedWeaponMask) || unlockedWeaponMask < 1 || unlockedWeaponMask > 15 || (unlockedWeaponMask & 1) === 0) {
    throw new Error('Worker weapon mask must include pulse and contain only known weapons');
  }
  simulation = new GameSimulation(seed, unlockedWeaponMask);
  simulation.state.player.coins = initialCoins;
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
  altFireLatched = false;
  pendingWeapon = null;
  recorder = new ReplayRecorder(simulation);
  if (agentRun) recorder.markAgentRun();
  checkpointSnapshot = null;
  stageSnapshot();
}

function executeTick(command: PlayerCommand): void {
  if (simulation === null) throw new Error('Simulation Worker is not initialized');
  simulation.step(command);
  recorder?.record(command);
  if (simulation.state.events.some((event) => event.type === 'checkpoint-activated')) {
    checkpointSnapshot = createSimulationSnapshot(simulation.state);
  }
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
    altFire: altFireLatched,
    weapon: pendingWeapon,
  };
  pendingYawDelta = 0;
  pendingPitchDelta = 0;
  fireLatched = false;
  altFireLatched = false;
  pendingWeapon = null;
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
  const replay = recorder?.finish();
  post({
    type: 'complete', requestId, generation, tick: simulation.state.tick, mode,
    checksum: stateChecksum(simulation.state), transport: snapshotPool.metrics(), events: eventChannel.metrics(),
    observation: createObservation(simulation.state),
    commandRuns: replay?.commandRuns.length ?? 0,
    checksumRecords: replay?.checksums.length ?? 0,
  });
}

scope.onmessage = (event: MessageEvent<SimulationWorkerRequest>) => {
  const request = event.data;
  try {
    if (request.type === 'initialize') {
      configurePorts(request.snapshotPort, request.eventPort);
      resetRuntime(request.seed, request.initialCoins ?? 0, false, request.unlockedWeaponMask ?? CAMPAIGN_LEVEL_1_WEAPON_MASK);
      setMode(request.mode ?? 'manual');
      post({ type: 'ready', generation, tick: simulation!.state.tick, mode, observation: createObservation(simulation!.state) });
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
      altFireLatched ||= request.altFire === true;
      if (request.weapon !== undefined && request.weapon !== null) {
        if (!isWeaponId(request.weapon)) throw new Error('input.weapon is invalid');
        pendingWeapon = request.weapon;
      }
      return;
    }
    if (request.type === 'set-mode') {
      setMode(request.mode);
      if (request.agentRun === true) recorder?.markAgentRun();
      postComplete(request.requestId);
      return;
    }
    if (request.type === 'save-replay') {
      post({ type: 'replay', requestId: request.requestId, replay: recorder!.finish() });
      return;
    }
    if (request.type === 'get-checkpoint') {
      post({ type: 'checkpoint', requestId: request.requestId, snapshot: checkpointSnapshot });
      return;
    }
    if (request.type === 'load-replay') {
      setMode('manual');
      const replay = typeof request.replay === 'string' ? parseReplay(request.replay) : request.replay;
      const verified = verifyReplay(replay);
      simulation.loadSnapshot(createSimulationSnapshot(verified.simulation.state));
      generation += 1;
      snapshotPool = new SnapshotProducerPool();
      eventChannel = new EventProducerChannel();
      stagedTick = -1;
      publishedTick = -1;
      recorder = new ReplayRecorder(simulation);
      recorder.markAgentRun();
      checkpointSnapshot = simulation.state.level.checkpoint.activated ? createSimulationSnapshot(simulation.state) : null;
      stageSnapshot();
      postComplete(request.requestId);
      return;
    }
    if (request.type === 'get-status') {
      postComplete(request.requestId);
      return;
    }
    if (request.type === 'reset') {
      resetRuntime(
        request.seed, request.initialCoins ?? 0, request.agentRun === true,
        request.unlockedWeaponMask ?? CAMPAIGN_LEVEL_1_WEAPON_MASK,
      );
    } else if (request.type === 'load-snapshot') {
      simulation.loadSnapshot(request.snapshot);
      generation += 1;
      snapshotPool = new SnapshotProducerPool();
      eventChannel = new EventProducerChannel();
      stagedTick = -1;
      publishedTick = -1;
      recorder = new ReplayRecorder(simulation);
      checkpointSnapshot = simulation.state.level.checkpoint.activated ? createSimulationSnapshot(simulation.state) : null;
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
