"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { FantasyWorld } from "@/components/FantasyWorld";
import type { FxDetail } from "@/lib/fx";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  a: number;
  color: string;
  life: number;
  kind: "spark" | "coin";
  spin: number;
  spinV: number;
};

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function burst(w: number, h: number, color: string, count: number): Particle[] {
  const cx = w * 0.5;
  const cy = h * 0.42;
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = rand(1.2, 5);
    return {
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - rand(0.4, 1.6),
      r: rand(2.2, 3.8),
      a: 1,
      color,
      life: rand(36, 80),
      kind: "spark" as const,
      spin: 0,
      spinV: 0,
    };
  });
}

export function Atmosphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<"idle" | "urgent" | "take">("idle");
  const [foggy, setFoggy] = useState(false);
  const [wash, setWash] = useState("#ffb020");
  const reduced = useRef(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced.current = media.matches;

    function onFx(event: CustomEvent<FxDetail>) {
      const detail = event.detail;
      if (!detail) return;
      const color = detail.color || "#ffb020";
      if (detail.kind === "take") {
        setFoggy(false);
        setMode("take");
        setWash(color);
        window.setTimeout(() => setMode("idle"), 4200);
      } else if (detail.kind === "urgent") {
        setMode("urgent");
      } else if (detail.kind === "fog") {
        setFoggy(true);
        setWash("#c9c4d8");
      } else if (detail.kind === "round") {
        setFoggy(false);
        setMode("idle");
      }
    }

    window.addEventListener("huepot:fx", onFx);
    return () => window.removeEventListener("huepot:fx", onFx);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reduced.current) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let frame = 0;
    const particles: Particle[] = [];
    let running = true;
    const sparkImg = new Image();
    sparkImg.src = "/fx/spark.png";

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function tossCoins(color: string, count: number, fromBottom = false) {
      for (let i = 0; i < count; i += 1) {
        particles.push({
          x: fromBottom ? rand(w * 0.18, w * 0.82) : w * 0.5 + rand(-80, 80),
          y: fromBottom ? h + 12 : h * 0.42,
          vx: rand(-1.2, 1.2),
          vy: fromBottom ? rand(-3.2, -1.6) : rand(-2.6, -0.6),
          r: rand(7, 13),
          a: 1,
          color,
          life: rand(60, 100),
          kind: "coin",
          spin: rand(0, Math.PI * 2),
          spinV: rand(-0.07, 0.07),
        });
      }
    }

    function onFx(event: CustomEvent<FxDetail>) {
      const detail = event.detail;
      if (!detail) return;
      const color = detail.color || "#ffb020";
      if (detail.kind === "take") {
        particles.push(...burst(w, h, color, 26));
        tossCoins(color, 6);
      } else if (detail.kind === "click") {
        particles.push(...burst(w, h, color, 6));
      } else if (detail.kind === "pot") {
        tossCoins("#ffb020", 3, true);
      }
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("huepot:fx", onFx);

    function draw() {
      if (!running || !ctx) return;
      frame = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, w, h);

      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i]!;
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1;
        p.spin += p.spinV;
        if (p.kind === "spark") {
          p.vy += 0.04;
          p.a *= 0.97;
        } else {
          p.vy += 0.045;
          if (p.life < 70) p.a *= 0.98;
        }
        if (p.life <= 0 || p.a < 0.03) {
          particles.splice(i, 1);
          continue;
        }
        if (p.kind === "spark") {
          if (sparkImg.complete && sparkImg.naturalWidth) {
            ctx.save();
            ctx.globalCompositeOperation = "screen";
            ctx.globalAlpha = Math.max(0, p.a);
            const size = p.r * 5;
            ctx.drawImage(sparkImg, p.x - size / 2, p.y - size / 2, size, size);
            ctx.restore();
          } else {
            ctx.globalAlpha = Math.max(0, p.a);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
          }
          continue;
        }
        ctx.save();
        ctx.globalAlpha = Math.max(0.3, p.a);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.spin);
        ctx.scale(1, 0.62);
        ctx.beginPath();
        ctx.arc(0, 0, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.lineWidth = Math.max(1.4, p.r * 0.16);
        ctx.strokeStyle = "rgba(255, 220, 150, 0.9)";
        ctx.stroke();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    frame = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("huepot:fx", onFx);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`fx-root is-realm is-live3d is-${mode} ${foggy ? "is-fog" : ""}`}
      style={{ "--take": wash } as CSSProperties}
    >
      <div className="fx-realm" />
      <div className="fx-gold-grain" />
      <FantasyWorld foggy={foggy} mode={mode} />
      <div className="fx-aurora fx-aurora-a" />
      <div className="fx-aurora fx-aurora-b" />
      <div className="fx-wash" />
      <div className="fx-mist" />
      <canvas className="fx-canvas" ref={canvasRef} />
      <div className="fx-vignette" />
    </div>
  );
}
