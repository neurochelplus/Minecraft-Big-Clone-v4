import * as THREE from 'three';
import type { IControls } from "../contracts/controls";
import { HealthBar } from '../ui/HealthBar';

export class PlayerHealth {
  private hp: number = 20;
  private readonly maxHp: number = 20;
  private isInvulnerable: boolean = false;
  private damageOverlay: HTMLElement;
  private healthBar: HealthBar;
  private camera: THREE.PerspectiveCamera;
  private controls: IControls;
  private checkCollision: (position: THREE.Vector3) => boolean;
  private onRespawn?: () => void;
  private getRespawnPosition?: () => THREE.Vector3;

  constructor(
    damageOverlay: HTMLElement,
    healthBar: HealthBar,
    camera: THREE.PerspectiveCamera,
    controls: IControls,
    checkCollision: (position: THREE.Vector3) => boolean,
    onRespawn?: () => void,
    getRespawnPosition?: () => THREE.Vector3
  ) {
    this.damageOverlay = damageOverlay;
    this.healthBar = healthBar;
    this.camera = camera;
    this.controls = controls;
    this.checkCollision = checkCollision;
    this.onRespawn = onRespawn;
    this.getRespawnPosition = getRespawnPosition;
  }

  public getHp(): number {
    return this.hp;
  }

  public getMaxHp(): number {
    return this.maxHp;
  }

  public isInvulnerableNow(): boolean {
    return this.isInvulnerable;
  }

  public takeDamage(amount: number): void {
    if (this.isInvulnerable) return;

    this.hp -= amount;
    if (this.hp < 0) this.hp = 0;
    this.healthBar.update(this.hp);

    this.isInvulnerable = true;

    // Red Flash Effect
    this.damageOverlay.style.transition = 'none';
    this.damageOverlay.style.opacity = '0.3';

    // Camera Shake
    const originalPos = this.camera.position.clone();
    const shakeIntensity = 0.2;

    // Apply shake
    this.camera.position.x += (Math.random() - 0.5) * shakeIntensity;
    this.camera.position.y += (Math.random() - 0.5) * shakeIntensity;
    this.camera.position.z += (Math.random() - 0.5) * shakeIntensity;

    // Verify valid position
    if (this.checkCollision(this.camera.position)) {
      this.camera.position.copy(originalPos);
    }

    // Restore
    requestAnimationFrame(() => {
      this.damageOverlay.style.transition = 'opacity 0.5s ease-out';
      this.damageOverlay.style.opacity = '0';
    });

    if (this.hp <= 0) {
      this.respawn();
    }

    setTimeout(() => {
      this.isInvulnerable = false;
    }, 500);
  }

  public respawn(): void {
    this.hp = this.maxHp;
    this.healthBar.update(this.hp);
    this.isInvulnerable = false;

    // Teleport to spawn
    const respawnPos = this.getRespawnPosition
      ? this.getRespawnPosition()
      : new THREE.Vector3(8, 40, 8);
    this.controls.object.position.copy(respawnPos);
    
    if (this.onRespawn) {
      this.onRespawn();
    }

    console.log("Respawned!");
  }

  public setHp(hp: number): void {
    this.hp = Math.max(0, Math.min(hp, this.maxHp));
    this.healthBar.update(this.hp);
  }
}

