import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { ItemPhysics } from "./ItemPhysics";
import type { IWorld } from "../contracts/world";

function createWorld(): IWorld {
  return {
    getBlock: (_x: number, y: number) => (y <= 0 ? 1 : 0),
  } as unknown as IWorld;
}

function createMesh(): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.3, 0.3),
    new THREE.MeshBasicMaterial(),
  );
}

describe("ItemPhysics", () => {
  it("applies horizontal impulse from initial velocity", () => {
    const mesh = createMesh();
    mesh.position.set(0, 2, 0);

    const physics = new ItemPhysics(
      createWorld(),
      mesh,
      new THREE.Vector3(2, 0, 1),
    );

    for (let i = 0; i < 30; i++) {
      physics.update(i * 0.05, 0.05);
    }

    expect(mesh.position.x).toBeGreaterThan(0.2);
    expect(mesh.position.z).toBeGreaterThan(0.1);
    expect(physics.getIsOnGround()).toBe(true);
  });

  it("damps horizontal velocity after landing", () => {
    const mesh = createMesh();
    mesh.position.set(0, 2, 0);

    const physics = new ItemPhysics(
      createWorld(),
      mesh,
      new THREE.Vector3(3, 0, 0),
    );

    for (let i = 0; i < 80; i++) {
      physics.update(i * 0.05, 0.05);
    }

    expect(physics.getIsOnGround()).toBe(true);
    expect(Math.abs(physics.getVelocity().x)).toBeLessThan(0.1);
  });

  it("keeps legacy behavior with zero initial horizontal velocity", () => {
    const mesh = createMesh();
    mesh.position.set(0, 2, 0);

    const physics = new ItemPhysics(createWorld(), mesh);

    for (let i = 0; i < 30; i++) {
      physics.update(i * 0.05, 0.05);
    }

    expect(Math.abs(mesh.position.x)).toBeLessThan(0.001);
    expect(Math.abs(mesh.position.z)).toBeLessThan(0.001);
  });
});
