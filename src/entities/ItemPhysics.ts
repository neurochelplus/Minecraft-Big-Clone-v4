import * as THREE from "three";
import type { IWorld } from "../contracts/world";
import { GRAVITY, ITEM_ENTITY } from "../constants/GameConstants";

export class ItemPhysics {
  private world: IWorld;
  private mesh: THREE.Mesh;
  private velocity: THREE.Vector3;
  private isOnGround: boolean = false;
  private groundY: number = 0;
  private readonly horizontalFriction = 8;

  constructor(
    world: IWorld,
    mesh: THREE.Mesh,
    initialVelocity: THREE.Vector3 = new THREE.Vector3(),
  ) {
    this.world = world;
    this.mesh = mesh;
    this.velocity = initialVelocity.clone();
  }

  public update(time: number, delta: number) {
    const safeDelta = Math.min(delta, 0.05);

    this.applyHorizontalMovement(safeDelta);

    if (!this.isOnGround) {
      this.applyGravity(safeDelta);
      this.applyVerticalMovement(safeDelta);
      this.checkGroundCollision();
    } else {
      this.applyGroundFriction(safeDelta);
      this.applyFloatingAnimation(time);
      this.checkGroundRemoved();
    }
  }

  private applyGravity(delta: number) {
    this.velocity.y -= GRAVITY * delta;
  }

  private applyVerticalMovement(delta: number) {
    this.mesh.position.y += this.velocity.y * delta;
  }

  private applyHorizontalMovement(delta: number) {
    if (this.velocity.x !== 0) {
      const nextX = this.mesh.position.x + this.velocity.x * delta;
      if (this.hasBlockingCell(nextX, this.mesh.position.y, this.mesh.position.z)) {
        this.velocity.x = 0;
      } else {
        this.mesh.position.x = nextX;
      }
    }

    if (this.velocity.z !== 0) {
      const nextZ = this.mesh.position.z + this.velocity.z * delta;
      if (this.hasBlockingCell(this.mesh.position.x, this.mesh.position.y, nextZ)) {
        this.velocity.z = 0;
      } else {
        this.mesh.position.z = nextZ;
      }
    }
  }

  private hasBlockingCell(x: number, y: number, z: number): boolean {
    const blockX = Math.floor(x);
    const blockZ = Math.floor(z);
    const blockY = Math.floor(y);
    return this.world.getBlock(blockX, blockY, blockZ) !== 0;
  }

  private checkGroundCollision() {
    const x = Math.floor(this.mesh.position.x);
    const z = Math.floor(this.mesh.position.z);

    const feetY = this.mesh.position.y - ITEM_ENTITY.COLLISION_OFFSET;
    const blockY = Math.floor(feetY);

    if (this.world.getBlock(x, blockY, z) !== 0) {
      this.isOnGround = true;
      this.velocity.y = 0;
      this.groundY = blockY + 1 + ITEM_ENTITY.COLLISION_OFFSET;
      this.mesh.position.y = this.groundY;
    }
  }

  private applyGroundFriction(delta: number) {
    const damping = Math.exp(-this.horizontalFriction * delta);
    this.velocity.x *= damping;
    this.velocity.z *= damping;

    if (Math.abs(this.velocity.x) < 0.01) this.velocity.x = 0;
    if (Math.abs(this.velocity.z) < 0.01) this.velocity.z = 0;
  }

  private applyFloatingAnimation(time: number) {
    const offset = Math.sin(time * ITEM_ENTITY.FLOAT_SPEED) * ITEM_ENTITY.FLOAT_AMPLITUDE;
    this.mesh.position.y = this.groundY + offset;
  }

  private checkGroundRemoved() {
    const x = Math.floor(this.mesh.position.x);
    const z = Math.floor(this.mesh.position.z);
    const blockY = Math.floor(this.groundY - 1 - ITEM_ENTITY.COLLISION_OFFSET);

    if (this.world.getBlock(x, blockY, z) === 0) {
      this.isOnGround = false;
      this.velocity.y = 0;
    }
  }

  public getIsOnGround(): boolean {
    return this.isOnGround;
  }

  public getVelocity(): THREE.Vector3 {
    return this.velocity.clone();
  }
}
