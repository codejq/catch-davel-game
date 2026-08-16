import { describe, expect, it } from 'vitest';
import { EventBuffer, EventClass, EventKind } from '../src/sim/events';
import {
  EventConsumerQueue,
  EventProducerChannel,
  type EventTransportConfig,
} from '../src/transport/event-channel';

function makeEvents(count: number, eventClass: EventClass): EventBuffer {
  const events = new EventBuffer();
  for (let index = 0; index < count; index += 1) {
    events.emit({
      eventClass,
      kind: EventKind.Spark,
      tick: index,
      sequence: index + 1,
      robotId: index % 24,
      x: index,
      y: 1,
      z: -index,
      value: 1,
    });
  }
  return events;
}

function config(overrides: Partial<EventTransportConfig> = {}): EventTransportConfig {
  return {
    queueRecordCap: 8,
    queueByteCap: 8 * 32,
    batchRecordCap: 4,
    batchByteCap: 4 * 32,
    creditWindow: 1,
    ...overrides,
  };
}

describe('bounded credited event transport', () => {
  it('never posts beyond its credit window', () => {
    const producer = new EventProducerChannel(config());
    producer.enqueue(makeEvents(8, EventClass.PresentationOnly));
    const first = producer.createBatch();
    expect(first?.recordCount).toBe(4);
    expect(producer.createBatch()).toBeNull();
    expect(producer.metrics().inFlightBatches).toBe(1);
    producer.acknowledge(first!.batchSequence);
    expect(producer.createBatch()?.recordCount).toBe(4);
  });

  it('drops oldest presentation records while remaining bounded', () => {
    const producer = new EventProducerChannel(config({ queueRecordCap: 4, queueByteCap: 128 }));
    producer.enqueue(makeEvents(7, EventClass.PresentationOnly));
    expect(producer.metrics().pendingRecords).toBe(4);
    expect(producer.metrics().presentationDrops).toBe(3);
    expect(producer.metrics().stateCriticalResyncs).toBe(0);
  });

  it('advances epoch instead of stalling on critical overflow', () => {
    const producer = new EventProducerChannel(config({ queueRecordCap: 4, queueByteCap: 128 }));
    producer.enqueue(makeEvents(5, EventClass.StateCritical));
    expect(producer.metrics().pendingRecords).toBe(0);
    expect(producer.metrics().stateCriticalResyncs).toBe(1);
    expect(producer.eventEpoch).toBe(1);
    expect(producer.snapshotResyncMetadata()).toEqual({ eventEpoch: 1, resyncRequired: true });
    expect(producer.snapshotResyncMetadata()).toEqual({ eventEpoch: 1, resyncRequired: true });
    producer.markSnapshotPublished();
    expect(producer.snapshotResyncMetadata()).toEqual({ eventEpoch: 1, resyncRequired: false });
  });

  it('buffers events until a snapshot at or after their tick is presented', () => {
    const producer = new EventProducerChannel(config());
    producer.enqueue(makeEvents(4, EventClass.PresentationOnly));
    const batch = producer.createBatch();
    expect(batch).not.toBeNull();
    const consumer = new EventConsumerQueue(config());
    consumer.receive(batch!.buffer);
    const presented: number[] = [];
    expect(consumer.presentThrough(1, (event) => presented.push(event.tick))).toBe(0);
    expect(presented).toEqual([0, 1]);
    expect(consumer.presentThrough(3, (event) => presented.push(event.tick))).toBe(batch!.batchSequence);
    expect(presented).toEqual([0, 1, 2, 3]);
  });

  it('coalesces repeated consumer resync requests', () => {
    const producer = new EventProducerChannel(config());
    producer.requestResync();
    producer.requestResync();
    producer.requestResync();
    expect(producer.metrics().stateCriticalResyncs).toBe(1);
    expect(producer.metrics().coalescedResyncRequests).toBe(2);
  });

  it('acknowledges a stale batch discarded after a newer full-snapshot resync', () => {
    const producer = new EventProducerChannel(config());
    producer.enqueue(makeEvents(1, EventClass.StateCritical));
    const batch = producer.createBatch();
    expect(batch).not.toBeNull();
    const consumer = new EventConsumerQueue(config());

    consumer.consumeResyncSnapshot(1);
    consumer.receive(batch!.buffer);

    expect(consumer.acknowledgementReady()).toBe(batch!.batchSequence);
  });
});
