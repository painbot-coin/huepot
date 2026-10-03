import type { ColorId } from "@/lib/colors";
import type { PublicSeat } from "@/lib/types";

export type ClickStack = {
  userId: string;
  username: string;
  you: boolean;
  clicks: number;
};

export type ClickSample = {
  t: number;
  totals: Record<string, number>;
};

export type PlotBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function timeBarPct(remainingMs: number, durationMs: number) {
  const span = Math.max(1, durationMs);
  return Math.max(0, Math.min(100, (remainingMs / span) * 100));
}

export function elapsed01(remainingMs: number, durationMs: number) {
  return 1 - timeBarPct(remainingMs, durationMs) / 100;
}

export function playheadAt(now: number, startedAt: number, endsAt: number) {
  const span = Math.max(1, endsAt - startedAt);
  return Math.max(0, Math.min(1, (now - startedAt) / span));
}

export function remainingOf(now: number, endsAt: number) {
  return Math.max(0, endsAt - now);
}

export function approachScale(current: number, target: number, dtMs = 16) {
  if (!Number.isFinite(current) || current <= 0) return target;
  if (!Number.isFinite(target) || target <= 0) return current;
  const tau = target > current ? 160 : 420;
  const alpha = 1 - Math.exp(-Math.max(0, dtMs) / tau);
  const next = current + (target - current) * alpha;
  return Math.abs(target - next) < 0.02 ? target : next;
}

export type RoundClock = {
  perf: number;
  remaining: number;
  duration: number;
};

export function syncRoundClock(
  clock: RoundClock,
  remaining: number,
  duration: number,
  perf: number,
  slack = 180,
): RoundClock {
  const next = {
    perf,
    remaining: Math.max(0, remaining),
    duration: Math.max(1, duration),
  };
  if (clock.duration !== next.duration) return next;
  const predicted = clock.remaining - (perf - clock.perf);
  if (Math.abs(predicted - next.remaining) > slack) return next;
  return clock;
}

export function readRoundClock(clock: RoundClock, perf: number) {
  const left = Math.max(0, clock.remaining - (perf - clock.perf));
  const t = Math.max(0, Math.min(1, 1 - left / Math.max(1, clock.duration)));
  return { left, t };
}

export function holdScale(current: number, target: number) {
  const next = niceMax(Math.max(1, target));
  if (!Number.isFinite(current) || current <= 0) return next;
  return Math.max(current, next);
}

export function axisTicks(scale: number) {
  const max = Math.max(1, Math.round(scale));
  if (max === 1) return [0, 1];
  if (max <= 6) return Array.from({ length: max + 1 }, (_, i) => i);
  const mid = Math.round(max / 2);
  return [...new Set([0, mid, max])].sort((a, b) => a - b);
}

export function graphScale(totals: Record<string, number>, ids: readonly string[]) {
  return Math.max(1, ...ids.map((id) => totals[id] ?? 0));
}

/** Fog hides the numbers. The last clear race stays on the canvas so the line does not crash to zero. */
export function holdTotals(
  live: Record<string, number>,
  held: Record<string, number>,
  fog: boolean,
) {
  return fog ? held : live;
}

export function niceMax(n: number) {
  const v = Math.max(1, n);
  const pow = 10 ** Math.floor(Math.log10(v));
  const m = v / pow;
  const nice = m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10;
  return nice * pow;
}

export function sameTotals(
  a: Record<string, number>,
  b: Record<string, number>,
  ids: readonly string[],
) {
  return ids.every((id) => (a[id] ?? 0) === (b[id] ?? 0));
}

export function pushSample(
  series: ClickSample[],
  sample: ClickSample,
  ids: readonly string[],
  limit = 96,
): ClickSample[] {
  const t = Math.max(0, Math.min(1, sample.t));
  const next = { t, totals: sample.totals };
  const last = series[series.length - 1];
  if (last && t + 0.12 < last.t) return [next];
  if (last && t + 1e-6 < last.t) return series;
  if (last && Math.abs(last.t - t) < 0.003 && sameTotals(last.totals, next.totals, ids)) {
    return series;
  }
  if (last && t - last.t >= 0.003 && !sameTotals(last.totals, next.totals, ids)) {
    return [...series, { t, totals: last.totals }, next].slice(-limit);
  }
  return [...series, next].slice(-limit);
}

function zeroed(totals: Record<string, number>) {
  return Object.fromEntries(Object.keys(totals).map((key) => [key, 0]));
}

/** Keep the line growing to the live playhead even between clicks. */
export function withLiveTip(
  series: ClickSample[],
  t: number,
  totals: Record<string, number>,
  ids?: readonly string[],
): ClickSample[] {
  const tipT = Math.max(0, Math.min(1, t));
  const keys = ids && ids.length ? ids : Object.keys(totals);
  const origin = { t: 0, totals: zeroed(totals) };
  let out =
    !series.length ? [origin] : series[0].t > 0.02 ? [origin, ...series] : [...series];
  const last = out[out.length - 1];
  if (!last) return [origin, { t: tipT, totals }];
  if (tipT > last.t + 1e-6) {
    if (!sameTotals(last.totals, totals, keys)) {
      return [...out, { t: tipT, totals: last.totals }, { t: tipT, totals }];
    }
    return [...out, { t: tipT, totals }];
  }
  if (!sameTotals(last.totals, totals, keys)) {
    return [...out, { t: last.t, totals }];
  }
  return out;
}

export function plotX(t: number, box: PlotBox) {
  return box.left + Math.max(0, Math.min(1, t)) * box.width;
}

export function plotY(value: number, scale: number, box: PlotBox) {
  const n = Math.max(0, value) / Math.max(1, scale);
  return box.top + box.height - n * box.height;
}

/** Accounts on one color, biggest stack first. Fog hides everyone but you. */
export function stacksForColor(
  seats: PublicSeat[],
  colorId: ColorId,
  fog = false,
): ClickStack[] {
  return seats
    .map((seat) => ({
      userId: seat.userId,
      username: seat.username,
      you: seat.you,
      clicks: seat.clicks[colorId] ?? 0,
    }))
    .filter((seat) => seat.clicks > 0 && (!fog || seat.you))
    .sort((a, b) => b.clicks - a.clicks || a.username.localeCompare(b.username));
}

export type HeadMark = {
  id: ColorId;
  x: number;
  y: number;
  stacks: ClickStack[];
  extra: number;
};

export function headMarks(
  buttonIds: ColorId[],
  seats: PublicSeat[],
  totals: Record<string, number>,
  t: number,
  scale: number,
  box: PlotBox,
  fog = false,
): HeadMark[] {
  return buttonIds.flatMap((id) => {
    const stacks = stacksForColor(seats, id, fog);
    const value = fog ? (stacks[0]?.clicks ?? 0) : (totals[id] ?? 0);
    if (stacks.length === 0 && value <= 0) return [];
    return [
      {
        id,
        x: plotX(t, box),
        y: plotY(value, scale, box),
        stacks: stacks.slice(0, 4),
        extra: Math.max(0, stacks.length - 4),
      },
    ];
  });
}
