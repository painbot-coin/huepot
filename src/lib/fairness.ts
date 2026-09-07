import { sha256, toUtf8Bytes } from "ethers";
import { colorById, type ColorId } from "@/lib/colors";
import { floorPayoutPerClick, fromCents } from "@/lib/money";
import type { Round, RoundResult } from "@/lib/types";

export type PublicSettledRound = {
  id: string;
  roomSlug: string;
  roomName: string;
  number: number;
  startedAt: number;
  settledAt: number;
  clickPrice: number;
  buttonIds: ColorId[];
  totals: Record<ColorId, number>;
  seedCommit: string;
  serverSeed: string;
  fairHash: string;
  kind: RoundResult["kind"];
  winners: ColorId[];
  losingPot: number;
  winningClicks: number;
  payoutPerWinningClick: number;
  paidCount: number;
  unit: "cents" | "usd";
  rake: number;
};

export function sha256Hex(value: string) {
  return sha256(toUtf8Bytes(value)).slice(2);
}

export function newServerSeed() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function seedCommit(seed: string) {
  return sha256Hex(seed);
}

type FairInput = {
  serverSeed: string;
  roundId: string;
  number: number;
  buttonIds: string[];
  totals: Record<string, number>;
  kind: string;
  winners: string[];
  losingPot: number;
  payoutPerWinningClick: number;
  rake?: number;
};

/**
 * The exact string that gets hashed into the settle digest. Shown verbatim on
 * the ledger page so anyone can recompute the digest themselves — which is why
 * the digest must never be built anywhere but here.
 */
export function fairPreimage(input: FairInput) {
  const totals = input.buttonIds.map((id) => `${id}:${input.totals[id] ?? 0}`).join(",");
  const winners = [...input.winners].sort().join(",");
  const parts = [
    input.serverSeed,
    input.roundId,
    String(input.number),
    totals,
    input.kind,
    winners,
    String(input.losingPot),
    String(input.payoutPerWinningClick),
  ];
  if (input.rake) parts.push(String(input.rake));
  return parts.join("|");
}

export function fairDigest(input: FairInput) {
  return sha256Hex(fairPreimage(input));
}

export function settledPreimage(row: PublicSettledRound) {
  return fairPreimage({
    serverSeed: row.serverSeed,
    roundId: row.id,
    number: row.number,
    buttonIds: row.buttonIds,
    totals: row.totals,
    kind: row.kind,
    winners: row.winners,
    losingPot: row.losingPot,
    payoutPerWinningClick: row.payoutPerWinningClick,
    rake: row.rake ?? 0,
  });
}

export function ensureRoundSeed(round: Round) {
  if (round.serverSeed && round.seedCommit) return;
  round.serverSeed = newServerSeed();
  round.seedCommit = seedCommit(round.serverSeed);
}

export function sealRound(round: Round) {
  ensureRoundSeed(round);
  const result = round.result;
  if (!result) return;
  round.fairHash = fairDigest({
    serverSeed: round.serverSeed,
    roundId: round.id,
    number: round.number,
    buttonIds: round.buttonIds,
    totals: result.totals,
    kind: result.kind,
    winners: result.winners,
    losingPot: result.losingPot,
    payoutPerWinningClick: result.payoutPerWinningClick,
    rake: result.rake ?? 0,
  });
}

export function verifySettledRound(row: PublicSettledRound) {
  const commitOk = seedCommit(row.serverSeed) === row.seedCommit;
  const hashOk =
    fairDigest({
      serverSeed: row.serverSeed,
      roundId: row.id,
      number: row.number,
      buttonIds: row.buttonIds,
      totals: row.totals,
      kind: row.kind,
      winners: row.winners,
      losingPot: row.losingPot,
      payoutPerWinningClick: row.payoutPerWinningClick,
      rake: row.rake ?? 0,
    }) === row.fairHash;
  const math = verifyMath(row);
  return {
    commitOk,
    hashOk,
    mathOk: math.ok,
    math,
    ok: commitOk && hashOk && math.ok,
  };
}

function verifyMath(row: PublicSettledRound) {
  if (row.kind === "void") {
    return { ok: row.winners.length === 0 && row.losingPot === 0 };
  }
  const ids = row.buttonIds;
  const totals = row.totals;
  const totalClicks = ids.reduce((sum, id) => sum + (totals[id] ?? 0), 0);
  const max = ids.reduce((value, id) => Math.max(value, totals[id] ?? 0), 0);
  if (totalClicks === 0 || max === 0) {
    return { ok: row.kind === "empty" && row.winners.length === 0 };
  }
  const winners = ids.filter((id) => (totals[id] ?? 0) === max);
  const losing = ids.filter((id) => (totals[id] ?? 0) < max);
  if (losing.length === 0) {
    return {
      ok:
        row.kind === "push" &&
        sameIds(winners, row.winners) &&
        row.losingPot === 0 &&
        row.payoutPerWinningClick === row.clickPrice,
    };
  }
  const winningClicks = winners.reduce((sum, id) => sum + (totals[id] ?? 0), 0);
  const losingClicks = losing.reduce((sum, id) => sum + (totals[id] ?? 0), 0);
  if (row.unit === "cents") {
    const losingPot = losingClicks * row.clickPrice;
    const rake = row.rake ?? 0;
    const payout = floorPayoutPerClick(row.clickPrice, losingPot - rake, winningClicks);
    return {
      ok:
        row.kind === "take" &&
        sameIds(winners, row.winners) &&
        row.winningClicks === winningClicks &&
        row.losingPot === losingPot &&
        rake >= 0 &&
        rake <= losingPot &&
        row.payoutPerWinningClick === payout,
    };
  }
  const losingPot = roundToCents(losingClicks * row.clickPrice);
  const payout = roundToCents(row.clickPrice + losingPot / winningClicks);
  return {
    ok:
      row.kind === "take" &&
      sameIds(winners, row.winners) &&
      row.winningClicks === winningClicks &&
      row.losingPot === losingPot &&
      row.payoutPerWinningClick === payout,
  };
}

function sameIds(a: string[], b: string[]) {
  return [...a].sort().join(",") === [...b].sort().join(",");
}

function roundToCents(value: number) {
  return Math.max(0, Math.round(value * 100) / 100);
}

export function settledSummary(row: PublicSettledRound) {
  if (row.kind === "empty") return "No clicks";
  if (row.kind === "push") return "All colors tied";
  if (row.kind === "void") return "Staff voided";
  return `${row.winners.map((id) => colorById(id).name).join(" & ")} took`;
}

export function settledDollars(row: PublicSettledRound, value: number) {
  return row.unit === "cents" ? fromCents(value) : value;
}

/**
 * What the winning color actually collected: the losing pot after the house
 * take, plus the winners' own stakes back. The losing pot alone understates it
 * and reads as 0.00 when the losers barely clicked, so every surface that
 * names a take amount must use this.
 */
export function settledTakeAmount(row: PublicSettledRound) {
  const losing = settledDollars(row, row.losingPot);
  const rake = settledDollars(row, row.rake ?? 0);
  const click = settledDollars(row, row.clickPrice);
  return Math.max(0, losing - rake) + row.winningClicks * click;
}

export function shortHash(value: string) {
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}
