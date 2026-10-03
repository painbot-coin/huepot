"use server";

import { redirect } from "next/navigation";
import { newId } from "@/lib/atrium/ids";
import { holdKey, issueKey } from "@/lib/atrium/key";
import { commit, ensureSeat, seatByUsername, withDb } from "@/lib/atrium/store";
import { reviewTask, sharesFit } from "@/lib/atrium/trade";
import { parseUsdtToCents } from "@/lib/money";
import { getHeaderUser } from "@/lib/auth";
import { MAX_PACT_CENTS, MIN_PACT_CENTS } from "@/lib/vault-pact";
import { lockHire, moveHire, readWork, seatsByNames, splitEarning } from "@/lib/vault-work";

function fail(path: string, error: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}e=${encodeURIComponent(error)}`);
}

async function actor(back: string) {
  const user = await getHeaderUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(back)}`);
  return user;
}

export async function saveClaims(form: FormData) {
  const me = await actor("/atrium");
  const back = `/atrium/u/${encodeURIComponent(me.username)}`;
  await withDb((db) => {
    const row = ensureSeat(db, me);
    if (row.kind === "org") return;
    row.claims.showName = form.get("showName") === "on";
    row.claims.human = true;
  });
  redirect(back);
}

export async function setOrg(form: FormData) {
  const me = await actor("/atrium");
  await withDb((db) => {
    const row = ensureSeat(db, me);
    const org = form.get("org") === "on";
    row.kind = org ? "org" : "human";
    row.claims.human = !org;
  });
  redirect(`/atrium/u/${encodeURIComponent(me.username)}`);
}

export async function createAgent(form: FormData) {
  const me = await actor("/atrium/agents/new");
  const name = String(form.get("name") ?? "").trim().slice(0, 40);
  const pitch = String(form.get("pitch") ?? "").trim().slice(0, 280);
  const skills = String(form.get("skills") ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 8);
  const taskCents = Math.round(Number(form.get("task")) * 100);
  const negotiateUnderCents = Math.round(Number(form.get("cap")) * 100);
  const spendLimitCents = Math.round(Number(form.get("limit")) * 100);
  if (!name || !pitch || !skills.length) fail("/atrium/agents/new", "Name, skills, and a sentence are required.");
  if (![taskCents, negotiateUnderCents, spendLimitCents].every((n) => Number.isInteger(n) && n >= 0)) {
    fail("/atrium/agents/new", "Prices and limits are USDT amounts.");
  }
  if (taskCents < MIN_PACT_CENTS) fail("/atrium/agents/new", "Name a task price of at least 1 USDT.");
  const price = taskCents;
  await withDb((db) => {
    ensureSeat(db, me);
    db.agents.push({
      id: newId(),
      ownerId: me.id,
      name,
      skills,
      pitch,
      available: true,
      negotiateUnderCents,
      spendLimitCents,
      spentCents: 0,
      queryCents: Math.max(1, Math.round(price / 20)),
      taskCents: price,
      reportCents: price * 10,
      monthCents: price * 40,
      published: form.get("published") === "on",
    });
  });
  redirect("/atrium");
}

export async function writePost(form: FormData) {
  const me = await actor("/atrium/feed");
  const body = String(form.get("body") ?? "").trim().slice(0, 500);
  const asAgent = String(form.get("agent") ?? "");
  const circleId = String(form.get("circle") ?? "");
  if (!body) fail(circleId ? "/atrium/feed" : "/atrium/feed", "Write something.");
  let back = "/atrium/feed";
  const error = await withDb((db) => {
    ensureSeat(db, me);
    if (circleId) {
      const circle = db.circles.find((row) => row.id === circleId);
      if (!circle) return "That circle is gone.";
      back = `/atrium/circles/${circle.slug}`;
    }
    if (asAgent) {
      const agent = db.agents.find((row) => row.id === asAgent && row.ownerId === me.id);
      if (!agent) return "That is not your agent.";
      db.posts.push({ id: newId(), authorId: agent.id, authorKind: "agent", body, circleId, createdAt: Date.now() });
      return "";
    }
    db.posts.push({ id: newId(), authorId: me.id, authorKind: "human", body, circleId, createdAt: Date.now() });
    return "";
  });
  if (error) fail(back, error);
  redirect(back);
}

export async function openCircle(form: FormData) {
  const me = await actor("/atrium/circles");
  const name = String(form.get("name") ?? "").trim().slice(0, 40);
  const brief = String(form.get("brief") ?? "").trim().slice(0, 160);
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  if (!name || !slug) fail("/atrium/circles", "Name the circle.");
  const error = await withDb((db) => {
    ensureSeat(db, me);
    if (db.circles.some((row) => row.slug === slug)) return "That circle already exists.";
    db.circles.push({ id: newId(), slug, name, brief, founderId: me.id, agentId: "", memberIds: [me.id] });
    return "";
  });
  if (error) fail("/atrium/circles", error);
  redirect(`/atrium/circles/${slug}`);
}

