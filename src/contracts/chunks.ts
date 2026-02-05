export type ChunkCoord = {
  cx: number;
  cz: number;
};

export type ChunkMeta = {
  version: number;
  seed: number;
  biomeId?: number;
};

export type ChunkData = {
  data: Uint8Array;
  meta: ChunkMeta;
};

export type ChunkMeshData = {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
};

export type RngLike = {
  next(): number;
  nextInt(maxExclusive: number): number;
  nextRange(min: number, max: number): number;
};

export type ChunkGenContext = {
  cx: number;
  cz: number;
  startX: number;
  startZ: number;
  chunkSize: number;
  chunkHeight: number;
  getBlockIndex: (x: number, y: number, z: number) => number;
  rngForStage: (label: string) => RngLike;
};

export interface IChunkSource {
  getSeed(): number;
  setSeed(seed: number): void;
  generateChunk(cx: number, cz: number): Promise<ChunkData> | ChunkData;
  getTerrainHeight(worldX: number, worldZ: number): number;
}

export interface IChunkDecorator {
  decorate(chunk: ChunkData, ctx: ChunkGenContext): void;
}

export interface IChunkMesher {
  buildMeshData(
    data: Uint8Array,
    cx: number,
    cz: number,
    chunkSize: number,
    chunkHeight: number,
    getBlockIndex: (x: number, y: number, z: number) => number,
    getNeighborBlock: (x: number, y: number, z: number) => number,
  ): ChunkMeshData;
}

export interface IChunkStreamer {
  getDesiredChunks(
    playerX: number,
    playerZ: number,
    viewDirX: number,
    viewDirZ: number,
    chunkSize: number,
    radius: number,
  ): ChunkCoord[];
}
