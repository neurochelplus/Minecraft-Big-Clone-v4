import * as THREE from "three";
import { TextureAtlas } from "./TextureAtlas";
import type { IFurnaceManager } from "../contracts/crafting";
import type { ChunkMeshData, IChunkMesher } from "../contracts/chunks";
import { ChunkMeshDataBuilder } from "./mesh/ChunkMeshDataBuilder";

export class ChunkMeshBuilder implements IChunkMesher {
  private noiseTexture: THREE.DataTexture;
  private chunkMaterial: THREE.MeshStandardMaterial;
  private furnaceManager?: IFurnaceManager;

  constructor(furnaceManager?: IFurnaceManager) {
    this.furnaceManager = furnaceManager;
    this.noiseTexture = TextureAtlas.createNoiseTexture();
    this.chunkMaterial = new THREE.MeshStandardMaterial({
      map: this.noiseTexture,
      vertexColors: true,
      roughness: 0.8,
      alphaTest: 0.5,
      transparent: true,
    });
    this.chunkMaterial.userData.qfSharedChunkMaterial = true;
  }

  public getNoiseTexture(): THREE.DataTexture {
    return this.noiseTexture;
  }

  public buildMeshData(
    data: Uint8Array,
    cx: number,
    cz: number,
    chunkSize: number,
    chunkHeight: number,
    getBlockIndex: (x: number, y: number, z: number) => number,
    getNeighborBlock: (x: number, y: number, z: number) => number,
  ): ChunkMeshData {
    return ChunkMeshDataBuilder.buildMeshData(
      data,
      cx,
      cz,
      chunkSize,
      chunkHeight,
      getBlockIndex,
      getNeighborBlock,
      (x, y, z) => this.furnaceManager?.getFurnace(x, y, z)?.rotation,
    );
  }

  public buildMesh(
    data: Uint8Array,
    cx: number,
    cz: number,
    chunkSize: number,
    chunkHeight: number,
    getBlockIndex: (x: number, y: number, z: number) => number,
    getNeighborBlock: (x: number, y: number, z: number) => number,
  ): THREE.Mesh {
    const meshData = this.buildMeshData(
      data,
      cx,
      cz,
      chunkSize,
      chunkHeight,
      getBlockIndex,
      getNeighborBlock,
    );
    return this.buildMeshFromData(meshData, cx * chunkSize, cz * chunkSize);
  }

  public buildMeshFromData(meshData: ChunkMeshData, startX: number, startZ: number): THREE.Mesh {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(meshData.positions, 3),
    );
    geometry.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(meshData.normals, 3),
    );
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(meshData.uvs, 2));
    geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(meshData.colors, 3),
    );
    geometry.setIndex(new THREE.BufferAttribute(meshData.indices, 1));
    geometry.computeBoundingSphere();

    const mesh = new THREE.Mesh(geometry, this.chunkMaterial);
    mesh.userData.qfSharedChunkMaterial = true;
    mesh.position.set(startX, 0, startZ);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
}
