import { createNoise2D } from "simplex-noise";
import { BLOCK } from "../../../constants/Blocks";
import { RngStreams, hashSeed, type Rng } from "../../../utils/Rng";
import {
  normalizeWorldGenPresetId,
  WORLD_GEN_PRESET_BIOMES_V3,
  type WorldGenPresetId,
} from "../WorldGenPresets";
import {
  getBiomeDefinitionForProfile,
  type BiomeGenerationProfile,
  type BiomeId,
} from "./BiomeRegistry";
import {
  BiomeSampler,
  type BiomeSample,
} from "./BiomeSampler";
import { resolveSurfaceBlock } from "./BiomeSurfaceRules";

const LEGACY_BASE_HEIGHT = 20;
const LEGACY_HEIGHT_SCALE = 8;
const LEGACY_TERRAIN_SCALE = 50;

const BIOME_BASE_HEIGHT = 21;
const BIOME_HEIGHT_SCALE = 7.5;
const BIOME_TERRAIN_SCALE = 60;
const BIOME_DETAIL_SCALE = 160;
const BIOME_RIDGE_SCALE = 120;

function createNoiseFromSeed(seed: number): (x: number, y: number) => number {
  let state = seed >>> 0;
  const random = () => {
    let t = (state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return createNoise2D(random);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge1 <= edge0) {
    return value >= edge1 ? 1 : 0;
  }
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

type RuntimeContext = {
  presetId: WorldGenPresetId;
  biomeProfile: BiomeGenerationProfile;
  terrainNoise: (x: number, y: number) => number;
  terrainDetailNoise: (x: number, y: number) => number;
  terrainRidgeNoise: (x: number, y: number) => number;
  biomeSampler?: BiomeSampler;
};

const CONTEXT_CACHE = new Map<string, RuntimeContext>();

function isBiomePreset(presetId: WorldGenPresetId): boolean {
  return presetId === WORLD_GEN_PRESET_BIOMES_V3;
}

function createRuntimeContext(seed: number, presetId: WorldGenPresetId): RuntimeContext {
  const terrainSeed = hashSeed(seed, "terrain");

  const context: RuntimeContext = {
    presetId,
    biomeProfile: presetId === WORLD_GEN_PRESET_BIOMES_V3 ? "v3" : "default",
    terrainNoise: createNoiseFromSeed(terrainSeed),
    terrainDetailNoise: createNoiseFromSeed(hashSeed(terrainSeed, "detail")),
    terrainRidgeNoise: createNoiseFromSeed(hashSeed(terrainSeed, "ridge")),
  };

  if (isBiomePreset(presetId)) {
    const biomeSeed = hashSeed(seed, "biome");
    context.biomeSampler = new BiomeSampler(biomeSeed, "v3");
  }

  return context;
}

function getRuntimeContext(seed: number, presetId: string): RuntimeContext {
  const normalizedPreset = normalizeWorldGenPresetId(presetId);
  const key = `${seed}:${normalizedPreset}`;
  const cached = CONTEXT_CACHE.get(key);
  if (cached) {
    return cached;
  }
  const context = createRuntimeContext(seed, normalizedPreset);
  CONTEXT_CACHE.set(key, context);
  return context;
}

type HeightSample = {
  height: number;
  biomeId: BiomeId;
  secondBiomeId: BiomeId;
  ecotone: number;
  biomeSample?: BiomeSample;
};

function sampleHeight(
  context: RuntimeContext,
  worldX: number,
  worldZ: number,
): HeightSample {
  if (!isBiomePreset(context.presetId)) {
    const noiseValue = context.terrainNoise(
      worldX / LEGACY_TERRAIN_SCALE,
      worldZ / LEGACY_TERRAIN_SCALE,
    );
    const height = Math.floor(noiseValue * LEGACY_HEIGHT_SCALE) + LEGACY_BASE_HEIGHT;
    return {
      height: Math.max(1, height),
      biomeId: "plains",
      secondBiomeId: "plains",
      ecotone: 0,
    };
  }

  const biomeSample = context.biomeSampler!.sample(worldX, worldZ);

  let weightedHeightOffset = 0;
  let weightedRoughness = 0;
  for (const [biomeId, weight] of Object.entries(biomeSample.weights) as Array<
    [BiomeId, number]
  >) {
    const def = getBiomeDefinitionForProfile(context.biomeProfile, biomeId);
    weightedHeightOffset += def.heightOffset * weight;
    weightedRoughness += def.roughness * weight;
  }

  let blendedHeightOffset = weightedHeightOffset;
  let blendedRoughness = weightedRoughness;
  let ridgeStrength = 2.5;

  if (context.presetId === WORLD_GEN_PRESET_BIOMES_V3) {
    const dominantBiome = getBiomeDefinitionForProfile(
      context.biomeProfile,
      biomeSample.biomeId,
    );
    const secondBiome = getBiomeDefinitionForProfile(
      context.biomeProfile,
      biomeSample.secondBiomeId,
    );
    const ecotone = biomeSample.ecotone;
    const ecotoneHeightOffset =
      dominantBiome.heightOffset * 0.78 + secondBiome.heightOffset * 0.22;
    const ecotoneRoughness =
      dominantBiome.roughness * 0.72 + secondBiome.roughness * 0.28;
    blendedHeightOffset =
      dominantBiome.heightOffset +
      (ecotoneHeightOffset - dominantBiome.heightOffset) * ecotone;
    blendedRoughness =
      dominantBiome.roughness + (ecotoneRoughness - dominantBiome.roughness) * ecotone;

    const mountainWeight = biomeSample.weights.mountains;
    const mountainGate = smoothstep(0.3, 0.65, mountainWeight);
    blendedHeightOffset = lerp(weightedHeightOffset, blendedHeightOffset, mountainGate);
    blendedRoughness = lerp(weightedRoughness, blendedRoughness, mountainGate);
    ridgeStrength = lerp(1.6, 2.5, mountainGate);
  }

  const baseNoise = context.terrainNoise(
    worldX / BIOME_TERRAIN_SCALE,
    worldZ / BIOME_TERRAIN_SCALE,
  );
  const detailNoise = context.terrainDetailNoise(
    worldX / BIOME_DETAIL_SCALE,
    worldZ / BIOME_DETAIL_SCALE,
  );
  const ridge = Math.abs(
    context.terrainRidgeNoise(worldX / BIOME_RIDGE_SCALE, worldZ / BIOME_RIDGE_SCALE),
  );

  const elevation =
    BIOME_BASE_HEIGHT +
    baseNoise * BIOME_HEIGHT_SCALE * blendedRoughness +
    detailNoise * 2.2 +
    ridge * ridgeStrength +
    blendedHeightOffset;

  return {
    height: Math.max(1, Math.floor(elevation)),
    biomeId: biomeSample.biomeId,
    secondBiomeId: biomeSample.secondBiomeId,
    ecotone: biomeSample.ecotone,
    biomeSample,
  };
}

function getBlockIndex(
  chunkSize: number,
  chunkHeight: number,
  x: number,
  y: number,
  z: number,
): number {
  return x + y * chunkSize + z * chunkSize * chunkHeight;
}

function sampleSurfaceSlope(
  context: RuntimeContext,
  worldX: number,
  worldZ: number,
  centerHeight: number,
): number {
  const left = sampleHeight(context, worldX - 1, worldZ).height;
  const right = sampleHeight(context, worldX + 1, worldZ).height;
  const back = sampleHeight(context, worldX, worldZ - 1).height;
  const front = sampleHeight(context, worldX, worldZ + 1).height;

  return Math.max(
    Math.abs(centerHeight - left),
    Math.abs(centerHeight - right),
    Math.abs(centerHeight - back),
    Math.abs(centerHeight - front),
  );
}

type VeinConfig = {
  blockType: number;
  attempts: number;
  targetLen: number;
};

function generateVein(
  data: Uint8Array,
  chunkSize: number,
  chunkHeight: number,
  rng: Rng,
  config: VeinConfig,
  surfaceMap: Int16Array,
): void {
  const { blockType, attempts, targetLen } = config;

  for (let i = 0; i < attempts; i++) {
    let vx = rng.nextInt(chunkSize);
    let vz = rng.nextInt(chunkSize);
    const surfaceIndex = vz * chunkSize + vx;
    const surfaceHeight = surfaceMap[surfaceIndex];
    const maxStoneY = Math.max(2, surfaceHeight - 3);
    if (maxStoneY <= 1) {
      continue;
    }

    let vy = 1 + rng.nextInt(maxStoneY - 1);
    let index = getBlockIndex(chunkSize, chunkHeight, vx, vy, vz);
    if (data[index] !== BLOCK.STONE && data[index] !== BLOCK.SANDSTONE) {
      continue;
    }

    data[index] = blockType;
    let currentLen = 1;
    let fails = 0;

    while (currentLen < targetLen && fails < 10) {
      const dir = rng.nextInt(6);
      let nx = vx;
      let ny = vy;
      let nz = vz;

      if (dir === 0) nx++;
      else if (dir === 1) nx--;
      else if (dir === 2) ny++;
      else if (dir === 3) ny--;
      else if (dir === 4) nz++;
      else nz--;

      if (
        nx < 0 ||
        nx >= chunkSize ||
        ny <= 0 ||
        ny >= chunkHeight ||
        nz < 0 ||
        nz >= chunkSize
      ) {
        fails++;
        continue;
      }

      index = getBlockIndex(chunkSize, chunkHeight, nx, ny, nz);
      const target = data[index];
      if (target === BLOCK.STONE || target === BLOCK.SANDSTONE) {
        data[index] = blockType;
        vx = nx;
        vy = ny;
        vz = nz;
        currentLen++;
      } else if (target === blockType) {
        vx = nx;
        vy = ny;
        vz = nz;
      } else {
        fails++;
      }
    }
  }
}

function placeTree(
  data: Uint8Array,
  chunkSize: number,
  chunkHeight: number,
  rng: Rng,
  startX: number,
  startY: number,
  startZ: number,
): void {
  const trunkHeight = 4 + rng.nextInt(2);

  for (let y = 0; y < trunkHeight; y++) {
    const currentY = startY + y;
    if (currentY >= chunkHeight) {
      break;
    }
    const index = getBlockIndex(chunkSize, chunkHeight, startX, currentY, startZ);
    data[index] = BLOCK.WOOD;
  }

  const leavesStart = startY + trunkHeight - 2;
  const leavesEnd = startY + trunkHeight + 1;

  for (let y = leavesStart; y <= leavesEnd; y++) {
    const dy = y - (startY + trunkHeight - 1);
    const radius = dy === 2 ? 1 : 2;

    for (let x = startX - radius; x <= startX + radius; x++) {
      for (let z = startZ - radius; z <= startZ + radius; z++) {
        if (x < 0 || x >= chunkSize || y < 0 || y >= chunkHeight || z < 0 || z >= chunkSize) {
          continue;
        }

        const dx = x - startX;
        const dz = z - startZ;
        if (Math.abs(dx) === radius && Math.abs(dz) === radius && rng.next() < 0.4) {
          continue;
        }

        const index = getBlockIndex(chunkSize, chunkHeight, x, y, z);
        if (data[index] !== BLOCK.WOOD) {
          data[index] = BLOCK.LEAVES;
        }
      }
    }
  }
}

function generateTrees(
  data: Uint8Array,
  chunkSize: number,
  chunkHeight: number,
  rng: Rng,
  surfaceMap: Int16Array,
  biomeMap: Uint8Array,
  secondBiomeMap: Uint8Array,
  ecotoneMap: Float32Array,
  biomeProfile: BiomeGenerationProfile,
  presetId: WorldGenPresetId,
): void {
  for (let x = 2; x < chunkSize - 2; x++) {
    for (let z = 2; z < chunkSize - 2; z++) {
      const mapIndex = z * chunkSize + x;
      const surfaceY = surfaceMap[mapIndex];
      if (surfaceY <= 0 || surfaceY >= chunkHeight - 6) {
        continue;
      }

      const surfaceIndex = getBlockIndex(chunkSize, chunkHeight, x, surfaceY, z);
      const surfaceType = data[surfaceIndex];
      if (surfaceType !== BLOCK.GRASS && surfaceType !== BLOCK.SNOW_GRASS) {
        continue;
      }

      const biomeId = biomeIndexToId(biomeMap[mapIndex]);
      const dominantBiome = getBiomeDefinitionForProfile(biomeProfile, biomeId);
      let treeChance = dominantBiome.treeChance;
      if (presetId === WORLD_GEN_PRESET_BIOMES_V3) {
        const secondBiomeId = biomeIndexToId(secondBiomeMap[mapIndex]);
        const secondBiome = getBiomeDefinitionForProfile(biomeProfile, secondBiomeId);
        const ecotone = ecotoneMap[mapIndex];
        const transitionTreeChance =
          dominantBiome.treeChance * 0.65 + secondBiome.treeChance * 0.35;
        treeChance =
          dominantBiome.treeChance +
          (transitionTreeChance - dominantBiome.treeChance) * ecotone;
      }
      if (treeChance <= 0 || rng.next() >= treeChance) {
        continue;
      }

      if (data[getBlockIndex(chunkSize, chunkHeight, x, surfaceY + 1, z)] !== BLOCK.AIR) {
        continue;
      }

      placeTree(data, chunkSize, chunkHeight, rng, x, surfaceY + 1, z);
    }
  }
}

const BIOME_ID_TO_INDEX: Record<BiomeId, number> = {
  plains: 0,
  forest: 1,
  desert: 2,
  mountains: 3,
  tundra: 4,
};

const BIOME_INDEX_TO_ID: BiomeId[] = [
  "plains",
  "forest",
  "desert",
  "mountains",
  "tundra",
];

function biomeIdToIndex(biomeId: BiomeId): number {
  return BIOME_ID_TO_INDEX[biomeId];
}

function biomeIndexToId(index: number): BiomeId {
  return BIOME_INDEX_TO_ID[index] ?? "plains";
}

export type GenerateChunkInput = {
  seed: number;
  presetId: string;
  chunkSize: number;
  chunkHeight: number;
  cx: number;
  cz: number;
};

export function generateChunkData(input: GenerateChunkInput): Uint8Array {
  const { seed, chunkSize, chunkHeight, cx, cz } = input;
  const context = getRuntimeContext(seed, input.presetId);
  const data = new Uint8Array(chunkSize * chunkSize * chunkHeight);
  const surfaceMap = new Int16Array(chunkSize * chunkSize);
  const biomeMap = new Uint8Array(chunkSize * chunkSize);
  const secondBiomeMap = new Uint8Array(chunkSize * chunkSize);
  const ecotoneMap = new Float32Array(chunkSize * chunkSize);

  const startX = cx * chunkSize;
  const startZ = cz * chunkSize;

  for (let x = 0; x < chunkSize; x++) {
    for (let z = 0; z < chunkSize; z++) {
      const worldX = startX + x;
      const worldZ = startZ + z;
      const sample = sampleHeight(context, worldX, worldZ);
      const surfaceY = Math.min(chunkHeight - 1, sample.height);
      const mapIndex = z * chunkSize + x;
      surfaceMap[mapIndex] = surfaceY;
      biomeMap[mapIndex] = biomeIdToIndex(sample.biomeId);
      secondBiomeMap[mapIndex] = biomeIdToIndex(sample.secondBiomeId);
      ecotoneMap[mapIndex] = sample.ecotone;
      const slope = isBiomePreset(context.presetId)
        ? sampleSurfaceSlope(context, worldX, worldZ, surfaceY)
        : 0;
      const mountainInfluence = sample.biomeSample?.weights.mountains ?? 0;

      for (let y = 0; y <= surfaceY; y++) {
        const index = getBlockIndex(chunkSize, chunkHeight, x, y, z);
        if (y === 0) {
          data[index] = BLOCK.BEDROCK;
          continue;
        }

        if (!isBiomePreset(context.presetId)) {
          if (y === surfaceY) {
            data[index] = BLOCK.GRASS;
          } else if (y >= surfaceY - 3) {
            data[index] = BLOCK.DIRT;
          } else {
            data[index] = BLOCK.STONE;
          }
          continue;
        }

        const depthFromSurface = surfaceY - y;
        if (depthFromSurface <= 4) {
          data[index] = resolveSurfaceBlock({
            presetId: context.presetId,
            biomeId: sample.biomeId,
            secondBiomeId: sample.secondBiomeId,
            ecotone: sample.ecotone,
            climate: sample.biomeSample!.climate,
            surfaceY,
            depthFromSurface,
            slope,
            mountainInfluence,
          });
        } else {
          data[index] = BLOCK.STONE;
        }
      }
    }
  }

  const chunkSeed = hashSeed(seed, `chunk:${cx},${cz}`);
  const streams = new RngStreams(chunkSeed);
  const oresRng = streams.forStage("ores");
  const treesRng = streams.forStage("trees");

  let oreMultiplierSum = 0;
  for (let i = 0; i < biomeMap.length; i++) {
    const biomeId = biomeIndexToId(biomeMap[i]);
    oreMultiplierSum += getBiomeDefinitionForProfile(
      context.biomeProfile,
      biomeId,
    ).oreMultiplier;
  }
  const avgOreMultiplier = oreMultiplierSum / biomeMap.length;

  generateVein(
    data,
    chunkSize,
    chunkHeight,
    oresRng,
    {
      blockType: BLOCK.COAL_ORE,
      attempts: Math.max(20, Math.floor(80 * avgOreMultiplier)),
      targetLen: 8,
    },
    surfaceMap,
  );
  generateVein(
    data,
    chunkSize,
    chunkHeight,
    oresRng,
    {
      blockType: BLOCK.IRON_ORE,
      attempts: Math.max(12, Math.floor(50 * avgOreMultiplier)),
      targetLen: 6,
    },
    surfaceMap,
  );

  generateTrees(
    data,
    chunkSize,
    chunkHeight,
    treesRng,
    surfaceMap,
    biomeMap,
    secondBiomeMap,
    ecotoneMap,
    context.biomeProfile,
    context.presetId,
  );
  return data;
}

export function getTerrainHeightAt(
  seed: number,
  presetId: string,
  worldX: number,
  worldZ: number,
): number {
  const context = getRuntimeContext(seed, presetId);
  return sampleHeight(context, worldX, worldZ).height;
}

export function getBiomeIdAt(
  seed: number,
  presetId: string,
  worldX: number,
  worldZ: number,
): BiomeId {
  const context = getRuntimeContext(seed, presetId);
  return sampleHeight(context, worldX, worldZ).biomeId;
}
