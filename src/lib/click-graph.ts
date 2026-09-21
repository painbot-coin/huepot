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
  if (last && t + 1e-6 < last.t) return [next];
  if (last && Math.abs(last.t - t) < 0.003 && sameTotals(last.totals, next.totals, ids)) {
    return series;
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
): ClickSample[] {
  const tip = { t: Math.max(0, Math.min(1, t)), totals };
  const origin = { t: 0, totals: zeroed(totals) };
  if (!series.length) return [origin, tip];
  if (series[0].t > 0.02) return [origin, ...series, tip];
  return [...series, tip];
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
