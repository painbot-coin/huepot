/**
 * The wing ranks talk the same way for a guest and a seat.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { recommendPosts } from "@/lib/feed-rank";
import type { NetworkPost } from "@/lib/types";

function post(input: Partial<NetworkPost> & { id: string; username: string }): NetworkPost {
  return {
    avatar: "",
    headline: "",
    body: "",
    link: "",
    image: "",
    title: "",
    source: "",
    createdAt: Date.now(),
    likes: 0,
    liked: false,
    relation: "none",
    comments: [],
    ...input,
  };
}

test("a guest still sees the louder card first", () => {
  const quiet = post({ id: "a", username: "ana", likes: 0 });
  const loud = post({ id: "b", username: "bill", likes: 8 });
  const ranked = recommendPosts([quiet, loud], "");
  assert.equal(ranked[0]?.id, "b");
});

test("your own line drops behind other seats when you are signed in", () => {
  const mine = post({ id: "me", username: "volt", likes: 20 });
  const theirs = post({ id: "them", username: "bill", likes: 1 });
  const ranked = recommendPosts([mine, theirs], "volt");
  assert.equal(ranked[0]?.id, "them");
});
