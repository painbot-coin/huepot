"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import { colorById, type ColorId } from "@/lib/colors";
import {
  elapsed01,
  graphScale,
  headMarks,
  holdTotals,
  niceMax,
  plotX,
  plotY,
  pushSample,
  timeBarPct,
  withLiveTip,
  type ClickSample,
  type PlotBox,
} from "@/lib/click-graph";
import { formatClock, formatUsdt } from "@/lib/money";
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

function drawChart(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  series: ClickSample[],
  buttonIds: ColorId[],
  totals: Record<ColorId, number>,
  t: number,
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
  const live = withLiveTip(series, t, totals);
  const scale = niceMax(graphScale(totals, buttonIds));

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
      y: plotY(sample.totals[id] ?? 0, scale, box),
    }));
    if (points.length < 2) continue;

    ctx.globalAlpha = fog && !taken ? 0.28 : dimmed ? 0.22 : 1;
    const trace = (close = false) => {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      if (close) {
        ctx.lineTo(points[points.length - 1].x, box.top + box.height);
        ctx.lineTo(points[0].x, box.top + box.height);
        ctx.closePath();
      }
    };
    trace(true);
    const fill = ctx.createLinearGradient(0, box.top, 0, box.top + box.height);
    fill.addColorStop(0, fog ? "rgba(180, 186, 210, 0.12)" : `${color.hex}33`);
    fill.addColorStop(1, "rgba(7, 8, 13, 0)");
    ctx.fillStyle = fill;
    ctx.fill();

    trace(false);
    ctx.strokeStyle = fog ? "#9aa0b5" : color.hex;
    ctx.lineWidth = taken ? 3.2 : 2.2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.shadowColor = fog ? "transparent" : color.hex;
    ctx.shadowBlur = taken ? 22 : 14;
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
  for (const tick of [0, scale / 2, scale]) {
    const y = plotY(tick, scale, box);
    ctx.fillText(String(Math.round(tick)), box.left - 8, y);
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
  const seriesRef = useRef<ClickSample[]>([]);
  const heldRef = useRef(totals);
  const roundRef = useRef(roundId);
  const drawRef = useRef({
    buttonIds,
    totals,
    remainingMs,
    durationMs,
    fog,
    urgent,
    revealing,
    winners,
  });
  const [size, setSize] = useState({ w: 640, h: 280 });

  if (roundRef.current !== roundId) {
    seriesRef.current = [];
    heldRef.current = totals;
    roundRef.current = roundId;
  }
  if (!fog) heldRef.current = totals;
  const drawnTotals = holdTotals(totals, heldRef.current, fog);
  seriesRef.current = pushSample(
    seriesRef.current,
    { t: elapsed01(remainingMs, durationMs), totals: drawnTotals },
    buttonIds,
  );

  drawRef.current = {
    buttonIds,
    totals: drawnTotals,
    remainingMs,
    durationMs,
    fog,
    urgent,
    revealing,
    winners,
  };

  useEffect(() => {
    const node = frameRef.current;
    if (!node) return;
    const fit = () => {
      const rect = node.getBoundingClientRect();
      setSize({ w: Math.max(240, rect.width), h: Math.max(220, rect.height) });
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
      if (canvas) {
        drawChart(
          canvas,
          size.w,
          size.h,
          seriesRef.current,
          snap.buttonIds,
          snap.totals,
          elapsed01(snap.remainingMs, snap.durationMs),
          snap.fog,
          snap.urgent,
          snap.revealing,
          snap.winners,
        );
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [size.h, size.w]);

  const t = elapsed01(remainingMs, durationMs);
  const pct = timeBarPct(remainingMs, durationMs);
  const clock = paused ? "Paused" : formatClock(Math.max(0, remainingMs));
  const box = plotBox(size.w, size.h);
  const scale = niceMax(graphScale(drawnTotals, buttonIds));
  const marks = useMemo(
    () => headMarks(buttonIds, seats, drawnTotals, t, scale, box, fog),
    [box, buttonIds, drawnTotals, fog, scale, seats, t],
  );
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
            <div className="timer-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <canvas ref={canvasRef} className="click-crash-canvas" />
        <div className="click-crash-hud">
          <strong>{clock}</strong>
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
        <div className="click-crash-marks">
          {marks.map((mark) => {
            const color = colorById(mark.id);
            return (
              <div
                className="click-crash-mark"
                key={mark.id}
                style={
                  {
                    "--pad": color.hex,
                    "--ink": color.ink,
                    left: mark.x,
                    top: mark.y,
                  } as CSSProperties
                }
              >
                {mark.stacks.map((seat) => (
                  <b className={seat.you ? "is-you" : ""} key={seat.userId}>
                    @{seat.username}
                    <em>{seat.clicks}</em>
                  </b>
                ))}
                {mark.extra > 0 ? <b>+{mark.extra}</b> : null}
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
