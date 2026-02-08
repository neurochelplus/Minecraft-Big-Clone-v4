import type * as THREE from "three";

export type HandAnimationState = {
  bobTime: number;
  swingTime: number;
  isSwinging: boolean;
  isMining: boolean;
  isEating: boolean;
  currentId: number;
};

type HandAnimationUpdateParams = {
  state: HandAnimationState;
  delta: number;
  isMoving: boolean;
  handGroup: THREE.Group;
  needleMesh: THREE.Mesh | null;
  basePos: THREE.Vector3;
  swingDuration: number;
  isSword: (id: number) => boolean;
};

export function startPunch(state: HandAnimationState): void {
  state.isMining = true;
  if (!state.isSwinging) {
    state.isSwinging = true;
    state.swingTime = 0;
  }
}

export function stopPunch(state: HandAnimationState): void {
  state.isMining = false;
}

export function setEating(state: HandAnimationState, eating: boolean): void {
  state.isEating = eating;
}

export function updateHandAnimation(params: HandAnimationUpdateParams): void {
  const { state, delta, isMoving, handGroup, needleMesh, basePos, swingDuration, isSword } =
    params;

  if (needleMesh) {
    needleMesh.rotation.z += delta * 20 + Math.random() * 5;
  }

  if (isMoving) {
    state.bobTime += delta * 10;
    handGroup.position.x = basePos.x + Math.sin(state.bobTime) * 0.05;
    handGroup.position.y = basePos.y + Math.abs(Math.cos(state.bobTime)) * 0.05;
  } else if (state.isEating) {
    state.bobTime += delta * 15;
    handGroup.position.x = basePos.x + Math.sin(state.bobTime) * 0.02;
    handGroup.position.y = basePos.y + Math.abs(Math.cos(state.bobTime)) * 0.05 + 0.1;
    handGroup.position.z = basePos.z + 0.2;

    handGroup.rotation.x = -0.2 + Math.sin(state.bobTime * 2) * 0.1;
    handGroup.rotation.y = -0.2;
    handGroup.rotation.z = 0.2;
  } else {
    handGroup.position.x += (basePos.x - handGroup.position.x) * 10 * delta;
    handGroup.position.y += (basePos.y - handGroup.position.y) * 10 * delta;

    if (!state.isSwinging) {
      handGroup.rotation.x += (0 - handGroup.rotation.x) * 10 * delta;
      handGroup.rotation.y += (0 - handGroup.rotation.y) * 10 * delta;
      handGroup.rotation.z += (0 - handGroup.rotation.z) * 10 * delta;
      handGroup.position.z += (basePos.z - handGroup.position.z) * 10 * delta;
    }
  }

  if (state.isSwinging && !state.isEating) {
    state.swingTime += delta;
    const progress = Math.min(state.swingTime / swingDuration, 1.0);

    const swing = Math.sin(progress * Math.PI);

    handGroup.rotation.x = -swing * 0.5;
    handGroup.rotation.z = swing * 0.5;
    handGroup.position.z = basePos.z - swing * 0.5;

    if (progress >= 1.0) {
      if (state.isMining && !isSword(state.currentId)) {
        state.swingTime = 0;
      } else {
        state.isSwinging = false;
      }
    }
  }
}
