export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  public next(): number {
    // Mulberry32
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  public nextInt(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  public nextRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

export function hashSeed(seed: number, label: string): number {
  let hash = 2166136261 ^ seed;
  for (let i = 0; i < label.length; i++) {
    hash ^= label.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export class RngStreams {
  private baseSeed: number;

  constructor(seed: number) {
    this.baseSeed = seed >>> 0;
  }

  public forStage(label: string): Rng {
    return new Rng(hashSeed(this.baseSeed, label));
  }
}
