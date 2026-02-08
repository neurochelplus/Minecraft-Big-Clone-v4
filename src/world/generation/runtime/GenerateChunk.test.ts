import { describe, expect, it } from "vitest";
import { BLOCK } from "../../../constants/Blocks";
import { getBiomeTintForBlock } from "./BiomeVisuals";
import { ChunkGenerationQueue } from "../../chunks/ChunkGenerationQueue";
import { ChunkPersistence } from "../../chunks/ChunkPersistence";
import {
  WORLD_GEN_PRESET_BIOMES_V3,
  WORLD_GEN_PRESET_LEGACY,
} from "../WorldGenPresets";
import {
  generateChunkData,
  getBiomeIdAt,
  getTerrainHeightAt,
} from "./GenerateChunk";

describe("GenerateChunk runtime", () => {
  it("is deterministic for the same seed/preset/chunk in biomes_v3", () => {
    const input = {
      seed: 424242,
      presetId: WORLD_GEN_PRESET_BIOMES_V3,
      chunkSize: 16,
      chunkHeight: 64,
      cx: 3,
      cz: -2,
    };

    const first = generateChunkData(input);
    const second = generateChunkData(input);
    expect(Array.from(first)).toEqual(Array.from(second));
  });

  it("differs between legacy and biomes_v3 presets", () => {
    const legacy = generateChunkData({
      seed: 42,
      presetId: WORLD_GEN_PRESET_LEGACY,
      chunkSize: 16,
      chunkHeight: 64,
      cx: 0,
      cz: 0,
    });
    const biomes = generateChunkData({
      seed: 42,
      presetId: WORLD_GEN_PRESET_BIOMES_V3,
      chunkSize: 16,
      chunkHeight: 64,
      cx: 0,
      cz: 0,
    });

    expect(Array.from(legacy)).not.toEqual(Array.from(biomes));
  });

  it("maps biomes_v1 and biomes_v2 aliases to biomes_v3 output", () => {
    const input = {
      seed: 42,
      chunkSize: 16,
      chunkHeight: 64,
      cx: 1,
      cz: 1,
    };

    const v1Alias = generateChunkData({ ...input, presetId: "biomes_v1" });
    const v2Alias = generateChunkData({ ...input, presetId: "biomes_v2" });
    const v3 = generateChunkData({ ...input, presetId: WORLD_GEN_PRESET_BIOMES_V3 });

    expect(Array.from(v1Alias)).toEqual(Array.from(v3));
    expect(Array.from(v2Alias)).toEqual(Array.from(v3));
  });

  it("matches ChunkGenerationQueue sync fallback output for biomes_v3", () => {
    const seed = 777;
    const presetId = WORLD_GEN_PRESET_BIOMES_V3;
    const queue = new ChunkGenerationQueue(
      new ChunkPersistence(),
      16,
      64,
      seed,
      presetId,
    );

    const fromQueue = (queue as unknown as { generateChunkSync(cx: number, cz: number): Uint8Array })
      .generateChunkSync(1, -1);
    const fromRuntime = generateChunkData({
      seed,
      presetId,
      chunkSize: 16,
      chunkHeight: 64,
      cx: 1,
      cz: -1,
    });

    expect(Array.from(fromQueue)).toEqual(Array.from(fromRuntime));
    queue.terminate();
  });

  it("meets v3 boundary distinctness and surface safety targets", () => {
    const seed = 42;
    const presetId = WORLD_GEN_PRESET_BIOMES_V3;
    const chunkSize = 16;
    const chunkHeight = 64;
    const chunkRadius = 6;
    const width = chunkRadius * 2 * chunkSize;

    const topBlockGrid: number[][] = Array.from({ length: width }, () => new Array<number>(width));
    const biomeGrid: string[][] = Array.from({ length: width }, () => new Array<string>(width));
    const terrainGrid: number[][] = Array.from({ length: width }, () => new Array<number>(width));

    const worldOffset = chunkRadius * chunkSize;

    let nonSnowBiomeColumns = 0;
    let nonSnowBiomeSnowTop = 0;

    let plainsColumns = 0;
    let forestColumns = 0;
    let plainsLeavesTop = 0;
    let forestLeavesTop = 0;

    for (let cz = -chunkRadius; cz < chunkRadius; cz++) {
      for (let cx = -chunkRadius; cx < chunkRadius; cx++) {
        const data = generateChunkData({ seed, presetId, chunkSize, chunkHeight, cx, cz });

        for (let x = 0; x < chunkSize; x++) {
          for (let z = 0; z < chunkSize; z++) {
            let topBlock = BLOCK.AIR;
            for (let y = chunkHeight - 1; y >= 0; y--) {
              const index = x + y * chunkSize + z * chunkSize * chunkHeight;
              if (data[index] !== BLOCK.AIR) {
                topBlock = data[index];
                break;
              }
            }

            const worldX = cx * chunkSize + x;
            const worldZ = cz * chunkSize + z;
            const gx = worldX + worldOffset;
            const gz = worldZ + worldOffset;
            if (gx < 0 || gz < 0 || gx >= width || gz >= width) {
              continue;
            }

            const biomeId = getBiomeIdAt(seed, presetId, worldX, worldZ);
            const terrainY = getTerrainHeightAt(seed, presetId, worldX, worldZ);

            topBlockGrid[gz][gx] = topBlock;
            biomeGrid[gz][gx] = biomeId;
            terrainGrid[gz][gx] = terrainY;

            if (biomeId === "plains" || biomeId === "forest" || biomeId === "desert") {
              nonSnowBiomeColumns++;
              if (topBlock === BLOCK.SNOW) {
                nonSnowBiomeSnowTop++;
              }
            }

            if (biomeId === "plains") {
              plainsColumns++;
              if (topBlock === BLOCK.LEAVES) {
                plainsLeavesTop++;
              }
            }
            if (biomeId === "forest") {
              forestColumns++;
              if (topBlock === BLOCK.LEAVES) {
                forestLeavesTop++;
              }
            }
          }
        }
      }
    }

    const visualKey = (biomeId: string, topBlock: number): string => {
      if (
        biomeId !== "plains" &&
        biomeId !== "forest" &&
        biomeId !== "desert" &&
        biomeId !== "mountains" &&
        biomeId !== "tundra"
      ) {
        return `${topBlock}:na`;
      }
      const tint = getBiomeTintForBlock(biomeId, topBlock);
      if (!tint) {
        return `${topBlock}:na`;
      }
      return `${topBlock}:${Math.round(tint.r * 100)}:${Math.round(tint.g * 100)}:${Math.round(
        tint.b * 100,
      )}`;
    };

    let forestPlainsEdges = 0;
    let forestPlainsSameVisualTop = 0;
    for (let z = 0; z < width; z++) {
      for (let x = 0; x < width; x++) {
        const aBiome = biomeGrid[z][x];
        const aTop = topBlockGrid[z][x];

        const neighbors: Array<[number, number]> = [];
        if (x + 1 < width) {
          neighbors.push([x + 1, z]);
        }
        if (z + 1 < width) {
          neighbors.push([x, z + 1]);
        }

        for (const [nx, nz] of neighbors) {
          const bBiome = biomeGrid[nz][nx];
          const bTop = topBlockGrid[nz][nx];

          const isForestPlainsPair =
            (aBiome === "forest" && bBiome === "plains") ||
            (aBiome === "plains" && bBiome === "forest");

          if (!isForestPlainsPair) {
            continue;
          }

          forestPlainsEdges++;

          if (visualKey(aBiome, aTop) === visualKey(bBiome, bTop)) {
            forestPlainsSameVisualTop++;
          }
        }
      }
    }

    const sameVisualTopRate =
      (forestPlainsSameVisualTop / Math.max(1, forestPlainsEdges)) * 100;
    const nonSnowBiomeSnowRate =
      (nonSnowBiomeSnowTop / Math.max(1, nonSnowBiomeColumns)) * 100;

    const plainsTreeCoverage = plainsLeavesTop / Math.max(1, plainsColumns);
    const forestTreeCoverage = forestLeavesTop / Math.max(1, forestColumns);
    const treeCoverageRatio = forestTreeCoverage / Math.max(0.000001, plainsTreeCoverage);

    expect(sameVisualTopRate).toBeLessThan(70);
    expect(treeCoverageRatio).toBeGreaterThanOrEqual(2.5);
    expect(nonSnowBiomeSnowRate).toBeLessThan(0.05);
  });

  it("keeps smoother mountain boundary transitions in biomes_v3", () => {
    const seed = 42;
    const presetId = WORLD_GEN_PRESET_BIOMES_V3;
    const chunkSize = 16;
    const chunkRadius = 7;
    const width = chunkRadius * 2 * chunkSize;
    const offset = chunkRadius * chunkSize;

    const biomeGrid: string[][] = Array.from({ length: width }, () => new Array<string>(width));
    const terrainGrid: number[][] = Array.from({ length: width }, () => new Array<number>(width));

    for (let gz = 0; gz < width; gz++) {
      const worldZ = gz - offset;
      for (let gx = 0; gx < width; gx++) {
        const worldX = gx - offset;
        biomeGrid[gz][gx] = getBiomeIdAt(seed, presetId, worldX, worldZ);
        terrainGrid[gz][gx] = getTerrainHeightAt(seed, presetId, worldX, worldZ);
      }
    }

    let boundaryEdges = 0;
    let smoothEdges = 0;
    let sharpEdges = 0;

    for (let z = 0; z < width; z++) {
      for (let x = 0; x < width; x++) {
        const neighbors: Array<[number, number]> = [];
        if (x + 1 < width) {
          neighbors.push([x + 1, z]);
        }
        if (z + 1 < width) {
          neighbors.push([x, z + 1]);
        }

        for (const [nx, nz] of neighbors) {
          const aMountain = biomeGrid[z][x] === "mountains";
          const bMountain = biomeGrid[nz][nx] === "mountains";

          if (aMountain === bMountain) {
            continue;
          }

          boundaryEdges++;
          const delta = Math.abs(terrainGrid[z][x] - terrainGrid[nz][nx]);
          if (delta <= 2) {
            smoothEdges++;
          }
          if (delta >= 4) {
            sharpEdges++;
          }
        }
      }
    }

    expect(boundaryEdges).toBeGreaterThan(0);
    expect(smoothEdges / boundaryEdges).toBeGreaterThanOrEqual(0.55);
    expect(sharpEdges / boundaryEdges).toBeLessThanOrEqual(0.25);
  });
});

