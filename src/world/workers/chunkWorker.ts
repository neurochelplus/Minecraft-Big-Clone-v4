/// <reference lib="webworker" />
import type { ChunkData, ChunkMeshData } from "../../contracts/chunks";
import { ChunkGenerator } from "../generation/ChunkGenerator";
import { BiomeDecorator } from "../generation/decorators/BiomeDecorator";
import { CaveDecorator } from "../generation/decorators/CaveDecorator";
import { StructureDecorator } from "../generation/decorators/StructureDecorator";
import { PostProcessDecorator } from "../generation/decorators/PostProcessDecorator";
import { TerrainGenerator } from "../generation/TerrainGenerator";
import { RngStreams } from "../../utils/Rng";
import { ChunkMeshDataBuilder } from "../mesh/ChunkMeshDataBuilder";
import { BLOCK } from "../../constants/Blocks";

type GenerateRequest = {
  id: number;
  type: "generate";
  cx: number;
  cz: number;
  seed: number;
  chunkSize: number;
  chunkHeight: number;
  withMesh: boolean;
};

type GenerateResponse = {
  id: number;
  type: "generateResult";
  chunk: ChunkData;
  meshData?: ChunkMeshData;
};

const getBlockIndex = (chunkSize: number, chunkHeight: number) => (x: number, y: number, z: number) =>
  x + y * chunkSize + z * chunkSize * chunkHeight;

const getNeighborBlock = (
  data: Uint8Array,
  chunkSize: number,
  chunkHeight: number,
  worldX: number,
  worldY: number,
  worldZ: number,
) => {
  if (worldY < 0 || worldY >= chunkHeight) return BLOCK.AIR;
  const cx = Math.floor(worldX / chunkSize);
  const cz = Math.floor(worldZ / chunkSize);
  const localX = worldX - cx * chunkSize;
  const localZ = worldZ - cz * chunkSize;
  if (localX < 0 || localX >= chunkSize || localZ < 0 || localZ >= chunkSize) return BLOCK.AIR;
  const index = localX + worldY * chunkSize + localZ * chunkSize * chunkHeight;
  return data[index];
};

self.onmessage = (event: MessageEvent<GenerateRequest>) => {
  const msg = event.data;
  if (msg.type !== "generate") return;

  const { cx, cz, seed, chunkSize, chunkHeight, withMesh } = msg;
  const streams = new RngStreams(seed);
  const terrainGen = new TerrainGenerator(seed);
  const decorators = [
    new BiomeDecorator(streams.forStage("biomes")),
    new CaveDecorator(streams.forStage("caves"), false),
    new StructureDecorator(terrainGen),
    new PostProcessDecorator(),
  ];
  const generator = new ChunkGenerator(seed, {
    chunkSize,
    chunkHeight,
    decorators,
    terrainGen,
  });

  const chunk = generator.generateChunk(cx, cz);

  let meshData: ChunkMeshData | undefined;
  if (withMesh) {
    meshData = ChunkMeshDataBuilder.buildMeshData(
      chunk.data,
      cx,
      cz,
      chunkSize,
      chunkHeight,
      getBlockIndex(chunkSize, chunkHeight),
      (x, y, z) => getNeighborBlock(chunk.data, chunkSize, chunkHeight, x, y, z),
      undefined,
    );
  }

  const response: GenerateResponse = {
    id: msg.id,
    type: "generateResult",
    chunk,
    meshData,
  };

  const transfer: Transferable[] = [chunk.data.buffer as ArrayBuffer];
  if (meshData) {
    transfer.push(
      meshData.positions.buffer as ArrayBuffer,
      meshData.normals.buffer as ArrayBuffer,
      meshData.uvs.buffer as ArrayBuffer,
      meshData.colors.buffer as ArrayBuffer,
      meshData.indices.buffer as ArrayBuffer,
    );
  }

  self.postMessage(response, transfer);
};
