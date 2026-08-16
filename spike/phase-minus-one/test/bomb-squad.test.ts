import { describe, expect, it } from 'vitest';
import { detonateRepresentativeBombSquad } from '../src/sim/bomb-squad';
import { EVENT_RECORD_BYTES, EventBuffer } from '../src/sim/events';
import { createScenario } from '../src/sim/scenario';
import { EventProducerChannel, type EventTransportConfig } from '../src/transport/event-channel';

function measuredConfig(creditWindow: number): EventTransportConfig {
  return {
    queueRecordCap: 256,
    queueByteCap: 64 * 1024,
    batchRecordCap: 64,
    batchByteCap: 16 * 1024,
    creditWindow,
  };
}

describe('representative pulse-bomb squad burst', () => {
  it('evaluates every robot and emits the frozen 146-record burst', () => {
    const state = createScenario('phase-minus-one-bomb-squad-v1');
    const events = new EventBuffer();
    detonateRepresentativeBombSquad(state, events);
    expect(events.count).toBe(146);
    expect(events.byteLength).toBe(146 * EVENT_RECORD_BYTES);
    expect([...state.robots.health]).toEqual(Array.from({ length: 24 }, () => 65));
  });

  it('remains bounded without a nominal resync for every candidate credit window', () => {
    const state = createScenario('phase-minus-one-bomb-squad-v1');
    const events = new EventBuffer();
    detonateRepresentativeBombSquad(state, events);
    for (let creditWindow = 1; creditWindow <= 4; creditWindow += 1) {
      const producer = new EventProducerChannel(measuredConfig(creditWindow));
      producer.enqueue(events);
      let highestBatch = 0;
      while (producer.metrics().pendingRecords > 0) {
        let batch = producer.createBatch();
        while (batch !== null) {
          highestBatch = batch.batchSequence;
          batch = producer.createBatch();
        }
        producer.acknowledge(highestBatch);
      }
      expect(producer.metrics().pendingRecords).toBe(0);
      expect(producer.metrics().presentationDrops).toBe(0);
      expect(producer.metrics().stateCriticalResyncs).toBe(0);
    }
  });
});