export async function joinCircle(form: FormData) {
  const me = await actor("/atrium/circles");
  const slug = String(form.get("slug") ?? "");
  await withDb((db) => {
    ensureSeat(db, me);
    const circle = db.circles.find((row) => row.slug === slug);
    if (!circle) return;
    if (!circle.memberIds.includes(me.id)) circle.memberIds.push(me.id);
  });
  redirect(`/atrium/circles/${slug}`);
}

export async function attachCircleAgent(form: FormData) {
  const me = await actor("/atrium/circles");
  const slug = String(form.get("slug") ?? "");
  const agentId = String(form.get("agent") ?? "");
  const error = await withDb((db) => {
    ensureSeat(db, me);
    const circle = db.circles.find((row) => row.slug === slug);
    const agent = db.agents.find((row) => row.id === agentId && row.ownerId === me.id);
    if (!circle || circle.founderId !== me.id) return "Only the founder attaches an agent.";
    if (!agent) return "That is not your agent.";
    circle.agentId = agent.id;
    return "";
  });
  if (error) fail(`/atrium/circles/${slug}`, error);
  redirect(`/atrium/circles/${slug}`);
}

export async function digestCircle(form: FormData) {
  const me = await actor("/atrium/circles");
  const slug = String(form.get("slug") ?? "");
  const error = await withDb((db) => {
    ensureSeat(db, me);
    const circle = db.circles.find((row) => row.slug === slug);
    if (!circle?.agentId) return "This circle has no agent yet.";
    const agent = db.agents.find((row) => row.id === circle.agentId);
    if (!agent || agent.ownerId !== me.id) return "Only the agent's owner can ask it to digest.";
    const recent = db.posts.filter((row) => row.circleId === circle.id).slice(-5);
    if (!recent.length) return "Nothing to digest yet.";
    const body = recent.map((row) => row.body).join(" · ").slice(0, 500);
    db.posts.push({
      id: newId(),
      authorId: agent.id,
      authorKind: "agent",
      body: `Digest: ${body}`,
      circleId: circle.id,
      createdAt: Date.now(),
    });
    return "";
  });
  if (error) fail(`/atrium/circles/${slug}`, error);
  redirect(`/atrium/circles/${slug}`);
}

export async function askLink(form: FormData) {
  const me = await actor("/atrium");
  const username = String(form.get("username") ?? "");
  const back = `/atrium/u/${encodeURIComponent(username)}`;
  const error = await withDb((db) => {
    ensureSeat(db, me);
    const other = seatByUsername(db, username);
    if (!other || other.id === me.id) return "That seat has not opened Agents.";
    const have = db.links.find(
      (row) => (row.fromId === me.id && row.toId === other.id) || (row.fromId === other.id && row.toId === me.id),
    );
    if (have) return "";
    db.links.push({ id: newId(), fromId: me.id, toId: other.id, status: "pending" });
    return "";
  });
  if (error) fail(back, error);
  redirect(back);
}

export async function acceptLink(form: FormData) {
  const me = await actor("/atrium/feed");
  const id = String(form.get("id") ?? "");
  await withDb((db) => {
    ensureSeat(db, me);
    const row = db.links.find((item) => item.id === id && item.toId === me.id && item.status === "pending");
    if (row) row.status = "accepted";
  });
  redirect("/atrium/feed");
}

export async function hire(form: FormData) {
  const back = String(form.get("back") ?? "/atrium/work");
  const me = await actor(back);
  const cents = parseUsdtToCents(Number(String(form.get("price") ?? "").trim()));
  const safe = back.startsWith("/atrium") ? back : "/atrium/work";
  if (!Number.isInteger(cents) || cents < MIN_PACT_CENTS) fail(safe, "Name a price of at least 1 USDT.");
  if (cents > MAX_PACT_CENTS) fail(safe, "A hire locks at most 100,000 USDT.");
  const stepId = newId();
  const error = await lockHire({
    actorId: me.id,
    fromAgentId: String(form.get("from") ?? ""),
    toAgentId: String(form.get("to") ?? ""),
    brief: String(form.get("brief") ?? ""),
    priceCents: cents,
    id: stepId,
  });
  if (error) fail(safe, error);
  redirect(`/atrium/work/${stepId}`);
}

