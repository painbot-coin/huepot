"use client";

import { useEffect, useRef } from "react";
import type { FxDetail } from "@/lib/fx";

type Mat = Float32Array;

function ident(): Mat {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

function mul(a: Mat, b: Mat): Mat {
  const o = ident();
  for (let i = 0; i < 4; i += 1) {
    for (let j = 0; j < 4; j += 1) {
      o[i * 4 + j] =
        a[i * 4]! * b[j]! +
        a[i * 4 + 1]! * b[4 + j]! +
        a[i * 4 + 2]! * b[8 + j]! +
        a[i * 4 + 3]! * b[12 + j]!;
    }
  }
  return o;
}

function persp(fovy: number, aspect: number, near: number, far: number): Mat {
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  const m = new Float32Array(16);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = (far + near) * nf;
  m[11] = -1;
  m[14] = 2 * far * near * nf;
  return m;
}

function lookAt(z = -4.35): Mat {
  const m = ident();
  m[14] = z;
  return m;
}

function rotateY(t: number): Mat {
  const c = Math.cos(t);
  const s = Math.sin(t);
  const m = ident();
  m[0] = c;
  m[2] = s;
  m[8] = -s;
  m[10] = c;
  return m;
}

function rotateX(t: number): Mat {
  const c = Math.cos(t);
  const s = Math.sin(t);
  const m = ident();
  m[5] = c;
  m[6] = s;
  m[9] = -s;
  m[10] = c;
  return m;
}

function rotateZ(t: number): Mat {
  const c = Math.cos(t);
  const s = Math.sin(t);
  const m = ident();
  m[0] = c;
  m[1] = s;
  m[4] = -s;
  m[5] = c;
  return m;
}

function translate(x: number, y: number, z: number): Mat {
  const m = ident();
  m[12] = x;
  m[13] = y;
  m[14] = z;
  return m;
}

function scale(s: number): Mat {
  const m = ident();
  m[0] = s;
  m[5] = s;
  m[10] = s;
  return m;
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) throw new Error("shader");
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(String(gl.getShaderInfoLog(sh)));
  }
  return sh;
}

function program(gl: WebGLRenderingContext, vs: string, fs: string) {
  const p = gl.createProgram();
  if (!p) throw new Error("program");
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(String(gl.getProgramInfoLog(p)));
  }
  return p;
}

const MESH_VS = `
attribute vec3 aPos;
attribute vec3 aNrm;
attribute vec3 aCol;
uniform mat4 uMVP;
uniform mat4 uN;
varying vec3 vN;
varying vec3 vC;
varying vec3 vP;
void main() {
  vN = mat3(uN) * aNrm;
  vC = aCol;
  vP = aPos;
  gl_Position = uMVP * vec4(aPos, 1.0);
}
`;

const MESH_FS = `
precision mediump float;
varying vec3 vN;
varying vec3 vC;
varying vec3 vP;
uniform vec3 uLight;
uniform float uPulse;
uniform float uFog;
void main() {
  vec3 n = normalize(vN);
  float ndl = max(dot(n, normalize(uLight)), 0.0);
  float cel = ndl > 0.78 ? 1.0 : ndl > 0.42 ? 0.68 : 0.32;
  float rim = pow(1.0 - max(dot(n, vec3(0.0, 0.15, 1.0)), 0.0), 2.6);
  vec3 rainbow = 0.5 + 0.5 * cos(6.2831 * (vP.x * 0.35 + vP.y * 0.22 + uPulse) + vec3(0.0, 2.1, 4.2));
  vec3 col = mix(vC, rainbow, 0.28) * cel;
  col += rim * vec3(1.0, 0.82, 0.48) * (0.55 + uPulse * 0.5);
  col += rainbow * uPulse * 0.18;
  float a = mix(0.92, 0.58, uFog);
  gl_FragColor = vec4(col, a);
}
`;

