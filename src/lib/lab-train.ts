/**
 * Frozen first and deep sits. Same look-ahead house sit as the live books.
 * No USDT. No second ranking. Gold is only to take a priced file home.
 */

import { AIM_N, aimGap, newAim } from "@/lib/aim";
import { pickAimMove, trainAim, AIM_FEATURE_COUNT, stepAimHouse } from "@/lib/aim-ai";
import { newBreak } from "@/lib/break";
import { pickBreakMove, trainBreak, BREAK_FEATURE_COUNT } from "@/lib/break-ai";
import { newCatch } from "@/lib/catch";
import { pickCatchMove, trainCatch, CATCH_FEATURE_COUNT } from "@/lib/catch-ai";
import { newLane } from "@/lib/lane";
import { pickLaneStrike, trainLane, LANE_FEATURE_COUNT } from "@/lib/lane-ai";
import { newSnake, stepSnake } from "@/lib/snake";
import { pickSnakeTurn, trainSnake, SNAKE_FEATURE_COUNT } from "@/lib/snake-ai";
import type { LabId } from "@/lib/lab-stack";

export type { LabId };

export const LAB_FIRST_GAMES = 80;
export const LAB_DEEP_GAMES = 160;

/** Hand start. First and deep files are trained from here. */
export const LAB_SEED_WEIGHTS: Record<LabId, number[]> = {
  catch: [0.2, 0, 0.05, -3.6, 0.02, 1.2],
  snake: [0.3, -2.4, -1.8, -1.8, 1.6, 0.7],
  aim: [0.2, -1.7, 0.25, 0.35],
  lane: [0.15, 0.2, -0.35, 0.25],
  break: [0.2, 0, -3.8, -0.08],
};

const BOOK = {
  catch: { count: CATCH_FEATURE_COUNT, train: trainCatch },
  snake: { count: SNAKE_FEATURE_COUNT, train: trainSnake },
  aim: { count: AIM_FEATURE_COUNT, train: trainAim },
  lane: { count: LANE_FEATURE_COUNT, train: trainLane },
  break: { count: BREAK_FEATURE_COUNT, train: trainBreak },
} as const;

const rng = () => 0.4;

export function clipLabWeights(weights: number[], fallback: number[], count: number) {
  return Array.from({ length: count }, (_, i) => {
    const w = Number(weights[i]);
    if (!Number.isFinite(w)) return fallback[i] ?? 0;
    return Math.max(-25, Math.min(25, w));
  });
}

export function roundLabWeights(weights: number[]) {
  return weights.map((w) => Math.round(w * 1000) / 1000);
}

export function labSitHolds(game: LabId, weights: number[]) {
  if (game === "catch") {
    const right = { ...newCatch(rng), paddle: 0, tokenX: 8, tokenY: 3, alive: true };
    const left = { ...newCatch(rng), paddle: 8, tokenX: 0, tokenY: 3, alive: true };
    return pickCatchMove(right, weights) === 1 && pickCatchMove(left, weights) === -1;
  }
  if (game === "break") {
    const right = { ...newBreak(rng), paddle: 0, ballX: 5, ballY: 8, vx: 1 as const, vy: 1 as const, alive: true };
    const left = { ...newBreak(rng), paddle: 6, ballX: 1, ballY: 8, vx: -1 as const, vy: 1 as const, alive: true };
    return pickBreakMove(right, weights) === 1 && pickBreakMove(left, weights) === -1;
  }
  if (game === "lane") {
    const ripe = { ...newLane(rng), pos: 1, hp: 1, alive: true };
    const far = { ...newLane(rng), pos: 6, hp: 3, alive: true };
    return pickLaneStrike(ripe, weights) === true && pickLaneStrike(far, weights) === false;
  }
  if (game === "snake") {
    const start = newSnake(rng);
    const against = { ...start, body: [1, 2, 3], dir: 3 as const, alive: true };
    if (!stepSnake(against, pickSnakeTurn(against, weights), rng).alive) return false;
    let state = start;
    let steps = 0;
    while (state.alive && steps < 100) {
      state = stepSnake(state, pickSnakeTurn(state, weights), rng);
      steps += 1;
      if (state.score >= 3) return true;
    }
    return false;
  }
  const start = { ...newAim(rng), cursor: 0, target: AIM_N * AIM_N - 1, time: 12 };
  const next = stepAimHouse(start, weights, rng);
  return aimGap(next) <= aimGap(start) && pickAimMove(start, weights) !== undefined;
}

/** A lock that breaks a sit which already holds is refused. The book stays. */
export function keepHeldSit(game: LabId, before: number[], after: number[]) {
  const seed = LAB_SEED_WEIGHTS[game];
  const count = BOOK[game].count;
  const next = roundLabWeights(clipLabWeights(after, seed, count));
  const held = roundLabWeights(clipLabWeights(before, seed, count));
  if (!labSitHolds(game, held)) return next;
  if (labSitHolds(game, next)) return next;
  return held;
}

export function keepLabSit(game: LabId, trained: number[]) {
  const seed = LAB_SEED_WEIGHTS[game];
  const count = BOOK[game].count;
  const clipped = clipLabWeights(trained, seed, count);
  if (labSitHolds(game, clipped)) return roundLabWeights(clipped);
  for (const mix of [0.85, 0.7, 0.55, 0.4, 0.25, 0.1, 0]) {
    const weights = roundLabWeights(
      clipLabWeights(
        clipped.map((w, i) => mix * w + (1 - mix) * (seed[i] ?? 0)),
        seed,
        count,
      ),
    );
    if (labSitHolds(game, weights)) return weights;
  }
  return [...seed];
}

function pullLabWeights(weights: number[], seed: number[], count: number, pull = 0.08) {
  return clipLabWeights(
    weights.map((w, i) => w + pull * ((seed[i] ?? 0) - w)),
    seed,
    count,
  );
}

export function trainLabBook(
  game: LabId,
  start: number[],
  games: number,
  seed: number,
  maxSteps = 80,
) {
  const spec = BOOK[game];
  const fallback = LAB_SEED_WEIGHTS[game];
  let weights = clipLabWeights(start, fallback, spec.count);
  let best = 0;
  let steps = 0;
  for (let i = 0; i < games; i++) {
    const result = spec.train(weights, (seed + i * 9973) >>> 0 || 1, maxSteps);
    weights = pullLabWeights(clipLabWeights(result.weights, fallback, spec.count), fallback, spec.count);
    best = Math.max(best, result.score);
    steps += result.steps;
  }
  return { weights: keepLabSit(game, weights), best, steps, games };
}

export function trainLabSits(game: LabId, seed = 11) {
  const first = trainLabBook(game, LAB_SEED_WEIGHTS[game], LAB_FIRST_GAMES, seed);
  const deep = trainLabBook(game, first.weights, LAB_DEEP_GAMES, seed + 1009);
  return { first, deep };
}
