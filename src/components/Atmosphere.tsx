"use client";

import { useEffect, useRef, useState } from "react";
import { FantasyWorld } from "@/components/FantasyWorld";
import type { FxDetail } from "@/lib/fx";

const PALETTE = [
  "#ff355e",
  "#ff6a2a",
  "#ffb020",
  "#d4ff2e",
  "#3dffb0",
  "#7af0ff",
  "#2ea8ff",
  "#8b5cff",
];

const TINT: Record<string, string> = {
  "#ff355e": "#ffb0c0",
  "#2ea8ff": "#9ad4ff",
  "#d4ff2e": "#e8ff9a",
  "#ffb020": "#ffd27a",
  "#8b5cff": "#d2c2ff",
  "#3dffb0": "#b8ffe4",
  "#ff6a2a": "#ffc4a8",
  "#7af0ff": "#d7fbff",
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  a: number;
  color: string;
  life: number;
  kind: "dust" | "ember" | "spark" | "streak" | "coin";
  spin: number;
  spinV: number;
};

type TickerItem = { id: number; text: string; color: string };

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function makeDust(w: number, h: number): Particle {
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    vx: rand(-0.18, 0.18),
    vy: rand(-0.42, -0.12),
    r: rand(2.2, 3.8),
    a: rand(0.7, 1),
    color: PALETTE[Math.floor(Math.random() * PALETTE.length)]!,
    life: rand(400, 900),
    kind: "dust",
    spin: 0,
    spinV: 0,
  };
}

function burst(w: number, h: number, color: string, count: number): Particle[] {
  const cx = w * 0.5;
  const cy = h * 0.42;
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = rand(1.2, 6);
    return {
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - rand(0.4, 1.8),
      r: rand(2.2, 4.2),
      a: 1,
      color,
      life: rand(40, 90),
      kind: "spark" as const,
      spin: 0,
      spinV: 0,
    };
  });
}

