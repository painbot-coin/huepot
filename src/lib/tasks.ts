/**
 * Daily and weekly tasks.
 *
 * Progress and completion are **derived from `Tx` rows**, never stored and
 * never "claimed". A task is complete because the play happened, so a bonus
 * cannot be double-claimed, cannot be granted by mistake, and applies
 * retroactively to every day already played.
 *
 * That also keeps the HUE total monotonic. Bonuses are summed over every past
 * day and week that met a target, so a player's coin never drops when the
 * clock rolls over — which it would if only the current window counted.
 *
 * Windows are UTC, matching the house schedule (Classic hour, Fog cup).
 */

export const DAY_MS = 86_400_000;
export const WEEK_MS = 604_800_000;

/** UTC day index. Epoch day 0 is a Thursday. */
export function dayIndex(ms: number) {
  return Math.floor(ms / DAY_MS);
}

/** Monday-start week index. Epoch day 4 was Monday 5 Jan 1970. */
export function weekIndex(ms: number) {
  return Math.floor((dayIndex(ms) + 3) / 7);
}

export function dayStart(index: number) {
  return index * DAY_MS;
}

export function weekStart(index: number) {
  return (index * 7 - 3) * DAY_MS;
}

export type WindowCounts = { clicks: number; takes: number };

export type TaskDef = {
  id: string;
  name: string;
  note: string;
  target: number;
  bonus: number;
  of: keyof WindowCounts;
};

export const DAILY_TASKS: TaskDef[] = [
  { id: "sit", name: "Sit a round", note: "Strike one color", target: 1, bonus: 5, of: "clicks" },
  { id: "ten", name: "Strike ten", note: "Ten clicks in a day", target: 10, bonus: 15, of: "clicks" },
  { id: "take", name: "Take a pot", note: "Win a round", target: 1, bonus: 25, of: "takes" },
];

export const WEEKLY_TASKS: TaskDef[] = [
  { id: "fifty", name: "Fifty strikes", note: "Fifty clicks in a week", target: 50, bonus: 60, of: "clicks" },
  { id: "three", name: "Three takes", note: "Win three rounds", target: 3, bonus: 100, of: "takes" },
];

export type TaskProgress = {
  id: string;
  name: string;
  note: string;
  target: number;
  progress: number;
  done: boolean;
  bonus: number;
};

function measure(defs: TaskDef[], counts: WindowCounts): TaskProgress[] {
  return defs.map((def) => {
    const progress = Math.max(0, counts[def.of] ?? 0);
    return {
      id: def.id,
      name: def.name,
      note: def.note,
      target: def.target,
      progress: Math.min(progress, def.target),
      done: progress >= def.target,
      bonus: def.bonus,
    };
  });
}

export function dailyProgress(counts: WindowCounts) {
  return measure(DAILY_TASKS, counts);
}

export function weeklyProgress(counts: WindowCounts) {
  return measure(WEEKLY_TASKS, counts);
}

function bonusFor(defs: TaskDef[], counts: WindowCounts) {
  return defs.reduce(
    (sum, def) => ((counts[def.of] ?? 0) >= def.target ? sum + def.bonus : sum),
    0,
  );
}

/** Lifetime task bonus: every past day and week that met a target. */
export function lifetimeTaskBonus(input: {
  days: WindowCounts[];
  weeks: WindowCounts[];
}) {
  const daily = input.days.reduce((sum, day) => sum + bonusFor(DAILY_TASKS, day), 0);
  const weekly = input.weeks.reduce((sum, week) => sum + bonusFor(WEEKLY_TASKS, week), 0);
  return daily + weekly;
}
