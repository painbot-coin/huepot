import test from "node:test";
import assert from "node:assert/strict";
import { canOpenProject, parseProjectHref, publicProject } from "@/lib/seat-project-public";

const row = {
  id: "p1",
  userId: "u1",
  seat: "game" as const,
  name: "Open sit",
  how: "A sit you can take home.",
  href: "https://example.com/sit",
  priceCents: 250,
  createdAt: 1,
};

test("a project door stays on https", () => {
  assert.equal(parseProjectHref("https://huepot.net/wait"), "https://huepot.net/wait");
  assert.throws(() => parseProjectHref("http://huepot.net/wait"));
  assert.throws(() => parseProjectHref("not-a-link"));
  assert.throws(() => parseProjectHref("https://user:pass@huepot.net/wait"));
});

test("a priced door hides until gold has left the vault", () => {
  const locked = publicProject(row, "ana", []);
  assert.equal(locked.href, "");
  assert.equal(locked.owned, false);
  assert.equal(canOpenProject(row, []), false);

  const open = publicProject(row, "ana", ["p1"]);
  assert.equal(open.href, "https://example.com/sit");
  assert.equal(open.owned, true);
  assert.equal(canOpenProject(row, ["p1"]), true);
});

test("a free door is open to anyone", () => {
  const free = { ...row, priceCents: 0 };
  const shown = publicProject(free, "ana", []);
  assert.equal(shown.href, "https://example.com/sit");
  assert.equal(shown.owned, true);
  assert.equal(shown.priceLabel, "Free door");
  assert.equal(canOpenProject(free, []), true);
});
