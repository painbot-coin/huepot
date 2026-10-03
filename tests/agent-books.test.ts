import assert from "node:assert/strict";
import test from "node:test";
import {
  AGENT_BOOKS,
  canDownloadWeights,
  canWatchMark,
  freePricedLine,
  markById,
  weightsFor,
} from "@/lib/house-mark-list";
import { agentSits, shelfSeed, shelfSit } from "@/lib/lab-watch";

test("the seven books are the cards, and the file is that sit", () => {
  const sits = agentSits((id) => weightsFor(id));
  assert.deepEqual(
    sits.map((sit) => sit.label),
    ["Down", "Burst", "Catch", "Snake", "Aim", "Lane", "Break"],
  );
  assert.equal(sits.length, AGENT_BOOKS.length);
  const sentences = new Set(sits.map((sit) => sit.how));
  assert.equal(sentences.size, sits.length);
  for (const sit of sits) {
    const mark = markById(sit.id)!;
    assert.equal(canWatchMark(mark), true);
    assert.equal(sit.how, mark.how);
    assert.ok(sit.frames.length >= 2);
    assert.equal(sit.frames[0]!.alive, true);
    const weights = weightsFor(sit.id)!;
    const shelf = shelfSit(sit.id, weights);
    assert.equal(sit.score, shelf?.score);
    assert.equal(sit.note, shelf?.note);
    assert.equal(shelfSeed(sit.id), shelfSeed(sit.id));
  }
  const down = markById("wait-down")!;
  const burst = markById("wait-burst")!;
  assert.equal(canDownloadWeights(down, []), true);
  assert.equal(canDownloadWeights(burst, []), false);
  assert.equal(canWatchMark(burst), true);
  assert.match(freePricedLine(), /A free file downloads/);
  assert.match(freePricedLine(), /A priced file needs gold/);
});
