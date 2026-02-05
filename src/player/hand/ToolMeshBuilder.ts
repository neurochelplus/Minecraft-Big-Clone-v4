import * as THREE from "three";
import { hexToRgb } from "../../constants/BlockTextures";
import type { ToolDef } from "./ToolDefs";

export function createToolMesh(def: ToolDef): THREE.Mesh {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];

  const pattern = def.pattern;
  const size = 16;
  const scale = 0.04;
  const pixelSize = scale;
  const depth = pixelSize;

  const pushVertex = (
    x: number,
    y: number,
    z: number,
    nx: number,
    ny: number,
    nz: number,
    r: number,
    g: number,
    b: number,
  ) => {
    positions.push(x, y, z);
    normals.push(nx, ny, nz);
    colors.push(r, g, b);
    uvs.push(0, 0);
  };

  const addFace = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    nx: number,
    ny: number,
    nz: number,
    r: number,
    g: number,
    b: number,
  ) => {
    const x0 = x;
    const x1 = x + w;
    const y0 = y;
    const y1 = y + h;
    const z0 = z;
    const z1 = z + d;

    let p0, p1, p2, p3;

    if (nx === 1) {
      p0 = [x1, y0, z1];
      p1 = [x1, y0, z0];
      p2 = [x1, y1, z1];
      p3 = [x1, y1, z0];
    } else if (nx === -1) {
      p0 = [x0, y0, z0];
      p1 = [x0, y0, z1];
      p2 = [x0, y1, z0];
      p3 = [x0, y1, z1];
    } else if (ny === 1) {
      p0 = [x0, y1, z1];
      p1 = [x1, y1, z1];
      p2 = [x0, y1, z0];
      p3 = [x1, y1, z0];
    } else if (ny === -1) {
      p0 = [x0, y0, z0];
      p1 = [x1, y0, z0];
      p2 = [x0, y0, z1];
      p3 = [x1, y0, z1];
    } else if (nz === 1) {
      p0 = [x0, y0, z1];
      p1 = [x1, y0, z1];
      p2 = [x0, y1, z1];
      p3 = [x1, y1, z1];
    } else {
      p0 = [x1, y0, z0];
      p1 = [x0, y0, z0];
      p2 = [x1, y1, z0];
      p3 = [x0, y1, z0];
    }

    pushVertex(p0[0], p0[1], p0[2], nx, ny, nz, r, g, b);
    pushVertex(p1[0], p1[1], p1[2], nx, ny, nz, r, g, b);
    pushVertex(p2[0], p2[1], p2[2], nx, ny, nz, r, g, b);

    pushVertex(p2[0], p2[1], p2[2], nx, ny, nz, r, g, b);
    pushVertex(p1[0], p1[1], p1[2], nx, ny, nz, r, g, b);
    pushVertex(p3[0], p3[1], p3[2], nx, ny, nz, r, g, b);
  };

  const rgbHandle = { r: 92 / 255, g: 64 / 255, b: 51 / 255 };

  const matColorHex = def.color || "#7d7d7d";
  const rgbMatRes = hexToRgb(matColorHex);
  const rgbMat = {
    r: rgbMatRes.r / 255,
    g: rgbMatRes.g / 255,
    b: rgbMatRes.b / 255,
  };

  const offsetX = -(size * pixelSize) / 2;
  const offsetY = -(size * pixelSize) / 2;

  for (let y = 0; y < size; y++) {
    const row = pattern[y];
    for (let x = 0; x < size; x++) {
      const char = row[x];
      if (char === "0") continue;

      const px = offsetX + x * pixelSize;
      const py = offsetY + (size - 1 - y) * pixelSize;
      const pz = -depth / 2;

      let r = 1,
        g = 1,
        b = 1;
      if (char === "1") {
        r = rgbHandle.r;
        g = rgbHandle.g;
        b = rgbHandle.b;
      } else if (char === "2") {
        r = rgbMat.r;
        g = rgbMat.g;
        b = rgbMat.b;
      }

      if (x + 1 >= size || pattern[y][x + 1] === "0") {
        addFace(px, py, pz, pixelSize, pixelSize, depth, 1, 0, 0, r, g, b);
      }
      if (x - 1 < 0 || pattern[y][x - 1] === "0") {
        addFace(px, py, pz, pixelSize, pixelSize, depth, -1, 0, 0, r, g, b);
      }
      if (y - 1 < 0 || pattern[y - 1][x] === "0") {
        addFace(px, py, pz, pixelSize, pixelSize, depth, 0, 1, 0, r, g, b);
      }
      if (y + 1 >= size || pattern[y + 1][x] === "0") {
        addFace(px, py, pz, pixelSize, pixelSize, depth, 0, -1, 0, r, g, b);
      }

      addFace(px, py, pz, pixelSize, pixelSize, depth, 0, 0, 1, r, g, b);
      addFace(px, py, pz, pixelSize, pixelSize, depth, 0, 0, -1, r, g, b);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.5,
    metalness: 0.1,
    flatShading: true,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.y = Math.PI / 2;

  const edges = new THREE.EdgesGeometry(geo);
  const line = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1 }),
  );
  mesh.add(line);

  return mesh;
}