export function Atmosphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ticker, setTicker] = useState<TickerItem[]>([
    { id: 0, text: "Orbit graph · same price on every face", color: "#ffd27a" },
    { id: 1, text: "Crimson · Azure · Volt · Amber · Violet · Mint", color: "#ffb0c0" },
    { id: 2, text: "Biggest color takes the pot", color: "#9ad4ff" },
  ]);
  const [mode, setMode] = useState<"idle" | "urgent" | "take">("idle");
  const [foggy, setFoggy] = useState(false);
  const [wash, setWash] = useState("#ffb020");
  const reduced = useRef(false);
  const tickId = useRef(3);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced.current = media.matches;

    function onFx(event: CustomEvent<FxDetail>) {
      const detail = event.detail;
      if (!detail) return;
      const color = detail.color || "#ffb020";
      const tint = TINT[color.toLowerCase()] || "#f3efe6";
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
      if (detail.label) {
        const id = tickId.current++;
        setTicker((list) =>
          [{ id, text: detail.label!, color: tint }, ...list].slice(0, 8),
        );
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
    const starImg = new Image();
    const flareImg = new Image();
    sparkImg.src = "/fx/spark.png";
    starImg.src = "/fx/star.png";
    flareImg.src = "/fx/flare.png";

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

    function seed() {
      particles.length = 0;
      const dust = Math.min(28, Math.floor((w * h) / 36000));
      for (let i = 0; i < dust; i += 1) particles.push(makeDust(w, h));
    }

    function tossCoins(color: string, count: number, fromBottom = false) {
      for (let i = 0; i < count; i += 1) {
        particles.push({
          x: fromBottom ? rand(w * 0.18, w * 0.82) : w * 0.5 + rand(-80, 80),
          y: fromBottom ? h + 12 : h * 0.42,
          vx: rand(-1.4, 1.4),
          vy: fromBottom ? rand(-3.4, -1.6) : rand(-2.8, -0.6),
          r: rand(8, 16),
          a: 1,
          color,
          life: rand(70, 120),
          kind: "coin",
          spin: rand(0, Math.PI * 2),
          spinV: rand(-0.08, 0.08),
        });
      }
    }

    function onFx(event: CustomEvent<FxDetail>) {
      const detail = event.detail;
      if (!detail) return;
      const color = detail.color || "#ffb020";
      if (detail.kind === "take") {
        particles.push(...burst(w, h, color, 36));
        particles.push(...burst(w, h, "#ffd27a", 12));
        tossCoins(color, 8);
      } else if (detail.kind === "click") {
        particles.push(...burst(w, h, color, 8));
      } else if (detail.kind === "pot") {
        tossCoins("#ffb020", 4, true);
      }
    }

    resize();
    seed();
    window.addEventListener("resize", resize);
    window.addEventListener("huepot:fx", onFx);

    const flavor = [
      { text: "Constellation rings over the pit", color: "#ffd27a" },
      { text: "Chrono gem ticking down", color: "#ffb0c0" },
      { text: "Azure tide rolling in", color: "#9ad4ff" },
      { text: "Volt spark on the floor", color: "#e8ff9a" },
      { text: "Mint glass in the felt", color: "#b8ffe4" },
      { text: "Violet lanterns overhead", color: "#d2c2ff" },
      { text: "Frost gleam on the rail", color: "#d7fbff" },
      { text: "Same price on every coin", color: "#f3efe6" },
      { text: "Fog Pit hides the board late", color: "#c9c4d8" },
    ];
    const flavorTimer = window.setInterval(() => {
      const pick = flavor[Math.floor(Math.random() * flavor.length)]!;
      const id = tickId.current++;
      setTicker((list) => [{ id, text: pick.text, color: pick.color }, ...list].slice(0, 8));
    }, 12000);

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
        if (p.kind === "spark" || p.kind === "ember") {
          p.vy += 0.04;
          p.a *= 0.97;
        }
        if (p.kind === "coin" && p.life < 80) {
          p.a *= 0.98;
        }
        if (p.kind === "dust" || (p.kind === "coin" && p.life > 200)) {
          if (p.y < -24) p.y = h + 16;
          if (p.y > h + 24) p.y = -16;
          if (p.x < -24) p.x = w + 16;
          if (p.x > w + 24) p.x = -16;
        }
        if (p.kind === "coin" && p.life < 200) {
          p.vy += 0.045;
        }
        if (p.life <= 0 || p.a < 0.03) {
          if (p.kind === "dust") particles[i] = makeDust(w, h);
          else particles.splice(i, 1);
          continue;
        }
        ctx.shadowBlur = 0;
        if (p.kind === "spark" && sparkImg.complete && sparkImg.naturalWidth) {
          ctx.save();
          ctx.globalCompositeOperation = "screen";
          ctx.globalAlpha = Math.max(0, p.a);
          const size = p.r * 6;
          ctx.drawImage(sparkImg, p.x - size / 2, p.y - size / 2, size, size);
          ctx.restore();
          continue;
        }
        if (p.kind === "streak" && flareImg.complete && flareImg.naturalWidth) {
          ctx.save();
          ctx.globalCompositeOperation = "screen";
          ctx.globalAlpha = Math.max(0, p.a * 0.85);
          ctx.translate(p.x, p.y);
          ctx.rotate(Math.atan2(p.vy, p.vx));
          ctx.drawImage(flareImg, -18, -18, 36, 36);
          ctx.restore();
          continue;
        }
        if (p.kind === "dust" && starImg.complete && starImg.naturalWidth) {
          ctx.save();
          ctx.globalCompositeOperation = "screen";
          ctx.globalAlpha = Math.max(0.25, p.a * 0.7);
          const size = p.r * 3.4;
          ctx.drawImage(starImg, p.x - size / 2, p.y - size / 2, size, size);
          ctx.restore();
          continue;
        }
        if (p.kind === "coin") {
          ctx.save();
          ctx.globalAlpha = Math.max(0.35, p.a);
          ctx.translate(p.x, p.y);
          ctx.rotate(p.spin);
          ctx.scale(1, 0.62);
          ctx.beginPath();
          ctx.arc(0, 0, p.r, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
          ctx.lineWidth = Math.max(1.6, p.r * 0.18);
          ctx.strokeStyle = "rgba(255, 220, 150, 0.95)";
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 0, p.r * 0.58, 0, Math.PI * 2);
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
          ctx.stroke();
          ctx.restore();
          continue;
        }
        ctx.globalAlpha = p.kind === "dust" ? Math.max(0.55, p.a) : Math.max(0, p.a);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.kind === "streak" ? 10 : 6;
        if (p.kind === "streak") {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 6, p.y - p.vy * 6);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
    }

    frame = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(frame);
      window.clearInterval(flavorTimer);
      window.removeEventListener("resize", resize);
      window.removeEventListener("huepot:fx", onFx);
    };
  }, []);

  return (
    <>
    <div aria-hidden="true" className={`fx-root is-realm is-live3d is-${mode} ${foggy ? "is-fog" : ""}`}>
      <div className="fx-realm" />
      <div className="fx-prism" />
      <div className="fx-gold-grain" />
      <div className="fx-spark-field" />
      <FantasyWorld foggy={foggy} mode={mode} />
      <div className="fx-aurora fx-aurora-a" />
      <div className="fx-aurora fx-aurora-b" />
      <div className="fx-aurora fx-aurora-c" />
      <div className="fx-aurora fx-aurora-d" />
      <div className="fx-shine" />
      <div
        className="fx-wash"
        style={{ background: `radial-gradient(circle at 50% 18%, ${wash}28, transparent 46%)` }}
      />
      <div className="fx-mist" />
      <canvas className="fx-canvas" ref={canvasRef} />
      <div className="fx-vignette" />
    </div>
    <div aria-hidden="true" className="fx-ticker">
      <div className="fx-ticker-track">
        {[...ticker, ...ticker].map((item, index) => (
          <span key={`${item.id}-${index}`} style={{ color: item.color }}>
            {item.text}
          </span>
        ))}
      </div>
    </div>
    </>
  );
}
