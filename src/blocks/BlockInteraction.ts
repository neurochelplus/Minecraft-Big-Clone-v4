import * as THREE from "three";
import { PerspectiveCamera } from "three";
import { Scene } from "three";
import type { IWorld } from "../contracts/world";
import type { IMobCollider } from "../contracts/mobs";
import { BLOCK } from "../constants/Blocks";
import {
  PLAYER_HALF_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_EYE_HEIGHT,
} from "../constants/GameConstants";

type ControlsLike = {
  object: THREE.Object3D;
  velocity?: { set: (x: number, y: number, z: number) => void };
};

type SelectableObject = THREE.Object3D & {
  isMesh?: boolean;
  isItem?: boolean;
  parent?: THREE.Object3D & { isMob?: boolean };
};

export class BlockInteraction {
  private raycaster: THREE.Raycaster;
  private camera: PerspectiveCamera;
  private scene: Scene;
  private controls: ControlsLike;
  private cursorMesh?: THREE.Mesh;
  private crackMesh?: THREE.Mesh;
  private readonly MAX_DISTANCE = 6;

  // Eating State
  private isEating = false;
  private eatTimer = 0;
  private readonly EAT_DURATION = 1.5; // Seconds

  private getSelectedSlotItem: () => { id: number; count: number };
  private getMobs?: () => IMobCollider[];
  private onPlaceBlock?: (
    x: number,
    y: number,
    z: number,
    blockId: number,
  ) => boolean;
  private onOpenCraftingTable?: () => void;
  private onOpenFurnace?: (x: number, y: number, z: number) => void;
  private onConsumeItem?: () => void;

  constructor(
    camera: PerspectiveCamera,
    scene: Scene,
    controls: ControlsLike,
    getSelectedSlotItem: () => { id: number; count: number },
    onPlaceBlock?: (
      x: number,
      y: number,
      z: number,
      blockId: number,
    ) => boolean,
    onOpenCraftingTable?: () => void,
    onOpenFurnace?: (x: number, y: number, z: number) => void,
    cursorMesh?: THREE.Mesh,
    crackMesh?: THREE.Mesh,
    getMobs?: () => IMobCollider[],
    onConsumeItem?: () => void,
  ) {
    this.camera = camera;
    this.scene = scene;
    this.controls = controls;
    this.getSelectedSlotItem = getSelectedSlotItem;
    this.onPlaceBlock = onPlaceBlock;
    this.onOpenCraftingTable = onOpenCraftingTable;
    this.onOpenFurnace = onOpenFurnace;
    this.cursorMesh = cursorMesh;
    this.crackMesh = crackMesh;
    this.getMobs = getMobs;
    this.onConsumeItem = onConsumeItem;
    this.raycaster = new THREE.Raycaster();
  }

  public update(delta: number, isUsePressed: boolean) {
    const slot = this.getSelectedSlotItem();
    const isFood =
      slot.id === BLOCK.COOKED_MEAT || slot.id === BLOCK.RAW_MEAT; // Can eat raw meat too? Sure.

    if (isUsePressed && isFood) {
      if (!this.isEating) {
        this.isEating = true;
        this.eatTimer = 0;
      }

      this.eatTimer += delta;

      if (this.eatTimer >= this.EAT_DURATION) {
        // Consume!
        this.consumeFood(slot.id);
        this.isEating = false;
        this.eatTimer = 0;
      }
    } else {
      this.isEating = false;
      this.eatTimer = 0;
    }
  }

  public getIsEating(): boolean {
    return this.isEating;
  }

  private consumeFood(_id: number) {
    this.onConsumeItem?.();
  }

