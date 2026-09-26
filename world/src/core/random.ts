/** Deterministic PRNG (mulberry32) so every world generates identically from its seed. */
export class Random {
  private state: number;

  constructor(seed: number | string) {
    this.state = typeof seed === 'number' ? seed >>> 0 : hashString(seed);
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  int(min: number, maxInclusive: number): number {
    return Math.floor(this.range(min, maxInclusive + 1));
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Cannot pick from an empty list');
    return items[Math.min(items.length - 1, Math.floor(this.next() * items.length))]!;
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }
}

export function hashString(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
