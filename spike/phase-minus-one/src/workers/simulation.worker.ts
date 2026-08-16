/// <reference lib="webworker" />

import { FIXED_DT_SECONDS } from '../sim/constants';
import { Simulation, type StepResult } from '../sim/simulation';
import { writeSnapshotToBuffer } from '../sim/snapshot';
import { EventProducerChannel } from '../transport/event-channel';
import type {
  EventConsumerMessage,
  EventProducerMessage,
  SnapshotConsumerMessage,
  SnapshotProducerMessage,
} from '../transport/messages';
import { SnapshotProducerPool } from '../transport/snapshot-pool';

interface InitializeMessage {
  readonly type: 'initialize';
  readonly seed: string;
  readonly renderSnapshotPort: MessagePort;
  readonly renderEventPort: MessagePort;
  readonly mainSnapshotPort: MessagePort;
  readonly mainEventPort: MessagePort;
}

interface ConsumerRuntime {
  readonly name: 'render' | 'main';
  readonly snapshotPort: MessagePort;
  readonly eventPort: MessagePort;
  readonly snapshots: SnapshotProducerPool;
  readonly events: EventProducerChannel;
}

const scope = self as DedicatedWorkerGlobalScope;
let simulation: Simulation | null = null;
let consumers: readonly ConsumerRuntime[] = [];
let nextTickDeadline = 0;
let timer: ReturnType<typeof setTimeout> | null = null;

function realmTimestamp(): number {
  return performance.timeOrigin + performance.now();
}

function publishToConsumer(consumer: ConsumerRuntime, result: StepResult): void {
  consumer.events.enqueue(simulation!.events);
  const metadata = consumer.events.snapshotResyncMetadata();
  writeSnapshotToBuffer(
    consumer.snapshots.stagingBuffer,
    simulation!.state,
    simulation!.events,
    metadata,
  );
  if (consumer.snapshots.canPublish) {
    const published = consumer.snapshots.publish(result.tick);
    if (published === null) throw new Error(`${consumer.name} pool reported capacity but did not publish`);
    const message: SnapshotProducerMessage = {
      type: 'snapshot',
      slotId: published.slotId,
      tick: result.tick,
      sentAt: realmTimestamp(),
      buffer: published.buffer,
      timings: result.timings,
      checksum: result.checksum,
    };
    consumer.snapshotPort.postMessage(message, [published.buffer]);
    consumer.events.markSnapshotPublished();
  } else {
    consumer.snapshots.publish(result.tick);
  }

  let batch = consumer.events.createBatch();
  while (batch !== null) {
    const message: EventProducerMessage = {
      type: 'event-batch',
      batchSequence: batch.batchSequence,
      eventEpoch: batch.eventEpoch,
      sentAt: realmTimestamp(),
      buffer: batch.buffer,
    };
    consumer.eventPort.postMessage(message, [batch.buffer]);
    batch = consumer.events.createBatch();
  }
}

function runTick(): void {
  if (simulation === null) return;
  const result = simulation.step();
  for (const consumer of consumers) publishToConsumer(consumer, result);
}

function pump(): void {
  const now = performance.now();
  let steps = 0;
  while (now >= nextTickDeadline && steps < 4) {
    runTick();
    nextTickDeadline += FIXED_DT_SECONDS * 1_000;
    steps += 1;
  }
  if (now - nextTickDeadline > 250) nextTickDeadline = now + FIXED_DT_SECONDS * 1_000;
  timer = setTimeout(pump, Math.max(0, nextTickDeadline - performance.now()));
}

function configureConsumerPorts(runtime: ConsumerRuntime): void {
  runtime.snapshotPort.onmessage = (event: MessageEvent<SnapshotConsumerMessage>) => {
    if (event.data.type === 'return-snapshot') {
      runtime.snapshots.returnBuffer(event.data.slotId, event.data.buffer);
    }
  };
  runtime.eventPort.onmessage = (event: MessageEvent<EventConsumerMessage>) => {
    if (event.data.type === 'event-ack') {
      runtime.events.acknowledge(event.data.highestContiguousBatchSequence);
    } else if (event.data.type === 'event-resync-request') {
      runtime.events.requestResync();
    }
  };
  runtime.snapshotPort.start();
  runtime.eventPort.start();
}

scope.onmessage = (event: MessageEvent<InitializeMessage>) => {
  if (event.data.type !== 'initialize') return;
  if (timer !== null) clearTimeout(timer);
  simulation = new Simulation(event.data.seed, () => performance.now());
  consumers = [
    {
      name: 'render',
      snapshotPort: event.data.renderSnapshotPort,
      eventPort: event.data.renderEventPort,
      snapshots: new SnapshotProducerPool(),
      events: new EventProducerChannel(),
    },
    {
      name: 'main',
      snapshotPort: event.data.mainSnapshotPort,
      eventPort: event.data.mainEventPort,
      snapshots: new SnapshotProducerPool(),
      events: new EventProducerChannel(),
    },
  ];
  for (const consumer of consumers) configureConsumerPorts(consumer);
  nextTickDeadline = performance.now();
  pump();
};
