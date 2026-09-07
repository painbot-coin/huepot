"use client";

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function remainPath(frac: number) {
  const r = 36;
  const cx = 50;
  const cy = 50;
  const amount = clamp01(frac);
  if (amount <= 0.002) return "";
  if (amount >= 0.998) {
    return `M ${cx} ${cy} m 0 ${-r} a ${r} ${r} 0 1 1 0 ${r * 2} a ${r} ${r} 0 1 1 0 ${-r * 2}`;
  }
  const deg = amount * 360;
  const rad = ((deg - 90) * Math.PI) / 180;
  const x = cx + r * Math.cos(rad);
  const y = cy + r * Math.sin(rad);
  const large = deg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${large} 1 ${x} ${y} Z`;
}

export function FantasyClock({
  remainingMs,
  durationMs,
  urgent = false,
  paused = false,
  fog = false,
  revealing = false,
}: {
  remainingMs: number;
  durationMs: number;
  urgent?: boolean;
  paused?: boolean;
  fog?: boolean;
  revealing?: boolean;
}) {
  const left = Math.max(0, remainingMs);
  const seconds = left / 1000;
  const frac = clamp01(seconds / 60);
  const angle = frac * 360;
  const secondsLeft = Math.ceil(seconds);
  const roundSec = Math.max(1, Math.round(durationMs / 1000));
  const label = paused
    ? "Pit clock paused"
    : revealing
      ? `Next round, ${secondsLeft} seconds left`
      : fog
        ? `Fog clock, ${secondsLeft} of ${roundSec} seconds left`
        : urgent
          ? `Warning, ${secondsLeft} seconds left`
          : `Pit clock, ${secondsLeft} of ${roundSec} seconds left. The hand points at leftover seconds. 12 is time up.`;

  return (
    <div
      aria-label={label}
      className={`pit-clock ${urgent ? "is-urgent" : ""} ${fog ? "is-fog" : ""} ${paused ? "is-paused" : ""} ${revealing ? "is-revealing" : ""}`}
      role="timer"
    >
      <img alt="" className="pit-clock-face" src="/fx/clock-face.png" />
      <svg aria-hidden="true" className="pit-clock-arc" viewBox="0 0 100 100">
        <path d={remainPath(frac)} />
      </svg>
      <img
        alt=""
        className="pit-clock-hand"
        src="/fx/clock-hand-second.png"
        style={{ transform: `rotate(${angle}deg)` }}
      />
      <span className="pit-clock-hub" />
      <span className="pit-clock-mark is-12">Up</span>
      <span className="pit-clock-mark is-15">15</span>
      <span className="pit-clock-mark is-30">30</span>
      <span className="pit-clock-mark is-45">45</span>
      {urgent ? <span className="pit-clock-warn" /> : null}
    </div>
  );
}
