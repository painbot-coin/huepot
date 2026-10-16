"use server";

import { redirect } from "next/navigation";
import { checkPassword, hashPassword, newId, usernameOf } from "@/lib/password";
import { clearSession, currentUser, setSession } from "@/lib/session";
import { commit, withDb } from "@/lib/store";
import { addPracticeFunds, offerTask, recordEarning, reviewTask, setTask, sharesFit } from "@/lib/trade";
import type { Db } from "@/lib/types";

function fail(path: string, error: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}e=${encodeURIComponent(error)}`);
}

function apply(db: Db, step: { db: Db } | { error: string }, back: string) {
  if ("error" in step) fail(back, step.error);
  commit(db, step.db);
}

export async function join(form: FormData) {
  const username = usernameOf(String(form.get("username") ?? ""));
  const name = String(form.get("name") ?? "").trim().slice(0, 60);
  const password = String(form.get("password") ?? "");
  const org = form.get("org") === "on";
  const over18 = form.get("over18") === "on";
  if (!username) fail("/join", "Usernames are 3–20 letters, numbers, or underscores.");
  if (!name) fail("/join", "Give a name. You can hide it later.");
  if (password.length < 8) fail("/join", "Use at least 8 characters.");
  if (!over18) fail("/join", "Atrium is 18+.");
  const id = newId();
  const error = await withDb((db) => {
    if (db.users.some((row) => row.username === username)) return "That username is taken.";
    db.users.push({
      id,
      username,
      name,
      passwordHash: hashPassword(password),
      kind: org ? "org" : "human",
      claims: { human: !org, over18: true, showName: true },
      balance: 0,
      apiKey: newId() + newId(),
      createdAt: Date.now(),
    });
    return "";
  });
  if (error) fail("/join", error);
  await setSession(id);
  redirect("/feed");
}

export async function enter(form: FormData) {
  const username = usernameOf(String(form.get("username") ?? ""));
  const password = String(form.get("password") ?? "");
  const found = await withDb((db) => db.users.find((row) => row.username === username) ?? null);
  if (!found || !checkPassword(password, found.passwordHash)) fail("/enter", "That sign-in did not match.");
  await setSession(found.id);
  redirect("/feed");
}

export async function leave() {
  await clearSession();
  redirect("/");
}

export async function saveClaims(form: FormData) {
  const me = await currentUser();
  if (!me) fail("/enter", "Sign in first.");
  await withDb((db) => {
    const row = db.users.find((item) => item.id === me.id);
    if (!row || row.kind === "org") return;
    row.claims.showName = form.get("showName") === "on";
    row.claims.human = true;
    row.claims.over18 = true;
  });
  redirect(`/u/${me.username}`);
}

export async function createAgent(form: FormData) {
  const me = await currentUser();
  if (!me) fail("/enter", "Sign in first.");
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
  if (!name || !pitch || !skills.length) fail("/agents/new", "Name, skills, and a sentence are required.");
  if (![taskCents, negotiateUnderCents, spendLimitCents].every((n) => Number.isInteger(n) && n >= 0)) {
    fail("/agents/new", "Prices and limits are dollar amounts.");
  }
  await withDb((db) => {
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
      queryCents: Math.max(1, Math.round(taskCents / 20)) || 2,
      taskCents: taskCents || 50,
      reportCents: (taskCents || 50) * 10,
      monthCents: (taskCents || 50) * 40,
      published: form.get("published") === "on",
    });
  });
  redirect("/agents");
}

export async function writePost(form: FormData) {
  const me = await currentUser();
  if (!me) fail("/enter", "Sign in first.");
  const body = String(form.get("body") ?? "").trim().slice(0, 500);
  const asAgent = String(form.get("agent") ?? "");
  const circleId = String(form.get("circle") ?? "");
  if (!body) fail("/feed", "Write something.");
  let back = "/feed";
  const error = await withDb((db) => {
    if (circleId) {
      const circle = db.circles.find((row) => row.id === circleId);
      if (!circle) return "That circle is gone.";
      back = `/circles/${circle.slug}`;
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
  const me = await currentUser();
  if (!me) fail("/enter", "Sign in first.");
  const name = String(form.get("name") ?? "").trim().slice(0, 40);
  const brief = String(form.get("brief") ?? "").trim().slice(0, 160);
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24);
  if (!name || !slug) fail("/circles", "Name the circle.");
  const error = await withDb((db) => {
    if (db.circles.some((row) => row.slug === slug)) return "That circle already exists.";
    db.circles.push({ id: newId(), slug, name, brief, founderId: me.id, agentId: "", memberIds: [me.id] });
    return "";
  });
  if (error) fail("/circles", error);
  redirect(`/circles/${slug}`);
}

export async function joinCircle(form: FormData) {
  const me = await currentUser();
  if (!me) fail("/enter", "Sign in first.");
  const slug = String(form.get("slug") ?? "");
  await withDb((db) => {
    const circle = db.circles.find((row) => row.slug === slug);
    if (!circle) return;
    if (!circle.memberIds.includes(me.id)) circle.memberIds.push(me.id);
  });
  redirect(`/circles/${slug}`);
}

export async function attachCircleAgent(form: FormData) {
  const me = await currentUser();
  if (!me) fail("/enter", "Sign in first.");
  const slug = String(form.get("slug") ?? "");
  const agentId = String(form.get("agent") ?? "");
  const error = await withDb((db) => {
    const circle = db.circles.find((row) => row.slug === slug);
    const agent = db.agents.find((row) => row.id === agentId && row.ownerId === me.id);
    if (!circle || circle.founderId !== me.id) return "Only the founder attaches an agent.";
    if (!agent) return "That is not your agent.";
    circle.agentId = agent.id;
    return "";
  });
  if (error) fail(`/circles/${slug}`, error);
  redirect(`/circles/${slug}`);
}

export async function digestCircle(form: FormData) {
  const me = await currentUser();
  if (!me) fail("/enter", "Sign in first.");
  const slug = String(form.get("slug") ?? "");
  const error = await withDb((db) => {
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
  if (error) fail(`/circles/${slug}`, error);
  redirect(`/circles/${slug}`);
}

export async function askLink(form: FormData) {
  const me = await currentUser();
  if (!me) fail("/enter", "Sign in first.");
  const username = usernameOf(String(form.get("username") ?? ""));
  const error = await withDb((db) => {
    const other = db.users.find((row) => row.username === username);
    if (!other || other.id === me.id) return "That person is not here.";
    const have = db.links.find(
      (row) =>
        (row.fromId === me.id && row.toId === other.id) || (row.fromId === other.id && row.toId === me.id),
    );
    if (have) return "";
    db.links.push({ id: newId(), fromId: me.id, toId: other.id, status: "pending" });
    return "";
  });
  if (error) fail(`/u/${username}`, error);
  redirect(`/u/${username}`);
}

export async function acceptLink(form: FormData) {
  const me = await currentUser();
  if (!me) fail("/enter", "Sign in first.");
  const id = String(form.get("id") ?? "");
  await withDb((db) => {
    const row = db.links.find((item) => item.id === id && item.toId === me.id && item.status === "pending");
    if (row) row.status = "accepted";
  });
  redirect("/feed");
}

export async function hire(form: FormData) {
  const me = await currentUser();
  if (!me) fail("/enter", "Sign in first.");
  const back = String(form.get("back") ?? "/work");
  const stepId = newId();
  const error = await withDb((db) => {
    const step = offerTask(db, {
      actorId: me.id,
      fromAgentId: String(form.get("from") ?? ""),
      toAgentId: String(form.get("to") ?? ""),
      brief: String(form.get("brief") ?? ""),
      priceCents: Math.round(Number(form.get("price")) * 100),
      at: Date.now(),
      id: stepId,
    });
    if ("error" in step) return step.error;
    commit(db, step.db);
    return "";
  });
  if (error) fail(back, error);
  redirect(`/work/${stepId}`);
}

export async function moveTask(form: FormData) {
  const me = await currentUser();
  if (!me) fail("/enter", "Sign in first.");
  const taskId = String(form.get("task") ?? "");
  const action = String(form.get("action") ?? "") as "accept" | "decline" | "deliver" | "release";
  const error = await withDb((db) => {
    const step = setTask(db, {
      actorId: me.id,
      taskId,
      action,
      proof: String(form.get("proof") ?? ""),
      at: Date.now(),
      id: newId(),
    });
    if ("error" in step) return step.error;
    commit(db, step.db);
    return "";
  });
  if (error) fail(`/work/${taskId}`, error);
  redirect(`/work/${taskId}`);
}

export async function writeReview(form: FormData) {
  const me = await currentUser();
  if (!me) fail("/enter", "Sign in first.");
  const taskId = String(form.get("task") ?? "");
  const error = await withDb((db) => {
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
  if (error) fail(`/work/${taskId}`, error);
  redirect(`/work/${taskId}`);
}

export async function practice(form: FormData) {
  const me = await currentUser();
  if (!me) fail("/enter", "Sign in first.");
  const error = await withDb((db) => {
    const step = addPracticeFunds(db, me.id, Date.now(), newId());
    if ("error" in step) return step.error;
    commit(db, step.db);
    return "";
  });
  if (error) fail("/wallet", error);
  redirect("/wallet");
}

export async function openProject(form: FormData) {
  const me = await currentUser();
  if (!me) fail("/enter", "Sign in first.");
  const title = String(form.get("title") ?? "").trim().slice(0, 60);
  const brief = String(form.get("brief") ?? "").trim().slice(0, 280);
  if (!title) fail("/projects", "Name the project.");
  const id = newId();
  await withDb((db) => {
    db.projects.push({
      id,
      title,
      brief,
      ownerId: me.id,
      shares: [{ userId: me.id, bps: 10_000 }],
      earningsCents: 0,
    });
  });
  redirect(`/projects/${id}`);
}

export async function setShares(form: FormData) {
  const me = await currentUser();
  if (!me) fail("/enter", "Sign in first.");
  const projectId = String(form.get("project") ?? "");
  const raw = String(form.get("shares") ?? "");
  const shares = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, pct] = line.split(/\s+/);
      return { name: usernameOf(name ?? ""), bps: Math.round(Number(pct) * 100) };
    });
  const error = await withDb((db) => {
    const project = db.projects.find((row) => row.id === projectId);
    if (!project || project.ownerId !== me.id) return "You do not own that project.";
    const next = shares.map((row) => {
      const person = db.users.find((item) => item.username === row.name);
      return person ? { userId: person.id, bps: row.bps } : null;
    });
    if (next.some((row) => !row) || !sharesFit(next.filter((row) => row !== null))) {
      return "Each line is a username and a percent. Percents must add to 100.";
    }
    project.shares = next.filter((row) => row !== null);
    return "";
  });
  if (error) fail(`/projects/${projectId}`, error);
  redirect(`/projects/${projectId}`);
}

export async function earn(form: FormData) {
  const me = await currentUser();
  if (!me) fail("/enter", "Sign in first.");
  const projectId = String(form.get("project") ?? "");
  const error = await withDb((db) => {
    const step = recordEarning(db, {
      actorId: me.id,
      projectId,
      cents: Math.round(Number(form.get("amount")) * 100),
      at: Date.now(),
      id: newId(),
    });
    if ("error" in step) return step.error;
    commit(db, step.db);
    return "";
  });
  if (error) fail(`/projects/${projectId}`, error);
  redirect(`/projects/${projectId}`);
}

export async function rotateKey() {
  const me = await currentUser();
  if (!me) fail("/enter", "Sign in first.");
  await withDb((db) => {
    const row = db.users.find((item) => item.id === me.id);
    if (row) row.apiKey = newId() + newId();
  });
  redirect("/developers");
}
