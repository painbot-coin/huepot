import test from "node:test";
import assert from "node:assert/strict";
import {
  applicationNotice,
  applicationsOf,
  cleanBidHref,
  cleanBidNote,
  countOn,
  deskWork,
  jobById,
  listHouseJobs,
  manageApplicationsOf,
  placeBidOn,
  setBidStatusOn,
  takeBidFrom,
  yoursOn,
} from "@/lib/house-jobs";

test("the house posted the seats it still needs", () => {
  const ids = listHouseJobs().map((job) => job.id);
  assert.deepEqual(ids, [
    "design",
    "backend",
    "architect",
    "ml",
    "market",
    "lane",
    "break",
    "books",
    "classic",
    "shelf",
    "review",
  ]);
  assert.equal(jobById("design")?.seat, "design");
  assert.equal(jobById("backend")?.seat, "backend");
  assert.equal(jobById("architect")?.seat, "architect");
  assert.equal(jobById("ml")?.seat, "ml");
  assert.equal(jobById("market")?.seat, "market");
  assert.equal(jobById("lane")?.seat, "ai");
  assert.equal(jobById("break")?.seat, "ai");
  assert.equal(jobById("books")?.seat, "ai");
  assert.equal(jobById("classic")?.seat, "better");
  assert.equal(jobById("review")?.seat, "any");
  assert.match(jobById("review")?.how.join(" ") ?? "", /\/manage/);
  assert.equal(jobById("missing"), null);
});

test("house posts stay off invented pay and foreign games", () => {
  const text = listHouseJobs()
    .flatMap((job) => [job.title, job.need, ...job.how, ...job.stayOff])
    .join(" ");
  assert.match(text, /UI\/UX/);
  assert.match(text, /Backend engineer/);
  assert.match(text, /System architect/);
  assert.match(text, /Machine learning engineer/);
  assert.match(text, /Marketing specialist/);
  assert.match(text, /Not Dota/);
  assert.match(text, /deposit bonus/);
  assert.match(text, /overlay/);
  assert.doesNotMatch(text, /mainnet HUE pool/i);
  assert.doesNotMatch(text, /deposit 10 get 5/i);
  assert.doesNotMatch(text, /\$\d{2,}/);
});

test("a seat's project is work, and gold is not the line", () => {
  const rows = deskWork([
    {
      id: "house-wait",
      userId: "house",
      username: "house",
      name: "Games lab",
      how: "Play free.",
      seat: "game",
      href: "https://huepot.net/wait",
      priceCents: 0,
    },
    {
      id: "ada-tool",
      userId: "ada",
      username: "ada",
      name: "Brick pad",
      how: "A small break model.",
      seat: "ai",
      href: "https://huepot.net/wait",
      priceCents: 0,
    },
    {
      id: "bao-file",
      userId: "bao",
      username: "bao",
      name: "Priced file",
      how: "On the store.",
      seat: "game",
      href: "https://example.com/file",
      priceCents: 250,
    },
  ]);
  assert.deepEqual(
    rows.map((row) => row.username),
    ["ada", "bao"],
  );
  assert.equal(rows[0]?.href, "https://huepot.net/wait");
  assert.equal(rows[1]?.href, "");
  assert.equal(JSON.stringify(rows).includes("250"), false);
  assert.equal(deskWork([]).length, 0);
});

test("a bid needs a note and may carry an https door", () => {
  assert.throws(() => cleanBidNote("short"), /how you would/);
  assert.equal(cleanBidNote("I would sit Lane as a last-hit trainer."), "I would sit Lane as a last-hit trainer.");
  assert.equal(cleanBidHref(""), "");
  assert.equal(cleanBidHref("https://huepot.net/wait"), "https://huepot.net/wait");
  assert.throws(() => cleanBidHref("http://huepot.net/wait"));
});

test("one seat may bid once and take it back", () => {
  const first = placeBidOn([], {
    jobId: "lane",
    userId: "u1",
    username: "ana",
    seat: "game",
    note: "I would sit Lane as a last-hit trainer.",
    now: 10,
  });
  assert.equal(first.bid.jobId, "lane");
  assert.equal(countOn(first.rows, "lane"), 1);
  assert.equal(yoursOn(first.rows, "u1").lane?.note.includes("Lane"), true);

  const replaced = placeBidOn(first.rows, {
    jobId: "lane",
    userId: "u1",
    username: "ana",
    seat: "game",
    note: "I would sit Lane with a tiny own book.",
    now: 20,
  });
  assert.equal(countOn(replaced.rows, "lane"), 1);
  assert.match(replaced.bid.note, /tiny own book/);

  assert.throws(
    () =>
      placeBidOn([], {
        jobId: "ghost",
        userId: "u1",
        username: "ana",
        note: "I would sit something that is not posted.",
      }),
    /not found/,
  );

  const taken = takeBidFrom(replaced.rows, "u1", "lane");
  assert.equal(countOn(taken.rows, "lane"), 0);
  assert.throws(() => takeBidFrom(taken.rows, "u1", "lane"), /no application/);

  const hire = placeBidOn([], {
    jobId: "design",
    userId: "u2",
    username: "rio",
    seat: "game",
    note: "I would sit the floor and keep wait full-stage.",
    href: "https://huepot.net/wait",
    now: 30,
  });
  assert.equal(hire.bid.jobId, "design");
  assert.equal(hire.bid.href, "https://huepot.net/wait");
});

test("a seat can read its own applications, newest first", () => {
  const first = placeBidOn([], {
    jobId: "design",
    userId: "u1",
    username: "ana",
    note: "I would sit the floor and keep games full-stage.",
    now: 10,
  });
  const next = placeBidOn(first.rows, {
    jobId: "ml",
    userId: "u1",
    username: "ana",
    note: "I would train the open Stack book on the house.",
    now: 20,
  });
  const other = placeBidOn(next.rows, {
    jobId: "design",
    userId: "u2",
    username: "rio",
    note: "I would sit the floor and keep wait full-stage.",
    now: 30,
  });
  const mine = applicationsOf(other.rows, "u1");
  assert.equal(mine.length, 2);
  assert.equal(mine[0].jobId, "ml");
  assert.equal(mine[0].title, "Machine learning engineer");
  assert.equal(mine[1].title, "UI/UX designer");
  assert.equal(applicationsOf(other.rows, "u2").length, 1);
});

test("the house names an application, not a bid", () => {
  const fresh = applicationNotice("new", "UI/UX designer");
  assert.equal(fresh.title, "Huepot has your application");
  assert.match(fresh.body, /UI\/UX designer/);
  const again = applicationNotice("update", "UI/UX designer");
  assert.equal(again.title, "Application updated");
  assert.doesNotMatch(`${fresh.title} ${fresh.body} ${again.title}`, /bid/i);
});

test("the hiring desk can shortlist or pass an application", () => {
  const first = placeBidOn([], {
    jobId: "design",
    userId: "u1",
    username: "ana",
    note: "I would sit the floor and keep games full-stage.",
    now: 10,
  });
  assert.equal(first.bid.status, "open");
  const listed = manageApplicationsOf(first.rows);
  assert.equal(listed[0].title, "UI/UX designer");
  const next = setBidStatusOn(first.rows, first.bid.id, "shortlist");
  assert.equal(next.bid.status, "shortlist");
  assert.throws(() => setBidStatusOn(first.rows, first.bid.id, "hire"), /open, shortlist/);
});
