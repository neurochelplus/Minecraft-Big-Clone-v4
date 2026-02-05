import type { Object3D, Vector3 } from "three";
import type { IEnvironment } from "./environment";
import type { IPlayerInput } from "./player";

export interface IMobCollider {
  mesh: Object3D;
  width: number;
  height: number;
}

export interface IMobManager {
  update(
    delta: number,
    player: IPlayerInput | Vector3,
    environment: IEnvironment,
    onPlayerHit?: (damage: number) => void,
  ): void;
}
