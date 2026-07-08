/**
 * Randomizer
 * ----------
 * Deterministic, seedable pseudo-random number generator. Single responsibility:
 * turn a seed into a repeatable stream of numbers/choices. The whole world
 * generator draws its randomness from here, so the same seed always produces the
 * same house (goal 10).
 *
 * `fork(salt)` derives an independent sub-generator from the current state. That
 * lets each room decorate from its own stream, so editing one room's contents
 * doesn't shift every other room's randomness.
 */

/** xmur3-style string hash → 32-bit unsigned int. Stable across runs. */
export function hashSeed(seed: string | number): number {
  const str = String(seed);
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

export class Randomizer {
  private state: number;

  constructor(seed: string | number = 0) {
    // Never allow a 0 state (mulberry32 degenerates); hashSeed rarely returns 0
    // but guard anyway.
    this.state = hashSeed(seed) || 0x9e3779b9;
  }

  /** Next float in [0, 1). mulberry32. */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Float in [min, max). */
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /** True with probability p. */
  bool(p = 0.5): boolean {
    return this.next() < p;
  }

  /** Uniform pick from a non-empty array. */
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  /** Fisher–Yates copy. */
  shuffle<T>(arr: readonly T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** Derive an independent generator from this one plus a salt. */
  fork(salt: string | number): Randomizer {
    return new Randomizer(hashSeed(`${this.state}:${salt}`));
  }
}
