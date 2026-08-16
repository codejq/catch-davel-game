import { describe, expect, it } from 'vitest';
import { SnapshotConsumerCopies, SnapshotProducerPool } from '../src/transport/snapshot-pool';

describe('bounded three-buffer snapshot ownership', () => {
  it('never transfers its final owned buffer and publishes the newest coalesced state', () => {
    const pool = new SnapshotProducerPool(16);
    new DataView(pool.stagingBuffer).setUint32(0, 1, true);
    const first = pool.publish(1)!;
    new DataView(pool.stagingBuffer).setUint32(0, 2, true);
    const second = pool.publish(2)!;
    expect(pool.metrics()).toMatchObject({ inFlight: 2, producerOwned: 1, published: 2 });
    new DataView(pool.stagingBuffer).setUint32(0, 3, true);
    expect(pool.publish(3)).toBeNull();
    expect(pool.metrics()).toMatchObject({ inFlight: 2, producerOwned: 1, coalesced: 1 });
    pool.returnBuffer(first.slotId, first.buffer);
    const newest = pool.publish(3)!;
    expect(new DataView(newest.buffer).getUint32(0, true)).toBe(3);
    expect(pool.metrics()).toMatchObject({ inFlight: 2, producerOwned: 1, published: 3, returned: 1 });
    pool.returnBuffer(second.slotId, second.buffer);
    pool.returnBuffer(newest.slotId, newest.buffer);
    expect(pool.metrics()).toMatchObject({ inFlight: 0, producerOwned: 3, returned: 3 });
  });

  it('keeps independent current and previous consumer copies before returning transfers', () => {
    const consumer = new SnapshotConsumerCopies(8);
    const firstBuffer = new ArrayBuffer(8);
    new DataView(firstBuffer).setUint32(0, 11, true);
    const first = consumer.consume(1, firstBuffer);
    expect(new DataView(first.current.buffer).getUint32(0, true)).toBe(11);
    const secondBuffer = new ArrayBuffer(8);
    new DataView(secondBuffer).setUint32(0, 22, true);
    const second = consumer.consume(2, secondBuffer);
    expect(new DataView(second.current.buffer).getUint32(0, true)).toBe(22);
    expect(new DataView(second.previous.buffer).getUint32(0, true)).toBe(11);
  });
});
