import { executeSql } from "@/lib/atlas-engine";
import { MongoPort } from "@/lib/atlas-mongo";
import { copyRow, docId, type SqlColumn, type SqlPort, type SqlRow } from "@/lib/atlas-port";

type Where = Record<string, unknown>;

const MODELS: Record<string, { table: string; pk: string[] }> = {
  user: { table: "User", pk: ["id"] },
  wallet: { table: "Wallet", pk: ["userId", "network"] },
  session: { table: "Session", pk: ["token"] },
  oAuthState: { table: "OAuthState", pk: ["state"] },
  notice: { table: "Notice", pk: ["id"] },
  tx: { table: "Tx", pk: ["id"] },
  room: { table: "Room", pk: ["id"] },
  roomSeat: { table: "RoomSeat", pk: ["roomId", "userId"] },
  roomEvent: { table: "RoomEvent", pk: ["id"] },
  round: { table: "Round", pk: ["id"] },
  meta: { table: "Meta", pk: ["id"] },
};

const CASCADE: Record<string, { table: string; field: string }[]> = {
  User: [
    { table: "Wallet", field: "userId" },
    { table: "Session", field: "userId" },
    { table: "Notice", field: "userId" },
    { table: "Tx", field: "playerId" },
  ],
  Room: [
    { table: "RoomSeat", field: "roomId" },
    { table: "RoomEvent", field: "roomId" },
    { table: "Round", field: "roomId" },
  ],
};

function col(
  name: string,
  pk = 0,
  type = "TEXT",
  defaultValue: unknown = null,
): SqlColumn {
  return { name, type, notNull: false, defaultValue, pk };
}

const BASE: { table: string; columns: SqlColumn[]; uniques?: string[][] }[] = [
  {
    table: "User",
    columns: [
      col("id", 1),
      col("email"),
      col("username"),
      col("passwordHash", 0, "TEXT", ""),
      col("googleId"),
      col("emailVerified", 0, "INTEGER", 0),
      col("verifyToken"),
      col("verifyExpires", 0, "INTEGER"),
      col("verifySentAt", 0, "INTEGER"),
      col("createdAt", 0, "INTEGER", 0),
      col("balance", 0, "REAL", 0),
      col("bonus", 0, "REAL", 0),
      col("withdrawAddress", 0, "TEXT", ""),
      col("limits", 0, "TEXT", "{}"),
      col("auth", 0, "TEXT", "{}"),
    ],
  },
  {
    table: "Wallet",
    columns: [col("userId", 1), col("network", 2), col("address"), col("secretEnc")],
  },
  {
    table: "Session",
    columns: [
      col("token", 1),
      col("userId"),
      col("expiresAt", 0, "INTEGER", 0),
      col("createdAt", 0, "INTEGER", 0),
      col("userAgent", 0, "TEXT", ""),
    ],
  },
  { table: "OAuthState", columns: [col("state", 1), col("expiresAt", 0, "INTEGER", 0)] },
  {
    table: "Notice",
    columns: [
      col("id", 1),
      col("userId"),
      col("kind"),
      col("title"),
      col("body"),
      col("href"),
      col("read", 0, "INTEGER", 0),
      col("createdAt", 0, "INTEGER", 0),
    ],
  },
  {
    table: "Tx",
    columns: [
      col("id", 1),
      col("playerId"),
      col("type"),
      col("amount", 0, "REAL", 0),
      col("createdAt", 0, "INTEGER", 0),
      col("note", 0, "TEXT", ""),
    ],
  },
  {
    table: "Room",
    columns: [
      col("id", 1),
      col("slug"),
      col("name"),
      col("kind"),
      col("ownerId"),
      col("buttonCount", 0, "INTEGER", 0),
      col("clickPrice", 0, "REAL", 0),
      col("roundSeconds", 0, "INTEGER", 0),
      col("fogSeconds", 0, "INTEGER"),
      col("createdAt", 0, "INTEGER", 0),
      col("liveMinutes", 0, "INTEGER"),
      col("closesAt", 0, "INTEGER"),
      col("roundNumber", 0, "INTEGER", 0),
      col("mutedIds", 0, "TEXT", "[]"),
      col("paused", 0, "INTEGER", 0),
      col("pausedAt", 0, "INTEGER"),
      col("slowMode", 0, "INTEGER", 0),
    ],
  },
  { table: "RoomSeat", columns: [col("roomId", 1), col("userId", 2)] },
  {
    table: "RoomEvent",
    columns: [
      col("id", 1),
      col("roomId"),
      col("kind"),
      col("userId"),
      col("username"),
      col("body", 0, "TEXT", ""),
      col("createdAt", 0, "INTEGER", 0),
    ],
  },
  {
    table: "Round",
    columns: [
      col("id", 1),
      col("roomId"),
      col("number", 0, "INTEGER", 0),
      col("status"),
      col("startedAt", 0, "INTEGER", 0),
      col("endsAt", 0, "INTEGER", 0),
      col("revealUntil", 0, "INTEGER"),
      col("clickPrice", 0, "REAL", 0),
      col("buttonIds", 0, "TEXT", "[]"),
      col("totals", 0, "TEXT", "{}"),
      col("clicks", 0, "TEXT", "{}"),
      col("result"),
      col("fair", 0, "TEXT", "{}"),
    ],
  },
  {
    table: "Meta",
    columns: [col("id", 1), col("roundNumber", 0, "INTEGER", 0), col("legacyRound")],
  },
];

