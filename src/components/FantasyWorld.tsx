"use client";

import { useEffect, useRef } from "react";
import type { FxDetail } from "@/lib/fx";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const HUES = [
  0xff355e, 0xff6a2a, 0xffb020, 0xd4ff2e, 0x3dffb0, 0x7af0ff, 0x2ea8ff, 0x8b5cff,
];

export function FantasyWorld({
  mode,
  foggy,
}: {
  mode: "idle" | "urgent" | "take";
  foggy: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(mode);
  const fogRef = useRef(foggy);
  modeRef.current = mode;
  fogRef.current = foggy;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070614, 0.045);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
    camera.position.set(0, 2.35, 6.2);

    const loader = new THREE.TextureLoader();
    const orbitMap = loader.load("/fx/huepot-orbit.jpg");
    const panelMap = loader.load("/fx/huepot-panel.jpg");
    const realmMap = loader.load("/fx/huepot-realm.jpg");
    for (const map of [orbitMap, panelMap, realmMap]) {
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = 8;
    }

    // Soft environment from realm image
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.background = realmMap;
    const envMap = pmrem.fromScene(envScene, 0.04).texture;
    scene.environment = envMap;
    pmrem.dispose();

    // Distant backdrop dome
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(28, 48, 32),
      new THREE.MeshBasicMaterial({
        map: orbitMap,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.72,
      }),
    );
    scene.add(dome);

    // Magical pit table
    const table = new THREE.Group();
    const felt = new THREE.Mesh(
      new THREE.CylinderGeometry(2.35, 2.35, 0.16, 96),
      new THREE.MeshStandardMaterial({
        map: panelMap,
        color: 0x1a1230,
        roughness: 0.72,
        metalness: 0.08,
        emissive: 0x14082a,
        emissiveIntensity: 0.18,
      }),
    );
    felt.receiveShadow = true;
    felt.castShadow = true;
    table.add(felt);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(2.42, 0.11, 24, 120),
      new THREE.MeshStandardMaterial({
        color: 0xffd27a,
        metalness: 1,
        roughness: 0.22,
        emissive: 0x664410,
        emissiveIntensity: 0.35,
      }),
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.12;
    rim.castShadow = true;
    table.add(rim);

    const innerGlow = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 2.2, 64),
      new THREE.MeshBasicMaterial({
        color: 0x8b5cff,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    innerGlow.rotation.x = -Math.PI / 2;
    innerGlow.position.y = 0.09;
    table.add(innerGlow);

    for (const [x, z] of [
      [1.45, 1.45],
      [1.45, -1.45],
      [-1.45, 1.45],
      [-1.45, -1.45],
    ] as [number, number][]) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 1.15, 12),
        new THREE.MeshStandardMaterial({
          color: 0x3a2412,
          metalness: 0.55,
          roughness: 0.4,
        }),
      );
      leg.position.set(x, -0.65, z);
      leg.castShadow = true;
      table.add(leg);
    }
    table.position.y = -0.85;
    scene.add(table);

    // Hero crystal
    const crystal = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.72, 2),
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.05,
        roughness: 0.05,
        transmission: 0.85,
        thickness: 1.4,
        ior: 1.5,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        iridescence: 1,
        iridescenceIOR: 1.3,
        iridescenceThicknessRange: [120, 420],
        emissive: 0x442266,
        emissiveIntensity: 0.25,
        envMapIntensity: 1.6,
      }),
    );
    crystal.castShadow = true;
    crystal.position.y = 0.55;
    scene.add(crystal);

    // Orbit rings
    const rings: THREE.Mesh[] = [];
    const ringColors = [0xffb020, 0x2ea8ff, 0x8b5cff];
    ringColors.forEach((color, i) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.35 + i * 0.38, 0.028, 16, 128),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.85,
          metalness: 0.9,
          roughness: 0.18,
          transparent: true,
          opacity: 0.92,
        }),
      );
      ring.rotation.x = 0.7 + i * 0.35;
      ring.rotation.y = i * 0.8;
      rings.push(ring);
      scene.add(ring);
    });

    // Floating rune nodes (constellation)
    const nodeGeo = new THREE.SphereGeometry(0.07, 16, 16);
    const nodes: THREE.Mesh[] = [];
    for (let i = 0; i < 16; i += 1) {
      const hue = HUES[i % HUES.length]!;
      const node = new THREE.Mesh(
        nodeGeo,
        new THREE.MeshStandardMaterial({
          color: hue,
          emissive: hue,
          emissiveIntensity: 1.2,
          roughness: 0.25,
          metalness: 0.4,
        }),
      );
      nodes.push(node);
      scene.add(node);
    }
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xffd27a,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const linePos = new Float32Array(16 * 2 * 3);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lines);

    // Spark dust
    const dustCount = 220;
    const dustPos = new Float32Array(dustCount * 3);
    const dustVel: number[] = [];
    for (let i = 0; i < dustCount; i += 1) {
      dustPos[i * 3] = (Math.random() - 0.5) * 10;
      dustPos[i * 3 + 1] = Math.random() * 5 - 0.5;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 10;
      dustVel.push((Math.random() - 0.5) * 0.004, 0.004 + Math.random() * 0.008, (Math.random() - 0.5) * 0.004);
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    const dust = new THREE.Points(
      dustGeo,
      new THREE.PointsMaterial({
        color: 0xffe6a8,
        size: 0.045,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
    scene.add(dust);

    // Lights
    const hemi = new THREE.HemisphereLight(0xb8c4ff, 0x1a0e08, 0.55);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfff0d0, 1.35);
    key.position.set(4.5, 7, 3.5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 20;
    key.shadow.camera.left = -6;
    key.shadow.camera.right = 6;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    scene.add(key);
    const fill = new THREE.PointLight(0x8b5cff, 28, 18, 2);
    fill.position.set(-2.5, 2.2, 2);
    scene.add(fill);
    const accent = new THREE.PointLight(0xff355e, 18, 14, 2);
    accent.position.set(2.8, 1.6, -1.5);
    scene.add(accent);
    const crystalLight = new THREE.PointLight(0xffd27a, 12, 8, 2);
    crystalLight.position.copy(crystal.position);
    scene.add(crystalLight);

    // Post: bloom
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.7, 0.82);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    const ptr = { x: 0, y: 0, tx: 0, ty: 0, zoom: 0, burst: 0 };
    function onPointer(e: PointerEvent) {
      ptr.tx = (e.clientX / Math.max(window.innerWidth, 1)) * 2 - 1;
      ptr.ty = -((e.clientY / Math.max(window.innerHeight, 1)) * 2 - 1);
    }
    function onDown() {
      ptr.burst = 1;
    }
    function onWheel(e: WheelEvent) {
      ptr.zoom = THREE.MathUtils.clamp(ptr.zoom + e.deltaY * -0.0004, -0.8, 1.2);
    }
    function onFx(e: CustomEvent<FxDetail>) {
      if (e.detail?.kind === "take" || e.detail?.kind === "click") ptr.burst = 1;
    }
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("huepot:fx", onFx);

    function resize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      bloom.setSize(w, h);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let running = true;
    const t0 = performance.now();
    const camTarget = new THREE.Vector3(0, 0.35, 0);

    function frame(now: number) {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      const t = (now - t0) / 1000;
      ptr.x += (ptr.tx - ptr.x) * 0.07;
      ptr.y += (ptr.ty - ptr.y) * 0.07;
      ptr.burst *= 0.92;
      document.documentElement.style.setProperty("--fx-px", ptr.x.toFixed(4));
      document.documentElement.style.setProperty("--fx-py", ptr.y.toFixed(4));

      const take = modeRef.current === "take" ? 1 : ptr.burst;
      const urgent = modeRef.current === "urgent" ? 1 : 0;
      const fogAmt = fogRef.current ? 1 : 0;
      scene.fog = new THREE.FogExp2(fogAmt ? 0x2a2a38 : 0x070614, 0.038 + fogAmt * 0.03);

      crystal.rotation.y = t * 0.55;
      crystal.rotation.x = Math.sin(t * 0.4) * 0.2;
      crystal.position.y = 0.55 + Math.sin(t * 1.2) * 0.08 + take * 0.12;
      (crystal.material as THREE.MeshPhysicalMaterial).emissiveIntensity =
        0.25 + take * 0.9 + urgent * 0.35;
      crystalLight.intensity = 10 + take * 28 + urgent * 10;

      rings.forEach((ring, i) => {
        ring.rotation.z = t * (0.35 + i * 0.12) * (i % 2 === 0 ? 1 : -1);
        ring.rotation.x = 0.7 + i * 0.35 + ptr.y * 0.25;
        ring.rotation.y = i * 0.8 + ptr.x * 0.4;
        (ring.material as THREE.MeshStandardMaterial).emissiveIntensity =
          0.7 + take * 1.2 + urgent * 0.4;
      });

      table.rotation.y = ptr.x * 0.12;
      table.rotation.x = ptr.y * -0.06;
      dome.rotation.y = t * 0.02 + ptr.x * 0.05;

      for (let i = 0; i < nodes.length; i += 1) {
        const a = (i / nodes.length) * Math.PI * 2 + t * 0.22;
        const r = 1.55 + (i % 3) * 0.25;
        const n = nodes[i]!;
        n.position.set(
          Math.cos(a) * r,
          0.55 + Math.sin(t * 1.1 + i) * 0.25 + (i % 4) * 0.12,
          Math.sin(a) * r,
        );
        n.scale.setScalar(1 + take * 0.35 + Math.sin(t * 4 + i) * 0.08);
      }
      let lp = 0;
      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i]!;
        const b = nodes[(i + 3) % nodes.length]!;
        linePos[lp++] = a.position.x;
        linePos[lp++] = a.position.y;
        linePos[lp++] = a.position.z;
        linePos[lp++] = b.position.x;
        linePos[lp++] = b.position.y;
        linePos[lp++] = b.position.z;
      }
      lineGeo.attributes.position!.needsUpdate = true;
      lineMat.opacity = 0.2 + take * 0.35;

      const pos = dustGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < dustCount; i += 1) {
        pos.array[i * 3]! += dustVel[i * 3]! + ptr.x * 0.002;
        pos.array[i * 3 + 1]! += dustVel[i * 3 + 1]! + take * 0.01;
        pos.array[i * 3 + 2]! += dustVel[i * 3 + 2]!;
        if (pos.array[i * 3 + 1]! > 5) pos.array[i * 3 + 1] = -0.5;
      }
      pos.needsUpdate = true;

      fill.intensity = 22 + take * 30 + Math.sin(t * 2) * 4;
      accent.intensity = 14 + urgent * 20 + take * 18;
      bloom.strength = 0.45 + take * 0.55 + urgent * 0.25;

      camera.position.x = ptr.x * 1.4;
      camera.position.y = 2.2 + ptr.y * 0.55 + ptr.zoom * 0.15;
      camera.position.z = 6.0 - ptr.zoom * 1.4;
      camTarget.set(ptr.x * 0.4, 0.3 + take * 0.2, 0);
      camera.lookAt(camTarget);

      composer.render();
    }

    raf = requestAnimationFrame(frame);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("huepot:fx", onFx);
      composer.dispose();
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const m = obj.material;
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else m.dispose();
        }
      });
    };
  }, []);

  return <canvas aria-hidden="true" className="fx-gl" ref={canvasRef} />;
}
