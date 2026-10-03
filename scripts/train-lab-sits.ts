import { writeFileSync } from "fs";
import { trainLabSits, type LabId } from "@/lib/lab-train";

const FILES: Record<LabId, { head: string; first: string; deep: string }> = {
  catch: {
    head: "/** TD sit for catch. Bias, paddle, token, distance, fall, cover. Look-ahead house sits. */",
    first: "CATCH_FIRST_WEIGHTS",
    deep: "CATCH_DEEP_WEIGHTS",
  },
  snake: {
    head: "/** TD sit for snake. Bias, ahead, left, right, food ahead, food side. The loop sits, then cuts to food. */",
    first: "SNAKE_FIRST_WEIGHTS",
    deep: "SNAKE_DEEP_WEIGHTS",
  },
  aim: {
    head: "/** TD sit for aim. Bias, error, time, streak. Not Counter-Strike. Look-ahead house sits. */",
    first: "AIM_FIRST_WEIGHTS",
    deep: "AIM_DEEP_WEIGHTS",
  },
  lane: {
    head: "/** TD sit for lane. Bias, range, hp, reach. Not Dota. Look-ahead house sits. */",
    first: "LANE_FIRST_WEIGHTS",
    deep: "LANE_DEEP_WEIGHTS",
  },
  break: {
    head: "/** TD sit for break. Bias, pad, landing gap, ball height. The pad tracks the gold. */",
    first: "BREAK_FIRST_WEIGHTS",
    deep: "BREAK_DEEP_WEIGHTS",
  },
};

const games = (process.argv.slice(2).filter(Boolean) as LabId[]).length
  ? (process.argv.slice(2) as LabId[])
  : (["catch", "snake", "aim", "lane", "break"] as const);

for (const game of games) {
  const started = Date.now();
  const sits = trainLabSits(game);
  const spec = FILES[game];
  const body = [
    spec.head,
    `export const ${spec.first} = [${sits.first.weights.join(", ")}];`,
    `export const ${spec.deep} = [${sits.deep.weights.join(", ")}];`,
    "",
  ].join("\n");
  writeFileSync(new URL(`../src/lib/${game}-weights.ts`, import.meta.url), body);
  console.log(
    `${game} first=${sits.first.best} deep=${sits.deep.best} ms=${Date.now() - started} first=${sits.first.weights.join(",")} deep=${sits.deep.weights.join(",")}`,
  );
}
