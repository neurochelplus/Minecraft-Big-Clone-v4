import { createNoise2D } from "simplex-noise";
import { hashSeed } from "../../../utils/Rng";
import {
  getBiomeDefinitionForProfile,
  getBiomeListForProfile,
  type BiomeDefinition,
  type BiomeGenerationProfile,
  type BiomeId,
} from "./BiomeRegistry";

export type BiomeWeights = Record<BiomeId, number>;

export type ClimateSample = {
  temperature: number;
  moisture: number;
  continentalness: number;
  ruggedness: number;
};

export type BiomeSample = {
  biomeId: BiomeId;
  secondBiomeId: BiomeId;
  climate: ClimateSample;
  weights: BiomeWeights;
  dominantWeight: number;
  secondWeight: number;
  top2Margin: number;
  ecotone: number;
};

export type BiomeSamplerProfile = "v3";

type SamplerConfig = {
  temperatureScale: number;
  moistureScale: number;
  continentalScale: number;
  ruggedScale: number;
  baseWeightOffset: number;
  distanceMultiplier: number;
  sharpenPower: number;
  useWeightFloor: boolean;
  temperatureRuggedBias: number;
  moistureContinentalBias: number;
  warpScale: number;
  warpAmplitude: number;
};

const SAMPLER_CONFIGS: Record<BiomeSamplerProfile, SamplerConfig> = {
  v3: {
    temperatureScale: 300,
    moistureScale: 300,
    continentalScale: 220,
    ruggedScale: 170,
    baseWeightOffset: 0.02,
    distanceMultiplier: 1.35,
    sharpenPower: 1.57,
    useWeightFloor: false,
    temperatureRuggedBias: 0.07,
    moistureContinentalBias: 0.05,
    warpScale: 700,
    warpAmplitude: 16,
  },
};

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

