import * as THREE from "three";
import { BLOCK } from "../constants/Blocks";
import { createToolMesh } from "./hand/ToolMeshBuilder";
import { getToolDefForBlock, isSwordBlock } from "./hand/ToolDefs";
import {
  setEating,
  startPunch,
  stopPunch,
  updateHandAnimation,
  type HandAnimationState,
} from "./hand/HandAnimation";

export class PlayerHand {
  private camera: THREE.Camera;
  private handGroup: THREE.Group;
  private currentMesh: THREE.Mesh | null = null;
  private needleMesh: THREE.Mesh | null = null;
  private animationState: HandAnimationState = {
    bobTime: 0,
    swingTime: 0,
    isSwinging: false,
    isMining: false,
    isEating: false,
    currentId: 0,
  };

  private readonly SWING_DURATION = 0.3; // Seconds
  private readonly BASE_POS = new THREE.Vector3(0.5, -0.6, -1); // Right hand position

  // Texture References
  private blockTexture: THREE.DataTexture;
  constructor(
    camera: THREE.Camera,
    blockTexture: THREE.DataTexture,
  ) {
    this.camera = camera;
    this.blockTexture = blockTexture;

    this.handGroup = new THREE.Group();
    this.camera.add(this.handGroup);

    // Initial pos
    this.handGroup.position.copy(this.BASE_POS);
  }


