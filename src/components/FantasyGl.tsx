"use client";

import { useEffect, useRef } from "react";
import type { FxDetail } from "@/lib/fx";

const VS = `
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

const FS = `
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
  float a = mix(0.88, 0.55, uFog);
  gl_FragColor = vec4(col, a);
}
`;

const PVS = `
attribute vec3 aPos;
attribute float aSize;
attribute vec3 aCol;
uniform mat4 uMVP;
uniform float uDpr;
varying vec3 vC;
varying float vLife;
void main() {
  vC = aCol;
  vLife = aSize;
  gl_Position = uMVP * vec4(aPos, 1.0);
  gl_PointSize = clamp(aSize * uDpr * (1.6 / max(0.35, gl_Position.w)), 2.0, 48.0);
}
`;

const PFS = `
precision mediump float;
varying vec3 vC;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float d = length(p);
  if (d > 1.0) discard;
  float petal = smoothstep(1.0, 0.15, d) * (0.55 + 0.45 * (1.0 - abs(p.x)));
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
uniform sampler2D uTex;
uniform float uT;
uniform float uTake;
void main() {
  vec2 uv = vUv;
  uv.x += sin(uv.y * 6.0 + uT * 0.35) * 0.008;
  uv.y += cos(uv.x * 5.0 + uT * 0.22) * 0.01;
  vec4 tex = texture2D(uTex, uv);
  vec3 glow = 0.5 + 0.5 * cos(uT * 0.4 + vec3(0.0, 2.0, 4.0));
  vec3 col = mix(tex.rgb, tex.rgb * (1.0 + glow * 0.18), 0.65);
  col += glow * uTake * 0.22;
  gl_FragColor = vec4(col, 0.42);
}
`;

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

function lookAt(): Mat {
  const m = ident();
  m[14] = -4.15;
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

function icosahedron() {
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
  const hues = [
    [1, 0.21, 0.37],
    [1, 0.42, 0.16],
    [1, 0.69, 0.13],
    [0.83, 1, 0.18],
    [0.24, 1, 0.69],
    [0.48, 0.94, 1],
    [0.18, 0.66, 1],
    [0.55, 0.36, 1],
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
    const hue = hues[i % hues.length]!;
    for (const v of [a, b, c]) {
      pos.push(v[0]! * 0.92, v[1]! * 0.92, v[2]! * 0.92);
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

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
    });
    if (!gl) return;

    const crystal = program(gl, VS, FS);
    const sparks = program(gl, PVS, PFS);
    const backdrop = program(gl, BVS, BFS);
    const mesh = icosahedron();

    function buf(data: Float32Array) {
      const b = gl!.createBuffer();
      gl!.bindBuffer(gl!.ARRAY_BUFFER, b);
      gl!.bufferData(gl!.ARRAY_BUFFER, data, gl!.STATIC_DRAW);
      return b;
    }

    const posB = buf(mesh.pos);
    const nrmB = buf(mesh.nrm);
    const colB = buf(mesh.col);

    const quad = buf(new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]));
    const tex = gl.createTexture();
    const img = new Image();
    img.src = "/fx/huepot-realm.jpg";
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    };

    const count = Math.min(96, Math.floor((window.innerWidth * window.innerHeight) / 18000));
    const parts = Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 6,
      y: (Math.random() - 0.5) * 3.4,
      z: (Math.random() - 0.5) * 4,
      vx: (Math.random() - 0.5) * 0.012,
      vy: 0.004 + Math.random() * 0.01,
      vz: (Math.random() - 0.5) * 0.01,
      s: 6 + Math.random() * 14,
      c: [
        [1, 0.45, 0.62],
        [1, 0.82, 0.42],
        [0.55, 0.9, 1],
        [0.72, 0.48, 1],
        [1, 0.28, 0.42],
      ][Math.floor(Math.random() * 5)] as [number, number, number],
    }));
    const pPos = new Float32Array(count * 3);
    const pSize = new Float32Array(count);
    const pCol = new Float32Array(count * 3);
    const pPosB = gl.createBuffer();
    const pSizeB = gl.createBuffer();
    const pColB = gl.createBuffer();

    let burst = 0;
    function onFx(event: CustomEvent<FxDetail>) {
      if (event.detail?.kind === "take" || event.detail?.kind === "click") {
        burst = 1;
      }
    }
    window.addEventListener("huepot:fx", onFx);

    function bindAttr(
      prog: WebGLProgram,
      name: string,
      buffer: WebGLBuffer | null,
      size: number,
    ) {
      const loc = gl!.getAttribLocation(prog, name);
      if (loc < 0) return;
      gl!.bindBuffer(gl!.ARRAY_BUFFER, buffer);
      gl!.enableVertexAttribArray(loc);
      gl!.vertexAttribPointer(loc, size, gl!.FLOAT, false, 0, 0);
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
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
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

    function draw(now: number) {
      if (!running) return;
      raf = requestAnimationFrame(draw);
      const t = (now - t0) / 1000;
      burst *= 0.94;
      const take = modeRef.current === "take" ? 1 : burst;
      const urgent = modeRef.current === "urgent" ? 1 : 0;
      const fog = fogRef.current ? 1 : 0;

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.useProgram(backdrop);
      gl.depthMask(false);
      bindAttr(backdrop, "aUv", quad, 2);
      gl.uniform1f(gl.getUniformLocation(backdrop, "uT"), t);
      gl.uniform1f(gl.getUniformLocation(backdrop, "uTake"), take);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(gl.getUniformLocation(backdrop, "uTex"), 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      const aspect = w / Math.max(h, 1);
      const mvp = mul(
        persp(0.72, aspect, 0.2, 20),
        mul(lookAt(), mul(rotateX(0.42 + Math.sin(t * 0.35) * 0.08), rotateY(t * 0.42))),
      );
      const nmat = mul(rotateX(0.42), rotateY(t * 0.42));

      gl.depthMask(true);
      gl.useProgram(crystal);
      bindAttr(crystal, "aPos", posB, 3);
      bindAttr(crystal, "aNrm", nrmB, 3);
      bindAttr(crystal, "aCol", colB, 3);
      gl.uniformMatrix4fv(gl.getUniformLocation(crystal, "uMVP"), false, mvp);
      gl.uniformMatrix4fv(gl.getUniformLocation(crystal, "uN"), false, nmat);
      gl.uniform3f(gl.getUniformLocation(crystal, "uLight"), 1.4, 2.2, 3.2);
      gl.uniform1f(gl.getUniformLocation(crystal, "uPulse"), 0.22 + take * 0.7 + urgent * 0.25);
      gl.uniform1f(gl.getUniformLocation(crystal, "uFog"), fog);
      gl.drawArrays(gl.TRIANGLES, 0, mesh.count);

      for (let i = 0; i < parts.length; i += 1) {
        const p = parts[i]!;
        p.x += p.vx;
        p.y += p.vy + take * 0.01;
        p.z += p.vz;
        if (p.y > 2.2) p.y = -2.1;
        if (p.x > 3.4) p.x = -3.4;
        if (p.x < -3.4) p.x = 3.4;
        pPos[i * 3] = p.x;
        pPos[i * 3 + 1] = p.y;
        pPos[i * 3 + 2] = p.z;
        pSize[i] = p.s * (1 + take * 0.45);
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

      gl.depthMask(false);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.useProgram(sparks);
      bindAttr(sparks, "aPos", pPosB, 3);
      bindAttr(sparks, "aSize", pSizeB, 1);
      bindAttr(sparks, "aCol", pColB, 3);
      const bill = mul(persp(0.72, aspect, 0.2, 20), lookAt());
      gl.uniformMatrix4fv(gl.getUniformLocation(sparks, "uMVP"), false, bill);
      gl.uniform1f(
        gl.getUniformLocation(sparks, "uDpr"),
        Math.min(window.devicePixelRatio || 1, 1.75),
      );
      gl.drawArrays(gl.POINTS, 0, parts.length);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }

    raf = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("huepot:fx", onFx);
    };
  }, []);

  return <canvas aria-hidden="true" className="fx-gl" ref={canvasRef} />;
}
