export const EVENT_RECORD_BYTES = 32;
export const MAX_EVENTS_PER_TICK = 1_024;

export const enum EventClass {
  PresentationOnly = 0,
  StateCritical = 1,
}

export const enum EventKind {
  Spark = 1,
  Damage = 2,
  CriticalAudio = 3,
  Coin = 4,
  Objective = 5,
  Debris = 6,
  TempoChange = 7,
  Knockback = 8,
  HitMarker = 9,
}

export interface EventInput {
  readonly eventClass: EventClass;
  readonly kind: EventKind;
  readonly tick: number;
  readonly sequence: number;
  readonly robotId: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly value: number;
}

export class EventBuffer {
  readonly eventClass = new Uint8Array(MAX_EVENTS_PER_TICK);
  readonly kind = new Uint8Array(MAX_EVENTS_PER_TICK);
  readonly tick = new Uint32Array(MAX_EVENTS_PER_TICK);
  readonly sequence = new Uint32Array(MAX_EVENTS_PER_TICK);
  readonly robotId = new Uint8Array(MAX_EVENTS_PER_TICK);
  readonly x = new Float32Array(MAX_EVENTS_PER_TICK);
  readonly y = new Float32Array(MAX_EVENTS_PER_TICK);
  readonly z = new Float32Array(MAX_EVENTS_PER_TICK);
  readonly value = new Float32Array(MAX_EVENTS_PER_TICK);
  count = 0;

  reset(): void {
    this.count = 0;
  }

  emit(event: EventInput): void {
    if (this.count >= MAX_EVENTS_PER_TICK) {
      throw new Error(`Per-tick simulation event capacity ${MAX_EVENTS_PER_TICK} exceeded`);
    }
    const index = this.count;
    this.eventClass[index] = event.eventClass;
    this.kind[index] = event.kind;
    this.tick[index] = event.tick;
    this.sequence[index] = event.sequence;
    this.robotId[index] = event.robotId;
    this.x[index] = event.x;
    this.y[index] = event.y;
    this.z[index] = event.z;
    this.value[index] = event.value;
    this.count += 1;
  }

  get byteLength(): number {
    return this.count * EVENT_RECORD_BYTES;
  }
}
