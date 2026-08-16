import { describe, expect, it } from 'vitest';
import type { GameEvent } from '../src/sim/game';
import {
  EVENT_CLASS, EventConsumerQueue, EventProducerChannel, type EventTransportConfig,
} from '../src/transport/event-channel';

const config = (queueRecordCap: number, batchRecordCap = queueRecordCap, creditWindow = 1): EventTransportConfig => ({
  queueRecordCap,
  queueByteCap: 64 * 1024,
  batchRecordCap,
  batchByteCap: 16 * 1024,
  creditWindow,
});

describe('bounded ordered event transport', () => {
  it('uses credit flow control and acknowledges only after tick-correlated presentation', () => {
    const producer = new EventProducerChannel(config(8, 2, 1));
    const events: GameEvent[] = [
      { tick: 3, type: 'pulse-fired' },
      { tick: 4, type: 'robot-hit', robotId: 2 },
      { tick: 5, type: 'robot-defeated', robotId: 2, coins: 16 },
    ];
    producer.enqueue(events);
    const first = producer.createBatch()!;
    expect(producer.createBatch()).toBeNull();
    const consumer = new EventConsumerQueue(config(8, 2, 1));
    consumer.receive(first.buffer);
    const presented: string[] = [];
    expect(consumer.presentThrough(3, (event) => presented.push(event.type))).toBe(0);
    expect(presented).toEqual(['pulse-fired']);
    const acknowledgement = consumer.presentThrough(4, (event) => presented.push(event.type));
    expect(acknowledgement).toBe(1);
    producer.acknowledge(acknowledgement);
    const second = producer.createBatch()!;
    consumer.receive(second.buffer);
    expect(consumer.presentThrough(5, (event) => presented.push(`${event.type}:${event.coins}`))).toBe(2);
    expect(presented).toEqual(['pulse-fired', 'robot-hit', 'robot-defeated:16']);
  });

  it('sorts reordered batches by authoritative tick and deduplicates event IDs', () => {
    const producer = new EventProducerChannel(config(8, 1, 2));
    producer.enqueue([{ tick: 8, type: 'robot-hit', robotId: 1 }, { tick: 9, type: 'player-hit', robotId: 1 }]);
    const first = producer.createBatch()!;
    const second = producer.createBatch()!;
    const consumer = new EventConsumerQueue(config(8, 1, 2));
    consumer.receive(second.buffer.slice(0));
    consumer.receive(first.buffer.slice(0));
    consumer.receive(first.buffer.slice(0));
    const presented: number[] = [];
    const acknowledgement = consumer.presentThrough(9, (event) => presented.push(event.tick));
    expect(presented).toEqual([8, 9]);
    expect(acknowledgement).toBe(2);
  });

  it('drops presentation records first and advances epoch on unavoidable critical overflow', () => {
    const producer = new EventProducerChannel(config(2));
    producer.enqueue([{ tick: 1, type: 'pulse-fired' }, { tick: 1, type: 'robot-hit', robotId: 0 }]);
    producer.enqueue([{ tick: 1, type: 'player-hit', robotId: 0 }]);
    expect(producer.metrics()).toMatchObject({ pendingRecords: 2, presentationDrops: 1, stateCriticalResyncs: 0 });
    producer.enqueue([{ tick: 1, type: 'victory' }]);
    expect(producer.metrics()).toMatchObject({ pendingRecords: 0, stateCriticalResyncs: 1, eventEpoch: 1 });
    expect(producer.snapshotMetadata()).toMatchObject({ eventEpoch: 1, resyncRequired: true });
    producer.requestResync();
    expect(producer.metrics().coalescedResyncRequests).toBe(1);
  });

  it('requests one resync when the consumer cannot retain a critical record', () => {
    const producer = new EventProducerChannel(config(4, 4));
    producer.enqueue([
      { tick: 1, type: 'robot-hit', robotId: 0 },
      { tick: 1, type: 'player-hit', robotId: 0 },
      { tick: 1, type: 'victory' },
    ]);
    const batch = producer.createBatch()!;
    const consumer = new EventConsumerQueue(config(2, 4));
    consumer.receive(batch.buffer);
    expect(consumer.metrics().resyncRequested).toBe(true);
    expect(consumer.takeResyncRequest()).toBe(true);
    expect(consumer.takeResyncRequest()).toBe(false);
    expect(batch.recordCount).toBe(3);
    expect(EVENT_CLASS.stateCritical).toBe(1);
  });
});
