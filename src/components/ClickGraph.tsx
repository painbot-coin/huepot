"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type PointerEvent,
} from "react";
import { colorById, type ColorId } from "@/lib/colors";
import {
  axisTicks,
  graphScale,
  headMarks,
  holdScale,
  holdTotals,
  plotX,
  plotY,
  pushSample,
  readRoundClock,
  stacksForColor,
  syncRoundClock,
  timeBarPct,
  withLiveTip,
  type ClickSample,
  type PlotBox,
  type RoundClock,
} from "@/lib/click-graph";
import { formatGraphClock, formatUsdt } from "@/lib/money";
import type { PublicSeat } from "@/lib/types";

const PAD = { left: 36, right: 18, top: 36, bottom: 22 };

function plotBox(width: number, height: number): PlotBox {
  return {
    left: PAD.left,
    top: PAD.top,
    width: Math.max(1, width - PAD.left - PAD.right),
    height: Math.max(1, height - PAD.top - PAD.bottom),
  };
}

function strokeSteps(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  floor?: number,
) {
  if (points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i - 1].y);
    ctx.lineTo(points[i].x, points[i].y);
  }
  if (floor != null) {
    ctx.lineTo(points[points.length - 1].x, floor);
    ctx.lineTo(points[0].x, floor);
    ctx.closePath();
  }
}

function drawChart(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  series: ClickSample[],
  buttonIds: ColorId[],
  totals: Record<ColorId, number>,
  t: number,
  scale: number,
  fog: boolean,
  urgent: boolean,
  revealing: boolean,
  winners: ColorId[],
) {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const box = plotBox(width, height);
  const live = withLiveTip(series, t, totals, buttonIds);
  const axis = Math.max(1, scale);

  ctx.fillStyle = "#07080d";
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.beginPath();
  ctx.rect(box.left, box.top, box.width, box.height);
  ctx.clip();

  ctx.strokeStyle = urgent ? "rgba(255, 53, 94, 0.12)" : "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = box.top + (box.height * i) / 4;
    ctx.beginPath();
    ctx.moveTo(box.left, y);
    ctx.lineTo(box.left + box.width, y);
    ctx.stroke();
  }
  for (let i = 0; i <= 6; i++) {
    const x = box.left + (box.width * i) / 6;
    ctx.beginPath();
    ctx.moveTo(x, box.top);
    ctx.lineTo(x, box.top + box.height);
    ctx.stroke();
  }

  const playX = plotX(t, box);
  ctx.strokeStyle = urgent ? "rgba(255, 53, 94, 0.45)" : "rgba(255, 255, 255, 0.12)";
  ctx.setLineDash([3, 5]);
  ctx.beginPath();
  ctx.moveTo(playX, box.top);
  ctx.lineTo(playX, box.top + box.height);
  ctx.stroke();
  ctx.setLineDash([]);

  for (const id of buttonIds) {
    const color = colorById(id);
    const taken = revealing && winners.includes(id);
    const dimmed = revealing && winners.length > 0 && !taken;
    const points = live.map((sample) => ({
      x: plotX(sample.t, box),
      y: plotY(sample.totals[id] ?? 0, axis, box),
    }));
    if (points.length < 2) continue;

    ctx.globalAlpha = fog && !taken ? 0.28 : dimmed ? 0.22 : 1;
    strokeSteps(ctx, points, box.top + box.height);
    const fill = ctx.createLinearGradient(0, box.top, 0, box.top + box.height);
    fill.addColorStop(0, fog ? "rgba(180, 186, 210, 0.12)" : `${color.hex}33`);
    fill.addColorStop(1, "rgba(7, 8, 13, 0)");
    ctx.fillStyle = fill;
    ctx.fill();

    strokeSteps(ctx, points);
    ctx.strokeStyle = fog ? "#9aa0b5" : color.hex;
    ctx.lineWidth = taken ? 3 : 2;
    ctx.lineJoin = "miter";
    ctx.lineCap = "butt";
    ctx.shadowColor = fog ? "transparent" : color.hex;
    ctx.shadowBlur = taken ? 12 : 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    const head = points[points.length - 1];
    const orb = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 9);
    orb.addColorStop(0, "#fff");
    orb.addColorStop(0.35, fog ? "#c9c4d8" : color.hex);
    orb.addColorStop(1, "transparent");
    ctx.fillStyle = orb;
    ctx.beginPath();
    ctx.arc(head.x, head.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  ctx.fillStyle = "#6f7384";
  ctx.font = "10px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (const tick of axisTicks(axis)) {
    const y = plotY(tick, axis, box);
    ctx.fillText(String(tick), box.left - 8, y);
  }
}