  public interact(world: IWorld): void {
    // 1. Check Item Usage (Broken Compass)
    const slot = this.getSelectedSlotItem();
    if (slot.id === BLOCK.BROKEN_COMPASS) {
      // Random Teleport Logic
      const playerPos = this.controls.object.position;
      const angle = Math.random() * Math.PI * 2;
      const dist = 5 + Math.random() * 25; // 5 to 30 blocks away

      const targetX = playerPos.x + Math.sin(angle) * dist;
      const targetZ = playerPos.z + Math.cos(angle) * dist;

      const tx = Math.floor(targetX);
      const tz = Math.floor(targetZ);

      // Find valid ground
      const topY = world.getTopY(tx, tz);

      // If valid height found (and not void)
      if (topY > 0) {
        const targetY = topY + 3.0; // Drop from above to prevent sticking

        // Check if target is not too high/low compared to current?
        // Not strictly required by prompt, but good practice.
        // Prompt says "random place in radius 30".

        playerPos.set(tx + 0.5, targetY, tz + 0.5);

        // Reset velocity to prevent fall damage or momentum
        if (this.controls.velocity) {
          this.controls.velocity.set(0, 0, 0);
        }

        // Consume Item
        if (this.onConsumeItem) this.onConsumeItem();

        return; // Stop interaction
      }
      // If no valid ground found (void), do nothing (waste use? or prevent use?)
      // Let's prevent use if invalid target.
    }

    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children);
    const hit = intersects.find((i) => {
      const obj = i.object as SelectableObject;
      return (
        i.object !== this.cursorMesh &&
        i.object !== this.crackMesh &&
        i.object !== this.controls.object &&
        obj.isMesh &&
        !obj.isItem &&
        !obj.parent?.isMob
      );
    });

    if (hit && hit.distance < this.MAX_DISTANCE) {
      const p = hit.point
        .clone()
        .add(this.raycaster.ray.direction.clone().multiplyScalar(0.01));
      const x = Math.floor(p.x);
      const y = Math.floor(p.y);
      const z = Math.floor(p.z);

      const targetId = world.getBlock(x, y, z);
      if (targetId === BLOCK.CRAFTING_TABLE) {
        if (this.onOpenCraftingTable) {
          this.onOpenCraftingTable();
        }
        return;
      } else if (targetId === BLOCK.FURNACE) {
        if (this.onOpenFurnace) {
          this.onOpenFurnace(x, y, z);
        }
        return;
      }

      // Place Block
      const slot = this.getSelectedSlotItem();
      if (slot.id !== 0 && slot.count > 0) {
        // Prevent placing non-blocks (e.g. Stick, Tools)
        if (slot.id === BLOCK.STICK || slot.id >= 20) return;

        if (hit.face) {
          const placePos = hit.point
            .clone()
            .add(hit.face.normal.clone().multiplyScalar(0.01));
          const px = Math.floor(placePos.x);
          const py = Math.floor(placePos.y);
          const pz = Math.floor(placePos.z);

          // Check collision with player
          const playerPos = this.controls.object.position;
          const playerMinX = playerPos.x - PLAYER_HALF_WIDTH;
          const playerMaxX = playerPos.x + PLAYER_HALF_WIDTH;
          const playerMinY = playerPos.y - PLAYER_EYE_HEIGHT;
          const playerMaxY = playerPos.y - PLAYER_EYE_HEIGHT + PLAYER_HEIGHT;
          const playerMinZ = playerPos.z - PLAYER_HALF_WIDTH;
          const playerMaxZ = playerPos.z + PLAYER_HALF_WIDTH;

          const blockMinX = px;
          const blockMaxX = px + 1;
          const blockMinY = py;
          const blockMaxY = py + 1;
          const blockMinZ = pz;
          const blockMaxZ = pz + 1;

          if (
            playerMinX < blockMaxX &&
            playerMaxX > blockMinX &&
            playerMinY < blockMaxY &&
            playerMaxY > blockMinY &&
            playerMinZ < blockMaxZ &&
            playerMaxZ > blockMinZ
          ) {
            // Cannot place block inside player
            return;
          }

          // Check collision with mobs
          if (this.getMobs) {
            const mobs = this.getMobs();
            let mobCollision = false;
            for (const mob of mobs) {
              const mobPos = mob.mesh.position;
              const mobMinX = mobPos.x - mob.width / 2;
              const mobMaxX = mobPos.x + mob.width / 2;
              const mobMinY = mobPos.y;
              const mobMaxY = mobPos.y + mob.height;
              const mobMinZ = mobPos.z - mob.width / 2;
              const mobMaxZ = mobPos.z + mob.width / 2;

              if (
                mobMinX < blockMaxX &&
                mobMaxX > blockMinX &&
                mobMinY < blockMaxY &&
                mobMaxY > blockMinY &&
                mobMinZ < blockMaxZ &&
                mobMaxZ > blockMinZ
              ) {
                mobCollision = true;
                break;
              }
            }
            if (mobCollision) return;
          }

          if (this.onPlaceBlock) {
            const placed = this.onPlaceBlock(px, py, pz, slot.id);
            if (placed) {
              // Block was placed, inventory will be updated by caller
            }
          }
        }
      }
    }
  }
}
