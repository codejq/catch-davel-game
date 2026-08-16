import { describe, expect, it } from 'vitest';
import { EventBuffer, EventClass, EventKind } from '../src/sim/events';
import { EventProducerChannel, type EventTransportConfig } from '../src/transport/event-channel';
import { SnapshotProducerPool } from '../src/transport/snapshot-pool';

const STALL_TICKS = [3, 15, 60, 300] as const;

function events(count: number, eventClass: EventClass): EventBuffer {
  const buffer = new EventBuffer();
  for (let index = 0; index < count; index += 1) {
    buffer.emit({
      eventClass,
      kind: EventKind.Spark,
      tick: index,
      sequence: index + 1,
      robotId: index % 24,
      x: 0,
      y: 1,
      z: 0,
      value: 1,
    });
  }
  return buffer;
}

const config: EventTransportConfig = {
  queueRecordCap: 8,
  queueByteCap: 8 * 32,
  batchRecordCap: 4,
  batchByteCap: 4 * 32,
  creditWindow: 2,
};

describe('injected transport stalls', () => {
  it.each(STALL_TICKS)('keeps snapshot ownership bounded for a %i-tick pause', (stallTicks) => {
    const pool = new SnapshotProducerPool(8);
    const inFlight: Array<{ slotId: number; buffer: ArrayBuffer }> = [];
    for (let tick = 1; tick <= stallTicks; tick += 1) {
      new Uint32Array(pool.stagingBuffer)[0] = tick;
      const published = pool.publish(tick);
      if (published !== null) inFlight.push(published);
      expect(pool.metrics().producerOwned).toBeGreaterThanOrEqual(1);
      expect(pool.metrics().inFlight).toBeLessThanOrEqual(2);
    }
    expect(inFlight).toHaveLength(Math.min(2, stallTicks));
    pool.returnBuffer(inFlight[0]!.slotId, inFlight[0]!.buffer);
    const newest = pool.publish(stallTicks);
    expect(newest).not.toBeNull();
    expect(new Uint32Array(newest!.buffer)[0]).toBe(stallTicks);
  });

  it('bounds presentation backlog and drops oldest-first without blocking', () => {
    const producer = new EventProducerChannel(config);
    for (let tick = 0; tick < 300; tick += 1) {
      producer.enqueue(events(4, EventClass.PresentationOnly));
      while (producer.createBatch() !== null) {
        // The deliberately stalled consumer returns no credits.
      }
      expect(producer.metrics().pendingRecords).toBeLessThanOrEqual(config.queueRecordCap);
      expect(producer.metrics().inFlightBatches).toBeLessThanOrEqual(config.creditWindow);
    }
    expect(producer.metrics().presentationDrops).toBeGreaterThan(0);
    expect(producer.metrics().stateCriticalResyncs).toBe(0);
  });

  it('advances one epoch and requests a self-contained snapshot on critical overflow', () => {
    const producer = new EventProducerChannel(config);
    producer.enqueue(events(9, EventClass.StateCritical));
    expect(producer.metrics().stateCriticalResyncs).toBe(1);
    expect(producer.snapshotResyncMetadata()).toEqual({ eventEpoch: 1, resyncRequired: true });
    producer.requestResync();
    expect(producer.metrics().coalescedResyncRequests).toBe(1);
  });
});