function literal(value: unknown) {
  if (value == null) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "boolean") return value ? "1" : "0";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function stitch(strings: TemplateStringsArray, values: unknown[]) {
  let sql = "";
  strings.forEach((part, index) => {
    sql += part;
    if (index < values.length) sql += literal(values[index]);
  });
  return sql;
}

function bind(sql: string, params: unknown[]) {
  if (!params.length || !sql.includes("?")) return sql;
  let out = "";
  let quote: string | null = null;
  let index = 0;
  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i] ?? "";
    if (quote) {
      out += ch;
      if (ch === quote) {
        if (sql[i + 1] === quote) {
          out += sql[i + 1];
          i += 1;
          continue;
        }
        quote = null;
      }
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch;
      out += ch;
      continue;
    }
    if (ch === "?") {
      out += literal(params[index]);
      index += 1;
      continue;
    }
    out += ch;
  }
  return out;
}

function matches(row: SqlRow, where?: Where) {
  if (!where) return true;
  for (const [key, value] of Object.entries(where)) {
    if (value && typeof value === "object" && "in" in value) {
      const list = (value as { in: unknown[] }).in ?? [];
      if (!list.includes(row[key])) return false;
      continue;
    }
    if (row[key] !== value) return false;
  }
  return true;
}

function pick(row: SqlRow, select?: Record<string, boolean>) {
  const copy = copyRow(row);
  if (!select) return copy;
  const out: SqlRow = {};
  for (const [key, on] of Object.entries(select)) {
    if (on) out[key] = copy[key];
  }
  return out;
}

async function cascade(port: SqlPort, table: string, row: SqlRow) {
  if (row.id == null) return;
  for (const link of CASCADE[table] ?? []) {
    if (!(await port.tableExists(link.table))) continue;
    for (const child of await port.rows(link.table)) {
      if (child[link.field] === row.id) await port.del(link.table, String(child._id));
    }
  }
}

