/** A last-hit sit. Not Dota. Two wells. No USDT. */

export const LANE_N = 8;
export const LANE_ROUNDS = 8;
export const LANE_RANGE = 2;
export const LANE_MAX_HP = 3;

export type LaneState = {
  pos: number;
  hp: number;
  score: number;
  misses: number;
  streak: number;
  round: number;
  alive: boolean;
};

export function inLaneRange(state: Pick<LaneState, "pos">) {
  return state.pos <= LANE_RANGE;
}

export function canLastHit(state: Pick<LaneState, "pos" | "hp" | "alive">) {
  return state.alive && inLaneRange(state) && state.hp === 1;
}

function dealMark(rng: () => number) {
  return {
    pos: LANE_N - 1,
    hp: 1 + Math.floor(rng() * LANE_MAX_HP),
  };
}

export function newLane(rng: () => number): LaneState {
  const mark = dealMark(rng);
  return {
    pos: mark.pos,
    hp: mark.hp,
    score: 0,
    misses: 0,
    streak: 0,
    round: 0,
    alive: true,
  };
}

function afterMark(
  state: LaneState,
  hit: boolean,
  rng: (() => number) | null,
): LaneState {
  const score = state.score + (hit ? 1 : 0);
  const misses = state.misses + (hit ? 0 : 1);
  const streak = hit ? state.streak + 1 : 0;
  const round = state.round + 1;
  if (round >= LANE_ROUNDS) {
    return { ...state, pos: 0, hp: 0, score, misses, streak, round, alive: false };
  }
  const next = rng ? dealMark(rng) : { pos: LANE_N - 1, hp: 2 };
  return {
    ...state,
    pos: next.pos,
    hp: next.hp,
    score,
    misses,
    streak,
    round,
    alive: true,
  };
}

function resolveLane(state: LaneState, strike: boolean, rng: (() => number) | null): LaneState {
  if (!state.alive) return state;
  if (strike) {
    return afterMark(state, canLastHit(state), rng);
  }
  const pos = state.pos - 1;
  const hp = inLaneRange(state) ? state.hp - 1 : state.hp;
  if (pos < 0 || hp <= 0) return afterMark({ ...state, pos: Math.max(0, pos), hp: Math.max(0, hp) }, false, rng);
  return { ...state, pos, hp };
}

export function stepLane(state: LaneState, strike: boolean, rng: () => number): LaneState {
  return resolveLane(state, strike, rng);
}

export function peekLane(state: LaneState, strike: boolean): LaneState {
  return resolveLane(state, strike, null);
}

export function strikeLane(state: LaneState, rng: () => number): LaneState {
  return stepLane(state, true, rng);
}
