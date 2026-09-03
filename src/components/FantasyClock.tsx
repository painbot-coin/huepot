"use client";

import { useEffect, useRef } from "react";

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

function translate(x: number, y: number, z: number): Mat {
  const m = ident();
  m[12] = x;
  m[13] = y;
  m[14] = z;
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

const VS = `
attribute vec3 aPos;
attribute vec3 aNrm;
uniform mat4 uMVP;
uniform mat4 uN;
varying vec3 vN;
varying vec3 vP;
void main() {
  vN = mat3(uN) * aNrm;
  vP = aPos;
  gl_Position = uMVP * vec4(aPos, 1.0);
}
`;

const FS = `
precision mediump float;
varying vec3 vN;
varying vec3 vP;
uniform float uProgress;
uniform float uUrgent;
uniform float uPulse;
uniform float uFog;
uniform vec3 uTint;
void main() {
  float ang = atan(vP.y, vP.x);
  float a = fract((ang + 3.14159265) / 6.2831853 - 0.25);
  float ring = length(vP.xy);
  bool face = abs(vP.z) < 0.08 && ring > 0.72 && ring < 1.08;
  if (face && a > uProgress + 0.002) discard;

  vec3 n = normalize(vN);
  float ndl = max(dot(n, normalize(vec3(0.4, 0.7, 1.0))), 0.0);
  float cel = ndl > 0.75 ? 1.0 : ndl > 0.4 ? 0.62 : 0.28;
  float rim = pow(1.0 - max(dot(n, vec3(0.0, 0.1, 1.0)), 0.0), 2.4);
  vec3 rainbow = 0.5 + 0.5 * cos(6.2831 * (a + uPulse * 0.2) + vec3(0.0, 2.094, 4.188));
  vec3 gold = vec3(1.0, 0.82, 0.42);
  vec3 base = mix(gold, rainbow, 0.45 + uUrgent * 0.25);
  base = mix(base, uTint, 0.22 + uFog * 0.2);
  vec3 col = base * cel + rim * gold * (0.55 + uUrgent * 0.45);
  col += rainbow * uPulse * 0.2;
  if (face && a > uProgress - 0.03 && a <= uProgress) {
    col = mix(col, vec3(1.0, 0.95, 0.75), 0.7);
  }
  float alpha = face ? 0.95 : 0.82;
  gl_FragColor = vec4(col, alpha);
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
  gl_PointSize = clamp(aSize * uDpr / max(0.4, gl_Position.w), 2.0, 28.0);
}
`;

const PFS = `
precision mediump float;
varying vec3 vC;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float d = length(p);
  if (d > 1.0) discard;
  gl_FragColor = vec4(vC, smoothstep(1.0, 0.2, d));
}
`;

function buildRing(segments = 96) {
  const pos: number[] = [];
  const nrm: number[] = [];
  const r0 = 0.78;
  const r1 = 1.02;
  const z = 0.06;
  for (let i = 0; i < segments; i += 1) {
    const t0 = (i / segments) * Math.PI * 2;
    const t1 = ((i + 1) / segments) * Math.PI * 2;
    const c0 = Math.cos(t0);
    const s0 = Math.sin(t0);
    const c1 = Math.cos(t1);
    const s1 = Math.sin(t1);
    const quads: number[][] = [
      [r0 * c0, r0 * s0, z, r1 * c0, r1 * s0, z, r1 * c1, r1 * s1, z],
      [r0 * c0, r0 * s0, z, r1 * c1, r1 * s1, z, r0 * c1, r0 * s1, z],
      [r0 * c0, r0 * s0, -z, r1 * c1, r1 * s1, -z, r1 * c0, r1 * s0, -z],
      [r0 * c0, r0 * s0, -z, r0 * c1, r0 * s1, -z, r1 * c1, r1 * s1, -z],
      [r1 * c0, r1 * s0, -z, r1 * c0, r1 * s0, z, r1 * c1, r1 * s1, z],
      [r1 * c0, r1 * s0, -z, r1 * c1, r1 * s1, z, r1 * c1, r1 * s1, -z],
      [r0 * c0, r0 * s0, z, r0 * c0, r0 * s0, -z, r0 * c1, r0 * s1, -z],
      [r0 * c0, r0 * s0, z, r0 * c1, r0 * s1, -z, r0 * c1, r0 * s1, z],
    ];
    for (const q of quads) {
      const ax = q[3]! - q[0]!;
      const ay = q[4]! - q[1]!;
      const az = q[5]! - q[2]!;
      const bx = q[6]! - q[0]!;
      const by = q[7]! - q[1]!;
      const bz = q[8]! - q[2]!;
      let nx = ay * bz - az * by;
      let ny = az * bx - ax * bz;
      let nz = ax * by - ay * bx;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;
      for (let k = 0; k < 9; k += 3) {
        pos.push(q[k]!, q[k + 1]!, q[k + 2]!);
        nrm.push(nx, ny, nz);
      }
    }
  }
  // center gem (octahedron)
  const gem = [
    [0, 0.28, 0],
    [0.22, 0, 0.22],
    [-0.22, 0, 0.22],
    [0, -0.28, 0],
    [0.22, 0, -0.22],
    [-0.22, 0, -0.22],
  ];
  const faces = [
    [0, 1, 2],
    [0, 2, 5],
    [0, 5, 4],
    [0, 4, 1],
    [3, 2, 1],
    [3, 5, 2],
    [3, 4, 5],
    [3, 1, 4],
  ];
  for (const f of faces) {
    const a = gem[f[0]!]!;
    const b = gem[f[1]!]!;
    const c = gem[f[2]!]!;
    let nx = (a[0]! + b[0]! + c[0]!) / 3;
    let ny = (a[1]! + b[1]! + c[1]!) / 3;
    let nz = (a[2]! + b[2]! + c[2]!) / 3;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    for (const v of [a, b, c]) {
      pos.push(v[0]!, v[1]!, v[2]!);
      nrm.push(nx, ny, nz);
    }
  }
  return {
    pos: new Float32Array(pos),
    nrm: new Float32Array(nrm),
    count: pos.length / 3,
  };
}

export function FantasyClock({
  progress,
  label,
  urgent = false,
  paused = false,
  fog = false,
}: {
  progress: number;
  label: string;
  urgent?: boolean;
  paused?: boolean;
  fog?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(progress);
  const urgentRef = useRef(urgent);
  const fogRef = useRef(fog);
  const pausedRef = useRef(paused);
  progressRef.current = Math.max(0, Math.min(1, progress));
  urgentRef.current = urgent;
  fogRef.current = fog;
  pausedRef.current = paused;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const got = canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
    });
    if (!got) return;
    const gl: WebGLRenderingContext = got;

    const meshProg = program(gl, VS, FS);
    const sparkProg = program(gl, PVS, PFS);
    const mesh = buildRing();
    const posB = gl.createBuffer();
    const nrmB = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posB);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.pos, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, nrmB);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.nrm, gl.STATIC_DRAW);

    const sparks = Array.from({ length: 36 }, (_, i) => {
      const a = (i / 36) * Math.PI * 2;
      return {
        a,
        r: 0.88 + (i % 3) * 0.05,
        s: 4 + (i % 4),
        c: (
          [
            [1, 0.35, 0.45],
            [1, 0.75, 0.3],
            [0.45, 0.85, 1],
            [0.7, 0.45, 1],
          ] as [number, number, number][]
        )[i % 4]!,
      };
    });
    const pPos = new Float32Array(sparks.length * 3);
    const pSize = new Float32Array(sparks.length);
    const pCol = new Float32Array(sparks.length * 3);
    const pPosB = gl.createBuffer();
    const pSizeB = gl.createBuffer();
    const pColB = gl.createBuffer();

    const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
    function onMove(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      ptr.tx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ptr.ty = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    }
    function onLeave() {
      ptr.tx = 0;
      ptr.ty = 0;
    }
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);

    function bindAttr(prog: WebGLProgram, name: string, buffer: WebGLBuffer | null, size: number) {
      const loc = gl.getAttribLocation(prog, name);
      if (loc < 0) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas!.getBoundingClientRect();
      canvas!.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas!.height = Math.max(1, Math.floor(rect.height * dpr));
      gl.viewport(0, 0, canvas!.width, canvas!.height);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.DEPTH_TEST);

    let raf = 0;
    let running = true;
    const t0 = performance.now();

    function draw(now: number) {
      if (!running) return;
      raf = requestAnimationFrame(draw);
      const t = (now - t0) / 1000;
      ptr.x += (ptr.tx - ptr.x) * 0.12;
      ptr.y += (ptr.ty - ptr.y) * 0.12;
      const progress = pausedRef.current ? progressRef.current : progressRef.current;
      const urgent = urgentRef.current ? 1 : 0;
      const fog = fogRef.current ? 1 : 0;
      const pulse = 0.2 + urgent * (0.35 + Math.sin(t * 8) * 0.2);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const aspect = canvas!.width / Math.max(canvas!.height, 1);
      const spin = pausedRef.current ? 0 : t * (0.35 + urgent * 0.55);
      const model = mul(
        rotateX(0.55 + ptr.y * 0.45),
        mul(rotateY(ptr.x * 0.7), rotateZ(spin * 0.15)),
      );
      const view = translate(0, 0, -3.1);
      const mvp = mul(persp(0.85, aspect, 0.2, 20), mul(view, model));

      gl.depthMask(true);
      gl.useProgram(meshProg);
      bindAttr(meshProg, "aPos", posB, 3);
      bindAttr(meshProg, "aNrm", nrmB, 3);
      gl.uniformMatrix4fv(gl.getUniformLocation(meshProg, "uMVP"), false, mvp);
      gl.uniformMatrix4fv(gl.getUniformLocation(meshProg, "uN"), false, model);
      gl.uniform1f(gl.getUniformLocation(meshProg, "uProgress"), progress);
      gl.uniform1f(gl.getUniformLocation(meshProg, "uUrgent"), urgent);
      gl.uniform1f(gl.getUniformLocation(meshProg, "uPulse"), pulse);
      gl.uniform1f(gl.getUniformLocation(meshProg, "uFog"), fog);
      gl.uniform3f(
        gl.getUniformLocation(meshProg, "uTint"),
        fog ? 0.75 : 1,
        fog ? 0.78 : 0.85,
        fog ? 0.95 : 0.55,
      );
      gl.drawArrays(gl.TRIANGLES, 0, mesh.count);

      const hand = progress * Math.PI * 2 - Math.PI / 2;
      for (let i = 0; i < sparks.length; i += 1) {
        const s = sparks[i]!;
        const a = s.a + spin * 0.4;
        const live = ((a / (Math.PI * 2) + 1) % 1) <= progress + 0.02;
        const rr = s.r + Math.sin(t * 2 + i) * 0.02;
        pPos[i * 3] = Math.cos(a) * rr;
        pPos[i * 3 + 1] = Math.sin(a) * rr;
        pPos[i * 3 + 2] = Math.sin(t * 3 + i) * 0.05;
        pSize[i] = live ? s.s * (1 + urgent * 0.5) : s.s * 0.35;
        pCol[i * 3] = s.c[0]!;
        pCol[i * 3 + 1] = s.c[1]!;
        pCol[i * 3 + 2] = s.c[2]!;
      }
      // hand tip spark
      const tip = sparks.length - 1;
      pPos[tip * 3] = Math.cos(hand) * 0.95;
      pPos[tip * 3 + 1] = Math.sin(hand) * 0.95;
      pPos[tip * 3 + 2] = 0.12;
      pSize[tip] = 14 + urgent * 8;
      pCol[tip * 3] = 1;
      pCol[tip * 3 + 1] = 0.9;
      pCol[tip * 3 + 2] = 0.55;

      gl.bindBuffer(gl.ARRAY_BUFFER, pPosB);
      gl.bufferData(gl.ARRAY_BUFFER, pPos, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, pSizeB);
      gl.bufferData(gl.ARRAY_BUFFER, pSize, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, pColB);
      gl.bufferData(gl.ARRAY_BUFFER, pCol, gl.DYNAMIC_DRAW);

      gl.depthMask(false);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.useProgram(sparkProg);
      bindAttr(sparkProg, "aPos", pPosB, 3);
      bindAttr(sparkProg, "aSize", pSizeB, 1);
      bindAttr(sparkProg, "aCol", pColB, 3);
      gl.uniformMatrix4fv(gl.getUniformLocation(sparkProg, "uMVP"), false, mvp);
      gl.uniform1f(
        gl.getUniformLocation(sparkProg, "uDpr"),
        Math.min(window.devicePixelRatio || 1, 2),
      );
      gl.drawArrays(gl.POINTS, 0, sparks.length);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }

    raf = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`fantasy-clock ${urgent ? "is-urgent" : ""} ${fog ? "is-fog" : ""} ${paused ? "is-paused" : ""}`}
    >
      <canvas className="fantasy-clock-gl" ref={canvasRef} />
      <div className="fantasy-clock-face">
        <span className="fantasy-clock-kicker">{paused ? "Paused" : fog ? "Fog clock" : "Round clock"}</span>
        <span className={`fantasy-clock-time ${urgent ? "is-urgent" : ""}`}>{label}</span>
      </div>
    </div>
  );
}
