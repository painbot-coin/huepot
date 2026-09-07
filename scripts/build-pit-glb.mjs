/**
 * Builds a compact authored pit GLB for Huepot (geometry + PBR materials).
 * Run: node scripts/build-pit-glb.mjs
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { Blob } from "node:buffer";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

// GLTFExporter (binary) expects browser FileReader
class FileReaderPolyfill {
  result = null;
  onloadend = null;
  onerror = null;
  readAsArrayBuffer(blob) {
    Promise.resolve(blob.arrayBuffer())
      .then((buf) => {
        this.result = buf;
        this.onloadend?.({ target: this });
      })
      .catch((err) => this.onerror?.(err));
  }
}
globalThis.FileReader = FileReaderPolyfill;
globalThis.Blob = Blob;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, "..", "public", "fx", "huepot-pit.glb");

const root = new THREE.Group();
root.name = "HuepotPit";

const felt = new THREE.Mesh(
  new THREE.CylinderGeometry(2.35, 2.35, 0.18, 128),
  new THREE.MeshStandardMaterial({
    color: 0x1a1230,
    roughness: 0.55,
    metalness: 0.12,
    name: "felt",
  }),
);
felt.name = "felt";
root.add(felt);

const rim = new THREE.Mesh(
  new THREE.TorusGeometry(2.42, 0.12, 32, 160),
  new THREE.MeshStandardMaterial({
    color: 0xffd27a,
    metalness: 1,
    roughness: 0.18,
    name: "goldRim",
  }),
);
rim.rotation.x = Math.PI / 2;
rim.position.y = 0.14;
rim.name = "goldRim";
root.add(rim);

const inner = new THREE.Mesh(
  new THREE.TorusGeometry(1.95, 0.045, 16, 120),
  new THREE.MeshStandardMaterial({
    color: 0xffd27a,
    metalness: 1,
    roughness: 0.2,
  }),
);
inner.rotation.x = Math.PI / 2;
inner.position.y = 0.12;
root.add(inner);

const well = new THREE.Mesh(
  new THREE.CylinderGeometry(0.55, 0.7, 0.22, 64),
  new THREE.MeshStandardMaterial({
    color: 0x0a0618,
    roughness: 0.25,
    metalness: 0.7,
    emissive: 0x2a1450,
    emissiveIntensity: 0.35,
  }),
);
well.position.y = 0.02;
root.add(well);

const pedestal = new THREE.Mesh(
  new THREE.CylinderGeometry(1.1, 1.45, 0.55, 48),
  new THREE.MeshStandardMaterial({
    color: 0x2a1a10,
    roughness: 0.55,
    metalness: 0.35,
  }),
);
pedestal.position.y = -0.42;
root.add(pedestal);

for (const [x, z] of [
  [1.55, 1.55],
  [1.55, -1.55],
  [-1.55, 1.55],
  [-1.55, -1.55],
]) {
  const leg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.11, 1.35, 16),
    new THREE.MeshStandardMaterial({
      color: 0x3a2412,
      metalness: 0.65,
      roughness: 0.35,
    }),
  );
  leg.position.set(x, -0.78, z);
  root.add(leg);
  const foot = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 16, 12),
    new THREE.MeshStandardMaterial({
      color: 0xffd27a,
      metalness: 1,
      roughness: 0.2,
    }),
  );
  foot.position.set(x, -1.42, z);
  foot.scale.y = 0.55;
  root.add(foot);
}

const hues = [0xff355e, 0xff6a2a, 0xffb020, 0xd4ff2e, 0x3dffb0, 0x7af0ff, 0x2ea8ff, 0x8b5cff];
for (let i = 0; i < 8; i += 1) {
  const a = (i / 8) * Math.PI * 2;
  const tile = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.04, 0.28),
    new THREE.MeshStandardMaterial({
      color: hues[i],
      emissive: hues[i],
      emissiveIntensity: 0.55,
      metalness: 0.4,
      roughness: 0.35,
    }),
  );
  tile.position.set(Math.cos(a) * 1.7, 0.1, Math.sin(a) * 1.7);
  tile.rotation.y = -a;
  root.add(tile);
}

const exporter = new GLTFExporter();
const data = await exporter.parseAsync(root, {
  binary: true,
  onlyVisible: true,
});

const buf = Buffer.from(data);
fs.writeFileSync(out, buf);
console.log(`Wrote ${out} (${buf.length} bytes)`);