function toUnitRange(value: number): number {
  return Math.min(1, Math.max(0, value * 0.5 + 0.5));
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function computeEcotone(top2Margin: number): number {
  // 0 - biome core, 1 - strongest transition zone.
  return clamp01((0.22 - top2Margin) / 0.22);
}

function emptyWeights(): BiomeWeights {
  return {
    plains: 0,
    forest: 0,
    desert: 0,
    mountains: 0,
    tundra: 0,
  };
}

export class BiomeSampler {
  private readonly temperatureNoise: (x: number, y: number) => number;
  private readonly moistureNoise: (x: number, y: number) => number;
  private readonly continentalNoise: (x: number, y: number) => number;
  private readonly ruggedNoise: (x: number, y: number) => number;
  private readonly warpXNoise?: (x: number, y: number) => number;
  private readonly warpZNoise?: (x: number, y: number) => number;
  private readonly config: SamplerConfig;
  private readonly registryProfile: BiomeGenerationProfile;
  private readonly biomeList: readonly BiomeDefinition[];

  constructor(seed: number, profile: BiomeSamplerProfile = "v3") {
    this.registryProfile = "v3";
    this.biomeList = getBiomeListForProfile(this.registryProfile);
    this.config = SAMPLER_CONFIGS[profile];
    this.temperatureNoise = createNoiseFromSeed(hashSeed(seed, "biome.temperature"));
    this.moistureNoise = createNoiseFromSeed(hashSeed(seed, "biome.moisture"));
    this.continentalNoise = createNoiseFromSeed(hashSeed(seed, "biome.continental"));
    this.ruggedNoise = createNoiseFromSeed(hashSeed(seed, "biome.rugged"));
    if (this.config.warpAmplitude > 0 && this.config.warpScale > 0) {
      this.warpXNoise = createNoiseFromSeed(hashSeed(seed, "biome.warp.x"));
      this.warpZNoise = createNoiseFromSeed(hashSeed(seed, "biome.warp.z"));
    }
  }

  public sample(worldX: number, worldZ: number): BiomeSample {
    let sampleX = worldX;
    let sampleZ = worldZ;

    if (
      this.config.warpAmplitude > 0 &&
      this.config.warpScale > 0 &&
      this.warpXNoise &&
      this.warpZNoise
    ) {
      sampleX =
        worldX +
        this.warpXNoise(worldX / this.config.warpScale, worldZ / this.config.warpScale) *
          this.config.warpAmplitude;
      sampleZ =
        worldZ +
        this.warpZNoise(worldX / this.config.warpScale, worldZ / this.config.warpScale) *
          this.config.warpAmplitude;
    }

    let temperature = toUnitRange(
      this.temperatureNoise(
        sampleX / this.config.temperatureScale,
        sampleZ / this.config.temperatureScale,
      ),
    );
    let moisture = toUnitRange(
      this.moistureNoise(
        sampleX / this.config.moistureScale,
        sampleZ / this.config.moistureScale,
      ),
    );
    const continentalness = toUnitRange(
      this.continentalNoise(
        sampleX / this.config.continentalScale,
        sampleZ / this.config.continentalScale,
      ),
    );
    const ruggedness = toUnitRange(
      this.ruggedNoise(
        sampleX / this.config.ruggedScale,
        sampleZ / this.config.ruggedScale,
      ),
    );

    if (this.config.temperatureRuggedBias !== 0) {
      temperature = clamp01(
        temperature + (ruggedness - 0.5) * this.config.temperatureRuggedBias,
      );
    }
    if (this.config.moistureContinentalBias !== 0) {
      moisture = clamp01(
        moisture + (continentalness - 0.5) * this.config.moistureContinentalBias,
      );
    }

    const climate: ClimateSample = {
      temperature,
      moisture,
      continentalness,
      ruggedness,
    };

    const weights = this.calculateWeights(climate);

    let biomeId: BiomeId = "plains";
    let secondBiomeId: BiomeId = "plains";
    let dominantWeight = -Infinity;
    let secondWeight = -Infinity;

    for (const biome of this.biomeList) {
      const weight = weights[biome.id];
      if (weight > dominantWeight) {
        secondWeight = dominantWeight;
        secondBiomeId = biomeId;
        dominantWeight = weight;
        biomeId = biome.id;
      } else if (weight > secondWeight) {
        secondWeight = weight;
        secondBiomeId = biome.id;
      }
    }

    const top2Margin = Math.max(0, dominantWeight - Math.max(0, secondWeight));

    return {
      biomeId,
      secondBiomeId,
      climate,
      weights,
      dominantWeight: Math.max(0, dominantWeight),
      secondWeight: Math.max(0, secondWeight),
      top2Margin,
      ecotone: computeEcotone(top2Margin),
    };
  }

  private calculateWeights(climate: ClimateSample): BiomeWeights {
    const weights = emptyWeights();
    let totalWeight = 0;

    for (const biome of this.biomeList) {
      let weight = this.baseWeight(biome, climate);

      if (biome.id === "mountains") {
        weight *= 0.55 + climate.continentalness * 1.35 + climate.ruggedness * 0.45;
      } else if (biome.id === "desert") {
        weight *= 0.65 + climate.temperature * 0.85 + (1 - climate.moisture) * 0.6;
      } else if (biome.id === "tundra") {
        weight *= 0.7 + (1 - climate.temperature) * 0.95;
      } else if (biome.id === "forest") {
        weight *= 0.65 + climate.moisture * 0.8;
      }

      if (this.config.useWeightFloor) {
        weight = Math.max(0.0001, weight);
      } else {
        weight = Math.max(0, weight);
      }

      if (this.config.sharpenPower !== 1) {
        weight = Math.pow(weight, this.config.sharpenPower);
      }

      weights[biome.id] = weight;
      totalWeight += weight;
    }

    if (totalWeight <= 0) {
      weights.plains = 1;
      return weights;
    }

    for (const biome of this.biomeList) {
      weights[biome.id] = weights[biome.id] / totalWeight;
    }

    return weights;
  }

  private baseWeight(biome: BiomeDefinition, climate: ClimateSample): number {
    const tempDelta = climate.temperature - biome.temperature;
    const moistureDelta = climate.moisture - biome.moisture;
    const distance = tempDelta * tempDelta + moistureDelta * moistureDelta;
    return 1 / (this.config.baseWeightOffset + distance * this.config.distanceMultiplier);
  }

  public getDominantBiome(worldX: number, worldZ: number): BiomeId {
    return this.sample(worldX, worldZ).biomeId;
  }

  public getBiomeDefinition(worldX: number, worldZ: number): BiomeDefinition {
    const sample = this.sample(worldX, worldZ);
    return getBiomeDefinitionForProfile(this.registryProfile, sample.biomeId);
  }
}
