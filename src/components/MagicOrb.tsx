"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export function MagicOrb({
  color,
  pressed = false,
  spark = false,
  leading = false,
  winner = false,
  fog = false,
}: {
  color: string;
  pressed?: boolean;
  spark?: boolean;
  leading?: boolean;
  winner?: boolean;
  fog?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ pressed, spark, leading, winner, fog, color });
  stateRef.current = { pressed, spark, leading, winner, fog, color };

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasEl,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 20);
    camera.position.set(0, 0.15, 3.1);

    const loader = new THREE.TextureLoader();
    const energy = loader.load("/fx/huepot-orb-energy.jpg");
    energy.colorSpace = THREE.SRGBColorSpace;
    energy.wrapS = THREE.RepeatWrapping;
    energy.wrapT = THREE.RepeatWrapping;

    const base = new THREE.Color(color);
    const orbMat = new THREE.MeshPhysicalMaterial({
      color: base,
      map: energy,
      metalness: 0.05,
      roughness: 0.08,
      transmission: 0.72,
      thickness: 1.6,
      ior: 1.45,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      iridescence: 1,
      iridescenceIOR: 1.35,
      iridescenceThicknessRange: [100, 480],
      emissive: base.clone().multiplyScalar(0.35),
      emissiveIntensity: 0.45,
      envMapIntensity: 1.8,
      transparent: true,
      opacity: 0.96,
    });

    const orb = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), orbMat);
    scene.add(orb);

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 32, 24),
      new THREE.MeshBasicMaterial({
        color: base,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    scene.add(core);

    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(1.08, 48, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffe6a8,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        wireframe: true,
      }),
    );
    scene.add(shell);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.22, 0.03, 12, 80),
      new THREE.MeshStandardMaterial({
        color: 0xffd27a,
        emissive: 0xffb020,
        emissiveIntensity: 0.8,
        metalness: 1,
        roughness: 0.2,
      }),
    );
    ring.rotation.x = Math.PI / 2.4;
    scene.add(ring);

    // Spark burst cloud
    const sparkCount = 48;
    const sparkPos = new Float32Array(sparkCount * 3);
    const sparkVel: THREE.Vector3[] = [];
    const sparkLife = new Float32Array(sparkCount);
    for (let i = 0; i < sparkCount; i += 1) {
      sparkVel.push(new THREE.Vector3());
      sparkLife[i] = 0;
    }
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
    const sparks = new THREE.Points(
      sparkGeo,
      new THREE.PointsMaterial({
        color: base,
        size: 0.08,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
    scene.add(sparks);

    scene.add(new THREE.AmbientLight(0xffffff, 0.25));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(2.5, 3, 2);
    scene.add(key);
    const rimLight = new THREE.PointLight(base.getHex(), 16, 8, 2);
    rimLight.position.set(-1.2, 0.8, 1.5);
    scene.add(rimLight);
    const inner = new THREE.PointLight(base.getHex(), 8, 4, 2);
    scene.add(inner);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.55, 0.78);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
    function onMove(e: PointerEvent) {
      const rect = canvasEl.getBoundingClientRect();
      ptr.tx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ptr.ty = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    }
    function onLeave() {
      ptr.tx = 0;
      ptr.ty = 0;
    }
    canvasEl.addEventListener("pointermove", onMove);
    canvasEl.addEventListener("pointerleave", onLeave);

    function burst() {
      for (let i = 0; i < sparkCount; i += 1) {
        const dir = new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5,
        ).normalize();
        sparkPos[i * 3] = dir.x * 0.2;
        sparkPos[i * 3 + 1] = dir.y * 0.2;
        sparkPos[i * 3 + 2] = dir.z * 0.2;
        sparkVel[i]!.copy(dir).multiplyScalar(0.05 + Math.random() * 0.12);
        sparkLife[i] = 1;
      }
      sparkGeo.attributes.position!.needsUpdate = true;
    }

    let lastSpark = false;
    let lastPressed = false;

    function resize() {
      const rect = canvasEl.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      bloom.setSize(w, h);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvasEl);

    let raf = 0;
    let running = true;
    const t0 = performance.now();

    function frame(now: number) {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      const t = (now - t0) / 1000;
      const st = stateRef.current;
      if ((st.spark && !lastSpark) || (st.pressed && !lastPressed)) burst();
      lastSpark = st.spark;
      lastPressed = st.pressed;
      ptr.x += (ptr.tx - ptr.x) * 0.12;
      ptr.y += (ptr.ty - ptr.y) * 0.12;

      const c = new THREE.Color(st.color);
      orbMat.color.copy(c);
      orbMat.emissive.copy(c).multiplyScalar(0.4);
      (core.material as THREE.MeshBasicMaterial).color.copy(c);
      (sparks.material as THREE.PointsMaterial).color.copy(c);
      rimLight.color.copy(c);
      inner.color.copy(c);

      const pulse =
        0.4 +
        (st.pressed ? 0.9 : 0) +
        (st.spark ? 1.1 : 0) +
        (st.winner ? 0.7 : 0) +
        (st.leading ? 0.35 + Math.sin(t * 7) * 0.15 : 0);

      orbMat.emissiveIntensity = pulse;
      orbMat.transmission = st.fog ? 0.35 : 0.72;
      orbMat.opacity = st.fog ? 0.7 : 0.96;
      energy.offset.x = t * 0.04;
      energy.offset.y = t * 0.02;

      orb.rotation.y = t * (0.6 + pulse * 0.5) + ptr.x * 0.8;
      orb.rotation.x = 0.25 + ptr.y * 0.55 + Math.sin(t * 0.8) * 0.08;
      core.scale.setScalar(0.9 + Math.sin(t * 3) * 0.08 + pulse * 0.12);
      shell.rotation.y = -t * 0.35;
      shell.rotation.z = t * 0.2;
      ring.rotation.z = t * 0.8;
      ring.rotation.x = Math.PI / 2.4 + ptr.y * 0.3;
      (ring.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.6 + pulse * 0.8;

      rimLight.intensity = 10 + pulse * 22;
      inner.intensity = 5 + pulse * 16;
      bloom.strength = 0.55 + pulse * 0.45;

      const pos = sparkGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < sparkCount; i += 1) {
        if (sparkLife[i]! <= 0.02) {
          pos.array[i * 3 + 1] = -10;
          continue;
        }
        sparkLife[i]! *= 0.93;
        const v = sparkVel[i]!;
        pos.array[i * 3]! += v.x;
        pos.array[i * 3 + 1]! += v.y;
        pos.array[i * 3 + 2]! += v.z;
        v.y -= 0.0025;
      }
      pos.needsUpdate = true;
      (sparks.material as THREE.PointsMaterial).opacity = 0.2 + pulse * 0.6;

      camera.position.x = ptr.x * 0.35;
      camera.position.y = 0.15 + ptr.y * 0.25;
      camera.lookAt(0, 0, 0);
      composer.render();
    }

    raf = requestAnimationFrame(frame);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvasEl.removeEventListener("pointermove", onMove);
      canvasEl.removeEventListener("pointerleave", onLeave);
      composer.dispose();
      renderer.dispose();
      orb.geometry.dispose();
      orbMat.dispose();
      core.geometry.dispose();
      (core.material as THREE.Material).dispose();
      shell.geometry.dispose();
      (shell.material as THREE.Material).dispose();
      ring.geometry.dispose();
      (ring.material as THREE.Material).dispose();
      sparkGeo.dispose();
      (sparks.material as THREE.Material).dispose();
    };
  }, [color]);

  return (
    <canvas
      aria-hidden="true"
      className={`magic-orb-gl ${pressed ? "is-pressed" : ""} ${spark ? "is-spark" : ""}`}
      ref={canvasRef}
    />
  );
}
