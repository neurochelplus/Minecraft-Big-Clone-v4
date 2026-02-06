import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { ItemEntity } from "./ItemEntity";
import type { IWorld } from "../contracts/world";

function createTexture(): THREE.DataTexture {
  const texture = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  texture.needsUpdate = true;
  return texture;
}

describe("ItemEntity", () => {
  it("respects pickup delay gate", () => {
    const world = {
      getBlock: () => 0,
    } as unknown as IWorld;

    const nowSpy = vi.spyOn(performance, "now");
    nowSpy.mockReturnValue(1000);

    const entity = new ItemEntity(
      world,
      new THREE.Scene(),
      0,
      0,
      0,
      1,
      createTexture(),
      null,
      1,
      { pickupDelayMs: 1500 },
    );

    expect(entity.canBePickedUp()).toBe(false);

    nowSpy.mockReturnValue(2600);
    expect(entity.canBePickedUp()).toBe(true);

    entity.dispose();
    nowSpy.mockRestore();
  });
});