const LINE_VS = `
attribute vec3 aPos;
attribute vec3 aCol;
uniform mat4 uMVP;
varying vec3 vC;
void main() {
  vC = aCol;
  gl_Position = uMVP * vec4(aPos, 1.0);
}
`;

const LINE_FS = `
precision mediump float;
varying vec3 vC;
uniform float uPulse;
void main() {
  gl_FragColor = vec4(vC * (0.55 + uPulse * 0.7), 0.42 + uPulse * 0.25);
}
`;

const PVS = `
attribute vec3 aPos;
attribute float aSize;
attribute vec3 aCol;
uniform mat4 uMVP;
uniform float uDpr;
varying vec3 vC;
void main() {
  vC = aCol;
  gl_Position = uMVP * vec4(aPos, 1.0);
  gl_PointSize = clamp(aSize * uDpr * (1.7 / max(0.35, gl_Position.w)), 2.0, 56.0);
}
`;

const PFS = `
precision mediump float;
varying vec3 vC;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float d = length(p);
  if (d > 1.0) discard;
  float petal = smoothstep(1.0, 0.12, d) * (0.55 + 0.45 * (1.0 - abs(p.x)));
  gl_FragColor = vec4(vC, petal);
}
`;

const BVS = `
attribute vec2 aUv;
varying vec2 vUv;
void main() {
  vUv = aUv;
  gl_Position = vec4(aUv * 2.0 - 1.0, 0.0, 1.0);
}
`;

