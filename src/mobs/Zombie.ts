import * as THREE from "three";
import { Mob } from "./Mob";
import type { IWorld } from "../contracts/world";

export class Zombie extends Mob {
  protected readonly walkSpeed: number = 1.75;
  private lastAttackTime = 0;
  private targetShelter: THREE.Vector3 | null = null;

  // Body Parts
  private head: THREE.Mesh;
  private body: THREE.Mesh;

  // Pivots for animation
  private leftArmGroup: THREE.Group;
  private rightArmGroup: THREE.Group;
  private leftLegGroup: THREE.Group;
  private rightLegGroup: THREE.Group;

  private leftArm: THREE.Mesh;
  private rightArm: THREE.Mesh;
  private leftLeg: THREE.Mesh;
  private rightLeg: THREE.Mesh;

  constructor(
    world: IWorld,
    scene: THREE.Scene,
    x: number,
    y: number,
    z: number,
  ) {
    super(world, scene, x, y, z);

    const texture = world.noiseTexture;
    const skinColor = [0.2, 0.6, 0.2]; // Green
    const shirtColor = [0.2, 0.2, 0.8]; // Blue
    const pantsColor = [0.2, 0.2, 0.6]; // Dark Blue

    // 1. Legs (Height 0.7)
    // Pivot at y=0.7 (Hip)
    this.leftLegGroup = new THREE.Group();
    this.leftLegGroup.position.set(-0.1, 0.7, 0);
    this.mesh.add(this.leftLegGroup);

    // Mesh centered at -0.35 relative to pivot
    this.leftLeg = this.createBox(0.2, 0.7, 0.2, pantsColor, -0.35, texture);
    this.leftLegGroup.add(this.leftLeg);

    this.rightLegGroup = new THREE.Group();
    this.rightLegGroup.position.set(0.1, 0.7, 0);
    this.mesh.add(this.rightLegGroup);

    this.rightLeg = this.createBox(0.2, 0.7, 0.2, pantsColor, -0.35, texture);
    this.rightLegGroup.add(this.rightLeg);

    // 2. Body (Height 0.6, Base 0.7)
    // Body center is at 0.7 + 0.3 = 1.0
    this.body = this.createBox(0.5, 0.6, 0.25, shirtColor, 1.0, texture);
    this.mesh.add(this.body);

    // 3. Head (Height 0.5, Base 1.3)
    // Center at 1.3 + 0.25 = 1.55
    this.head = this.createBox(0.4, 0.5, 0.4, skinColor, 1.55, texture);
    this.mesh.add(this.head);

    // 4. Arms (Height 0.7)
    // Pivot at Shoulder (y=1.3, x=±0.35)
    this.leftArmGroup = new THREE.Group();
    this.leftArmGroup.position.set(-0.35, 1.3, 0);
    this.mesh.add(this.leftArmGroup);

    // Mesh centered at -0.35 relative to pivot
    this.leftArm = this.createBox(0.2, 0.7, 0.2, skinColor, -0.35, texture);
    this.leftArmGroup.add(this.leftArm);

    this.rightArmGroup = new THREE.Group();
    this.rightArmGroup.position.set(0.35, 1.3, 0);
    this.mesh.add(this.rightArmGroup);

    this.rightArm = this.createBox(0.2, 0.7, 0.2, skinColor, -0.35, texture);
    this.rightArmGroup.add(this.rightArm);

    this.leftArmGroup.rotation.x = -Math.PI / 2;
    this.rightArmGroup.rotation.x = -Math.PI / 2;
  }

  protected updateAI(
    delta: number,
    playerPos?: THREE.Vector3,
    onAttack?: (damage: number) => void,
    isDay?: boolean,
  ) {
    if (this.isDead) return;

    // Daytime behavior
    if (isDay) {
      // Avoid sunlight: seek shelter if not already
      if (!this.targetShelter) {
        this.targetShelter = this.findShelter();
      }

      if (this.targetShelter) {
        const dir = this.targetShelter.clone().sub(this.mesh.position);
        const dist = dir.length();
        dir.normalize();
        this.velocity.x = dir.x * this.walkSpeed;
        this.velocity.z = dir.z * this.walkSpeed;

        if (dist < 1) {
          // Reached shelter
          this.velocity.x = 0;
          this.velocity.z = 0;
        }
      } else {
        // If no shelter found, behave like normal mob
        super.updateAI(delta, playerPos, onAttack, isDay);
      }
      this.updateAnimationAndFacing();
      return;
    }

    // Nighttime behavior
    this.targetShelter = null;

    if (playerPos) {
      const toPlayer = playerPos.clone().sub(this.mesh.position);
      const distance = toPlayer.length();
      toPlayer.normalize();

      if (distance < 1.5) {
        // Attack if close enough
        const now = performance.now();
        if (now - this.lastAttackTime > 1000) {
          this.lastAttackTime = now;
          if (onAttack) onAttack(2);
        }
      } else if (distance < 12) {
        // Chase
        this.velocity.x = toPlayer.x * this.walkSpeed * 1.2;
        this.velocity.z = toPlayer.z * this.walkSpeed * 1.2;
      } else {
        // Wander
        super.updateAI(delta, playerPos, onAttack, isDay);
      }
    } else {
      super.updateAI(delta, playerPos, onAttack, isDay);
    }

    this.updateAnimationAndFacing();
  }

  private findShelter(): THREE.Vector3 | null {
    // Try 20 random positions to find a block overhead
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 15;
      const x = Math.floor(this.mesh.position.x + Math.cos(angle) * dist);
      const z = Math.floor(this.mesh.position.z + Math.sin(angle) * dist);
      const y = this.world.getTopY(x, z);

      // Check if block above exists (shade)
      if (this.world.hasBlock(x, y + 3, z)) {
        return new THREE.Vector3(x + 0.5, y + 1, z + 0.5);
      }
    }
    return null;
  }

  private updateAnimationAndFacing(): void {
    const horizontalSpeedSq =
      this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z;
    const time = performance.now() * 0.001;

    if (horizontalSpeedSq > 0.0001) {
      this.mesh.rotation.y = Math.atan2(this.velocity.x, this.velocity.z);
    }

    if (horizontalSpeedSq > 0.02) {
      const cycle = time * 10;
      const legSwing = Math.sin(cycle) * 0.5;

      this.leftLegGroup.rotation.x = legSwing;
      this.rightLegGroup.rotation.x = -legSwing;
      this.leftArmGroup.rotation.x = -Math.PI / 2 - legSwing * 0.35;
      this.rightArmGroup.rotation.x = -Math.PI / 2 + legSwing * 0.35;
      return;
    }

    this.leftLegGroup.rotation.x = 0;
    this.rightLegGroup.rotation.x = 0;
    this.leftArmGroup.rotation.x = -Math.PI / 2 + Math.sin(time * 2) * 0.05;
    this.rightArmGroup.rotation.x =
      -Math.PI / 2 + Math.sin(time * 2 + 1) * 0.05;
  }
}