  public updateItem(id: number) {
    if (this.animationState.currentId === id) return;
    this.animationState.currentId = id;

    // Cleanup old
    if (this.currentMesh) {
      this.handGroup.remove(this.currentMesh);
      this.currentMesh.geometry.dispose();
      if (Array.isArray(this.currentMesh.material)) {
        this.currentMesh.material.forEach((m) => m.dispose());
      } else {
        (this.currentMesh.material as THREE.Material).dispose();
      }
      this.currentMesh = null;
    }

    if (this.needleMesh) {
      // needleMesh is child of currentMesh usually, but let's be safe
      this.needleMesh.geometry.dispose();
      (this.needleMesh.material as THREE.Material).dispose();
      this.needleMesh = null;
    }

    if (id === 0) return; // Air

    const toolDef = getToolDefForBlock(id);

    // Check if Tool
    if (toolDef) {
      this.currentMesh = createToolMesh(toolDef);
      // Tool Orientation
      this.currentMesh.rotation.y = Math.PI / 2; // Point OUTWARD
      this.currentMesh.rotation.x = 0;

      // Axe Rotation Logic removed (standardized)

      this.currentMesh.scale.set(1.5, 1.5, 1.5);
      this.currentMesh.position.set(0, 0.2, 0);

      // Add Spinning Needle for Broken Compass
      if (id === BLOCK.BROKEN_COMPASS) {
        const needleGeo = new THREE.BoxGeometry(0.1, 0.4, 0.05); // Thin red needle
        const needleMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.needleMesh = new THREE.Mesh(needleGeo, needleMat);

        // Position slightly in front of the tool face
        // Tool pattern is centered. Tool mesh local Z+ is "Front".
        // Depth is 0.04 (pixelSize). Half depth is 0.02.
        // Place needle at z = -0.1 to be visible outside (facing player)
        this.needleMesh.position.set(0, 0, -0.1);
        this.currentMesh.add(this.needleMesh);
      }
    } else {
      // Block
      const geo = new THREE.BoxGeometry(0.6, 0.6, 0.6);

      // UV Logic
      // Atlas: 12 Columns
      const uvStep = 1.0 / 12.0;
      const uvInset = 0.001;

      const getRange = (idx: number) => {
        return {
          min: idx * uvStep + uvInset,
          max: (idx + 1) * uvStep - uvInset,
        };
      };

      const uvAttr = geo.attributes.uv;

      // Faces: 0:Right, 1:Left, 2:Top, 3:Bottom, 4:Front, 5:Back
      for (let face = 0; face < 6; face++) {
        let texIdx = 0; // Default Noise
        // 0: Noise, 1: Leaves, 2: Planks, 3: CT Top, 4: CT Side, 5: CT Bottom
        // 6: Coal Ore, 7: Iron Ore, 8: Furnace Front, 9: Furnace Side, 10: Furnace Top

        if (id === BLOCK.LEAVES) texIdx = 1;
        else if (id === BLOCK.PLANKS) texIdx = 2;
        else if (id === BLOCK.CRAFTING_TABLE) {
          if (face === 2)
            texIdx = 3; // Top
          else if (face === 3)
            texIdx = 5; // Bottom
          else texIdx = 4; // Side
        } else if (id === BLOCK.COAL_ORE) {
          texIdx = 6;
        } else if (id === BLOCK.IRON_ORE) {
          texIdx = 7;
        } else if (id === BLOCK.FURNACE) {
          if (face === 2)
            texIdx = 10; // Top
          else if (face === 3)
            texIdx = 5; // Bottom (Reuse CT bottom or Side) -> Let's reuse Side (9) or just make it dark. Side is fine.
          else if (face === 0)
            texIdx = 8; // Right (When held, orientation matters. BoxGeometry default: +x is Right. +z is Front.)
          // Wait, BoxGeometry faces: 0:Right(+x), 1:Left(-x), 2:Top(+y), 3:Bottom(-y), 4:Front(+z), 5:Back(-z).
          // If we rotate mesh by PI/4 (45 deg), Front face is towards camera?
          // Let's just map Front (4) to Furnace Front.
          else if (face === 4) texIdx = 8;
          else texIdx = 9; // Side
        }

        const { min, max } = getRange(texIdx);
        const offset = face * 4;
        for (let i = 0; i < 4; i++) {
          const u = uvAttr.getX(offset + i);
          uvAttr.setX(offset + i, min + u * (max - min));
        }
      }
      uvAttr.needsUpdate = true;

      // Colors
      let r = 1,
        g = 1,
        b = 1;
      if (id === BLOCK.STONE) {
        r = 0.5;
        g = 0.5;
        b = 0.5;
      } else if (id === BLOCK.BEDROCK) {
        r = 0.05;
        g = 0.05;
        b = 0.05;
      } else if (id === BLOCK.DIRT) {
        r = 0.54;
        g = 0.27;
        b = 0.07;
      } else if (id === BLOCK.GRASS) {
        r = 0.33;
        g = 0.6;
        b = 0.33;
      } else if (id === BLOCK.WOOD) {
        r = 0.4;
        g = 0.2;
        b = 0.0;
      } else if (id === BLOCK.LEAVES) {
        r = 0.13;
        g = 0.55;
        b = 0.13;
      } else if (id === BLOCK.PLANKS) {
        r = 0.76;
        g = 0.6;
        b = 0.42;
      } else if (id === BLOCK.STICK) {
        r = 0.4;
        g = 0.2;
        b = 0.0;
      } else if (
        id === BLOCK.COAL_ORE ||
        id === BLOCK.IRON_ORE ||
        id === BLOCK.FURNACE
      ) {
        r = 1.0;
        g = 1.0;
        b = 1.0; // Texture has colors
      }
      // Crafting Table uses white (texture colors)

      const colors: number[] = [];
      const grassTop = { r: 0.33, g: 0.6, b: 0.33 };
      const grassSide = { r: 0.54, g: 0.27, b: 0.07 };

      for (let i = 0; i < 24; i++) {
        const faceIndex = Math.floor(i / 4); // 0..5
        // BoxGeometry Faces: 0:Right, 1:Left, 2:Top, 3:Bottom, 4:Front, 5:Back

        if (id === BLOCK.GRASS) {
          if (faceIndex === 2) {
            // Top
            colors.push(grassTop.r, grassTop.g, grassTop.b);
          } else {
            // Sides/Bottom
            colors.push(grassSide.r, grassSide.g, grassSide.b);
          }
        } else {
          // Other blocks use uniform color
          colors.push(r, g, b);
        }
      }
      geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

      const mat = new THREE.MeshStandardMaterial({
        map: this.blockTexture,
        vertexColors: true,
        roughness: 0.8,
        alphaTest: 0.5,
        transparent: true,
      });

      this.currentMesh = new THREE.Mesh(geo, mat);
      // Block Orientation
      this.currentMesh.rotation.y = Math.PI / 4;
      this.currentMesh.position.set(0, 0, 0); // Centered
    }

    this.handGroup.add(this.currentMesh);
  }

  public punch() {
    startPunch(this.animationState);
  }

  public stopPunch() {
    stopPunch(this.animationState);
  }

  public setEating(eating: boolean) {
    setEating(this.animationState, eating);
  }

  public update(delta: number, isMoving: boolean) {
    updateHandAnimation({
      state: this.animationState,
      delta,
      isMoving,
      handGroup: this.handGroup,
      needleMesh: this.needleMesh,
      basePos: this.BASE_POS,
      swingDuration: this.SWING_DURATION,
      isSword: isSwordBlock,
    });
  }
}
