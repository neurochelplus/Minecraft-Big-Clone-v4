import * as THREE from "three";
import { PerspectiveCamera } from "three";
import { Scene } from "three";
import type { IWorld } from "../contracts/world";
import type { IControls } from "../contracts/controls";

type SelectableObject = THREE.Object3D & {
  isMesh?: boolean;
  isItem?: boolean;
  parent?: THREE.Object3D & { isMob?: boolean };
};

export class BlockCursor {
  private mesh: THREE.Mesh;
  private raycaster: THREE.Raycaster;
  private camera: PerspectiveCamera;
  private scene: Scene;
  private controls: IControls;
  private lastUpdateAt = 0;
  private readonly UPDATE_INTERVAL_MS = 33;
  private readonly MAX_DISTANCE = 6;

  constructor(
    scene: Scene,
    camera: PerspectiveCamera,
    controls: IControls
  ) {
    this.camera = camera;
    this.scene = scene;
    this.controls = controls;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = this.MAX_DISTANCE;

    // Create cursor mesh
    const cursorGeometry = new THREE.BoxGeometry(1.01, 1.01, 1.01);
    const cursorMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true });
    this.mesh = new THREE.Mesh(cursorGeometry, cursorMaterial);
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  public getMesh(): THREE.Mesh {
    return this.mesh;
  }

  public update(world: IWorld): void {
    const now = performance.now();
    if (now - this.lastUpdateAt < this.UPDATE_INTERVAL_MS) {
      return;
    }
    this.lastUpdateAt = now;

    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, false);
    
    const hit = intersects.find((i) => {
      const obj = i.object as SelectableObject;
      return (
        i.object !== this.mesh &&
        i.object !== this.controls.object &&
        obj.isMesh &&
        !obj.isItem &&
        !obj.parent?.isMob
      );
    });

    if (hit && hit.distance < this.MAX_DISTANCE) {
      const p = hit.point.clone().add(this.raycaster.ray.direction.clone().multiplyScalar(0.01));
      const x = Math.floor(p.x);
      const y = Math.floor(p.y);
      const z = Math.floor(p.z);

      const id = world.getBlock(x, y, z);

      if (id !== 0) {
        this.mesh.visible = true;
        this.mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
      } else {
        this.mesh.visible = false;
      }
    } else {
      this.mesh.visible = false;
    }
  }
}

