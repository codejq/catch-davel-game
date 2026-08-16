import { RENDER_SNAPSHOT_BYTES } from './render-snapshot';

export interface PublishedSnapshot {
  readonly slotId: number;
  readonly tick: number;
  readonly buffer: ArrayBuffer;
}

export interface SnapshotPoolMetrics {
  readonly published: number;
  readonly returned: number;
  readonly coalesced: number;
  readonly inFlight: number;
  readonly producerOwned: number;
}

interface Slot {
  readonly id: number;
  buffer: ArrayBuffer | null;
  state: 'staging' | 'free' | 'in-flight';
}

export class SnapshotProducerPool {
  private readonly slots: Slot[];
  private stagingSlotId = 0;
  private publishedCount = 0;
  private returnedCount = 0;
  private coalescedCount = 0;

  constructor(private readonly byteLength = RENDER_SNAPSHOT_BYTES) {
    this.slots = Array.from({ length: 3 }, (_, id): Slot => ({
      id,
      buffer: new ArrayBuffer(byteLength),
      state: id === 0 ? 'staging' : 'free',
    }));
    this.assertInvariants();
  }

  get stagingBuffer(): ArrayBuffer {
    const slot = this.slots[this.stagingSlotId];
    if (slot?.state !== 'staging' || slot.buffer === null) throw new Error('Snapshot staging slot is unavailable');
    return slot.buffer;
  }

  get canPublish(): boolean { return this.slots.some((slot) => slot.state === 'free'); }

  publish(tick: number): PublishedSnapshot | null {
    const free = this.slots.find((slot) => slot.state === 'free');
    if (free === undefined) {
      this.coalescedCount += 1;
      this.assertInvariants();
      return null;
    }
    const staging = this.slots[this.stagingSlotId];
    if (staging?.state !== 'staging' || staging.buffer === null || free.buffer === null) throw new Error('Snapshot pool ownership is corrupt');
    const publishedBuffer = staging.buffer;
    staging.buffer = null;
    staging.state = 'in-flight';
    free.state = 'staging';
    this.stagingSlotId = free.id;
    this.publishedCount += 1;
    this.assertInvariants();
    return { slotId: staging.id, tick, buffer: publishedBuffer };
  }

  returnBuffer(slotId: number, buffer: ArrayBuffer): void {
    const slot = this.slots[slotId];
    if (slot?.state !== 'in-flight' || slot.buffer !== null) throw new Error(`Snapshot slot ${slotId} was not in flight`);
    if (buffer.byteLength !== this.byteLength) throw new Error(`Returned snapshot slot ${slotId} has wrong byte length`);
    slot.buffer = buffer;
    slot.state = 'free';
    this.returnedCount += 1;
    this.assertInvariants();
  }

  metrics(): SnapshotPoolMetrics {
    const inFlight = this.slots.filter((slot) => slot.state === 'in-flight').length;
    return {
      published: this.publishedCount,
      returned: this.returnedCount,
      coalesced: this.coalescedCount,
      inFlight,
      producerOwned: this.slots.length - inFlight,
    };
  }

  private assertInvariants(): void {
    const staging = this.slots.filter((slot) => slot.state === 'staging');
    const inFlight = this.slots.filter((slot) => slot.state === 'in-flight');
    const producerOwned = this.slots.length - inFlight.length;
    if (staging.length !== 1 || inFlight.length > 2 || producerOwned < 1) {
      throw new Error(`Snapshot pool invariant failed: staging=${staging.length}, inFlight=${inFlight.length}, producerOwned=${producerOwned}`);
    }
    for (const slot of this.slots) {
      if ((slot.state !== 'in-flight') !== (slot.buffer !== null)) throw new Error(`Snapshot slot ${slot.id} ownership is corrupt`);
    }
  }
}

export interface ConsumedSnapshot {
  readonly tick: number;
  readonly current: Uint8Array;
  readonly previous: Uint8Array;
}

export class SnapshotConsumerCopies {
  private currentBytes: Uint8Array;
  private previousBytes: Uint8Array;

  constructor(private readonly byteLength = RENDER_SNAPSHOT_BYTES) {
    this.currentBytes = new Uint8Array(byteLength);
    this.previousBytes = new Uint8Array(byteLength);
  }

  consume(tick: number, transferred: ArrayBuffer): ConsumedSnapshot {
    if (transferred.byteLength !== this.byteLength) throw new Error(`Consumed snapshot has wrong byte length`);
    const swap = this.previousBytes;
    this.previousBytes = this.currentBytes;
    this.currentBytes = swap;
    this.currentBytes.set(new Uint8Array(transferred));
    return { tick, current: this.currentBytes, previous: this.previousBytes };
  }
}