export function ClickGraph({
  roundId,
  buttonIds,
  seats,
  totals,
  yourClicks,
  clickPrice,
  estimates,
  fog,
  remainingMs,
  durationMs,
  startedAt,
  endsAt,
  revealUntil,
  clockSkew = 0,
  paused,
  revealing,
  urgent,
  canClick,
  busyColor,
  leader,
  winners,
  onPadDown,
}: {
  roundId: string;
  buttonIds: ColorId[];
  seats: PublicSeat[];
  totals: Record<ColorId, number>;
  yourClicks: Record<ColorId, number>;
  clickPrice: number;
  estimates: Record<ColorId, number>;
  fog: boolean;
  remainingMs: number;
  durationMs: number;
  startedAt: number;
  endsAt: number;
  revealUntil: number | null;
  clockSkew?: number;
  paused: boolean;
  revealing: boolean;
  urgent: boolean;
  canClick: boolean;
  busyColor: ColorId | null;
  leader: ColorId[];
  winners: ColorId[];
  onPadDown: (colorId: ColorId, event: PointerEvent<HTMLButtonElement>) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<HTMLElement>(null);
  const marksRef = useRef<HTMLDivElement>(null);
  const seriesRef = useRef<ClickSample[]>([]);
  const heldRef = useRef(totals);
  const roundRef = useRef(roundId);
  const lastTRef = useRef(0);
  const scaleRef = useRef(1);
  const pausedTRef = useRef<number | null>(null);
  const pausedLeftRef = useRef<number | null>(null);
  const drawnRef = useRef(totals);
  const sizeRef = useRef({ w: 640, h: 280 });
  const clockHold = useRef<RoundClock>({
    perf: 0,
    remaining: Math.max(0, remainingMs),
    duration: Math.max(1, durationMs),
  });
  const drawRef = useRef({
    buttonIds,
    totals,
    remainingMs,
    durationMs,
    startedAt,
    endsAt,
    revealUntil,
    clockSkew,
    fog,
    urgent,
    revealing,
    paused,
    winners,
  });
  const seatsRef = useRef(seats);
  seatsRef.current = seats;
  clockHold.current = syncRoundClock(
    clockHold.current,
    Math.max(0, remainingMs),
    Math.max(1, durationMs),
    performance.now(),
  );

  if (roundRef.current !== roundId) {
    seriesRef.current = [];
    heldRef.current = totals;
    roundRef.current = roundId;
    lastTRef.current = 0;
    scaleRef.current = 1;
    pausedTRef.current = null;
    pausedLeftRef.current = null;
    clockHold.current = {
      perf: performance.now(),
      remaining: Math.max(0, remainingMs),
      duration: Math.max(1, durationMs),
    };
  }
  if (!fog) heldRef.current = totals;
  const drawnTotals = holdTotals(totals, heldRef.current, fog);
  drawnRef.current = drawnTotals;
  const totalsKey = buttonIds.map((id) => `${id}:${drawnTotals[id] ?? 0}`).join("|");

  drawRef.current = {
    buttonIds,
    totals: drawnTotals,
    remainingMs,
    durationMs,
    startedAt,
    endsAt,
    revealUntil,
    clockSkew,
    fog,
    urgent,
    revealing,
    paused,
    winners,
  };

  useEffect(() => {
    seriesRef.current = pushSample(
      seriesRef.current,
      { t: lastTRef.current, totals: drawnRef.current },
      buttonIds,
    );
  }, [buttonIds, totalsKey]);

  useEffect(() => {
    const node = frameRef.current;
    if (!node) return;
    const fit = () => {
      const rect = node.getBoundingClientRect();
      const w = Math.max(240, Math.round(rect.width));
      const h = Math.max(220, Math.round(rect.height));
      const prev = sizeRef.current;
      if (Math.abs(prev.w - w) < 2 && Math.abs(prev.h - h) < 2) return;
      sizeRef.current = { w, h };
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const canvas = canvasRef.current;
      const snap = drawRef.current;
      const size = sizeRef.current;
      const read = readRoundClock(clockHold.current, performance.now());
      let t = read.t;
      let left = read.left;
      if (snap.paused) {
        if (pausedTRef.current == null) {
          pausedTRef.current = t;
          pausedLeftRef.current = left;
        }
        t = pausedTRef.current;
        left = pausedLeftRef.current ?? 0;
      } else {
        pausedTRef.current = null;
        pausedLeftRef.current = null;
        if (snap.revealing) t = 1;
      }
      lastTRef.current = t;
      scaleRef.current = holdScale(scaleRef.current, graphScale(snap.totals, snap.buttonIds));
      const pct = snap.revealing ? 0 : timeBarPct(left, Math.max(1, snap.durationMs));
      if (fillRef.current) {
        fillRef.current.style.transform = `scaleX(${pct / 100})`;
      }
      if (clockRef.current) {
        clockRef.current.textContent = snap.paused ? "Paused" : formatGraphClock(left);
      }
      if (canvas) {
        drawChart(
          canvas,
          size.w,
          size.h,
          seriesRef.current,
          snap.buttonIds,
          snap.totals,
          t,
          scaleRef.current,
          snap.fog,
          snap.urgent,
          snap.revealing,
          snap.winners,
        );
      }
      const layer = marksRef.current;
      if (layer) {
        const box = plotBox(size.w, size.h);
        const marks = headMarks(
          snap.buttonIds,
          seatsRef.current,
          snap.totals,
          t,
          scaleRef.current,
          box,
          snap.fog,
        );
        for (const child of layer.children) {
          const node = child as HTMLElement;
          const mark = marks.find((item) => item.id === node.dataset.color);
          if (!mark) continue;
          node.style.left = `${mark.x}px`;
          node.style.top = `${mark.y}px`;
          node.classList.add("is-ready");
        }
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const lead = !fog && leader[0] ? colorById(leader[0]) : null;
  const take = revealing && winners[0] ? colorById(winners[0]) : null;

  return (
    <div
      className={`click-graph ${urgent ? "is-urgent" : ""} ${fog ? "is-fog" : ""} ${revealing ? "is-revealing" : ""}`}
      style={{ "--cols": buttonIds.length } as CSSProperties}
    >
      <div className="click-crash" ref={frameRef}>
        <div className="click-graph-time">
          <div className={`timer-track ${urgent ? "is-urgent" : ""}`} aria-hidden>
            <div
              className="timer-fill"
              ref={fillRef}
              style={{
                transform: `scaleX(${timeBarPct(Math.max(0, remainingMs), Math.max(1, durationMs)) / 100})`,
              }}
            />
          </div>
        </div>
        <canvas ref={canvasRef} className="click-crash-canvas" />
        <div className="click-crash-hud">
          <strong ref={clockRef}>
            {paused ? "Paused" : formatGraphClock(Math.max(0, remainingMs))}
          </strong>
          <span>
            {paused
              ? "Paused"
              : take
                ? `${take.name} takes`
                : fog
                  ? "Fog"
                  : lead
                    ? `${lead.name} ${totals[lead.id] ?? 0}`
                    : "Open"}
          </span>
        </div>
        <div className="click-crash-marks" ref={marksRef}>
          {buttonIds.map((id) => {
            const stacks = stacksForColor(seats, id, fog);
            const extra = Math.max(0, stacks.length - 4);
            if (stacks.length === 0 && (drawnTotals[id] ?? 0) <= 0) return null;
            const color = colorById(id);
            return (
              <div
                className="click-crash-mark"
                data-color={id}
                key={id}
                style={
                  {
                    "--pad": color.hex,
                    "--ink": color.ink,
                  } as CSSProperties
                }
              >
                {stacks.slice(0, 4).map((seat) => (
                  <b className={seat.you ? "is-you" : ""} key={seat.userId}>
                    @{seat.username}
                    <em>{seat.clicks}</em>
                  </b>
                ))}
                {extra > 0 ? <b>+{extra}</b> : null}
              </div>
            );
          })}
        </div>
      </div>
      <div className={`click-graph-cols is-${buttonIds.length}`}>
        {buttonIds.map((id) => {
          const color = colorById(id);
          const clicks = totals[id] ?? 0;
          const yours = yourClicks[id] ?? 0;
          const taken = revealing && winners.includes(id);
          const leading = !fog && !revealing && leader.includes(id) && clicks > 0;
          const dimmed = revealing && !taken && winners.length > 0;
          return (
            <div
              className={`click-col ${taken ? "is-winner" : ""} ${leading ? "is-leading" : ""} ${dimmed ? "is-dimmed" : ""}`}
              key={id}
              style={
                {
                  "--pad": color.hex,
                  "--ink": color.ink,
                  "--glow": color.glow,
                } as CSSProperties
              }
            >
              <button
                type="button"
                aria-label={`${color.name} · ${fog ? "board in fog" : `${clicks} clicks`} · you ${yours}`}
                disabled={!canClick}
                onPointerDown={(event) => onPadDown(id, event)}
                className={`click-col-btn ${busyColor === id ? "is-pressed" : ""}`}
              >
                <span>{color.name}</span>
                <em>{fog ? "—" : clicks}</em>
              </button>
              <p className="click-col-meta">
                {fog
                  ? "Board in fog"
                  : yours > 0
                    ? `You ${yours} · if takes ~${formatUsdt(estimates[id] ?? 0)}`
                    : `You 0 · ${formatUsdt(clickPrice)} / click`}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
