import test from "node:test";
import assert from "node:assert/strict";
import {
  alikeScore,
  alikeWhy,
  composeHallHome,
  lastPitOf,
  parseDoor,
  parseDoors,
  parseSearchIntent,
  parseSitSlug,
  searchRooms,
  seatMatchesQuery,
  tasteOf,
} from "@/lib/seat-alike";
import type { PublicRoomCard, User } from "@/lib/types";

function seat(input: Partial<User> & { username: string }): User {
  return {
    id: input.username,
    email: `${input.username}@huepot.net`,
    passwordHash: "",
    googleId: null,
    emailVerified: true,
    verifyToken: null,
    verifyExpires: null,
    verifySentAt: null,
    createdAt: 1,
    balance: 0,
    bonus: 0,
    withdrawAddress: "",
    wallets: {},
    limits: {
      frozen: false,
      freezeNote: "",
      dailyLossCap: 0,
      coolOffUntil: 0,
      selfExcludeUntil: 0,
      pendingLossCap: null,
      pendingLossCapAt: 0,
    },
    ageConfirmedAt: 1,
    resetToken: null,
    resetExpires: null,
    resetSentAt: null,
    inviteCode: "",
    invitedBy: null,
    headline: "",
    about: "",
    location: "",
    ...input,
  };
}

function room(slug: string, name: string): PublicRoomCard {
  return {
    slug,
    name,
    kind: "basic",
    ownerName: null,
    buttonCount: 4,
    clickPrice: 1,
    roundSeconds: 60,
    fogSeconds: null,
    status: "live",
    pot: 0,
    players: 0,
    roundNumber: 1,
    liveMinutes: null,
    closesAt: null,
    paused: false,
    sitting: [],
  };
}

test("doors out keep only https X, Telegram, or Discord invite", () => {
  assert.equal(parseDoor("x", "https://x.com/huepot"), "https://x.com/huepot");
  assert.equal(parseDoor("telegram", "https://t.me/huepot"), "https://t.me/huepot");
  assert.equal(parseDoor("discord", "https://discord.gg/huepot"), "https://discord.gg/huepot");
  assert.throws(() => parseDoor("x", "http://x.com/huepot"));
  assert.throws(() => parseDoor("discord", "https://discord.com/channels/1"));
  assert.deepEqual(parseDoors({}), { x: "", telegram: "", discord: "" });
});

test("a preferred pit has to be a house pit", () => {
  assert.equal(parseSitSlug("classic"), "classic");
  assert.equal(parseSitSlug(""), "");
  assert.throws(() => parseSitSlug("lobby"));
});

test("search reads a pit or a colour out of the query", () => {
  const hit = parseSearchIntent("classic azure");
  assert.equal(hit.slug, "classic");
  assert.equal(hit.color, "Azure");
});

test("alike ranks the same house seat first", () => {
  const you = tasteOf(seat({ username: "ana", seat: "ai", sitSlug: "fog" }));
  const same = tasteOf(seat({ username: "bill", seat: "ai", sitSlug: "high" }));
  const pit = tasteOf(seat({ username: "cara", seat: "gamer", sitSlug: "fog" }));
  assert.ok(alikeScore(you, same) > alikeScore(you, pit));
  assert.equal(alikeWhy(you, same), "Same role · AI developer");
});

test("alike ranks the same pit above a shared hall town", () => {
  const you = tasteOf(seat({ username: "ana", sitSlug: "fog", location: "Lisbon" }));
  const pit = tasteOf(seat({ username: "bill", sitSlug: "fog", location: "Oslo" }));
  const town = tasteOf(seat({ username: "cara", sitSlug: "high", location: "Lisbon" }));
  assert.ok(alikeScore(you, pit) > alikeScore(you, town));
  assert.equal(alikeWhy(you, pit), "Plays Fog too");
  assert.equal(alikeWhy(you, town), "Same location");
});

test("a seat matches a pit or colour query", () => {
  const user = seat({ username: "ana", sitSlug: "night", headline: "late sit", avatar: "hue:violet" });
  const taste = tasteOf(user);
  assert.equal(seatMatchesQuery(user, parseSearchIntent("night"), taste), true);
  assert.equal(seatMatchesQuery(user, parseSearchIntent("violet"), taste), true);
  assert.equal(seatMatchesQuery(user, parseSearchIntent("high"), taste), false);
});

test("last pit is the live seat, then the pit they named", () => {
  const ana = seat({ username: "ana", sitSlug: "fog" });
  assert.deepEqual(lastPitOf(ana), {
    slug: "fog",
    name: "Fog Pit",
    sitting: false,
  });
  assert.deepEqual(lastPitOf(ana, { sitting: { slug: "classic", name: "Classic Pit" } }), {
    slug: "classic",
    name: "Classic Pit",
    sitting: true,
  });
  assert.equal(lastPitOf(seat({ username: "zed" })), null);
  assert.equal(composeHallHome(null, []), null);
  assert.equal(composeHallHome(null, [
    { username: "bill", avatar: "", headline: "", why: "Plays Fog too" },
  ])?.alike[0]?.username, "bill");
});

test("house search puts the named pit first", () => {
  const rooms = searchRooms(
    [room("high", "High Table"), room("classic", "Classic Pit"), room("fog", "Fog Pit")],
    "classic",
  );
  assert.equal(rooms[0]?.slug, "classic");
});
