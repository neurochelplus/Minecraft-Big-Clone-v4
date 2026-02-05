import { RngStreams } from "../../../utils/Rng";
import type { ChunkManagerState } from "../types";
import type { TerrainGenerator } from "../../TerrainGenerator";
import { ChunkGenerator } from "../../generation/ChunkGenerator";
import { BiomeDecorator } from "../../generation/decorators/BiomeDecorator";
import { CaveDecorator } from "../../generation/decorators/CaveDecorator";
import { StructureDecorator } from "../../generation/decorators/StructureDecorator";
import { PostProcessDecorator } from "../../generation/decorators/PostProcessDecorator";
import { ChunkWorkerPool } from "../../workers/ChunkWorkerPool";

export function createChunkGenerator(
  seed: number,
  options: {
    chunkSize: number;
    chunkHeight: number;
    terrainGen: TerrainGenerator;
  },
): ChunkGenerator {
  const streams = new RngStreams(seed);
  const decorators = [
    new BiomeDecorator(streams.forStage("biomes")),
    new CaveDecorator(streams.forStage("caves"), false),
    new StructureDecorator(options.terrainGen),
    new PostProcessDecorator(),
  ];
  return new ChunkGenerator(seed, {
    chunkSize: options.chunkSize,
    chunkHeight: options.chunkHeight,
    decorators,
    terrainGen: options.terrainGen,
  });
}

export function setupWorkers(state: ChunkManagerState): void {
  if (typeof Worker === "undefined") return;
  let useWorkers = true;
  let useWorkerMesh = true;
  try {
    const flag = localStorage.getItem("qf-gen-workers");
    const meshFlag = localStorage.getItem("qf-gen-worker-mesh");
    if (flag === "0") useWorkers = false;
    if (meshFlag === "0") useWorkerMesh = false;
    if (meshFlag === "1") useWorkerMesh = true;
  } catch {
    useWorkers = false;
  }
  if (!useWorkers) return;

  const hc = navigator.hardwareConcurrency ?? 4;
  const workerCount = Math.max(1, Math.min(4, hc - 1));
  state.workerPool = new ChunkWorkerPool(workerCount);
  state.useWorkers = true;
  state.useWorkerMesh = useWorkerMesh;
}
