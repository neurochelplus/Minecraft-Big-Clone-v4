import * as THREE from "three";
import { Mob, MobState } from "./Mob";
import type { IWorld } from "../contracts/world";

export class WildBoar extends Mob {
  protected readonly walkSpeed: number = 1.5;
  protected readonly runSpeed: number = 4.5; // Player walk speed (~4.0-4.5 blocks/sec)
  protected readonly detectionRadius: number = 8.0;
  
  // Body Parts
  private head: THREE.Mesh;
  private body: THREE.Mesh;
  private snout: THREE.Mesh;
  private leftTusk: THREE.Mesh;
  private rightTusk: THREE.Mesh;
  private leftEye: THREE.Mesh;
  private rightEye: THREE.Mesh;
  private leftEar: THREE.Mesh;
  private rightEar: THREE.Mesh;

  // Legs Groups
  private legFLGroup: THREE.Group; // Front Left
  private legFRGroup: THREE.Group; // Front Right
  private legBLGroup: THREE.Group; // Back Left
  private legBRGroup: THREE.Group; // Back Right

  private legFL: THREE.Mesh;
  private legFR: THREE.Mesh;
  private legBL: THREE.Mesh;
  private legBR: THREE.Mesh;

  // AI State vars
  private alertTimer = 0;
  private fleeTimer = 0;
  private eatTimer = 0;

  constructor(
    world: IWorld,
    scene: THREE.Scene,
    x: number,
    y: number,
    z: number,
  ) {
    super(world, scene, x, y, z);
    this.hp = 10;
    this.maxHp = 10;
    // Hitbox adjustment (wider but shorter)
    // We can't easily change readonly width/height in subclass without overrides or casting, 
    // but Mob.ts uses them for collision. 
    // Let's assume standard size for collision is acceptable or we'd need to refactor Mob.ts
    // For now, visual size is what matters most.

    const texture = world.noiseTexture;
    const furColor = [0.29, 0.21, 0.15]; // #4A3728 Brown
    const snoutColor = [0.9, 0.72, 0.71]; // #E6B8B7 Pinkish
    const tuskColor = [1, 1, 1]; // White
    const hoofColor = [0.18, 0.18, 0.18]; // Dark Grey
    const eyeColor = [0.1, 0.1, 0.1]; // Black
    const earColor = [0.29, 0.21, 0.15]; // Same as fur

    // --- Geometry Construction ---
    // Pivot is at feet (y=0)

    // 1. Legs (Height 0.4)
    // Positions relative to center. Body is ~0.9 long, 0.5 wide.
    // Leg positions: x=±0.2, z=±0.3
    
    // Front Left
    this.legFLGroup = new THREE.Group();
    this.legFLGroup.position.set(-0.2, 0.4, 0.3);
    this.mesh.add(this.legFLGroup);
    this.legFL = this.createBox(0.15, 0.4, 0.15, hoofColor, -0.2, texture);
    this.legFLGroup.add(this.legFL);

    // Front Right
    this.legFRGroup = new THREE.Group();
    this.legFRGroup.position.set(0.2, 0.4, 0.3);
    this.mesh.add(this.legFRGroup);
    this.legFR = this.createBox(0.15, 0.4, 0.15, hoofColor, -0.2, texture);
    this.legFRGroup.add(this.legFR);

    // Back Left
    this.legBLGroup = new THREE.Group();
    this.legBLGroup.position.set(-0.2, 0.4, -0.3);
    this.mesh.add(this.legBLGroup);
    this.legBL = this.createBox(0.15, 0.4, 0.15, hoofColor, -0.2, texture);
    this.legBLGroup.add(this.legBL);

    // Back Right
    this.legBRGroup = new THREE.Group();
    this.legBRGroup.position.set(0.2, 0.4, -0.3);
    this.mesh.add(this.legBRGroup);
    this.legBR = this.createBox(0.15, 0.4, 0.15, hoofColor, -0.2, texture);
    this.legBRGroup.add(this.legBR);

    // 2. Body (0.5W x 0.5H x 0.9L)
    // Center Y = 0.4 (legs) + 0.25 (half body) = 0.65
    // Z centered
    this.body = this.createBox(0.5, 0.5, 0.9, furColor, 0.65, texture);
    this.mesh.add(this.body);

    // 3. Head (0.4W x 0.4H x 0.4L)
    // Attached to front of body. Body ends at z=0.45.
    // Head center z = 0.45 + 0.2 = 0.65
    // Head Y center = 0.65 (same as body) + 0.1 (slightly higher?) -> let's keep level: 0.7
    this.head = this.createBox(0.4, 0.4, 0.4, furColor, 0.7, texture);
    this.head.position.z = 0.65;
    this.mesh.add(this.head);

    // 4. Snout (0.2W x 0.15H x 0.1L)
    // Attached to front of head (z=0.65 + 0.2 = 0.85)
    // Y center = 0.7 - 0.05 = 0.65
    this.snout = this.createBox(0.2, 0.15, 0.1, snoutColor, 0.65, texture);
    this.snout.position.z = 0.85; // relative to mesh center, not head group (head is not a group here)
    // Wait, createBox returns a mesh at 0,0,0 with geometry offset. 
    // To attach snout to head properly for animation, head should be a group or we just move mesh.
    // For simple "look at" animations, head group is better. But here we just have procedural body anims.
    // Let's attach snout and tusks to head mesh if we want head rotation? 
    // Currently Mob structure is flat hierarchy in constructor mostly.

    this.mesh.add(this.snout);

    // Tusks
    this.leftTusk = this.createBox(0.05, 0.1, 0.05, tuskColor, 0.65, texture);
    this.leftTusk.position.set(-0.08, 0.65, 0.9);
    this.mesh.add(this.leftTusk);

    this.rightTusk = this.createBox(0.05, 0.1, 0.05, tuskColor, 0.65, texture);
    this.rightTusk.position.set(0.08, 0.65, 0.9);
    this.mesh.add(this.rightTusk);

    // Ears
    this.leftEar = this.createBox(0.1, 0.1, 0.05, earColor, 0.85, texture);
    this.leftEar.position.set(-0.15, 0.85, 0.5);
    this.mesh.add(this.leftEar);

    this.rightEar = this.createBox(0.1, 0.1, 0.05, earColor, 0.85, texture);
    this.rightEar.position.set(0.15, 0.85, 0.5);
    this.mesh.add(this.rightEar);

    // Eyes
    this.leftEye = this.createBox(0.05, 0.05, 0.05, eyeColor, 0.75, texture);
    this.leftEye.position.set(-0.1, 0.75, 0.85);
    this.mesh.add(this.leftEye);

    this.rightEye = this.createBox(0.05, 0.05, 0.05, eyeColor, 0.75, texture);
    this.rightEye.position.set(0.1, 0.75, 0.85);
    this.mesh.add(this.rightEye);
  }

