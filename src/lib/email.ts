/**
 * Reaching a player who is not on the site.
 *
 * Until now nothing could. A queued withdrawal, a credited deposit or an
 * invite credit was invisible until the player happened to come back, and the
 * referral loop was fully built with nothing to deliver with.
 *
 * Three deliberate limits:
 *
 * 1. **Only money, and only the rare kind.** A payout happens every round a
 *    player wins, so mailing every notice would be spam. Deposits credited and
 *    withdrawals queued, paid or rejected are rare and are the ones a player
 *    must hear about even when they are not looking. Because these are
 *    transactional — your own money moving — there is no opt-out to build;
 *    "your withdrawal was paid" is not something to unsubscribe from. Anything
 *    social or promotional would need one, and none is sent.
 *
 * 2. **It cannot break the money path.** Queuing is a synchronous push onto an
 *    array, flushed to a table on the next persist, and sent later by a
 *    drainer. A provider being down must never roll back a payout, which is
 *    the same reason settled rounds are queued rather than written inline.
 *
 * 3. **Inert without credentials.** No provider configured means nothing is
 *    queued at all, rather than a table filling with mail nobody will send.
 *    When credentials arrive there is deliberately no backlog to blast.
 *
 * Both supported providers are plain HTTPS POSTs, so this adds no dependency.
 */

import { prisma } from "@/lib/db";

export type EmailProvider = "resend" | "postmark";

export type QueuedEmail = {
  id: string;
  userId: string;
  to: string;
  kind: string;
  subject: string;
  text: string;
  createdAt: number;
};

const pending: QueuedEmail[] = [];

/** Attempts before a message is left alone. */
const MAX_ATTEMPTS = 5;
const DRAIN_MS = 60_000;
const BATCH = 10;

export function emailConfig() {
  const provider = (process.env.EMAIL_PROVIDER ?? "").trim().toLowerCase();
  const key = (process.env.EMAIL_KEY ?? "").trim();
  const from = (process.env.EMAIL_FROM ?? "").trim();
  // Only used by tests and self-hosting; production talks to the real host.
  const endpoint = (process.env.EMAIL_ENDPOINT ?? "").trim();
  return { provider, key, from, endpoint };
}

export function emailConfigured() {
  const { provider, key, from } = emailConfig();
  if (provider !== "resend" && provider !== "postmark") return false;
  // A sender the provider has not verified is a bounce, so an unset or
  // obviously wrong FROM counts as not configured rather than as a failure
  // discovered one withdrawal later.
  return Boolean(key && from && /@/.test(from));
}

