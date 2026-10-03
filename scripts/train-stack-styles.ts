import { writeFileSync } from "fs";
import { STACK_STYLES } from "@/lib/tetris-style";
import { trainStyle } from "@/lib/tetris-ai";

const frozen = STACK_STYLES.filter((row) => row.id !== "live");
const out: Record<string, { weights: number[]; best: number; games: number }> = {};

for (const style of frozen) {
  const started = Date.now();
  const result = trainStyle(style.id, style.games, 11);
  out[style.id] = {
    weights: result.weights.map((w) => Math.round(w * 1000) / 1000),
    best: result.best,
    games: style.games,
  };
  console.log(
    `${style.id} games=${style.games} best=${result.best} ms=${Date.now() - started} w=${out[style.id].weights.join(",")}`,
  );
}

writeFileSync(
  new URL("../src/lib/tetris-style-weights.ts", import.meta.url),
  [
    "/** Frozen TD sits for versus Tetris player types. */",
    "export const STYLE_STACK_WEIGHTS: Record<string, number[]> = " +
      JSON.stringify(
        Object.fromEntries(Object.entries(out).map(([id, row]) => [id, row.weights])),
        null,
        2,
      ) +
      ";",
    "",
    "export const STYLE_STACK_BEST: Record<string, number> = " +
      JSON.stringify(
        Object.fromEntries(Object.entries(out).map(([id, row]) => [id, row.best])),
        null,
        2,
      ) +
      ";",
    "",
  ].join("\n"),
);