export async function moveTask(form: FormData) {
  const taskId = String(form.get("task") ?? "");
  const me = await actor(`/atrium/work/${taskId}`);
  const action = String(form.get("action") ?? "") as "accept" | "decline" | "deliver" | "release";
  if (action !== "accept" && action !== "decline" && action !== "deliver" && action !== "release") {
    fail(`/atrium/work/${taskId}`, "That step is not available.");
  }
  const error = await moveHire({
    actorId: me.id,
    hireId: taskId,
    action,
    proof: String(form.get("proof") ?? ""),
    id: newId(),
  });
  if (error) fail(`/atrium/work/${taskId}`, error);
  redirect(`/atrium/work/${taskId}`);
}

export async function writeReview(form: FormData) {
  const taskId = String(form.get("task") ?? "");
  const me = await actor(`/atrium/work/${taskId}`);
  const work = await readWork();
  const hire = work.hires.find((row) => row.id === taskId);
  if (!hire || hire.status !== "released") fail(`/atrium/work/${taskId}`, "Review a finished payment.");
  if (hire.buyerId !== me.id) fail(`/atrium/work/${taskId}`, "The buyer writes the review.");
  const error = await withDb((db) => {
    ensureSeat(db, me);
    if (!db.tasks.some((row) => row.id === hire.id)) db.tasks.push(hire);
    const step = reviewTask(db, {
      actorId: me.id,
      taskId,
      stars: Number(form.get("stars")),
      body: String(form.get("body") ?? ""),
      at: Date.now(),
      id: newId(),
    });
    if ("error" in step) return step.error;
    commit(db, step.db);
    return "";
  });
  if (error) fail(`/atrium/work/${taskId}`, error);
  redirect(`/atrium/work/${taskId}`);
}

export async function practice() {
  await actor("/account");
  redirect("/account");
}

export async function openProject(form: FormData) {
  const me = await actor("/atrium/projects");
  const title = String(form.get("title") ?? "").trim().slice(0, 60);
  const brief = String(form.get("brief") ?? "").trim().slice(0, 280);
  if (!title) fail("/atrium/projects", "Name the project.");
  const id = newId();
  await withDb((db) => {
    ensureSeat(db, me);
    db.projects.push({
      id,
      title,
      brief,
      ownerId: me.id,
      shares: [{ userId: me.id, bps: 10_000 }],
      earningsCents: 0,
    });
  });
  redirect(`/atrium/projects/${id}`);
}

export async function setShares(form: FormData) {
  const me = await actor("/atrium/projects");
  const projectId = String(form.get("project") ?? "");
  const raw = String(form.get("shares") ?? "");
  const shares = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, pct] = line.split(/\s+/);
      return { name: (name ?? "").trim(), bps: Math.round(Number(pct) * 100) };
    });
  const error = await withDb((db) => {
    ensureSeat(db, me);
    const project = db.projects.find((row) => row.id === projectId);
    if (!project || project.ownerId !== me.id) return "You do not own that project.";
    return "";
  });
  if (error) fail(`/atrium/projects/${projectId}`, error);
  const found = await seatsByNames(shares.map((row) => row.name));
  const next = shares.map((row, index) => {
    const person = found[index];
    return person ? { userId: person.id, bps: row.bps } : null;
  });
  if (next.some((row) => !row) || !sharesFit(next.filter((row) => row !== null))) {
    fail(`/atrium/projects/${projectId}`, "Each line is a username and a percent. Percents must add to 100. Each person must be a Huepot seat.");
  }
  await withDb((db) => {
    const project = db.projects.find((row) => row.id === projectId);
    if (project && project.ownerId === me.id) project.shares = next.filter((row) => row !== null);
  });
  redirect(`/atrium/projects/${projectId}`);
}

export async function earn(form: FormData) {
  const me = await actor("/atrium/projects");
  const projectId = String(form.get("project") ?? "");
  const cents = parseUsdtToCents(Number(String(form.get("amount") ?? "").trim()));
  if (!Number.isInteger(cents) || cents < MIN_PACT_CENTS) fail(`/atrium/projects/${projectId}`, "Name an earning of at least 1 USDT.");
  if (cents > MAX_PACT_CENTS) fail(`/atrium/projects/${projectId}`, "A share locks at most 100,000 USDT.");
  const error = await splitEarning({
    actorId: me.id,
    projectId,
    cents,
    id: newId(),
  });
  if (error) fail(`/atrium/projects/${projectId}`, error);
  redirect(`/atrium/projects/${projectId}`);
}

export async function rotateKey() {
  const me = await actor("/atrium/developers");
  const issued = issueKey();
  await withDb((db) => {
    const row = ensureSeat(db, me);
    row.apiKey = issued.stored;
  });
  holdKey(me.id, issued.plain);
  redirect("/atrium/developers");
}
