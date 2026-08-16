/// <reference lib="webworker" />

import { GameSimulation } from '../sim/game';
import { stateChecksum } from '../sim/serialization';
import { writeRenderSnapshot } from '../transport/render-snapshot';
import { SnapshotProducerPool } from '../transport/snapshot-pool';
import type {
  SimulationWorkerRequest, SimulationWorkerResponse, WorkerReturnSnapshotMessage, WorkerSnapshotMessage,
} from './simulation-worker-protocol';

const scope = self as DedicatedWorkerGlobalScope;
let simulation: GameSimulation | null = null;
let snapshotPort: MessagePort | null = null;
let snapshotPool = new SnapshotProducerPool();
let generation = 0;
let stagedTick = -1;
let publishedTick = -1;

function post(message: SimulationWorkerResponse): void { scope.postMessage(message); }
function realmTimestamp(): number { return performance.timeOrigin + performance.now(); }

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
}

function stageSnapshot(): void {
  if (simulation === null) throw new Error('Simulation Worker is not initialized');
  writeRenderSnapshot(snapshotPool.stagingBuffer, simulation.state);
  stagedTick = simulation.state.tick;
  if (snapshotPool.canPublish) publishStaged();
  else snapshotPool.publish(stagedTick);
}

function configurePort(port: MessagePort): void {
  snapshotPort?.close();
  snapshotPort = port;
  port.onmessage = (event: MessageEvent<WorkerReturnSnapshotMessage>) => {
    const message = event.data;
    if (message.type !== 'return-snapshot' || message.generation !== generation) return;
    try {
      snapshotPool.returnBuffer(message.slotId, message.buffer);
      publishStaged();
    } catch (error) {
      post({ type: 'failure', requestId: null, message: error instanceof Error ? error.message : String(error) });
    }
  };
  port.start();
}

function resetRuntime(seed: string): void {
  if (seed.length === 0 || seed.length > 256) throw new Error('Worker seed must contain 1 to 256 characters');
  simulation = new GameSimulation(seed);
  generation += 1;
  snapshotPool = new SnapshotProducerPool();
  stagedTick = -1;
  publishedTick = -1;
  stageSnapshot();
}

scope.onmessage = (event: MessageEvent<SimulationWorkerRequest>) => {
  const request = event.data;
  try {
    if (request.type === 'initialize') {
      configurePort(request.snapshotPort);
      resetRuntime(request.seed);
      post({ type: 'ready', generation, tick: simulation!.state.tick });
      return;
    }
    if (simulation === null || snapshotPort === null) throw new Error('Simulation Worker received a request before initialization');
    if (request.type === 'reset') {
      resetRuntime(request.seed);
    } else if (request.type === 'load-snapshot') {
      simulation.loadSnapshot(request.snapshot);
      generation += 1;
      snapshotPool = new SnapshotProducerPool();
      stagedTick = -1;
      publishedTick = -1;
      stageSnapshot();
    } else if (request.type === 'step') {
      if (!Number.isInteger(request.ticks) || request.ticks < 1 || request.ticks > 600) throw new Error('Worker step ticks must be an integer from 1 to 600');
      for (let tick = 0; tick < request.ticks; tick += 1) {
        simulation.step(request.command);
        stageSnapshot();
      }
    }
    post({
      type: 'complete', requestId: request.requestId, generation, tick: simulation.state.tick,
      checksum: stateChecksum(simulation.state), transport: snapshotPool.metrics(),
    });
  } catch (error) {
    post({
      type: 'failure', requestId: 'requestId' in request ? request.requestId : null,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
