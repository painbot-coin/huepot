"use client";

import * as THREE from "three";

export type QualityTier = "high" | "mid" | "low";

export type OrbVisualState = {
  color: string;
  pressed: boolean;
  spark: boolean;
  leading: boolean;
  winner: boolean;
  fog: boolean;
};
type OrbSlot = {
  canvas: HTMLCanvasElement;
  getState: () => OrbVisualState;
};

type WorldDriver = {
  canvas: HTMLCanvasElement;
  resize: (w: number, h: number) => void;
  frame: (t: number, dt: number) => void;
  dispose: () => void;
};

function detectQuality(): QualityTier {
  if (typeof window === "undefined") return "mid";
  const cores = navigator.hardwareConcurrency || 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4;
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  if (mobile || cores <= 4 || mem <= 4) return "low";
  if (cores >= 8 && mem >= 8) return "high";
  return "mid";
}

const ORB_SIZE = 256;
let renderer: THREE.WebGLRenderer | null = null;
let glCanvas: HTMLCanvasElement | null = null;
let quality: QualityTier = "mid";
let envMap: THREE.Texture | null = null;
let refs = 0;
let raf = 0;
let running = false;
let t0 = 0;
let lastT = 0;

let world: WorldDriver | null = null;
const orbs = new Map<string, OrbSlot>();
let orbScene: THREE.Scene | null = null;
let orbCamera: THREE.PerspectiveCamera | null = null;
let orbRoot: THREE.Group | null = null;
let orbMat: THREE.MeshPhysicalMaterial | null = null;
let orbCore: THREE.Mesh | null = null;
let orbShell: THREE.Mesh | null = null;
let orbRing: THREE.Mesh | null = null;
let orbBodyGeo: THREE.BufferGeometry | null = null;
let orbCoronaGeo: THREE.BufferGeometry | null = null;
let orbBodyBase: Float32Array | null = null;
let orbCoronaBase: Float32Array | null = null;
let orbMotes: THREE.Points | null = null;
let orbMoteBase: Float32Array | null = null;
let orbSparks: THREE.Points | null = null;
let orbSparkPos: Float32Array | null = null;
let orbSparkVel: THREE.Vector3[] = [];
let orbSparkLife: Float32Array | null = null;
let orbEnergy: THREE.Texture | null = null;
let orbKey: THREE.DirectionalLight | null = null;
let orbRim: THREE.PointLight | null = null;
let orbInner: THREE.PointLight | null = null;
let orbLastSpark = new Map<string, boolean>();
let orbLastPressed = new Map<string, boolean>();