export async function ensureEmailTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS EmailOutbox (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      toAddress TEXT NOT NULL,
      kind TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      attempts INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL,
      sentAt INTEGER,
      error TEXT NOT NULL DEFAULT ''
    )
  `);
  try {
    await prisma.$executeRawUnsafe(
      "CREATE INDEX IF NOT EXISTS EmailOutbox_status_createdAt_idx ON EmailOutbox(status, createdAt)",
    );
  } catch {
    /* index already exists */
  }
}

/**
 * Synchronous on purpose: this is called from inside the store write lock,
 * where an await would hold the one lane the whole house shares.
 */
export function queueEmail(input: {
  userId: string;
  to: string;
  kind: string;
  subject: string;
  text: string;
}) {
  if (!emailConfigured()) return null;
  const to = input.to.trim();
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return null;
  const row: QueuedEmail = {
    id: crypto.randomUUID(),
    userId: input.userId,
    to,
    kind: input.kind,
    subject: input.subject,
    text: input.text,
    createdAt: Date.now(),
  };
  pending.push(row);
  return row;
}

export function listPendingEmails() {
  return pending.slice();
}

function esc(value: string) {
  return value.replace(/'/g, "''");
}

/** Called from persistStore, beside the settled-round flush, for the same reason. */
export async function flushEmails() {
  if (!pending.length) return;
  await ensureEmailTables();
  while (pending.length) {
    const row = pending[0];
    await prisma.$executeRawUnsafe(
      `INSERT OR IGNORE INTO EmailOutbox (id, userId, toAddress, kind, subject, body, status, attempts, createdAt)
       VALUES ('${esc(row.id)}', '${esc(row.userId)}', '${esc(row.to)}', '${esc(row.kind)}',
               '${esc(row.subject)}', '${esc(row.text)}', 'queued', 0, ${row.createdAt})`,
    );
    pending.shift();
  }
}

async function postJson(url: string, headers: Record<string, string>, body: unknown) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } finally {
    clearTimeout(timer);
  }
}

/** The wire format for each provider, kept in one place so a swap is one branch. */
export function requestFor(
  provider: EmailProvider,
  config: { key: string; from: string; endpoint: string },
  message: { to: string; subject: string; text: string },
): { url: string; headers: Record<string, string>; body: Record<string, unknown> } {
  if (provider === "postmark") {
    return {
      url: config.endpoint || "https://api.postmarkapp.com/email",
      headers: { "X-Postmark-Server-Token": config.key, accept: "application/json" },
      body: {
        From: config.from,
        To: message.to,
        Subject: message.subject,
        TextBody: message.text,
        MessageStream: "outbound",
      },
    };
  }
  return {
    url: config.endpoint || "https://api.resend.com/emails",
    headers: { authorization: `Bearer ${config.key}` },
    body: {
      from: config.from,
      to: [message.to],
      subject: message.subject,
      text: message.text,
    },
  };
}

export async function sendOne(message: { to: string; subject: string; text: string }) {
  const config = emailConfig();
  const provider = config.provider as EmailProvider;
  const { url, headers, body } = requestFor(provider, config, message);
  return postJson(url, headers, body);
}

type OutboxRow = {
  id: string;
  toAddress: string;
  subject: string;
  body: string;
  attempts: number | bigint;
};

export async function drainEmails(limit = BATCH) {
  if (!emailConfigured()) return { sent: 0, failed: 0 };
  await ensureEmailTables();
  const rows = await prisma.$queryRawUnsafe<OutboxRow[]>(
    `SELECT id, toAddress, subject, body, attempts FROM EmailOutbox
      WHERE status = 'queued' AND attempts < ${MAX_ATTEMPTS}
      ORDER BY createdAt ASC LIMIT ${Math.max(1, Math.min(50, limit))}`,
  );
  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    const attempts = Number(row.attempts) + 1;
    let ok = false;
    let note = "";
    try {
      const res = await sendOne({ to: row.toAddress, subject: row.subject, text: row.body });
      ok = res.ok;
      if (!ok) note = `http ${res.status} ${res.text.slice(0, 180)}`;
    } catch (error) {
      note = error instanceof Error ? error.message.slice(0, 180) : "send failed";
    }
    if (ok) {
      sent += 1;
      await prisma.$executeRawUnsafe(
        `UPDATE EmailOutbox SET status = 'sent', attempts = ${attempts}, sentAt = ${Date.now()}, error = '' WHERE id = '${esc(row.id)}'`,
      );
    } else {
      failed += 1;
      // Left queued until the attempt ceiling so a provider blip retries, and
      // marked failed after that so it stops being picked up forever.
      const status = attempts >= MAX_ATTEMPTS ? "failed" : "queued";
      await prisma.$executeRawUnsafe(
        `UPDATE EmailOutbox SET status = '${status}', attempts = ${attempts}, error = '${esc(note)}' WHERE id = '${esc(row.id)}'`,
      );
    }
  }
  return { sent, failed };
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startEmailDrainer() {
  if (timer || !emailConfigured()) return;
  timer = setInterval(() => {
    void drainEmails().catch(() => undefined);
  }, DRAIN_MS);
  setTimeout(() => {
    void drainEmails().catch(() => undefined);
  }, 15_000);
}

export async function outboxSummary() {
  try {
    await ensureEmailTables();
    const rows = await prisma.$queryRawUnsafe<{ status: string; n: number | bigint }[]>(
      "SELECT status, COUNT(*) AS n FROM EmailOutbox GROUP BY status",
    );
    const out: Record<string, number> = { queued: 0, sent: 0, failed: 0 };
    for (const row of rows) out[row.status] = Number(row.n);
    return out;
  } catch {
    return { queued: 0, sent: 0, failed: 0 };
  }
}
