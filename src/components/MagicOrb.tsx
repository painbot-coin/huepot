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

function translate(x: number, y: number, z: number): Mat {
  const m = ident();
  m[12] = x;
  m[13] = y;
  m[14] = z;
  return m;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
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
uniform vec3 uColor;
uniform vec3 uLight;
uniform float uPulse;
uniform float uFog;
uniform float uLead;
uniform sampler2D uTex;
uniform float uHasTex;
void main() {
  vec3 n = normalize(vN);
  float ndl = max(dot(n, normalize(uLight)), 0.0);
  float cel = ndl > 0.82 ? 1.0 : ndl > 0.45 ? 0.7 : 0.28;
  float rim = pow(1.0 - max(dot(n, vec3(0.0, 0.2, 1.0)), 0.0), 2.8);
  vec2 uv = 0.5 + 0.5 * vec2(atan(vP.z, vP.x) / 3.14159, asin(clamp(vP.y, -1.0, 1.0)) / 1.5708);
  vec3 tex = uHasTex > 0.5 ? texture2D(uTex, uv + vec2(uPulse * 0.04, 0.0)).rgb : vec3(1.0);
  vec3 swirl = 0.5 + 0.5 * cos(6.2831 * (vP.y * 1.4 + uPulse) + uColor * 6.28);
  vec3 base = mix(uColor, uColor * tex, 0.55);
  base = mix(base, swirl * uColor, 0.22 + uPulse * 0.2);
  vec3 col = base * cel;
  col += rim * mix(vec3(1.0, 0.9, 0.65), uColor, 0.35) * (0.65 + uPulse * 0.8 + uLead * 0.4);
  col += uColor * uPulse * 0.35;
  float a = mix(0.96, 0.62, uFog);
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
void main() {
  vC = aCol;
  gl_Position = uMVP * vec4(aPos, 1.0);
  gl_PointSize = clamp(aSize * uDpr / max(0.35, gl_Position.w), 2.0, 42.0);
}
`;

const PFS = `
precision mediump float;
varying vec3 vC;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float d = length(p);
  if (d > 1.0) discard;
  gl_FragColor = vec4(vC, smoothstep(1.0, 0.15, d));
}
`;

function uvSphere(segments = 28, rings = 20) {
  const pos: number[] = [];
  const nrm: number[] = [];
  for (let y = 0; y < rings; y += 1) {
    const v0 = y / rings;
    const v1 = (y + 1) / rings;
    const phi0 = v0 * Math.PI;
    const phi1 = v1 * Math.PI;
    for (let x = 0; x < segments; x += 1) {
      const u0 = x / segments;
      const u1 = (x + 1) / segments;
      const th0 = u0 * Math.PI * 2;
      const th1 = u1 * Math.PI * 2;
      const p00 = [
        Math.sin(phi0) * Math.cos(th0),
        Math.cos(phi0),
        Math.sin(phi0) * Math.sin(th0),
      ];
      const p10 = [
        Math.sin(phi0) * Math.cos(th1),
        Math.cos(phi0),
        Math.sin(phi0) * Math.sin(th1),
      ];
      const p01 = [
        Math.sin(phi1) * Math.cos(th0),
        Math.cos(phi1),
        Math.sin(phi1) * Math.sin(th0),
      ];
      const p11 = [
        Math.sin(phi1) * Math.cos(th1),
        Math.cos(phi1),
        Math.sin(phi1) * Math.sin(th1),
      ];
      for (const p of [p00, p10, p11, p00, p11, p01]) {
        pos.push(p[0]!, p[1]!, p[2]!);
        nrm.push(p[0]!, p[1]!, p[2]!);
      }
    }
  }
  return {
    pos: new Float32Array(pos),
    nrm: new Float32Array(nrm),
    count: pos.length / 3,
  };
}

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

    const meshProg = program(gl, VS, FS);
    const sparkProg = program(gl, PVS, PFS);
    const sphere = uvSphere(24, 16);
    const posB = gl.createBuffer();
    const nrmB = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posB);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.pos, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, nrmB);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.nrm, gl.STATIC_DRAW);

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
      new Uint8Array([40, 20, 60]),
    );
    let hasTex = 0;
    const img = new Image();
    img.src = "/fx/huepot-orb-energy.jpg";
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      hasTex = 1;
    };

    const sparks = Array.from({ length: 28 }, () => ({
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
      s: 6,
    }));
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

    function burst() {
      const rgb = hexToRgb(stateRef.current.color);
      for (let i = 0; i < sparks.length; i += 1) {
        const a = Math.random() * Math.PI * 2;
        const b = Math.acos(Math.random() * 2 - 1);
        const sp = 0.04 + Math.random() * 0.12;
        sparks[i] = {
          x: Math.sin(b) * Math.cos(a) * 0.2,
          y: Math.cos(b) * 0.2,
          z: Math.sin(b) * Math.sin(a) * 0.2,
          vx: Math.sin(b) * Math.cos(a) * sp,
          vy: Math.cos(b) * sp + 0.02,
          vz: Math.sin(b) * Math.sin(a) * sp,
          life: 1,
          s: 8 + Math.random() * 14,
        };
        pCol[i * 3] = rgb[0];
        pCol[i * 3 + 1] = rgb[1];
        pCol[i * 3 + 2] = rgb[2];
      }
    }

    let lastSpark = false;
    let lastPressed = false;

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
    gl.depthFunc(gl.LEQUAL);
    gl.clearColor(0, 0, 0, 0);

    let raf = 0;
    let running = true;
    const t0 = performance.now();

    function draw(now: number) {
      if (!running) return;
      raf = requestAnimationFrame(draw);
      const t = (now - t0) / 1000;
      const st = stateRef.current;
      if ((st.spark && !lastSpark) || (st.pressed && !lastPressed)) burst();
      lastSpark = st.spark;
      lastPressed = st.pressed;
      ptr.x += (ptr.tx - ptr.x) * 0.14;
      ptr.y += (ptr.ty - ptr.y) * 0.14;

      const rgb = hexToRgb(st.color);
      const pulse =
        0.18 +
        (st.pressed ? 0.7 : 0) +
        (st.spark ? 0.85 : 0) +
        (st.winner ? 0.55 : 0) +
        (st.leading ? 0.25 + Math.sin(t * 6) * 0.1 : 0);
      const lead = st.leading || st.winner ? 1 : 0;
      const fog = st.fog ? 1 : 0;

      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const aspect = canvas!.width / Math.max(canvas!.height, 1);
      const model = mul(
        rotateX(0.35 + ptr.y * 0.55),
        rotateY(t * (0.55 + pulse * 0.8) + ptr.x * 0.9),
      );
      const view = translate(0, 0.05, -2.55 - (st.pressed ? 0.08 : 0));
      const mvp = mul(persp(0.9, aspect, 0.2, 20), mul(view, model));

      gl.depthMask(true);
      gl.useProgram(meshProg);
      bindAttr(meshProg, "aPos", posB, 3);
      bindAttr(meshProg, "aNrm", nrmB, 3);
      gl.uniformMatrix4fv(gl.getUniformLocation(meshProg, "uMVP"), false, mvp);
      gl.uniformMatrix4fv(gl.getUniformLocation(meshProg, "uN"), false, model);
      gl.uniform3f(gl.getUniformLocation(meshProg, "uColor"), rgb[0], rgb[1], rgb[2]);
      gl.uniform3f(
        gl.getUniformLocation(meshProg, "uLight"),
        0.8 + ptr.x,
        1.4 + ptr.y,
        2.2,
      );
      gl.uniform1f(gl.getUniformLocation(meshProg, "uPulse"), pulse);
      gl.uniform1f(gl.getUniformLocation(meshProg, "uFog"), fog);
      gl.uniform1f(gl.getUniformLocation(meshProg, "uLead"), lead);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(gl.getUniformLocation(meshProg, "uTex"), 0);
      gl.uniform1f(gl.getUniformLocation(meshProg, "uHasTex"), hasTex);
      gl.drawArrays(gl.TRIANGLES, 0, sphere.count);

      for (let i = 0; i < sparks.length; i += 1) {
        const s = sparks[i]!;
        if (s.life <= 0) {
          pSize[i] = 0;
          continue;
        }
        s.x += s.vx;
        s.y += s.vy;
        s.z += s.vz;
        s.vy -= 0.003;
        s.life *= 0.94;
        pPos[i * 3] = s.x;
        pPos[i * 3 + 1] = s.y;
        pPos[i * 3 + 2] = s.z;
        pSize[i] = s.s * s.life;
        pCol[i * 3] = rgb[0];
        pCol[i * 3 + 1] = rgb[1];
        pCol[i * 3 + 2] = rgb[2];
      }
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
    <canvas
      aria-hidden="true"
      className={`magic-orb-gl ${pressed ? "is-pressed" : ""} ${spark ? "is-spark" : ""}`}
      ref={canvasRef}
    />
  );
}
