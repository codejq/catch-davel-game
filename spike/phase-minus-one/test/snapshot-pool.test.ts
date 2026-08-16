import { describe, expect, it } from 'vitest';
import { SnapshotConsumerCopies, SnapshotProducerPool } from '../src/transport/snapshot-pool';

describe('three-slot snapshot ownership state machine', () => {
  it('coalesces legally while two buffers are in flight', () => {
    const pool = new SnapshotProducerPool(32);
    new Uint8Array(pool.stagingBuffer)[0] = 1;
    const first = pool.publish(1);
    expect(first).not.toBeNull();
    new Uint8Array(pool.stagingBuffer)[0] = 2;
    const second = pool.publish(2);
    expect(second).not.toBeNull();
    new Uint8Array(pool.stagingBuffer)[0] = 3;
    expect(pool.publish(3)).toBeNull();
    new Uint8Array(pool.stagingBuffer)[0] = 4;
    expect(pool.publish(4)).toBeNull();

    const beforeReturn = pool.metrics();
    expect(beforeReturn.inFlight).toBe(2);
    expect(beforeReturn.producerOwned).toBe(1);
    expect(beforeReturn.coalesced).toBe(2);

    pool.returnBuffer(first!.slotId, first!.buffer);
    const newest = pool.publish(4);
    expect(newest).not.toBeNull();
    expect(new Uint8Array(newest!.buffer)[0]).toBe(4);
    expect(pool.metrics().inFlight).toBe(2);
    expect(pool.metrics().producerOwned).toBe(1);
  });

  it('rejects duplicate or malformed returns', () => {
    const pool = new SnapshotProducerPool(16);
    const first = pool.publish(1);
    expect(first).not.toBeNull();
    expect(() => pool.returnBuffer(first!.slotId, new ArrayBuffer(8))).toThrow(/expected 16/);
    pool.returnBuffer(first!.slotId, first!.buffer);
    expect(() => pool.returnBuffer(first!.slotId, first!.buffer)).toThrow(/not in flight/);
  });

  it('copies current and previous state before returning transfer ownership', () => {
    const consumer = new SnapshotConsumerCopies(8);
    const first = new ArrayBuffer(8);
    new Uint8Array(first)[0] = 11;
    consumer.consume(1, first);
    const second = new ArrayBuffer(8);
    new Uint8Array(second)[0] = 22;
    const copies = consumer.consume(2, second);
    expect(copies.current[0]).toBe(22);
    expect(copies.previous[0]).toBe(11);
  });
});

