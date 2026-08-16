function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash === 0 ? 0x6d2b79f5 : hash >>> 0;
}

export class XorShift32 {
  state: number;

  constructor(seed: string | number) {
    const value = typeof seed === 'string' ? hashSeed(seed) : seed >>> 0;
    this.state = value === 0 ? 0x6d2b79f5 : value;
  }

  nextUint32(): number {
    let value = this.state;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.state = value >>> 0;
    return this.state;
  }

  nextFloat(): number {
    return this.nextUint32() / 0x1_0000_0000;
  }

  range(minimum: number, maximum: number): number {
    return minimum + (maximum - minimum) * this.nextFloat();
  }
}