  protected updateAI(
    delta: number,
    playerPos?: THREE.Vector3,
    onAttack?: (damage: number) => void,
    isDay?: boolean,
  ) {
    if (this.isDead) return;

    const distToPlayer = playerPos ? this.mesh.position.distanceTo(playerPos) : Infinity;

    switch (this.state) {
      case MobState.IDLE:
        this.eatTimer += delta;
        if (this.eatTimer > 5) {
          this.eatTimer = 0;
        }

        if (distToPlayer < this.detectionRadius) {
          this.state = MobState.ALERT;
          this.alertTimer = 1.5;
          this.velocity.x = 0;
          this.velocity.z = 0;
        } else {
          super.updateAI(delta, playerPos, onAttack, isDay);
        }
        break;

      case MobState.WANDER:
        if (distToPlayer < this.detectionRadius) {
          this.state = MobState.ALERT;
          this.alertTimer = 1.5;
          this.velocity.x = 0;
          this.velocity.z = 0;
        } else {
          super.updateAI(delta, playerPos, onAttack, isDay);
        }
        break;

      case MobState.ALERT:
        this.velocity.x = 0;
        this.velocity.z = 0;

        if (playerPos) {
          const dx = playerPos.x - this.mesh.position.x;
          const dz = playerPos.z - this.mesh.position.z;
          const targetAngle = Math.atan2(dx, dz);
          let angleDiff = targetAngle - this.mesh.rotation.y;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          this.mesh.rotation.y += angleDiff * Math.min(delta * 6, 1);
        }

        this.alertTimer -= delta;
        // Boar only flees after taking damage; approach should only alert.
        if (this.alertTimer <= 0 || distToPlayer > this.detectionRadius * 1.5) {
          this.state = MobState.IDLE;
        }
        break;

      case MobState.FLEE: {
        this.fleeTimer -= delta;

        if (distToPlayer < this.detectionRadius) {
          const dir = this.mesh.position.clone().sub(playerPos as THREE.Vector3).normalize();
          this.velocity.x = dir.x * this.runSpeed;
          this.velocity.z = dir.z * this.runSpeed;
          this.mesh.rotation.y = Math.atan2(dir.x, dir.z);
        } else {
          this.velocity.x = Math.sin(this.mesh.rotation.y) * this.runSpeed;
          this.velocity.z = Math.cos(this.mesh.rotation.y) * this.runSpeed;
        }

        if (this.fleeTimer <= 0 || distToPlayer > 20) {
          this.state = MobState.IDLE;
          this.velocity.x = 0;
          this.velocity.z = 0;
        }
        break;
      }

      default:
        super.updateAI(delta, playerPos, onAttack, isDay);
        break;
    }

    this.updateAnimationAndFacing();
  }

  public takeDamage(amount: number, attackerPos: THREE.Vector3 | null): void {
    super.takeDamage(amount, attackerPos);

    if (!this.isDead) {
      this.state = MobState.FLEE;
      this.fleeTimer = 4.0;
      this.alertTimer = 0;
    }
  }

  private updateAnimationAndFacing(): void {
    const horizontalSpeedSq =
      this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z;

    if (horizontalSpeedSq > 0.0001) {
      this.mesh.rotation.y = Math.atan2(this.velocity.x, this.velocity.z);
    }

    if (horizontalSpeedSq > 0.02) {
      const time = performance.now() * 0.001;
      const isRunning = this.state === MobState.FLEE;
      const cycle = time * (isRunning ? 14 : 8);
      const swing = isRunning ? 0.8 : 0.4;

      this.legFLGroup.rotation.x = Math.sin(cycle) * swing;
      this.legFRGroup.rotation.x = Math.cos(cycle) * swing;
      this.legBLGroup.rotation.x = Math.cos(cycle) * swing;
      this.legBRGroup.rotation.x = Math.sin(cycle) * swing;
      this.body.rotation.x = isRunning ? -0.08 : 0;
      return;
    }

    this.legFLGroup.rotation.x = 0;
    this.legFRGroup.rotation.x = 0;
    this.legBLGroup.rotation.x = 0;
    this.legBRGroup.rotation.x = 0;
    this.body.rotation.x = 0;
  }
}