function ensureRenderer() {
  if (renderer && glCanvas) return;
  glCanvas = document.createElement("canvas");
  renderer = new THREE.WebGLRenderer({
    canvas: glCanvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
    preserveDrawingBuffer: true,
  });
  quality = detectQuality();
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = quality !== "low";
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

function makeEnergyTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const glow = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
  glow.addColorStop(0, "#fff6fb");
  glow.addColorStop(0.28, "#ffb0c8");
  glow.addColorStop(0.7, "#7a1028");
  glow.addColorStop(1, "#140308");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 256, 256);
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 10; i += 1) {
    ctx.strokeStyle = `rgba(255, 230, 240, ${0.05 + (i % 3) * 0.03})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(128, 128, 22 + i * 10, 40 + i * 7, i * 0.4, 0, Math.PI * 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.4, 1.4);
  tex.needsUpdate = true;
  return tex;
}

function ensureOrbKit() {
  if (orbScene) return;
  ensureRenderer();
  const scene = new THREE.Scene();
  if (envMap) scene.environment = envMap;
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 20);
  camera.position.set(0, 0.04, 3.15);

  const segs = quality === "low" ? 32 : 48;
  const bodyGeo = new THREE.SphereGeometry(0.88, segs, segs);
  const hazeGeo = new THREE.SphereGeometry(1.08, Math.max(16, segs - 12), Math.max(16, segs - 12));
  orbBodyGeo = bodyGeo;
  orbCoronaGeo = hazeGeo;
  orbBodyBase = Float32Array.from(bodyGeo.attributes.position.array);
  orbCoronaBase = Float32Array.from(hazeGeo.attributes.position.array);

  const energy = makeEnergyTexture();
  orbEnergy = energy;

  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xff355e,
    map: energy,
    metalness: 0.08,
    roughness: 0.18,
    transmission: 0.72,
    thickness: 1.8,
    ior: 1.42,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    sheen: 0.7,
    sheenRoughness: 0.28,
    sheenColor: new THREE.Color(0xffe0ea),
    emissive: new THREE.Color(0xff355e).multiplyScalar(0.35),
    emissiveIntensity: 0.55,
    envMapIntensity: 1.35,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
  });
  const ball = new THREE.Mesh(bodyGeo, mat);
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.36, 24, 20),
    new THREE.MeshBasicMaterial({
      color: 0xff355e,
      transparent: true,
      opacity: 0.85,
    }),
  );
  const shell = new THREE.Mesh(
    hazeGeo,
    new THREE.MeshPhysicalMaterial({
      color: 0xffe0ea,
      transparent: true,
      opacity: 0.16,
      transmission: 0.94,
      roughness: 0.4,
      depthWrite: false,
    }),
  );
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.98, 0.018, 10, 64),
    new THREE.MeshBasicMaterial({
      color: 0xff355e,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  ring.rotation.x = 1.12;

  const moteCount = quality === "low" ? 28 : 46;
  const moteBase = new Float32Array(moteCount * 3);
  const moteDirs = fibonacciSphere(moteCount);
  for (let i = 0; i < moteCount; i += 1) {
    const d = moteDirs[i]!;
    const r = 1.02 + (i % 5) * 0.045;
    moteBase[i * 3] = d.x * r;
    moteBase[i * 3 + 1] = d.y * r;
    moteBase[i * 3 + 2] = d.z * r;
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute("position", new THREE.BufferAttribute(moteBase.slice(), 3));
  const motes = new THREE.Points(
    moteGeo,
    new THREE.PointsMaterial({
      color: 0xff355e,
      size: 0.055,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    }),
  );
  orbMotes = motes;
  orbMoteBase = moteBase;

  const sparkCount = 40;
  const sparkPos = new Float32Array(sparkCount * 3);
  const sparkLife = new Float32Array(sparkCount);
  const sparkVel: THREE.Vector3[] = [];
  for (let i = 0; i < sparkCount; i += 1) {
    sparkVel.push(new THREE.Vector3());
    sparkLife[i] = 0;
    sparkPos[i * 3 + 1] = -10;
  }
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
  const sparks = new THREE.Points(
    sparkGeo,
    new THREE.PointsMaterial({
      color: 0xff355e,
      size: 0.09,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    }),
  );

  const root = new THREE.Group();
  root.add(ball, core, shell, ring, motes, sparks);
  scene.add(root);
  scene.add(new THREE.AmbientLight(0xffffff, 0.32));
  const key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(2.2, 2.8, 2.3);
  scene.add(key);
  const rim = new THREE.PointLight(0xff355e, 16, 8, 2);
  rim.position.set(-1.15, 0.75, 1.45);
  scene.add(rim);
  const inner = new THREE.PointLight(0xff355e, 10, 3.2, 2);
  scene.add(inner);

  orbScene = scene;
  orbCamera = camera;
  orbRoot = root;
  orbMat = mat;
  orbCore = core;
  orbShell = shell;
  orbRing = ring;
  orbSparks = sparks;
  orbSparkPos = sparkPos;
  orbSparkVel = sparkVel;
  orbSparkLife = sparkLife;
  orbKey = key;
  orbRim = rim;
  orbInner = inner;
}

function fibonacciSphere(count: number) {
  const pts: THREE.Vector3[] = [];
  const offset = 2 / count;
  const step = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i += 1) {
    const y = i * offset - 1 + offset / 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const phi = i * step;
    pts.push(new THREE.Vector3(Math.cos(phi) * r, y, Math.sin(phi) * r).normalize());
  }
  return pts;
}

function breatheMesh(
  geo: THREE.BufferGeometry,
  base: Float32Array,
  t: number,
  amount: number,
  speed: number,
  seed: number,
) {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const arr = pos.array as Float32Array;
  for (let i = 0; i < arr.length; i += 3) {
    const ox = base[i]!;
    const oy = base[i + 1]!;
    const oz = base[i + 2]!;
    const wave =
      1 +
      amount *
        Math.sin(t * speed + ox * 4.2 + oy * 3.1 + oz * 2.6 + seed + i * 0.045);
    arr[i] = ox * wave;
    arr[i + 1] = oy * wave;
    arr[i + 2] = oz * wave;
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

function burstOrbSparks() {
  if (!orbSparkPos || !orbSparkLife) return;
  for (let i = 0; i < orbSparkLife.length; i += 1) {
    const dir = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5,
    ).normalize();
    orbSparkPos[i * 3] = dir.x * 0.2;
    orbSparkPos[i * 3 + 1] = dir.y * 0.2;
    orbSparkPos[i * 3 + 2] = dir.z * 0.2;
    orbSparkVel[i]!.copy(dir).multiplyScalar(0.05 + Math.random() * 0.12);
    orbSparkLife[i] = 1;
  }
  orbSparks!.geometry.attributes.position!.needsUpdate = true;
}

function targetSize(el: HTMLCanvasElement, fallbackW: number, fallbackH: number) {
  const parent = el.parentElement;
  const pw = parent?.clientWidth || fallbackW;
  const ph = parent?.clientHeight || fallbackH;
  const rawW = el.clientWidth || pw;
  const rawH = el.clientHeight || ph;
  const w = Math.max(1, Math.round(Math.min(rawW, pw * 1.25)));
  const h = Math.max(1, Math.round(Math.min(rawH, ph * 1.25)));
  return { w, h };
}

function blit(target: HTMLCanvasElement, cssW: number, cssH: number) {
  if (!glCanvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, quality === "low" ? 1.25 : 1.75);
  const tw = Math.max(1, Math.floor(cssW * dpr));
  const th = Math.max(1, Math.floor(cssH * dpr));
  if (target.width !== tw || target.height !== th) {
    target.width = tw;
    target.height = th;
  }
  const ctx = target.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, tw, th);
  ctx.drawImage(glCanvas, 0, 0, tw, th);
}

function fadeOrbEdge(target: HTMLCanvasElement) {
  const ctx = target.getContext("2d");
  if (!ctx) return;
  const tw = target.width;
  const th = target.height;
  const g = ctx.createRadialGradient(tw / 2, th / 2, tw * 0.36, tw / 2, th / 2, tw * 0.5);
  g.addColorStop(0, "rgba(0,0,0,1)");
  g.addColorStop(0.78, "rgba(0,0,0,1)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, tw, th);
  ctx.globalCompositeOperation = "source-over";
}

function renderOrb(id: string, slot: OrbSlot, t: number) {
  ensureOrbKit();
  if (!renderer || !orbScene || !orbCamera || !orbMat || !orbRoot) return;
  const st = slot.getState();
  const c = new THREE.Color(st.color);
  orbMat.color.copy(c);
  orbMat.emissive.copy(c).multiplyScalar(0.38);
  orbMat.sheenColor.copy(c).lerp(new THREE.Color("#ffffff"), 0.45);
  (orbCore!.material as THREE.MeshBasicMaterial).color.copy(c);
  (orbShell!.material as THREE.MeshPhysicalMaterial).color.copy(c).lerp(new THREE.Color("#ffffff"), 0.5);
  (orbRing!.material as THREE.MeshBasicMaterial).color.copy(c);
  (orbSparks!.material as THREE.PointsMaterial).color.copy(c);
  if (orbMotes) (orbMotes.material as THREE.PointsMaterial).color.copy(c).lerp(new THREE.Color("#ffffff"), 0.25);
  orbRim!.color.copy(c);
  orbInner!.color.copy(c);

  const wasSpark = orbLastSpark.get(id) || false;
  const wasPressed = orbLastPressed.get(id) || false;
  if ((st.spark && !wasSpark) || (st.pressed && !wasPressed)) burstOrbSparks();
  orbLastSpark.set(id, st.spark);
  orbLastPressed.set(id, st.pressed);

  const pulse =
    0.4 +
    (st.pressed ? 0.9 : 0) +
    (st.spark ? 1.1 : 0) +
    (st.winner ? 0.7 : 0) +
    (st.leading ? 0.35 + Math.sin(t * 7) * 0.15 : 0);

  orbMat.emissiveIntensity = 0.45 + pulse * 0.55;
  orbMat.transmission = st.fog ? 0.4 : 0.72;
  orbMat.opacity = st.fog ? 0.42 : 0.78;
  if (orbEnergy) {
    orbEnergy.offset.x = t * 0.04;
    orbEnergy.offset.y = t * 0.018;
  }

  orbRoot.position.set(0, 0, 0);
  orbRoot.rotation.set(0.12, t * 0.16, 0.03);
  const press = st.pressed ? 0.82 : 1;
  const breathScale = 1 + Math.sin(t * 1.7) * 0.035;
  orbRoot.scale.setScalar(press * breathScale);
  const breath = 0.012 + pulse * 0.01 + (st.winner ? 0.012 : 0);
  if (orbBodyGeo && orbBodyBase) {
    breatheMesh(orbBodyGeo, orbBodyBase, t, breath, 1.7, 0.4);
  }
  if (orbCoronaGeo && orbCoronaBase) {
    breatheMesh(orbCoronaGeo, orbCoronaBase, t, breath * 0.7, 1.25, 1.6);
  }
  orbCore!.scale.setScalar(0.92 + Math.sin(t * 2.2) * 0.08 + pulse * 0.06);
  orbRing!.rotation.z = t * 0.35;
  orbRing!.rotation.y = Math.sin(t * 0.6) * 0.2;
  if (orbMotes && orbMoteBase) {
    const pos = orbMotes.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const ca = Math.cos(t * 0.55);
    const sa = Math.sin(t * 0.55);
    for (let i = 0; i < orbMoteBase.length; i += 3) {
      const x = orbMoteBase[i]!;
      const y = orbMoteBase[i + 1]!;
      const z = orbMoteBase[i + 2]!;
      const wobble = 1 + 0.04 * Math.sin(t * 2.4 + i * 0.2);
      arr[i] = (x * ca - z * sa) * wobble;
      arr[i + 1] = y * wobble;
      arr[i + 2] = (x * sa + z * ca) * wobble;
    }
    pos.needsUpdate = true;
    (orbMotes.material as THREE.PointsMaterial).opacity = 0.45 + pulse * 0.35;
  }
  (orbShell!.material as THREE.MeshPhysicalMaterial).opacity = 0.12 + pulse * 0.08;
  (orbRing!.material as THREE.MeshBasicMaterial).opacity = 0.16 + pulse * 0.18;
  (orbCore!.material as THREE.MeshBasicMaterial).opacity = 0.7 + pulse * 0.2;
  orbRim!.intensity = 8 + pulse * 14;
  orbInner!.intensity = 6 + pulse * 10;

  if (orbSparkPos && orbSparkLife) {
    const pos = orbSparks!.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < orbSparkLife.length; i += 1) {
      if (orbSparkLife[i]! <= 0.02) {
        pos.array[i * 3 + 1] = -10;
        continue;
      }
      orbSparkLife[i]! *= 0.93;
      const v = orbSparkVel[i]!;
      pos.array[i * 3]! += v.x;
      pos.array[i * 3 + 1]! += v.y;
      pos.array[i * 3 + 2]! += v.z;
      v.y -= 0.0025;
    }
    pos.needsUpdate = true;
    (orbSparks!.material as THREE.PointsMaterial).opacity = 0.2 + pulse * 0.65;
  }

  renderer.setSize(ORB_SIZE, ORB_SIZE, false);
  renderer.setClearColor(0x000000, 0);
  renderer.render(orbScene, orbCamera);
  const { w, h } = targetSize(slot.canvas, 168, 168);
  const side = Math.max(w, h);
  blit(slot.canvas, side, side);
  fadeOrbEdge(slot.canvas);
}

function tick(now: number) {
  if (!running) return;
  raf = requestAnimationFrame(tick);
  if (!renderer) return;
  const t = (now - t0) / 1000;
  const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016);
  lastT = now;

  if (world) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    world.canvas.style.width = "100%";
    world.canvas.style.height = "100%";
    world.resize(w, h);
    world.frame(t, dt);
    blit(world.canvas, w, h);
  }

  for (const [id, slot] of orbs) {
    renderOrb(id, slot, t);
  }
}

function startLoop() {
  if (running) return;
  if (typeof window === "undefined") return;
  running = true;
  t0 = performance.now();
  lastT = t0;
  raf = requestAnimationFrame(tick);
}

function stopLoopIfIdle() {
  if (world || orbs.size > 0) return;
  running = false;
  cancelAnimationFrame(raf);
}

function retain() {
  ensureRenderer();
  refs += 1;
}

function release() {
  refs = Math.max(0, refs - 1);
  if (refs > 0) return;
  running = false;
  cancelAnimationFrame(raf);
  world?.dispose();
  world = null;
  orbs.clear();
  if (renderer) {
    renderer.dispose();
    renderer = null;
  }
  glCanvas = null;
  envMap = null;
  orbScene = null;
  orbMat = null;
  orbEnergy = null;
}

export const pitEngine = {
  quality(): QualityTier {
    ensureRenderer();
    return quality;
  },
  renderer(): THREE.WebGLRenderer {
    ensureRenderer();
    return renderer!;
  },
  setEnvMap(map: THREE.Texture | null) {
    envMap = map;
    if (orbScene) orbScene.environment = map;
  },
  setRenderSize(w: number, h: number, dpr = 1) {
    ensureRenderer();
    renderer!.setPixelRatio(dpr);
    renderer!.setSize(w, h, false);
  },
  bindWorld(driver: WorldDriver) {
    retain();
    if (world) world.dispose();
    world = driver;
    startLoop();
    return () => {
      if (world === driver) {
        world.dispose();
        world = null;
      }
      release();
      stopLoopIfIdle();
    };
  },
  bindOrb(id: string, slot: OrbSlot) {
    retain();
    ensureOrbKit();
    orbs.set(id, slot);
    startLoop();
    return () => {
      orbs.delete(id);
      orbLastSpark.delete(id);
      orbLastPressed.delete(id);
      release();
      stopLoopIfIdle();
    };
  },
};
