"use client";

import { useEffect, useRef } from "react";
import type { FxDetail, PadBoardDetail } from "@/lib/fx";
import { sampleAudioPulse } from "@/lib/fx";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import { SSRPass } from "three/addons/postprocessing/SSRPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { ReflectorForSSRPass } from "three/addons/objects/ReflectorForSSRPass.js";
import {
  buildProceduralPit,
  loadFallbackEnv,
  loadHdri,
  loadPitGltf,
} from "@/lib/pit-assets";
import { pitEngine } from "@/lib/pit-engine";

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
    const node = canvasRef.current;
    if (!node) return;
    const surface: HTMLCanvasElement = node;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    let cleanupEngine: (() => void) | null = null;
    const disposables: Array<{ dispose: () => void }> = [];

    void (async () => {
      const renderer = pitEngine.renderer();
      const quality = pitEngine.quality();
      const dprCap = quality === "high" ? 1.75 : quality === "mid" ? 1.35 : 1.1;

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x070614, 0.04);

      const camera = new THREE.PerspectiveCamera(40, 1, 0.15, 90);
      camera.position.set(0, 2.45, 6.4);

      const loader = new THREE.TextureLoader();
      const orbitMap = loader.load("/fx/huepot-orbit.jpg");
      const panelMap = loader.load("/fx/huepot-panel.jpg");
      const realmMap = loader.load("/fx/huepot-realm.jpg");
      const feltMap = loader.load("/fx/felt.jpg");
      const goldMap = loader.load("/fx/gold.jpg");
      for (const map of [orbitMap, panelMap, realmMap, feltMap, goldMap]) {
        map.colorSpace = THREE.SRGBColorSpace;
        map.anisotropy = quality === "low" ? 4 : 8;
      }
      feltMap.wrapS = feltMap.wrapT = THREE.RepeatWrapping;
      feltMap.repeat.set(3.2, 3.2);
      goldMap.wrapS = goldMap.wrapT = THREE.RepeatWrapping;
      goldMap.repeat.set(2, 2);

      let envMap = await loadHdri(renderer);
      if (cancelled) return;
      if (!envMap) envMap = loadFallbackEnv(renderer, realmMap);
      scene.environment = envMap;
      scene.background = null;
      pitEngine.setEnvMap(envMap);
      disposables.push(envMap);

      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(32, quality === "low" ? 24 : 48, quality === "low" ? 16 : 28),
        new THREE.MeshBasicMaterial({
          map: orbitMap,
          side: THREE.BackSide,
          transparent: true,
          opacity: 0.34,
        }),
      );
      scene.add(dome);

      let selects: THREE.Mesh[] = [];
      let pitRoot: THREE.Group;
      const gltf = await loadPitGltf(renderer);
      if (cancelled) return;
      if (gltf) {
        pitRoot = gltf.root;
        selects = gltf.selects;
      } else {
        const pit = buildProceduralPit({
          felt: feltMap,
          gold: goldMap,
          panel: panelMap,
        });
        pitRoot = pit.root;
        selects = pit.selects;
      }
      scene.add(pitRoot);

      const crystal = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.72, quality === "low" ? 1 : 3),
        new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          metalness: 0.02,
          roughness: 0.04,
          transmission: 0.9,
          thickness: 1.6,
          ior: 1.52,
          clearcoat: 1,
          clearcoatRoughness: 0.04,
          iridescence: 1,
          iridescenceIOR: 1.3,
          iridescenceThicknessRange: [120, 480],
          emissive: 0x332255,
          emissiveIntensity: 0.2,
          envMapIntensity: 1.6,
        }),
      );
      crystal.castShadow = true;
      crystal.position.y = 0.55;
      scene.add(crystal);

      // Magical color orbs living on the pit (synced from the live board)
      type TableOrb = {
        mesh: THREE.Mesh;
        core: THREE.Mesh;
        light: THREE.PointLight;
        color: THREE.Color;
        pulse: number;
        leading: number;
        share: number;
        winner: number;
        baseY: number;
      };
      const tableOrbs: TableOrb[] = [];
      const orbGeo = new THREE.SphereGeometry(0.22, quality === "low" ? 24 : 40, quality === "low" ? 18 : 28);
      const coreGeo = new THREE.SphereGeometry(0.09, 16, 12);
      for (let i = 0; i < 8; i += 1) {
        const hue = HUES[i]!;
        const color = new THREE.Color(hue);
        const mat = new THREE.MeshPhysicalMaterial({
          color,
          metalness: 0.05,
          roughness: 0.08,
          transmission: 0.72,
          thickness: 1.2,
          ior: 1.45,
          clearcoat: 1,
          clearcoatRoughness: 0.08,
          iridescence: 1,
          iridescenceIOR: 1.3,
          iridescenceThicknessRange: [100, 420],
          emissive: color.clone().multiplyScalar(0.4),
          emissiveIntensity: 0.45,
          envMapIntensity: 1.8,
          transparent: true,
          opacity: 0.95,
        });
        const mesh = new THREE.Mesh(orbGeo, mat);
        mesh.castShadow = true;
        const core = new THREE.Mesh(
          coreGeo,
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.55,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        );
        const light = new THREE.PointLight(hue, 4, 3.5, 2);
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const r = 1.55;
        mesh.position.set(Math.cos(a) * r, 0.28, Math.sin(a) * r);
        core.position.copy(mesh.position);
        light.position.copy(mesh.position);
        scene.add(mesh, core, light);
        tableOrbs.push({
          mesh,
          core,
          light,
          color,
          pulse: 0,
          leading: 0,
          share: 0,
          winner: 0,
          baseY: 0.28,
        });
      }
      const padState: PadBoardDetail = {
        pads: tableOrbs.map((o) => ({
          color: `#${o.color.getHexString()}`,
          leading: false,
          spark: false,
          share: 0,
          winner: false,
        })),
        fog: false,
      };

      const rings: THREE.Mesh[] = [];
      [0xffd27a, 0x8b5cff].forEach((color, i) => {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(1.42 + i * 0.46, 0.016, 12, 96),
          new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.34,
            metalness: 0.95,
            roughness: 0.2,
            transparent: true,
            opacity: 0.62,
          }),
        );
        ring.rotation.x = 0.72 + i * 0.3;
        ring.rotation.y = i * 0.8;
        rings.push(ring);
        scene.add(ring);
      });

      const dustCount = quality === "low" ? 40 : 90;
      const dustPos = new Float32Array(dustCount * 3);
      const dustVel: number[] = [];
      for (let i = 0; i < dustCount; i += 1) {
        dustPos[i * 3] = (Math.random() - 0.5) * 12;
        dustPos[i * 3 + 1] = Math.random() * 6 - 0.5;
        dustPos[i * 3 + 2] = (Math.random() - 0.5) * 12;
        dustVel.push(
          (Math.random() - 0.5) * 0.004,
          0.004 + Math.random() * 0.008,
          (Math.random() - 0.5) * 0.004,
        );
      }
      const dustGeo = new THREE.BufferGeometry();
      dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
      const dust = new THREE.Points(
        dustGeo,
        new THREE.PointsMaterial({
          color: 0xffe6a8,
          size: 0.03,
          transparent: true,
          opacity: 0.34,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          sizeAttenuation: true,
        }),
      );
      scene.add(dust);

      const hemi = new THREE.HemisphereLight(0xb8c4ff, 0x1a0e08, 0.42);
      scene.add(hemi);
      const key = new THREE.DirectionalLight(0xfff0d0, 1.55);
      key.position.set(4.8, 8, 3.8);
      key.castShadow = quality !== "low";
      key.shadow.mapSize.set(quality === "high" ? 2048 : 1024, quality === "high" ? 2048 : 1024);
      key.shadow.camera.near = 1;
      key.shadow.camera.far = 24;
      key.shadow.camera.left = -7;
      key.shadow.camera.right = 7;
      key.shadow.camera.top = 7;
      key.shadow.camera.bottom = -7;
      key.shadow.bias = -0.0002;
      scene.add(key);
      const fill = new THREE.PointLight(0x8b5cff, 18, 20, 2);
      fill.position.set(-2.6, 2.4, 2.1);
      scene.add(fill);
      const accent = new THREE.PointLight(0xff355e, 9, 14, 2);
      accent.position.set(2.9, 1.7, -1.6);
      scene.add(accent);
      const crystalLight = new THREE.PointLight(0xffd27a, 10, 9, 2);
      crystalLight.position.copy(crystal.position);
      scene.add(crystalLight);

      let groundReflector: ReflectorForSSRPass | null = null;
      if (quality === "high") {
        groundReflector = new ReflectorForSSRPass(new THREE.PlaneGeometry(6.5, 6.5), {
          textureWidth: 1024,
          textureHeight: 1024,
          useDepthTexture: true,
          color: 0x7a6a50,
        });
        groundReflector.material.depthWrite = false;
        groundReflector.rotation.x = -Math.PI / 2;
        groundReflector.position.y = -0.74;
        groundReflector.visible = false;
        scene.add(groundReflector);
      }

      const composer = new EffectComposer(renderer);
      let bloom: UnrealBloomPass;
      let ssao: SSAOPass | null = null;
      let ssr: SSRPass | null = null;
      let bokeh: BokehPass | null = null;

      if (quality === "high") {
        ssr = new SSRPass({
          renderer,
          scene,
          camera,
          width: 1,
          height: 1,
          groundReflector,
          selects,
        });
        ssr.thickness = 0.018;
        ssr.infiniteThick = false;
        ssr.maxDistance = 0.1;
        ssr.opacity = 0.45;
        composer.addPass(ssr);
      } else {
        composer.addPass(new RenderPass(scene, camera));
      }

      if (quality !== "low") {
        ssao = new SSAOPass(scene, camera, 1, 1);
        ssao.kernelRadius = quality === "high" ? 12 : 8;
        ssao.minDistance = 0.0025;
        ssao.maxDistance = 0.08;
        ssao.output = SSAOPass.OUTPUT.Default;
        composer.addPass(ssao);
      }

      bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.26, 0.7, 0.92);
      composer.addPass(bloom);

      if (quality === "high") {
        bokeh = new BokehPass(scene, camera, {
          focus: 6.1,
          aperture: 0.00022,
          maxblur: 0.008,
        });
        composer.addPass(bokeh);
      }

      composer.addPass(new OutputPass());

      if (cancelled) {
        composer.dispose();
        ssao?.dispose();
        ssr?.dispose();
        bokeh?.dispose();
        return;
      }

      const ptr = { x: 0, y: 0, tx: 0, ty: 0, zoom: 0, burst: 0 };
      function onPointer(e: PointerEvent) {
        ptr.tx = (e.clientX / Math.max(window.innerWidth, 1)) * 2 - 1;
        ptr.ty = -((e.clientY / Math.max(window.innerHeight, 1)) * 2 - 1);
      }
      function onDown() {
        ptr.burst = 1;
      }
      function onWheel(e: WheelEvent) {
        ptr.zoom = THREE.MathUtils.clamp(ptr.zoom + e.deltaY * -0.0004, -0.8, 1.25);
      }
      function onFx(e: CustomEvent<FxDetail>) {
        if (e.detail?.kind === "take" || e.detail?.kind === "click") ptr.burst = 1;
        const hex = e.detail?.color?.toLowerCase();
        if (!hex) return;
        for (const orb of tableOrbs) {
          const orbHex = `#${orb.color.getHexString()}`;
          if (orbHex === hex || orbHex.replace("#", "") === hex.replace("#", "")) {
            orb.pulse = 1.4;
          }
        }
      }
      function onPads(e: CustomEvent<PadBoardDetail>) {
        if (!e.detail?.pads) return;
        padState.fog = e.detail.fog;
        padState.pads = e.detail.pads;
        const n = Math.min(tableOrbs.length, e.detail.pads.length);
        for (let i = 0; i < tableOrbs.length; i += 1) {
          const orb = tableOrbs[i]!;
          if (i >= n) {
            orb.mesh.visible = false;
            orb.core.visible = false;
            orb.light.visible = false;
            continue;
          }
          orb.mesh.visible = true;
          orb.core.visible = true;
          orb.light.visible = true;
          const pad = e.detail.pads[i]!;
          const c = new THREE.Color(pad.color);
          orb.color.copy(c);
          (orb.mesh.material as THREE.MeshPhysicalMaterial).color.copy(c);
          (orb.mesh.material as THREE.MeshPhysicalMaterial).emissive.copy(c).multiplyScalar(0.4);
          (orb.core.material as THREE.MeshBasicMaterial).color.copy(c);
          orb.light.color.copy(c);
          orb.leading = pad.leading ? 1 : 0;
          orb.share = pad.share;
          orb.winner = pad.winner ? 1 : 0;
          if (pad.spark) orb.pulse = Math.max(orb.pulse, 1.2);
        }
      }
      window.addEventListener("pointermove", onPointer, { passive: true });
      window.addEventListener("pointerdown", onDown, { passive: true });
      window.addEventListener("wheel", onWheel, { passive: true });
      window.addEventListener("huepot:fx", onFx);
      window.addEventListener("huepot:pads", onPads);

      const camTarget = new THREE.Vector3(0, 0.35, 0);
      let viewW = 0;
      let viewH = 0;

      cleanupEngine = pitEngine.bindWorld({
        canvas: surface,
        resize(w, h) {
          if (w === viewW && h === viewH) return;
          viewW = w;
          viewH = h;
          camera.aspect = w / Math.max(h, 1);
          camera.updateProjectionMatrix();
          pitEngine.setRenderSize(w, h, Math.min(window.devicePixelRatio || 1, dprCap));
          composer.setSize(w, h);
          bloom.setSize(w, h);
          ssao?.setSize(w, h);
          ssr?.setSize(w, h);
          if (bokeh) {
            const uniforms = bokeh.uniforms as Record<string, { value: number }>;
            if (uniforms.aspect) uniforms.aspect.value = camera.aspect;
          }
        },
        frame(t) {
          ptr.x += (ptr.tx - ptr.x) * 0.07;
          ptr.y += (ptr.ty - ptr.y) * 0.07;
          ptr.burst *= 0.92;
          document.documentElement.style.setProperty("--fx-px", ptr.x.toFixed(4));
          document.documentElement.style.setProperty("--fx-py", ptr.y.toFixed(4));

          const take = modeRef.current === "take" ? 1 : ptr.burst;
          const urgent = modeRef.current === "urgent" ? 1 : 0;
          const fogAmt = fogRef.current || padState.fog ? 1 : 0;
          const audio = sampleAudioPulse();
          scene.fog = new THREE.FogExp2(fogAmt ? 0x2a2a38 : 0x070614, 0.035 + fogAmt * 0.028);

          crystal.rotation.y = t * 0.55;
          crystal.rotation.x = Math.sin(t * 0.4) * 0.2;
          crystal.position.y = 0.55 + Math.sin(t * 1.2) * 0.08 + take * 0.12 + audio * 0.06;
          (crystal.material as THREE.MeshPhysicalMaterial).emissiveIntensity =
            0.2 + take * 0.6 + urgent * 0.22 + audio * 0.3;
          crystalLight.intensity = 9 + take * 18 + urgent * 7 + audio * 10;
          crystalLight.position.copy(crystal.position);

          const orbCount = Math.max(2, padState.pads.length || tableOrbs.filter((o) => o.mesh.visible).length);
          for (let i = 0; i < tableOrbs.length; i += 1) {
            const orb = tableOrbs[i]!;
            if (!orb.mesh.visible) continue;
            orb.pulse *= 0.9;
            const a = (i / orbCount) * Math.PI * 2 - Math.PI / 2 + t * 0.08;
            const r = 1.45 + orb.share * 0.35;
            const lift =
              orb.baseY +
              Math.sin(t * 2.2 + i) * 0.05 +
              orb.leading * 0.18 +
              orb.winner * 0.28 +
              orb.pulse * 0.22 +
              audio * 0.05;
            orb.mesh.position.set(Math.cos(a) * r, lift, Math.sin(a) * r);
            orb.core.position.copy(orb.mesh.position);
            orb.light.position.copy(orb.mesh.position);
            orb.mesh.rotation.y = t * (1.2 + orb.pulse);
            orb.mesh.rotation.x = 0.3 + Math.sin(t + i) * 0.15;
            const scale = 1 + orb.leading * 0.18 + orb.winner * 0.35 + orb.pulse * 0.45 + orb.share * 0.25;
            orb.mesh.scale.setScalar(scale);
            orb.core.scale.setScalar(0.9 + Math.sin(t * 4 + i) * 0.1 + orb.pulse * 0.3);
            const mat = orb.mesh.material as THREE.MeshPhysicalMaterial;
            mat.emissiveIntensity = 0.3 + orb.leading * 0.4 + orb.winner * 0.7 + orb.pulse * 0.8 + audio * 0.22;
            mat.transmission = fogAmt ? 0.35 : 0.72;
            mat.opacity = fogAmt ? 0.65 : 0.95;
            orb.light.intensity = 2 + orb.leading * 5 + orb.winner * 9 + orb.pulse * 12 + audio * 4;
          }

          rings.forEach((ring, i) => {
            ring.rotation.z = t * (0.14 + i * 0.06) * (i % 2 === 0 ? 1 : -1);
            ring.rotation.x = 0.72 + i * 0.3 + ptr.y * 0.16;
            ring.rotation.y = i * 0.8 + ptr.x * 0.24;
            (ring.material as THREE.MeshStandardMaterial).emissiveIntensity =
              0.3 + take * 0.55 + urgent * 0.16;
          });

          pitRoot.rotation.y = ptr.x * 0.1;
          pitRoot.rotation.x = ptr.y * -0.05;
          dome.rotation.y = t * 0.012 + ptr.x * 0.03;

          const pos = dustGeo.attributes.position as THREE.BufferAttribute;
          for (let i = 0; i < dustCount; i += 1) {
            pos.array[i * 3]! += dustVel[i * 3]! + ptr.x * 0.002;
            pos.array[i * 3 + 1]! += dustVel[i * 3 + 1]! + take * 0.01;
            pos.array[i * 3 + 2]! += dustVel[i * 3 + 2]!;
            if (pos.array[i * 3 + 1]! > 5.5) pos.array[i * 3 + 1] = -0.5;
          }
          pos.needsUpdate = true;

          fill.intensity = 14 + take * 18 + Math.sin(t * 2) * 2 + audio * 8;
          accent.intensity = 8 + urgent * 12 + take * 10 + audio * 5;
          bloom.strength = 0.24 + take * 0.3 + urgent * 0.12 + audio * 0.18;
          if (bokeh) {
            const uniforms = bokeh.uniforms as Record<string, { value: number }>;
            if (uniforms.focus) uniforms.focus.value = 5.8 + ptr.zoom * 0.35;
            if (uniforms.aperture) {
              uniforms.aperture.value = 0.00018 + take * 0.00012 + urgent * 0.00008;
            }
          }
          if (ssr) {
            ssr.opacity = 0.38 + take * 0.2;
          }

          camera.position.x = ptr.x * 1.35;
          camera.position.y = 2.25 + ptr.y * 0.5 + ptr.zoom * 0.15;
          camera.position.z = 6.15 - ptr.zoom * 1.45;
          camTarget.set(ptr.x * 0.35, 0.32 + take * 0.2, 0);
          camera.lookAt(camTarget);

          if (groundReflector) groundReflector.visible = false;
          composer.render();
        },
        dispose() {
          window.removeEventListener("pointermove", onPointer);
          window.removeEventListener("pointerdown", onDown);
          window.removeEventListener("wheel", onWheel);
          window.removeEventListener("huepot:fx", onFx);
          window.removeEventListener("huepot:pads", onPads);
          composer.dispose();
          ssao?.dispose();
          ssr?.dispose();
          bokeh?.dispose();
          scene.traverse((obj) => {
            if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.LineSegments) {
              obj.geometry.dispose();
              const m = (obj as THREE.Mesh).material;
              if (Array.isArray(m)) m.forEach((x) => x.dispose());
              else if (m) m.dispose();
            }
          });
          for (const d of disposables) d.dispose();
        },
      });
    })();

    return () => {
      cancelled = true;
      cleanupEngine?.();
    };
  }, []);

  return <canvas aria-hidden="true" className="fx-gl" ref={canvasRef} />;
}
