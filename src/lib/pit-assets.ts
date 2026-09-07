"use client";

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

const HUES = [
  0xff355e, 0xff6a2a, 0xffb020, 0xd4ff2e, 0x3dffb0, 0x7af0ff, 0x2ea8ff, 0x8b5cff,
];

/** Authored-looking procedural pit used when GLB is missing, and as fallback. */
export function buildProceduralPit(textures: {
  felt: THREE.Texture;
  gold: THREE.Texture;
  panel: THREE.Texture;
}): { root: THREE.Group; reflective: THREE.Object3D[]; selects: THREE.Mesh[] } {
  const root = new THREE.Group();
  const selects: THREE.Mesh[] = [];
  const reflective: THREE.Object3D[] = [];

  const feltMat = new THREE.MeshPhysicalMaterial({
    map: textures.felt,
    color: 0x1a1230,
    roughness: 0.55,
    metalness: 0.12,
    clearcoat: 0.35,
    clearcoatRoughness: 0.45,
    emissive: 0x14082a,
    emissiveIntensity: 0.16,
    envMapIntensity: 1.1,
  });
  const felt = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.35, 0.18, 128), feltMat);
  felt.receiveShadow = true;
  felt.castShadow = true;
  felt.name = "felt";
  root.add(felt);
  selects.push(felt);
  reflective.push(felt);

  const well = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.7, 0.22, 64),
    new THREE.MeshPhysicalMaterial({
      color: 0x0a0618,
      roughness: 0.2,
      metalness: 0.7,
      transmission: 0.15,
      thickness: 0.4,
      emissive: 0x2a1450,
      emissiveIntensity: 0.4,
    }),
  );
  well.position.y = 0.02;
  well.receiveShadow = true;
  root.add(well);

  const goldMat = new THREE.MeshPhysicalMaterial({
    map: textures.gold,
    color: 0xffd27a,
    metalness: 1,
    roughness: 0.18,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    emissive: 0x664410,
    emissiveIntensity: 0.28,
    envMapIntensity: 2.2,
  });

  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.42, 0.12, 32, 160), goldMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.14;
  rim.castShadow = true;
  rim.receiveShadow = true;
  root.add(rim);
  selects.push(rim);
  reflective.push(rim);

  const innerRail = new THREE.Mesh(
    new THREE.TorusGeometry(1.95, 0.045, 16, 120),
    goldMat.clone(),
  );
  innerRail.rotation.x = Math.PI / 2;
  innerRail.position.y = 0.12;
  innerRail.castShadow = true;
  root.add(innerRail);
  selects.push(innerRail);

  // Carved pedestal under the table
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.45, 0.55, 48),
    new THREE.MeshStandardMaterial({
      map: textures.panel,
      color: 0x2a1a10,
      roughness: 0.55,
      metalness: 0.35,
    }),
  );
  pedestal.position.y = -0.42;
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  root.add(pedestal);
  selects.push(pedestal);

  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(1.15, 0.07, 16, 80),
    goldMat.clone(),
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.y = -0.12;
  root.add(collar);

  for (const [x, z] of [
    [1.55, 1.55],
    [1.55, -1.55],
    [-1.55, 1.55],
    [-1.55, -1.55],
  ] as [number, number][]) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.11, 1.35, 16),
      new THREE.MeshStandardMaterial({
        color: 0x3a2412,
        metalness: 0.65,
        roughness: 0.35,
        map: textures.gold,
      }),
    );
    leg.position.set(x, -0.78, z);
    leg.castShadow = true;
    root.add(leg);
    selects.push(leg);

    const foot = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 12),
      goldMat.clone(),
    );
    foot.position.set(x, -1.42, z);
    foot.scale.y = 0.55;
    foot.castShadow = true;
    root.add(foot);
  }

  // Inset rune tiles around felt
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const tile = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.04, 0.28),
      new THREE.MeshStandardMaterial({
        color: HUES[i]!,
        emissive: HUES[i]!,
        emissiveIntensity: 0.55,
        metalness: 0.4,
        roughness: 0.35,
      }),
    );
    tile.position.set(Math.cos(a) * 1.7, 0.1, Math.sin(a) * 1.7);
    tile.rotation.y = -a;
    tile.castShadow = true;
    root.add(tile);
  }

  const glow = new THREE.Mesh(
    new THREE.RingGeometry(0.4, 2.15, 96),
    new THREE.MeshBasicMaterial({
      color: 0x8b5cff,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.1;
  root.add(glow);

  root.position.y = -0.85;
  return { root, reflective, selects };
}

export async function loadPitGltf(
  renderer: THREE.WebGLRenderer,
): Promise<{ root: THREE.Group; selects: THREE.Mesh[] } | null> {
  try {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync("/fx/huepot-pit.glb");
    const root = gltf.scene;
    root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        const m = obj.material;
        if (m && "envMapIntensity" in m) {
          (m as THREE.MeshStandardMaterial).envMapIntensity = 1.4;
        }
      }
    });
    root.position.y = -0.85;
    const selects: THREE.Mesh[] = [];
    root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) selects.push(obj);
    });
    void renderer;
    return { root, selects };
  } catch {
    return null;
  }
}

export async function loadHdri(
  renderer: THREE.WebGLRenderer,
): Promise<THREE.Texture | null> {
  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const hdr = await new RGBELoader().loadAsync("/fx/huepot-hdri.hdr");
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    const env = pmrem.fromEquirectangular(hdr).texture;
    hdr.dispose();
    pmrem.dispose();
    return env;
  } catch {
    return null;
  }
}

export function loadFallbackEnv(
  renderer: THREE.WebGLRenderer,
  realmMap: THREE.Texture,
): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.background = realmMap;
  const env = pmrem.fromScene(envScene, 0.04).texture;
  pmrem.dispose();
  return env;
}
