import * as THREE from "three";
import type { IWorld } from "../contracts/world";
import { PLAYER_EYE_HEIGHT } from "../constants/GameConstants";

export function getSurfaceSpawnPosition(
  world: IWorld,
  x: number,
  z: number,
): THREE.Vector3 {
  const baseX = Math.floor(x);
  const baseZ = Math.floor(z);
  const topY = world.getTopY(baseX, baseZ);
  const y = topY + 1 + PLAYER_EYE_HEIGHT;

  return new THREE.Vector3(x, y, z);
}
