import { describe, expect, it } from "vitest";
import { Rng, hashSeed } from "./Rng";

describe("Rng", () => {
  it("is deterministic for the same seed", () => {
    const rngA = new Rng(12345);
    const rngB = new Rng(12345);
    const a = [rngA.next(), rngA.next(), rngA.next()];
    const b = [rngB.next(), rngB.next(), rngB.next()];
    expect(a).toEqual(b);
  });

  it("produces different hashes for different labels", () => {
    const h1 = hashSeed(42, "terrain");
    const h2 = hashSeed(42, "structures");
    expect(h1).not.toBe(h2);
  });
});
