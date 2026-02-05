import { BLOCK } from "../../constants/Blocks";
import { BlockColors } from "../../constants/BlockColors";
import type { ChunkMeshData } from "../../contracts/chunks";

const UV_STEP = 1.0 / 12;
const UV_INSET = 0.001;

export type FurnaceRotationLookup = (x: number, y: number, z: number) => number | undefined;

export class ChunkMeshDataBuilder {
  private static positionsPool: number[] = [];
  private static normalsPool: number[] = [];
  private static uvsPool: number[] = [];
  private static colorsPool: number[] = [];
  private static indicesPool: number[] = [];

  public static buildMeshData(
    data: Uint8Array,
    cx: number,
    cz: number,
    chunkSize: number,
    chunkHeight: number,
    getBlockIndex: (x: number, y: number, z: number) => number,
    getNeighborBlock: (x: number, y: number, z: number) => number,
    getFurnaceRotation?: FurnaceRotationLookup,
  ): ChunkMeshData {
    const positions = this.positionsPool;
    const normals = this.normalsPool;
    const uvs = this.uvsPool;
    const colors = this.colorsPool;
    const indices = this.indicesPool;

    positions.length = 0;
    normals.length = 0;
    uvs.length = 0;
    colors.length = 0;
    indices.length = 0;

    const startX = cx * chunkSize;
    const startZ = cz * chunkSize;

    for (let x = 0; x < chunkSize; x++) {
      for (let y = 0; y < chunkHeight; y++) {
        for (let z = 0; z < chunkSize; z++) {
          const index = getBlockIndex(x, y, z);
          const type = data[index];
          if (type === BLOCK.AIR) continue;

          if (this.isTransparent(getNeighborBlock(startX + x, y + 1, startZ + z))) {
            this.addFace(positions, normals, uvs, colors, indices, x, y, z, type, "top", startX, startZ, getFurnaceRotation);
          }
          if (this.isTransparent(getNeighborBlock(startX + x, y - 1, startZ + z))) {
            this.addFace(positions, normals, uvs, colors, indices, x, y, z, type, "bottom", startX, startZ, getFurnaceRotation);
          }
          if (this.isTransparent(getNeighborBlock(startX + x, y, startZ + z + 1))) {
            this.addFace(positions, normals, uvs, colors, indices, x, y, z, type, "front", startX, startZ, getFurnaceRotation);
          }
          if (this.isTransparent(getNeighborBlock(startX + x, y, startZ + z - 1))) {
            this.addFace(positions, normals, uvs, colors, indices, x, y, z, type, "back", startX, startZ, getFurnaceRotation);
          }
          if (this.isTransparent(getNeighborBlock(startX + x + 1, y, startZ + z))) {
            this.addFace(positions, normals, uvs, colors, indices, x, y, z, type, "right", startX, startZ, getFurnaceRotation);
          }
          if (this.isTransparent(getNeighborBlock(startX + x - 1, y, startZ + z))) {
            this.addFace(positions, normals, uvs, colors, indices, x, y, z, type, "left", startX, startZ, getFurnaceRotation);
          }
        }
      }
    }

    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      uvs: new Float32Array(uvs),
      colors: new Float32Array(colors),
      indices: new Uint32Array(indices),
    };
  }

  private static isTransparent(blockType: number): boolean {
    return blockType === BLOCK.AIR || blockType === BLOCK.LEAVES;
  }

  private static addFace(
    positions: number[],
    normals: number[],
    uvs: number[],
    colors: number[],
    indices: number[],
    x: number,
    y: number,
    z: number,
    type: number,
    side: string,
    startX: number,
    startZ: number,
    getFurnaceRotation?: FurnaceRotationLookup,
  ) {
    const x0 = x;
    const x1 = x + 1;
    const y0 = y;
    const y1 = y + 1;
    const z0 = z;
    const z1 = z + 1;

    const vertStart = positions.length / 3;

    if (side === "top") {
      positions.push(x0, y1, z1, x1, y1, z1, x0, y1, z0, x1, y1, z0);
      normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
    } else if (side === "bottom") {
      positions.push(x0, y0, z0, x1, y0, z0, x0, y0, z1, x1, y0, z1);
      normals.push(0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0);
    } else if (side === "front") {
      positions.push(x0, y0, z1, x1, y0, z1, x0, y1, z1, x1, y1, z1);
      normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1);
    } else if (side === "back") {
      positions.push(x1, y0, z0, x0, y0, z0, x1, y1, z0, x0, y1, z0);
      normals.push(0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1);
    } else if (side === "right") {
      positions.push(x1, y0, z1, x1, y0, z0, x1, y1, z1, x1, y1, z0);
      normals.push(1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0);
    } else if (side === "left") {
      positions.push(x0, y0, z0, x0, y0, z1, x0, y1, z0, x0, y1, z1);
      normals.push(-1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0);
    }

    const { u0, u1 } = this.getUVCoords(type, side, startX + x, y, startZ + z, getFurnaceRotation);
    uvs.push(u0, 0, u1, 0, u0, 1, u1, 1);

    const { r, g, b } = BlockColors.getColorForFace(type, side);
    for (let i = 0; i < 4; i++) {
      colors.push(r, g, b);
    }

    indices.push(vertStart, vertStart + 1, vertStart + 2);
    indices.push(vertStart + 2, vertStart + 1, vertStart + 3);
  }

  private static getUVCoords(
    type: number,
    side: string,
    worldX: number,
    worldY: number,
    worldZ: number,
    getFurnaceRotation?: FurnaceRotationLookup,
  ): { u0: number; u1: number } {
    let slot = 0;

    if (type === BLOCK.LEAVES) slot = 1;
    else if (type === BLOCK.PLANKS) slot = 2;
    else if (type === BLOCK.CRAFTING_TABLE) {
      if (side === "top") slot = 3;
      else if (side === "bottom") slot = 5;
      else slot = 4;
    } else if (type === BLOCK.COAL_ORE) slot = 6;
    else if (type === BLOCK.IRON_ORE) slot = 7;
    else if (type === BLOCK.FURNACE) {
      if (side === "top") slot = 10;
      else if (side === "bottom") slot = 9;
      else {
        const rot = getFurnaceRotation?.(worldX, worldY, worldZ) ?? 0;
        let frontFace = "front";
        if (rot === 0) frontFace = "back";
        else if (rot === 1) frontFace = "right";
        else if (rot === 2) frontFace = "front";
        else if (rot === 3) frontFace = "left";
        slot = side === frontFace ? 8 : 9;
      }
    }

    return {
      u0: UV_STEP * slot + UV_INSET,
      u1: UV_STEP * (slot + 1) - UV_INSET,
    };
  }
}