function model(port: SqlPort, spec: { table: string; pk: string[] }) {
  async function rows(where?: Where) {
    if (!(await port.tableExists(spec.table))) return [];
    return (await port.rows(spec.table)).filter((row) => matches(row, where));
  }

  return {
    async findUnique(args: { where: Where; select?: Record<string, boolean> }) {
      const found = (await rows(args.where))[0];
      return found ? pick(found, args.select) : null;
    },
    async findFirst(args: { where?: Where; select?: Record<string, boolean> }) {
      const found = (await rows(args.where))[0];
      return found ? pick(found, args.select) : null;
    },
    async findMany(args?: { where?: Where; select?: Record<string, boolean> }) {
      return (await rows(args?.where)).map((row) => pick(row, args?.select));
    },
    async count(args?: { where?: Where }) {
      return (await rows(args?.where)).length;
    },
    async update(args: { where: Where; data: SqlRow }) {
      const found = (await rows(args.where))[0];
      if (!found) throw new Error("Record to update not found.");
      const next = { ...copyRow(found), ...args.data };
      await port.put(spec.table, String(found._id ?? docId(spec.pk, next)), next);
      return next;
    },
    async upsert(args: { where: Where; create: SqlRow; update: SqlRow }) {
      const found = (await rows(args.where))[0];
      if (!found) {
        const next = { ...args.create };
        for (const column of await port.columns(spec.table)) {
          if (next[column.name] === undefined) next[column.name] = column.defaultValue;
        }
        await port.add(spec.table, docId(spec.pk, next), next);
        return next;
      }
      const next = { ...copyRow(found), ...args.update };
      await port.put(spec.table, String(found._id ?? docId(spec.pk, next)), next);
      return next;
    },
    async delete(args: { where: Where }) {
      const found = (await rows(args.where))[0];
      if (!found) throw new Error("Record to delete does not exist.");
      await cascade(port, spec.table, found);
      await port.del(spec.table, String(found._id));
      return copyRow(found);
    },
    async deleteMany(args?: { where?: Where }) {
      const found = await rows(args?.where);
      for (const row of found) {
        await cascade(port, spec.table, row);
        await port.del(spec.table, String(row._id));
      }
      return { count: found.length };
    },
    async createMany(args: { data: SqlRow[] }) {
      let count = 0;
      for (const data of args.data) {
        const next = { ...data };
        for (const column of await port.columns(spec.table)) {
          if (next[column.name] === undefined) next[column.name] = column.defaultValue;
        }
        if (await port.add(spec.table, docId(spec.pk, next), next)) count += 1;
      }
      return { count };
    },
  };
}

async function run(port: SqlPort, sql: string) {
  return executeSql(port, sql);
}

type ModelApi = ReturnType<typeof model>;

export type AtlasClient = {
  $queryRawUnsafe(sql: string, ...params: unknown[]): Promise<SqlRow[]>;
  $executeRawUnsafe(sql: string, ...params: unknown[]): Promise<number>;
  $queryRaw(strings: TemplateStringsArray, ...values: unknown[]): Promise<SqlRow[]>;
  $executeRaw(strings: TemplateStringsArray, ...values: unknown[]): Promise<number>;
  $transaction<T>(fn: (tx: AtlasClient) => Promise<T>, options?: { timeout?: number }): Promise<T>;
  user: ModelApi;
  wallet: ModelApi;
  session: ModelApi;
  oAuthState: ModelApi;
  notice: ModelApi;
  tx: ModelApi;
  room: ModelApi;
  roomSeat: ModelApi;
  roomEvent: ModelApi;
  round: ModelApi;
  meta: ModelApi;
};

export function prismaFacade(port: SqlPort): AtlasClient {
  let ready: Promise<void> | null = null;
  const ensure = () => {
    if (!ready) {
      ready = (async () => {
        for (const table of BASE) {
          if (await port.tableExists(table.table)) continue;
          await port.createTable(table.table, table.columns, true, table.uniques ?? []);
        }
      })();
    }
    return ready;
  };

  const client: Record<string, unknown> = {
    async $queryRawUnsafe(sql: string, ...params: unknown[]) {
      await ensure();
      return (await run(port, bind(sql, params))).rows;
    },
    async $executeRawUnsafe(sql: string, ...params: unknown[]) {
      await ensure();
      return (await run(port, bind(sql, params))).changes;
    },
    async $queryRaw(strings: TemplateStringsArray, ...values: unknown[]) {
      await ensure();
      return (await run(port, stitch(strings, values))).rows;
    },
    async $executeRaw(strings: TemplateStringsArray, ...values: unknown[]) {
      await ensure();
      return (await run(port, stitch(strings, values))).changes;
    },
  };
  client.$transaction = async <T>(fn: (tx: AtlasClient) => Promise<T>, options?: { timeout?: number }) => {
    await ensure();
    return port.transaction((inner) => fn(prismaFacade(inner)), options?.timeout ?? 20_000);
  };

  for (const [name, spec] of Object.entries(MODELS)) {
    const api = model(port, spec);
    const wrapped: Record<string, unknown> = {};
    for (const key of Object.keys(api) as (keyof typeof api)[]) {
      const method = api[key];
      wrapped[key] = async (...args: unknown[]) => {
        await ensure();
        return (method as (...inner: unknown[]) => unknown).apply(api, args);
      };
    }
    client[name] = wrapped;
  }

  return client as AtlasClient;
}

let atlas: ReturnType<typeof prismaFacade> | null = null;

export function atlasPrisma() {
  if (!atlas) atlas = prismaFacade(new MongoPort());
  return atlas;
}
