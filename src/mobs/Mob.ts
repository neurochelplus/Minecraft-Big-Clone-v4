import * as THREE from "three";
import type { IWorld } from "../contracts/world";
import type { IPlayerInput } from "../contracts/player";

export const MobState = {
  IDLE: 0,
  WANDER: 1,
  CHASE: 2,
  ATTACK: 3,
  SEEK_SHELTER: 4,
  ALERT: 5,
  FLEE: 6,
} as const;

export type MobState = (typeof MobState)[keyof typeof MobState];

export class Mob {
  public mesh: THREE.Group;
  public state: MobState = MobState.IDLE;

  // Physics
  protected velocity = new THREE.Vector3();
  protected readonly gravity = 20.0;
  protected readonly walkSpeed: number = 2.0;
  protected isOnGround = false;

  // Dimensions (AABB)
  public readonly width = 0.5;
  public readonly height = 1.8;

  // AI
  protected stateTimer = 0;
  protected wanderAngle = 0;

  // References
  protected world: IWorld;
  protected scene: THREE.Scene;

  // Stats
  public hp = 20;
  public maxHp = 20;
  public isDead = false;
  public isHurt = false;
  public isStunned = false;

  // Fire
  public isOnFire = false;
  private fireTimer = 0;
  private fireMesh: THREE.Mesh | null = null;

  constructor(
    world: IWorld,
    scene: THREE.Scene,
    x: number,
    y: number,
    z: number,
  ) {
    this.world = world;
    this.scene = scene;

    this.mesh = new THREE.Group();
    (this.mesh as THREE.Group & { isMob?: boolean }).isMob = true;
    this.mesh.userData.mob = this;
    this.mesh.position.set(x, y, z);

    this.scene.add(this.mesh);
  }

  protected createBox(
    w: number,
    h: number,
    d: number,
    colorRGB: number[],
    yOffset: number,
    texture: THREE.Texture,
  ): THREE.Mesh {
    const geo = new THREE.BoxGeometry(w, h, d);
    const count = geo.attributes.position.count;
    const colors: number[] = [];
    for (let i = 0; i < count; i++) colors.push(...colorRGB);
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      vertexColors: true,
      roughness: 0.8,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = yOffset;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  public setFire(active: boolean) {
    if (this.isOnFire === active) return;
    this.isOnFire = active;

    if (active) {
      if (!this.fireMesh) {
        const geo = new THREE.BoxGeometry(0.6, 1.8, 0.6);
        const mat = new THREE.MeshBasicMaterial({
          color: 0xff4500,
          transparent: true,
          opacity: 0.5,
        });
        this.fireMesh = new THREE.Mesh(geo, mat);
        this.fireMesh.position.y = 0.9;
        this.mesh.add(this.fireMesh);
      }
    } else {
      if (this.fireMesh) {
        this.mesh.remove(this.fireMesh);
        this.fireMesh.geometry.dispose();
        (this.fireMesh.material as THREE.Material).dispose();
        this.fireMesh = null;
      }
    }
  }

  public takeDamage(amount: number, attackerPos: THREE.Vector3 | null) {
    if (this.isDead || this.isHurt) return;

    this.hp -= amount;
    this.isHurt = true;
    if (attackerPos) {
      this.isStunned = true;
    }

    // Red Flash Effect (persistent for 0.5s)
    this.mesh.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.material instanceof THREE.MeshStandardMaterial
      ) {
        if (!child.userData.originalColor) {
          child.userData.originalColor = child.material.color.clone();
        }
        child.material.color.set(0xff0000);
      }
    });

    setTimeout(() => {
      this.isHurt = false;
      this.isStunned = false;
      if (!this.isDead) {
        this.mesh.traverse((child) => {
          if (
            child instanceof THREE.Mesh &&
            child.material instanceof THREE.MeshStandardMaterial &&
            child.userData.originalColor
          ) {
            child.material.color.copy(child.userData.originalColor);
          }
        });
      }
    }, 500);

    // Knockback
    if (attackerPos) {
      const knockbackDir = this.mesh.position
        .clone()
        .sub(attackerPos)
        .normalize();
      knockbackDir.y = 0.4; // Slightly upward
      knockbackDir.normalize();
      this.velocity.add(knockbackDir.multiplyScalar(8.0));
      this.isOnGround = false;
    }

    if (this.hp <= 0) {
      this.isDead = true;
      this.setFire(false); // Extinguish on death
    }
  }

  update(
    delta: number,
    player?: THREE.Vector3 | IPlayerInput,
    onAttack?: (damage: number) => void,
    isDay?: boolean,
  ) {
    // Resolve playerPos
    let playerPos: THREE.Vector3 | undefined;
    if (player instanceof THREE.Vector3) {
      playerPos = player;
    } else if (player) {
      playerPos = player.physics.controls.object
        .position as THREE.Vector3;
    }

    if (!this.isStunned) {
      this.updateAI(delta, playerPos, onAttack, isDay);
    }

    // Fire Damage
    if (this.isOnFire) {
      this.fireTimer += delta;
      // 2 damage per second -> 1 damage every 0.5s
      if (this.fireTimer >= 0.5) {
        this.fireTimer = 0;
        this.takeDamage(1, null); // No attacker
      }

      if (this.fireMesh) {
        this.fireMesh.scale.setScalar(1.0 + Math.random() * 0.1);
      }
    }

    this.updatePhysics(delta);
  }

  protected updateAI(
    delta: number,
    _playerPos?: THREE.Vector3,
    _onAttack?: (damage: number) => void,
    _isDay?: boolean,
  ) {
    if (this.state === MobState.IDLE) {
      // 1% chance per frame (assuming 60fps)
      if (Math.random() < 0.01) {
        this.state = MobState.WANDER;
        this.stateTimer = 1 + Math.random() * 3; // 1-4 seconds
        this.wanderAngle = Math.random() * Math.PI * 2;
      }
    } else if (this.state === MobState.WANDER) {
      this.stateTimer -= delta;
      this.velocity.x = Math.sin(this.wanderAngle) * this.walkSpeed;
      this.velocity.z = Math.cos(this.wanderAngle) * this.walkSpeed;

      if (this.stateTimer <= 0) {
        this.state = MobState.IDLE;
        this.velocity.x = 0;
        this.velocity.z = 0;
      }
    }
  }

  protected updatePhysics(delta: number) {
    // Gravity
    this.velocity.y -= this.gravity * delta;

    // Move
    this.mesh.position.addScaledVector(this.velocity, delta);

    // Collide with ground
    const x = Math.floor(this.mesh.position.x);
    const y = Math.floor(this.mesh.position.y);
    const z = Math.floor(this.mesh.position.z);

    if (this.world.hasBlock(x, y, z)) {
      this.mesh.position.y = Math.ceil(this.mesh.position.y);
      this.velocity.y = 0;
      this.isOnGround = true;
    } else {
      this.isOnGround = false;
    }
  }

  public dispose() {
    this.scene.remove(this.mesh);
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}