const BFS = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTexA;
uniform sampler2D uTexB;
uniform float uT;
uniform float uTake;
uniform vec2 uParallax;
void main() {
  vec2 uv = vUv + uParallax * 0.05;
  uv.x += sin(uv.y * 6.0 + uT * 0.35) * 0.01;
  uv.y += cos(uv.x * 5.0 + uT * 0.22) * 0.012;
  vec4 a = texture2D(uTexA, clamp(uv, 0.02, 0.98));
  vec2 uv2 = clamp(uv * 1.05 + vec2(0.02, -0.01) + uParallax * 0.02, 0.02, 0.98);
  vec4 b = texture2D(uTexB, uv2);
  float mixAmt = 0.42 + 0.18 * sin(uT * 0.25);
  vec3 col = mix(a.rgb, b.rgb, mixAmt);
  vec3 glow = 0.5 + 0.5 * cos(uT * 0.4 + vec3(0.0, 2.0, 4.0));
  col = mix(col, col * (1.0 + glow * 0.2), 0.7);
  col += glow * uTake * 0.25;
  float vignette = smoothstep(1.2, 0.32, distance(uv, vec2(0.5)));
  gl_FragColor = vec4(col, 0.5 * vignette);
}
`;

const HUES: [number, number, number][] = [
  [1, 0.21, 0.37],
  [1, 0.42, 0.16],
  [1, 0.69, 0.13],
  [0.83, 1, 0.18],
  [0.24, 1, 0.69],
  [0.48, 0.94, 1],
  [0.18, 0.66, 1],
  [0.55, 0.36, 1],
];

function icosahedron(scale = 0.92) {
  const t = (1 + Math.sqrt(5)) / 2;
  const raw: number[][] = [
    [-1, t, 0],
    [1, t, 0],
    [-1, -t, 0],
    [1, -t, 0],
    [0, -1, t],
    [0, 1, t],
    [0, -1, -t],
    [0, 1, -t],
    [t, 0, -1],
    [t, 0, 1],
    [-t, 0, -1],
    [-t, 0, 1],
  ].map((v) => {
    const len = Math.hypot(v[0]!, v[1]!, v[2]!);
    return [v[0]! / len, v[1]! / len, v[2]! / len];
  });
  const faces = [
    [0, 11, 5],
    [0, 5, 1],
    [0, 1, 7],
    [0, 7, 10],
    [0, 10, 11],
    [1, 5, 9],
    [5, 11, 4],
    [11, 10, 2],
    [10, 7, 6],
    [7, 1, 8],
    [3, 9, 4],
    [3, 4, 2],
    [3, 2, 6],
    [3, 6, 8],
    [3, 8, 9],
    [4, 9, 5],
    [2, 4, 11],
    [6, 2, 10],
    [8, 6, 7],
    [9, 8, 1],
  ];
  const pos: number[] = [];
  const nrm: number[] = [];
  const col: number[] = [];
  for (let i = 0; i < faces.length; i += 1) {
    const f = faces[i]!;
    const a = raw[f[0]!]!;
    const b = raw[f[1]!]!;
    const c = raw[f[2]!]!;
    const nx = (a[0]! + b[0]! + c[0]!) / 3;
    const ny = (a[1]! + b[1]! + c[1]!) / 3;
    const nz = (a[2]! + b[2]! + c[2]!) / 3;
    const hue = HUES[i % HUES.length]!;
    for (const v of [a, b, c]) {
      pos.push(v[0]! * scale, v[1]! * scale, v[2]! * scale);
      nrm.push(nx, ny, nz);
      col.push(hue[0]!, hue[1]!, hue[2]!);
    }
  }
  return {
    pos: new Float32Array(pos),
    nrm: new Float32Array(nrm),
    col: new Float32Array(col),
    count: pos.length / 3,
  };
}

function torusRing(R: number, r: number, seg = 72, tube = 10, hueIndex = 0) {
  const pos: number[] = [];
  const nrm: number[] = [];
  const col: number[] = [];
  const hue = HUES[hueIndex % HUES.length]!;
  for (let i = 0; i < seg; i += 1) {
    const u0 = (i / seg) * Math.PI * 2;
    const u1 = ((i + 1) / seg) * Math.PI * 2;
    for (let j = 0; j < tube; j += 1) {
      const v0 = (j / tube) * Math.PI * 2;
      const v1 = ((j + 1) / tube) * Math.PI * 2;
      const pts = [
        [u0, v0],
        [u1, v0],
        [u1, v1],
        [u0, v0],
        [u1, v1],
        [u0, v1],
      ];
      for (const [u, v] of pts) {
        const cu = Math.cos(u!);
        const su = Math.sin(u!);
        const cv = Math.cos(v!);
        const sv = Math.sin(v!);
        const x = (R + r * cv) * cu;
        const y = (R + r * cv) * su;
        const z = r * sv;
        const nx = cv * cu;
        const ny = cv * su;
        const nz = sv;
        pos.push(x, y, z);
        nrm.push(nx, ny, nz);
        col.push(hue[0]!, hue[1]!, hue[2]!);
      }
    }
  }
  return {
    pos: new Float32Array(pos),
    nrm: new Float32Array(nrm),
    col: new Float32Array(col),
    count: pos.length / 3,
  };
}

/** Thick magical pit table: felt disk, gold rim, short legs. */
function magicTable(radius = 2.05, segs = 48) {
  const pos: number[] = [];
  const nrm: number[] = [];
  const col: number[] = [];
  const felt: [number, number, number] = [0.12, 0.08, 0.22];
  const gold: [number, number, number] = [0.95, 0.75, 0.35];
  const wood: [number, number, number] = [0.28, 0.16, 0.08];
  const topY = -1.05;
  const thick = 0.14;
  const rimH = 0.18;
  const rimW = 0.12;

  function tri(
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    cx: number,
    cy: number,
    cz: number,
    nx: number,
    ny: number,
    nz: number,
    rgb: [number, number, number],
  ) {
    for (const p of [
      [ax, ay, az],
      [bx, by, bz],
      [cx, cy, cz],
    ]) {
      pos.push(p[0]!, p[1]!, p[2]!);
      nrm.push(nx, ny, nz);
      col.push(rgb[0], rgb[1], rgb[2]);
    }
  }

  // top felt disk
  for (let i = 0; i < segs; i += 1) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    tri(
      0,
      topY,
      0,
      Math.cos(a0) * radius,
      topY,
      Math.sin(a0) * radius,
      Math.cos(a1) * radius,
      topY,
      Math.sin(a1) * radius,
      0,
      1,
      0,
      felt,
    );
  }
  // underside
  for (let i = 0; i < segs; i += 1) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    tri(
      0,
      topY - thick,
      0,
      Math.cos(a1) * radius,
      topY - thick,
      Math.sin(a1) * radius,
      Math.cos(a0) * radius,
      topY - thick,
      Math.sin(a0) * radius,
      0,
      -1,
      0,
      wood,
    );
  }
  // gold rim (outer wall + top lip)
  const rOut = radius + rimW;
  for (let i = 0; i < segs; i += 1) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    // outer wall
    tri(
      c0 * rOut,
      topY - thick,
      s0 * rOut,
      c1 * rOut,
      topY - thick,
      s1 * rOut,
      c1 * rOut,
      topY + rimH,
      s1 * rOut,
      c1,
      0,
      s1,
      gold,
    );
    tri(
      c0 * rOut,
      topY - thick,
      s0 * rOut,
      c1 * rOut,
      topY + rimH,
      s1 * rOut,
      c0 * rOut,
      topY + rimH,
      s0 * rOut,
      c0,
      0,
      s0,
      gold,
    );
    // rim top
    tri(
      c0 * radius,
      topY + rimH,
      s0 * radius,
      c1 * radius,
      topY + rimH,
      s1 * radius,
      c1 * rOut,
      topY + rimH,
      s1 * rOut,
      0,
      1,
      0,
      gold,
    );
    tri(
      c0 * radius,
      topY + rimH,
      s0 * radius,
      c1 * rOut,
      topY + rimH,
      s1 * rOut,
      c0 * rOut,
      topY + rimH,
      s0 * rOut,
      0,
      1,
      0,
      gold,
    );
  }
  // four legs
  const legR = 0.09;
  const legH = 0.85;
  const legY0 = topY - thick - legH;
  for (const [lx, lz] of [
    [1.2, 1.2],
    [1.2, -1.2],
    [-1.2, 1.2],
    [-1.2, -1.2],
  ] as [number, number][]) {
    for (let i = 0; i < 10; i += 1) {
      const a0 = (i / 10) * Math.PI * 2;
      const a1 = ((i + 1) / 10) * Math.PI * 2;
      const c0 = Math.cos(a0);
      const s0 = Math.sin(a0);
      const c1 = Math.cos(a1);
      const s1 = Math.sin(a1);
      tri(
        lx + c0 * legR,
        legY0,
        lz + s0 * legR,
        lx + c1 * legR,
        legY0,
        lz + s1 * legR,
        lx + c1 * legR,
        topY - thick,
        lz + s1 * legR,
        c1,
        0,
        s1,
        wood,
      );
      tri(
        lx + c0 * legR,
        legY0,
        lz + s0 * legR,
        lx + c1 * legR,
        topY - thick,
        lz + s1 * legR,
        lx + c0 * legR,
        topY - thick,
        lz + s0 * legR,
        c0,
        0,
        s0,
        wood,
      );
    }
  }

  return {
    pos: new Float32Array(pos),
    nrm: new Float32Array(nrm),
    col: new Float32Array(col),
    count: pos.length / 3,
  };
}

function loadTex(gl: WebGLRenderingContext, src: string) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGB,
    1,
    1,
    0,
    gl.RGB,
    gl.UNSIGNED_BYTE,
    new Uint8Array([8, 6, 20]),
  );
  const img = new Image();
  img.src = src;
  img.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  };
  return tex;
}

export function FantasyGl({
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

    const got = canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
    });
    if (!got) return;
    const gl: WebGLRenderingContext = got;

    const meshProg = program(gl, MESH_VS, MESH_FS);
    const lineProg = program(gl, LINE_VS, LINE_FS);
    const sparkProg = program(gl, PVS, PFS);
    const backdrop = program(gl, BVS, BFS);

    const crystal = icosahedron(0.72);
    const table = magicTable(2.1, 52);
    const ringA = torusRing(1.45, 0.042, 80, 8, 1);
    const ringB = torusRing(1.85, 0.032, 80, 8, 6);
    const ringC = torusRing(2.25, 0.026, 72, 6, 3);

    function buf(data: Float32Array) {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      return b;
    }

    const crystalPos = buf(crystal.pos);
    const crystalNrm = buf(crystal.nrm);
    const crystalCol = buf(crystal.col);
    const tablePos = buf(table.pos);
    const tableNrm = buf(table.nrm);
    const tableCol = buf(table.col);
    const rings = [
      { mesh: ringA, pos: buf(ringA.pos), nrm: buf(ringA.nrm), col: buf(ringA.col) },
      { mesh: ringB, pos: buf(ringB.pos), nrm: buf(ringB.nrm), col: buf(ringB.col) },
      { mesh: ringC, pos: buf(ringC.pos), nrm: buf(ringC.nrm), col: buf(ringC.col) },
    ];

    const quad = buf(new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]));
    const texA = loadTex(gl, "/fx/huepot-orbit.jpg");
    const texB = loadTex(gl, "/fx/huepot-realm.jpg");

    // Interactive constellation graph nodes
    const nodeCount = 18;
    const nodes = Array.from({ length: nodeCount }, (_, i) => {
      const a = (i / nodeCount) * Math.PI * 2;
      const elev = ((i % 5) - 2) * 0.28;
      const rad = 1.35 + (i % 3) * 0.28;
      return {
        a,
        elev,
        rad,
        pulse: Math.random() * Math.PI * 2,
        hue: HUES[i % HUES.length]!,
      };
    });
    const edges: [number, number][] = [];
    for (let i = 0; i < nodeCount; i += 1) {
      edges.push([i, (i + 1) % nodeCount]);
      edges.push([i, (i + 3) % nodeCount]);
      if (i % 2 === 0) edges.push([i, (i + 7) % nodeCount]);
    }
    const linePos = new Float32Array(edges.length * 6);
    const lineCol = new Float32Array(edges.length * 6);
    const linePosB = gl.createBuffer();
    const lineColB = gl.createBuffer();

    const nodePos = new Float32Array(nodeCount * 3);
    const nodeSize = new Float32Array(nodeCount);
    const nodeCol = new Float32Array(nodeCount * 3);
    const nodePosB = gl.createBuffer();
    const nodeSizeB = gl.createBuffer();
    const nodeColB = gl.createBuffer();

    const dustCount = Math.min(72, Math.floor((window.innerWidth * window.innerHeight) / 22000));
    const parts = Array.from({ length: dustCount }, () => ({
      x: (Math.random() - 0.5) * 7,
      y: (Math.random() - 0.5) * 4,
      z: (Math.random() - 0.5) * 5,
      vx: (Math.random() - 0.5) * 0.01,
      vy: 0.003 + Math.random() * 0.008,
      vz: (Math.random() - 0.5) * 0.008,
      s: 5 + Math.random() * 12,
      c: HUES[Math.floor(Math.random() * HUES.length)]!,
    }));
    const pPos = new Float32Array(dustCount * 3);
    const pSize = new Float32Array(dustCount);
    const pCol = new Float32Array(dustCount * 3);
    const pPosB = gl.createBuffer();
    const pSizeB = gl.createBuffer();
    const pColB = gl.createBuffer();

    let burst = 0;
    const ptr = { x: 0, y: 0, tx: 0, ty: 0, down: 0, zoom: 0 };
    function onFx(event: CustomEvent<FxDetail>) {
      if (event.detail?.kind === "take" || event.detail?.kind === "click") {
        burst = 1;
        ptr.down = 1;
      }
    }
    function onPointer(e: PointerEvent) {
      ptr.tx = (e.clientX / Math.max(window.innerWidth, 1)) * 2 - 1;
      ptr.ty = -((e.clientY / Math.max(window.innerHeight, 1)) * 2 - 1);
    }
    function onPointerDown() {
      ptr.down = 1;
      burst = Math.max(burst, 0.6);
    }
    function onWheel(e: WheelEvent) {
      ptr.zoom = Math.max(-0.35, Math.min(0.45, ptr.zoom + e.deltaY * -0.00035));
    }
    window.addEventListener("huepot:fx", onFx);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });

    function bindAttr(
      prog: WebGLProgram,
      name: string,
      buffer: WebGLBuffer | null,
      size: number,
    ) {
      const loc = gl.getAttribLocation(prog, name);
      if (loc < 0) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    }

    let w = 0;
    let h = 0;
    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      gl.viewport(0, 0, canvas!.width, canvas!.height);
    }
    resize();
    window.addEventListener("resize", resize);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    let raf = 0;
    let t0 = performance.now();
    let running = true;

    function drawMesh(
      posB: WebGLBuffer | null,
      nrmB: WebGLBuffer | null,
      colB: WebGLBuffer | null,
      count: number,
      mvp: Mat,
      nmat: Mat,
      light: [number, number, number],
      pulse: number,
      fog: number,
    ) {
      gl.useProgram(meshProg);
      bindAttr(meshProg, "aPos", posB, 3);
      bindAttr(meshProg, "aNrm", nrmB, 3);
      bindAttr(meshProg, "aCol", colB, 3);
      gl.uniformMatrix4fv(gl.getUniformLocation(meshProg, "uMVP"), false, mvp);
      gl.uniformMatrix4fv(gl.getUniformLocation(meshProg, "uN"), false, nmat);
      gl.uniform3f(gl.getUniformLocation(meshProg, "uLight"), light[0], light[1], light[2]);
      gl.uniform1f(gl.getUniformLocation(meshProg, "uPulse"), pulse);
      gl.uniform1f(gl.getUniformLocation(meshProg, "uFog"), fog);
      gl.drawArrays(gl.TRIANGLES, 0, count);
    }

    function draw(now: number) {
      if (!running) return;
      raf = requestAnimationFrame(draw);
      const t = (now - t0) / 1000;
      burst *= 0.94;
      ptr.down *= 0.9;
      ptr.x += (ptr.tx - ptr.x) * 0.09;
      ptr.y += (ptr.ty - ptr.y) * 0.09;
      document.documentElement.style.setProperty("--fx-px", ptr.x.toFixed(4));
      document.documentElement.style.setProperty("--fx-py", ptr.y.toFixed(4));
      const take = modeRef.current === "take" ? 1 : burst;
      const urgent = modeRef.current === "urgent" ? 1 : 0;
      const fog = fogRef.current ? 1 : 0;
      const pulse = 0.22 + take * 0.7 + urgent * 0.3 + ptr.down * 0.35;

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.useProgram(backdrop);
      gl.depthMask(false);
      bindAttr(backdrop, "aUv", quad, 2);
      gl.uniform1f(gl.getUniformLocation(backdrop, "uT"), t);
      gl.uniform1f(gl.getUniformLocation(backdrop, "uTake"), take);
      gl.uniform2f(gl.getUniformLocation(backdrop, "uParallax"), ptr.x, ptr.y);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texA);
      gl.uniform1i(gl.getUniformLocation(backdrop, "uTexA"), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, texB);
      gl.uniform1i(gl.getUniformLocation(backdrop, "uTexB"), 1);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      const aspect = w / Math.max(h, 1);
      const camZ = -4.2 + ptr.zoom;
      const view = lookAt(camZ);
      const tiltX = 0.38 + Math.sin(t * 0.28) * 0.05 - ptr.y * 0.62;
      const tiltY = t * 0.22 + ptr.x * 1.05;
      const world = mul(rotateX(tiltX), rotateY(tiltY));
      const proj = persp(0.7, aspect, 0.2, 24);
      const light: [number, number, number] = [1.5 + ptr.x * 1.4, 2.3 + ptr.y * 0.9, 3.1];

      gl.depthMask(true);
      // Magical 3D pit table under the crystal
      const tableM = mul(world, translate(0, 0.05 + Math.sin(t * 0.4) * 0.02, 0));
      drawMesh(
        tablePos,
        tableNrm,
        tableCol,
        table.count,
        mul(proj, mul(view, tableM)),
        tableM,
        light,
        0.12 + take * 0.2,
        fog,
      );

      const crystalM = mul(
        world,
        mul(translate(0, 0.35, 0), mul(rotateY(t * 0.55), scale(1 + take * 0.08 + ptr.down * 0.06))),
      );
      drawMesh(
        crystalPos,
        crystalNrm,
        crystalCol,
        crystal.count,
        mul(proj, mul(view, crystalM)),
        crystalM,
        light,
        pulse,
        fog,
      );

      const ringSpin = [
        mul(world, mul(rotateX(0.9), rotateZ(t * 0.7))),
        mul(world, mul(rotateY(1.1), rotateX(-0.55 + ptr.y * 0.2))),
        mul(world, mul(rotateZ(t * -0.45), rotateX(0.35))),
      ];
      for (let i = 0; i < rings.length; i += 1) {
        const r = rings[i]!;
        const m = ringSpin[i]!;
        drawMesh(
          r.pos,
          r.nrm,
          r.col,
          r.mesh.count,
          mul(proj, mul(view, m)),
          m,
          light,
          pulse * (0.7 + i * 0.12),
          fog,
        );
      }

      // graph nodes + edges
      for (let i = 0; i < nodes.length; i += 1) {
        const n = nodes[i]!;
        const a = n.a + t * (0.25 + (i % 3) * 0.05) + ptr.x * 0.15;
        const rad = n.rad + Math.sin(t * 1.2 + n.pulse) * 0.06 + take * 0.05;
        const x = Math.cos(a) * rad;
        const y = n.elev + Math.sin(t * 0.9 + n.pulse) * 0.08 + ptr.y * 0.08;
        const z = Math.sin(a) * rad;
        nodePos[i * 3] = x;
        nodePos[i * 3 + 1] = y;
        nodePos[i * 3 + 2] = z;
        nodeSize[i] = 10 + (i % 4) * 3 + take * 8 + urgent * 4;
        nodeCol[i * 3] = n.hue[0]!;
        nodeCol[i * 3 + 1] = n.hue[1]!;
        nodeCol[i * 3 + 2] = n.hue[2]!;
      }
      for (let e = 0; e < edges.length; e += 1) {
        const [ia, ib] = edges[e]!;
        const a = nodes[ia!]!;
        const b = nodes[ib!]!;
        linePos[e * 6] = nodePos[ia! * 3]!;
        linePos[e * 6 + 1] = nodePos[ia! * 3 + 1]!;
        linePos[e * 6 + 2] = nodePos[ia! * 3 + 2]!;
        linePos[e * 6 + 3] = nodePos[ib! * 3]!;
        linePos[e * 6 + 4] = nodePos[ib! * 3 + 1]!;
        linePos[e * 6 + 5] = nodePos[ib! * 3 + 2]!;
        lineCol[e * 6] = a.hue[0]!;
        lineCol[e * 6 + 1] = a.hue[1]!;
        lineCol[e * 6 + 2] = a.hue[2]!;
        lineCol[e * 6 + 3] = b.hue[0]!;
        lineCol[e * 6 + 4] = b.hue[1]!;
        lineCol[e * 6 + 5] = b.hue[2]!;
      }

      const graphMvp = mul(proj, mul(view, world));
      gl.bindBuffer(gl.ARRAY_BUFFER, linePosB);
      gl.bufferData(gl.ARRAY_BUFFER, linePos, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, lineColB);
      gl.bufferData(gl.ARRAY_BUFFER, lineCol, gl.DYNAMIC_DRAW);
      gl.depthMask(false);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.useProgram(lineProg);
      bindAttr(lineProg, "aPos", linePosB, 3);
      bindAttr(lineProg, "aCol", lineColB, 3);
      gl.uniformMatrix4fv(gl.getUniformLocation(lineProg, "uMVP"), false, graphMvp);
      gl.uniform1f(gl.getUniformLocation(lineProg, "uPulse"), pulse);
      gl.drawArrays(gl.LINES, 0, edges.length * 2);

      gl.bindBuffer(gl.ARRAY_BUFFER, nodePosB);
      gl.bufferData(gl.ARRAY_BUFFER, nodePos, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, nodeSizeB);
      gl.bufferData(gl.ARRAY_BUFFER, nodeSize, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, nodeColB);
      gl.bufferData(gl.ARRAY_BUFFER, nodeCol, gl.DYNAMIC_DRAW);
      gl.useProgram(sparkProg);
      bindAttr(sparkProg, "aPos", nodePosB, 3);
      bindAttr(sparkProg, "aSize", nodeSizeB, 1);
      bindAttr(sparkProg, "aCol", nodeColB, 3);
      gl.uniformMatrix4fv(gl.getUniformLocation(sparkProg, "uMVP"), false, graphMvp);
      gl.uniform1f(
        gl.getUniformLocation(sparkProg, "uDpr"),
        Math.min(window.devicePixelRatio || 1, 1.75),
      );
      gl.drawArrays(gl.POINTS, 0, nodeCount);

      for (let i = 0; i < parts.length; i += 1) {
        const p = parts[i]!;
        p.vx += ptr.x * 0.0003;
        p.vy += ptr.y * 0.00018;
        p.x += p.vx + ptr.x * 0.004;
        p.y += p.vy + take * 0.01 + ptr.down * 0.01;
        p.z += p.vz - ptr.y * 0.003;
        if (p.y > 2.3) p.y = -2.2;
        if (p.x > 3.6) p.x = -3.6;
        if (p.x < -3.6) p.x = 3.6;
        pPos[i * 3] = p.x;
        pPos[i * 3 + 1] = p.y;
        pPos[i * 3 + 2] = p.z;
        pSize[i] = p.s * (1 + take * 0.4 + ptr.down * 0.3);
        pCol[i * 3] = p.c[0]!;
        pCol[i * 3 + 1] = p.c[1]!;
        pCol[i * 3 + 2] = p.c[2]!;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, pPosB);
      gl.bufferData(gl.ARRAY_BUFFER, pPos, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, pSizeB);
      gl.bufferData(gl.ARRAY_BUFFER, pSize, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, pColB);
      gl.bufferData(gl.ARRAY_BUFFER, pCol, gl.DYNAMIC_DRAW);
      bindAttr(sparkProg, "aPos", pPosB, 3);
      bindAttr(sparkProg, "aSize", pSizeB, 1);
      bindAttr(sparkProg, "aCol", pColB, 3);
      const bill = mul(proj, mul(view, rotateY(ptr.x * 0.2)));
      gl.uniformMatrix4fv(gl.getUniformLocation(sparkProg, "uMVP"), false, bill);
      gl.drawArrays(gl.POINTS, 0, parts.length);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }

    raf = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("huepot:fx", onFx);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("wheel", onWheel);
    };
  }, []);

  return <canvas aria-hidden="true" className="fx-gl" ref={canvasRef} />;
}
