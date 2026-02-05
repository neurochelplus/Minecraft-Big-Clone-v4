import type { Object3D, Vector3 } from "three";

export interface IControls {
  object: Object3D;
  lock(): void;
  unlock(): void;
  getDirection(dir: Vector3): void;
  addEventListener(event: "lock" | "unlock", handler: () => void): void;
  isLocked?: boolean;
}
