import { AsyncLocalStorage } from "node:async_hooks";
import pkg from "node-sql-parser";
import { copyRow, docId, type SqlColumn, type SqlPort, type SqlRow } from "@/lib/atlas-port";

const ports = new AsyncLocalStorage<SqlPort>();

const { Parser } = pkg;
const parser = new Parser();

type Node = {
  type?: string;
  operator?: string;
  left?: Node;
  right?: Node;
  expr?: Node;
  args?: Node[] | { expr?: Node; distinct?: string; value?: Node[]; type?: string };
  value?: unknown;
  values?: Node[] | { type?: string; value?: Node[]; values?: Node[] };
  column?: string | { column?: string };
  table?: string | null | Node[];
  name?: string | { name?: { value?: string }[] };
  as?: string | null;
  over?: Node;
  columns?: Node[];
  from?: Node[];
  where?: Node | null;
  groupby?: { columns?: Node[] } | null;
  having?: Node | null;
  orderby?: { expr: Node; type?: string }[] | null;
  limit?: { value?: Node[] } | null;
  distinct?: unknown;
  join?: string;
  on?: Node | null;
  set?: { column?: string; value?: Node }[];
  ast?: Node;
  target?: { dataType?: string }[];
  parentheses?: boolean;
  [key: string]: unknown;
};

type Env = { cells: Map<string, unknown>; outer?: Env };

const emptyEnv = (): Env => ({ cells: new Map() });

function shortError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.split("\n")[0]?.slice(0, 220) || "SQL could not be read.";
}

function quoteReserved(sql: string) {
  let out = "";
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i] ?? "";
    if (ch === "'" || ch === '"' || ch === "`") {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === ch) {
          if (sql[j + 1] === ch) {
            j += 2;
            continue;
          }
          j += 1;
          break;
        }
        j += 1;
      }
      out += sql.slice(i, j);
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < sql.length && /[A-Za-z0-9_]/.test(sql[j] ?? "")) j += 1;
      const word = sql.slice(i, j);
      out += word.toLowerCase() === "read" ? `\`${word}\`` : word;
      i = j;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

function prepare(sql: string) {
  let text = sql.trim().replace(/;\s*$/, "");
  const orIgnore = /insert\s+or\s+ignore\s+into/i.test(text);
  text = text.replace(/insert\s+or\s+ignore\s+into/gi, "INSERT INTO");
  text = quoteReserved(text);
  let conflict: string[] | null = null;
  let updateSql: string | null = null;
  const upsert = text.match(/\sON\s+CONFLICT\s*\(([^)]+)\)\s+DO\s+UPDATE\s+SET\s+([\s\S]+)$/i);
  if (upsert && upsert.index != null) {
    conflict = upsert[1].split(",").map((part) => part.trim().replace(/[`"[\]]/g, ""));
    updateSql = `UPDATE conflict_row SET ${upsert[2]}`;
    text = text.slice(0, upsert.index);
  }
  return { text, orIgnore, conflict, updateSql };
}

function parse(sql: string): Node {
  try {
    return parser.astify(sql, { database: "MySQL" }) as Node;
  } catch (mysql) {
    try {
      return parser.astify(sql, { database: "Sqlite" }) as Node;
    } catch (sqlite) {
      throw new Error(shortError(sqlite ?? mysql));
    }
  }
}

function funcName(node: Node) {
  if (typeof node.name === "string") return node.name.toUpperCase();
  const nested = node.name?.name?.[0]?.value;
  return String(nested ?? "").toUpperCase();
}

function argNodes(node: Node): Node[] {
  const args = node.args;
  if (!args) return [];
  if (Array.isArray(args)) return args;
  if (args.type === "expr_list" && Array.isArray(args.value)) return args.value;
  if (args.expr) return [args.expr];
  return [];
}

function norm(value: unknown) {
  if (value === true) return 1;
  if (value === false) return 0;
  return value;
}

function asNumber(value: unknown) {
  const next = norm(value);
  if (typeof next === "number" && Number.isFinite(next)) return next;
  if (typeof next === "string" && /^-?\d+(\.\d+)?$/.test(next)) return Number(next);
  return null;
}

function compare(left: unknown, right: unknown) {
  if (left == null && right == null) return 0;
  if (left == null) return -1;
  if (right == null) return 1;
  const a = asNumber(left);
  const b = asNumber(right);
  if (a != null && b != null) return a - b;
  const as = String(left);
  const bs = String(right);
  if (as < bs) return -1;
  if (as > bs) return 1;
  return 0;
}

function sqlEqual(left: unknown, right: unknown) {
  if (left == null || right == null) return null;
  return compare(left, right) === 0;
}

function isTrue(value: unknown) {
  return value != null && value !== false && value !== 0 && value !== "";
}

function like(value: unknown, pattern: string) {
  if (value == null) return null;
  const escaped = pattern
    .toLowerCase()
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/%/g, ".*")
    .replace(/_/g, ".");
  return new RegExp(`^${escaped}$`).test(String(value).toLowerCase());
}

function getCell(env: Env, table: string | null | undefined, column: string): unknown {
  if (table) {
    const key = `${table}.${column}`;
    if (env.cells.has(key)) return env.cells.get(key);
    if (env.outer) return getCell(env.outer, table, column);
    return null;
  }
  if (env.cells.has(column)) return env.cells.get(column);
  const hits = [...env.cells.keys()].filter((key) => key.endsWith(`.${column}`));
  if (hits.length === 1) return env.cells.get(hits[0] ?? "");
  if (env.outer) return getCell(env.outer, null, column);
  return null;
}

function bindRow(row: SqlRow, alias: string | null | undefined, outer?: Env): Env {
  const cells = new Map<string, unknown>();
  for (const [key, value] of Object.entries(row)) {
    if (key === "_id" || key.startsWith("__win_")) continue;
    cells.set(key, value);
    if (alias) cells.set(`${alias}.${key}`, value);
  }
  return { cells, outer };
}

function mergeEnv(left: Env, right: Env | null, alias: string | null, columns: string[]): Env {
  const cells = new Map(left.cells);
  if (!right) {
    for (const column of columns) {
      if (alias) cells.set(`${alias}.${column}`, null);
      if (!cells.has(column)) cells.set(column, null);
    }
    return { cells, outer: left.outer };
  }
  for (const [key, value] of right.cells) {
    if (key.includes(".")) {
      cells.set(key, value);
      continue;
    }
    if (alias) cells.set(`${alias}.${key}`, value);
    if (!cells.has(key)) cells.set(key, value);
  }
  return { cells, outer: left.outer };
}

function selectAst(node: Node | null | undefined): Node | null {
  if (!node) return null;
  if (node.type === "select") return node;
  if (node.ast?.type === "select") return node.ast;
  if (node.type === "expr_list" && Array.isArray(node.value) && node.value.length === 1) {
    return selectAst(node.value[0]);
  }
  return null;
}

function tableName(item: Node | string | null | undefined) {
  if (!item) return "";
  if (typeof item === "string") return item;
  if (typeof item.table === "string") return item.table;
  return "";
}

async function aggregate(node: Node, group: Env[], evalExpr: (node: Node, env: Env, group?: Env[]) => Promise<unknown>) {
  const name = funcName(node);
  const args = node.args;
  const distinct = !Array.isArray(args) && Boolean(args?.distinct);
  const expr = !Array.isArray(args) ? args?.expr : undefined;
  if (name === "COUNT" && (!expr || expr.type === "star" || expr.column === "*")) {
    return group.length;
  }
  const values: unknown[] = [];
  for (const env of group) {
    const value = expr ? await evalExpr(expr, env) : null;
    if (value != null) values.push(value);
  }
  const list = distinct
    ? values.filter((value, index) => values.findIndex((other) => sqlEqual(value, other) === true) === index)
    : values;
  if (name === "COUNT") return list.length;
  if (name === "SUM") {
    if (!list.length) return null;
    return list.reduce<number>((sum, value) => sum + Number(value), 0);
  }
  if (name === "MIN" || name === "MAX") {
    if (!list.length) return null;
    return list.reduce((best, value) => {
      if (best == null) return value;
      const order = compare(value, best);
      return name === "MIN" ? (order < 0 ? value : best) : order > 0 ? value : best;
    });
  }
  throw new Error(`Unsupported aggregate ${name}`);
}

async function scalar(name: string, values: unknown[]) {
  if (name === "COALESCE" || name === "IFNULL") {
    return values.find((value) => value != null) ?? null;
  }
  if (name === "LENGTH") {
    const value = values[0];
    return value == null ? null : String(value).length;
  }
  if (name === "SUBSTR" || name === "SUBSTRING") {
    const value = values[0];
    const start = values[1];
    if (value == null || start == null) return null;
    const text = String(value);
    let from = Number(start);
    if (from === 0) from = 1;
    const begin = from < 0 ? Math.max(0, text.length + from) : from - 1;
    const len = values[2] == null ? undefined : Number(values[2]);
    return len == null ? text.slice(begin) : text.slice(begin, begin + len);
  }
  if (name === "ROUND") {
    const value = values[0];
    if (value == null) return null;
    const digits = values[1] == null ? 0 : Number(values[1]);
    const scale = 10 ** digits;
    return Math.round(Number(value) * scale) / scale;
  }
  if (name === "MAX" || name === "MIN") {
    const present = values.filter((value) => value != null);
    if (!present.length) return null;
    return present.reduce((best, value) => {
      const order = compare(value, best);
      return name === "MIN" ? (order < 0 ? value : best) : order > 0 ? value : best;
    });
  }
  if (name === "LOWER") return values[0] == null ? null : String(values[0]).toLowerCase();
  if (name === "UPPER") return values[0] == null ? null : String(values[0]).toUpperCase();
  throw new Error(`Unsupported function ${name}`);
}

async function evalExpr(node: Node | null | undefined, env: Env, group?: Env[]): Promise<unknown> {
  if (!node) return null;
  if (node.type === "number") return typeof node.value === "number" ? node.value : Number(node.value);
  if (node.type === "single_quote_string" || node.type === "double_quote_string") return node.value ?? "";
  if (node.type === "bool") return node.value ? 1 : 0;
  if (node.type === "null") return null;
  if (node.type === "star") return null;
  if (node.type === "origin") {
    const raw = String(node.value ?? "");
    if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
    throw new Error(`Unsupported SQL fragment ${raw.slice(0, 40)}`);
  }
  if (node.type === "column_ref") {
    const column = typeof node.column === "string" ? node.column : node.column?.column ?? "";
    return getCell(env, typeof node.table === "string" ? node.table : null, column);
  }
  if (node.type === "cast") {
    const value = await evalExpr(node.expr, env, group);
    const kind = String(node.target?.[0]?.dataType ?? "TEXT").toUpperCase();
    if (value == null) return null;
    if (kind === "TEXT" || kind === "CHAR" || kind === "VARCHAR") return String(value);
    if (kind === "INTEGER" || kind === "INT" || kind === "BIGINT") return Math.trunc(Number(value));
    return Number(value);
  }
  if (node.type === "aggr_func") {
    if (!group) throw new Error("Aggregate used outside a group.");
    return aggregate(node, group, evalExpr);
  }
  if (node.type === "function" && node.over) {
    return null;
  }
  if (node.type === "function") {
    const values: unknown[] = [];
    for (const arg of argNodes(node)) values.push(await evalExpr(arg, env, group));
    return scalar(funcName(node), values);
  }
  if (node.type === "case") {
    const branches = Array.isArray(node.args) ? node.args : [];
    for (const branch of branches) {
      if (branch.type === "when") {
        const cond = await evalExpr(branch.cond as Node, env, group);
        if (isTrue(cond)) return evalExpr(branch.result as Node, env, group);
      }
      if (branch.type === "else") return evalExpr(branch.result as Node, env, group);
    }
    return null;
  }
  if (node.type === "unary_expr") {
    const op = String(node.operator ?? "").toUpperCase();
    if (op === "NOT EXISTS" || op === "EXISTS") {
      const inner = node.expr?.ast ?? node.expr;
      const rows = inner ? await runSelect(inner, env) : [];
      const hit = rows.length > 0;
      return op === "EXISTS" ? hit : !hit;
    }
    if (op === "NOT") {
      const value = await evalExpr(node.expr, env, group);
      if (value == null) return null;
      return !isTrue(value);
    }
    if (op === "-" || op === "MINUS") {
      const value = await evalExpr(node.expr, env, group);
      return value == null ? null : -Number(value);
    }
    throw new Error(`Unsupported unary ${op}`);
  }
  if (node.type === "binary_expr" || node.type === "expr") {
    const op = String(node.operator ?? "").toUpperCase();
    if (op === "AND" || op === "OR") {
      const left = await evalExpr(node.left, env, group);
      const right = await evalExpr(node.right, env, group);
      if (op === "AND") {
        if (!isTrue(left) && left != null) return false;
        if (!isTrue(right) && right != null) return false;
        if (left == null || right == null) return null;
        return true;
      }
      if (isTrue(left) || isTrue(right)) return true;
      if (left == null || right == null) return null;
      return false;
    }
    if (op === "IN" || op === "NOT IN") {
      const left = await evalExpr(node.left, env, group);
      const nested = selectAst(node.right);
      let items: unknown[] = [];
      if (nested) {
        const rows = await runSelect(nested, env);
        items = rows.map((row) => {
          const keys = Object.keys(row).filter((key) => key !== "_id");
          return row[keys[0] ?? ""];
        });
      } else if (node.right?.type === "expr_list" && Array.isArray(node.right.value)) {
        for (const item of node.right.value) items.push(await evalExpr(item, env, group));
      }
      if (left == null) return null;
      let sawNull = false;
      let found = false;
      for (const item of items) {
        if (item == null) {
          sawNull = true;
          continue;
        }
        if (sqlEqual(left, item) === true) found = true;
      }
      if (found) return op === "IN";
      if (sawNull) return null;
      return op === "NOT IN";
    }
    if (op === "IS" || op === "IS NOT") {
      const left = await evalExpr(node.left, env, group);
      const right = await evalExpr(node.right, env, group);
      const same = left == null && right == null;
      return op === "IS" ? same : !same;
    }
    if (op === "LIKE" || op === "NOT LIKE") {
      const left = await evalExpr(node.left, env, group);
      const right = await evalExpr(node.right, env, group);
      const hit = like(left, String(right ?? ""));
      if (hit == null) return null;
      return op === "LIKE" ? hit : !hit;
    }
    if (op === "||") {
      const left = await evalExpr(node.left, env, group);
      const right = await evalExpr(node.right, env, group);
      if (left == null || right == null) return null;
      return String(left) + String(right);
    }
    const left = await evalExpr(node.left, env, group);
    const right = await evalExpr(node.right, env, group);
    if (op === "+" || op === "-" || op === "*" || op === "/" || op === "%") {
      if (left == null || right == null) return null;
      const a = Number(left);
      const b = Number(right);
      if (op === "+") return a + b;
      if (op === "-") return a - b;
      if (op === "*") return a * b;
      if (op === "/") return b === 0 ? null : a / b;
      return b === 0 ? null : a % b;
    }
    if (left == null || right == null) return null;
    const order = compare(left, right);
    if (op === "=") return order === 0;
    if (op === "!=" || op === "<>") return order !== 0;
    if (op === "<") return order < 0;
    if (op === ">") return order > 0;
    if (op === "<=") return order <= 0;
    if (op === ">=") return order >= 0;
    throw new Error(`Unsupported operator ${op}`);
  }
  throw new Error(`Unsupported SQL node ${node.type ?? "unknown"}`);
}

function hasAggregate(node: Node | null | undefined): boolean {
  if (!node || typeof node !== "object") return false;
  if (node.type === "aggr_func") return true;
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      if (value.some((item) => item && typeof item === "object" && hasAggregate(item as Node))) return true;
    } else if (value && typeof value === "object" && hasAggregate(value as Node)) return true;
  }
  return false;
}

function windowSpec(node: Node) {
  const over = node.over as Node | undefined;
  const spec = (over?.as_window_specification as Node | undefined)?.window_specification as Node | undefined;
  return spec ?? null;
}

async function applyWindows(columns: Node[], envs: Env[]) {
  for (let index = 0; index < columns.length; index += 1) {
    const expr = columns[index]?.expr;
    if (!expr?.over) continue;
    const spec = windowSpec(expr);
    const groups = new Map<string, Env[]>();
    for (const env of envs) {
      const parts: string[] = [];
      for (const part of (spec?.partitionby as Node[] | undefined) ?? []) {
        parts.push(String(await evalExpr(part.expr ?? part, env)));
      }
      const key = parts.join("\u001f");
      const list = groups.get(key) ?? [];
      list.push(env);
      groups.set(key, list);
    }
    for (const list of groups.values()) {
      const sorted = [...list];
      for (const rule of [...((spec?.orderby as { expr: Node; type?: string }[] | undefined) ?? [])].reverse()) {
        const direction = String(rule.type ?? "ASC").toUpperCase() === "DESC" ? -1 : 1;
        const scored = await Promise.all(sorted.map(async (env) => ({ env, value: await evalExpr(rule.expr, env) })));
        scored.sort((a, b) => compare(a.value, b.value) * direction);
        sorted.splice(0, sorted.length, ...scored.map((item) => item.env));
      }
      sorted.forEach((env, row) => env.cells.set(`__win_${index}`, row + 1));
    }
  }
}

function projectExpr(expr: Node | undefined, index: number): Node | undefined {
  if (!expr?.over) return expr;
  return { type: "column_ref", column: `__win_${index}`, table: null };
}

async function project(columns: Node[], env: Env, group?: Env[]) {
  if (columns.length === 1 && (columns[0]?.expr?.type === "star" || columns[0]?.expr?.column === "*")) {
    const row: SqlRow = {};
    for (const [key, value] of env.cells) {
      if (!key.includes(".") && !key.startsWith("__win_")) row[key] = value;
    }
    return row;
  }
  const row: SqlRow = {};
  for (let index = 0; index < columns.length; index += 1) {
    const column = columns[index];
    if (!column) continue;
    const expr = projectExpr(column.expr, index);
    const name =
      column.as ||
      (expr?.type === "column_ref"
        ? typeof expr.column === "string"
          ? expr.column
          : expr.column?.column
        : "") ||
      `col${index}`;
    row[String(name)] = await evalExpr(expr, env, group);
  }
  return row;
}

async function sortEnvs(envs: Env[], orderby: { expr: Node; type?: string }[] | null | undefined, projected: SqlRow[]) {
  const scored = await Promise.all(
    envs.map(async (env, index) => {
      const keys: unknown[] = [];
      for (const rule of orderby ?? []) {
        const column = rule.expr.type === "column_ref" ? rule.expr.column : null;
        const bare = typeof column === "string" ? column : null;
        const fromRow = bare && projected[index] && bare in projected[index] ? projected[index]?.[bare] : undefined;
        const value = fromRow !== undefined && !rule.expr.table ? fromRow : await evalExpr(rule.expr, env);
        keys.push(value);
      }
      return { env, row: projected[index] ?? {}, keys };
    }),
  );
  scored.sort((a, b) => {
    for (let index = 0; index < (orderby?.length ?? 0); index += 1) {
      const direction = String(orderby?.[index]?.type ?? "ASC").toUpperCase() === "DESC" ? -1 : 1;
      const order = compare(a.keys[index], b.keys[index]) * direction;
      if (order) return order;
    }
    return 0;
  });
  return scored;
}

async function runSelect(ast: Node, outer?: Env): Promise<SqlRow[]> {
  const from = ast.from ?? [];
  let envs: Env[] = [];
  if (!from.length) {
    envs = [outer ? { cells: new Map(), outer } : emptyEnv()];
  } else {
    const first = from[0];
    if (!first) return [];
    if (first.expr?.ast || first.ast) {
      const inner = first.expr?.ast ?? first.ast;
      const rows = inner ? await runSelect(inner, outer) : [];
      envs = rows.map((row) => bindRow(row, typeof first.as === "string" ? first.as : null, outer));
    } else {
      const rows = await loadTable(tableName(first));
      envs = rows.map((row) => bindRow(copyRow(row), typeof first.as === "string" ? first.as : null, outer));
    }
    for (const join of from.slice(1)) {
      const rightRows = await loadTable(tableName(join));
      const alias = typeof join.as === "string" ? join.as : null;
      const sample = rightRows[0] ? Object.keys(copyRow(rightRows[0])) : [];
      const next: Env[] = [];
      const leftJoin = String(join.join ?? "").toUpperCase().includes("LEFT");
      for (const left of envs) {
        let matched = false;
        for (const right of rightRows) {
          const merged = mergeEnv(left, bindRow(copyRow(right), alias, outer), alias, sample);
          if (!join.on || isTrue(await evalExpr(join.on, merged))) {
            next.push(merged);
            matched = true;
          }
        }
        if (!matched && leftJoin) next.push(mergeEnv(left, null, alias, sample));
      }
      envs = next;
    }
  }

  if (ast.where) {
    const kept: Env[] = [];
    for (const env of envs) {
      if (isTrue(await evalExpr(ast.where, env))) kept.push(env);
    }
    envs = kept;
  }

  const columns = ast.columns ?? [];
  await applyWindows(columns, envs);
  const aggregateQuery = columns.some((column) => hasAggregate(column?.expr));
  let grouped: { env: Env; group: Env[] }[] = [];
  if (aggregateQuery) {
    const keys = ast.groupby?.columns ?? [];
    if (!keys.length) {
      grouped = [{ env: envs[0] ?? emptyEnv(), group: envs }];
    } else {
      const buckets = new Map<string, { env: Env; group: Env[] }>();
      for (const env of envs) {
        const parts: string[] = [];
        for (const key of keys) parts.push(String(await evalExpr(key, env)));
        const id = parts.join("\u001f");
        const bucket = buckets.get(id);
        if (bucket) bucket.group.push(env);
        else buckets.set(id, { env, group: [env] });
      }
      grouped = [...buckets.values()];
    }
  }

  if (ast.having && aggregateQuery) {
    const kept = [];
    for (const item of grouped) {
      if (isTrue(await evalExpr(ast.having, item.env, item.group))) kept.push(item);
    }
    grouped = kept;
  }

  let projected: { env: Env; row: SqlRow }[] = [];
  if (aggregateQuery) {
    for (const item of grouped) {
      projected.push({ env: item.env, row: await project(columns, item.env, item.group) });
    }
  } else {
    for (const env of envs) projected.push({ env, row: await project(columns, env) });
  }

  if (ast.distinct) {
    const seen = new Set<string>();
    projected = projected.filter((item) => {
      const key = JSON.stringify(item.row);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  if (ast.orderby?.length) {
    const ordered = await sortEnvs(
      projected.map((item) => item.env),
      ast.orderby,
      projected.map((item) => item.row),
    );
    projected = ordered.map((item) => ({ env: item.env, row: item.row }));
  }

  const limitNode = ast.limit?.value?.[0];
  if (limitNode) {
    const count = Math.max(0, Math.trunc(Number(await evalExpr(limitNode, emptyEnv()))));
    const offsetNode = ast.limit?.value?.[1];
    const offset = offsetNode ? Math.max(0, Math.trunc(Number(await evalExpr(offsetNode, emptyEnv())))) : 0;
    const values = ast.limit?.value ?? [];
    if (values.length > 1) projected = projected.slice(offset, offset + count);
    else projected = projected.slice(0, count);
  }

  return projected.map((item) => item.row);
}

function currentPort() {
  const port = ports.getStore();
  if (!port) throw new Error("The house database is not open.");
  return port;
}

async function loadTable(table: string) {
  if (!table) return [];
  return currentPort().rows(table);
}

function columnName(column: Node | string) {
  if (typeof column === "string") return column.replace(/[`"]/g, "");
  if (typeof column.column === "string") return column.column;
  return "";
}

function insertRows(ast: Node) {
  const values = ast.values as Node | Node[] | undefined;
  const lists: Node[] = [];
  const visit = (node: Node | Node[] | undefined) => {
    if (!node) return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (node.type === "expr_list" && Array.isArray(node.value)) {
      lists.push(node);
      return;
    }
    if (Array.isArray(node.values)) visit(node.values as Node[]);
  };
  visit(values as Node);
  return lists;
}

async function applyDefaults(port: SqlPort, table: string, row: SqlRow) {
  for (const column of await port.columns(table)) {
    if (row[column.name] === undefined) row[column.name] = column.defaultValue ?? null;
  }
  return row;
}

async function insertOne(
  port: SqlPort,
  table: string,
  columns: string[],
  list: Node,
  orIgnore: boolean,
  conflict: string[] | null,
  assignments: { column: string; value: Node }[],
) {
  const incoming: SqlRow = {};
  const values = Array.isArray(list.value) ? list.value : [];
  for (let index = 0; index < columns.length; index += 1) {
    incoming[columns[index] ?? ""] = await evalExpr(values[index], emptyEnv());
  }
  await applyDefaults(port, table, incoming);
  const primary = conflict?.length ? conflict : await port.primaryKey(table);
  const existing = await port.find(
    table,
    Object.fromEntries(primary.map((key) => [key, incoming[key]])),
  );
  if (!existing) {
    const id = docId(await port.primaryKey(table), incoming);
    await assertUnique(port, table, incoming);
    const added = await port.add(table, id, incoming);
    if (!added && orIgnore) return 0;
    if (!added) throw new Error(`duplicate key on ${table}`);
    return 1;
  }
  if (!assignments.length) return orIgnore ? 0 : Promise.reject(new Error(`duplicate key on ${table}`));
  const cells = new Map<string, unknown>();
  for (const [key, value] of Object.entries(existing)) {
    if (key !== "_id") cells.set(key, value);
  }
  for (const [key, value] of Object.entries(incoming)) cells.set(`excluded.${key}`, value);
  const env = { cells };
  const next: SqlRow = copyRow(existing);
  for (const assignment of assignments) {
    next[assignment.column] = await evalExpr(assignment.value, env);
  }
  const pk = await port.primaryKey(table);
  const oldId = String(existing._id ?? docId(pk, existing));
  const newId = docId(pk, next);
  await assertUnique(port, table, next, oldId);
  if (oldId !== newId) await port.del(table, oldId);
  await port.put(table, newId, next);
  return 1;
}

function createColumns(ast: Node): { columns: SqlColumn[]; uniques: string[][] } {
  const columns: SqlColumn[] = [];
  const primary: string[] = [];
  const uniques: string[][] = [];
  for (const item of (ast.create_definitions as Node[] | undefined) ?? []) {
    if (item.resource === "constraint") {
      const kind = String(item.constraint_type ?? "").toLowerCase();
      const defs = Array.isArray(item.definition) ? (item.definition as Node[]) : [];
      const names = defs.map((def) => columnName(def)).filter(Boolean);
      if (kind === "primary key") primary.push(...names);
      if (kind === "unique" && names.length) uniques.push(names);
      continue;
    }
    if (item.resource !== "column") continue;
    const name = columnName(item.column as Node);
    const definition = item.definition as Node | undefined;
    const fallback = item.default_val as Node | undefined;
    const rawDefault = (definition?.default_val as Node | undefined) ?? fallback;
    let defaultValue: unknown = null;
    const literal = rawDefault?.value as Node | undefined;
    if (literal && typeof literal === "object" && literal.type) {
      defaultValue = literal.type === "number" ? Number(literal.value) : (literal.value ?? null);
    } else if (typeof rawDefault?.value === "number" || typeof rawDefault?.value === "string") {
      defaultValue = rawDefault.value;
    }
    if (String(item.primary_key ?? definition?.primary_key ?? "").toLowerCase().includes("primary")) {
      primary.push(name);
    }
    columns.push({
      name,
      type: String(definition?.dataType ?? "TEXT"),
      notNull: String((item.nullable as Node | undefined)?.type ?? "").toLowerCase() === "not null",
      defaultValue,
      pk: 0,
    });
  }
  const keys = primary.length ? primary : columns.some((column) => column.name === "id") ? ["id"] : [];
  keys.forEach((key, index) => {
    const column = columns.find((item) => item.name === key);
    if (column) column.pk = index + 1;
  });
  return { columns, uniques };
}

async function assertUnique(port: SqlPort, table: string, row: SqlRow, ignoreId?: string) {
  for (const group of await port.uniques(table)) {
    const found = await port.find(
      table,
      Object.fromEntries(group.map((key) => [key, row[key]])),
    );
    if (found && String(found._id ?? "") !== ignoreId) throw new Error(`duplicate key on ${table}`);
  }
}

async function runAst(
  port: SqlPort,
  ast: Node,
  orIgnore: boolean,
  conflict: string[] | null,
  updateSql: string | null,
): Promise<{ rows: SqlRow[]; changes: number }> {
  if (ast.type === "select") return { rows: await runSelect(ast), changes: 0 };
  if (ast.type === "create") {
    const table = tableName((ast.table as Node[] | undefined)?.[0]);
    const created = createColumns(ast);
    await port.createTable(table, created.columns, Boolean(ast.if_not_exists), created.uniques);
    return { rows: [], changes: 0 };
  }
  if (ast.type === "alter") {
    const table = tableName((ast.table as Node[] | undefined)?.[0]);
    for (const action of (ast.expr as Node[] | undefined) ?? []) {
      if (String(action.action ?? "") !== "add") continue;
      const created = createColumns({ create_definitions: [action] } as Node);
      const column = created.columns[0];
      if (column) await port.addColumn(table, column);
    }
    return { rows: [], changes: 0 };
  }
  if (ast.type === "insert") {
    const table = tableName((ast.table as Node[] | undefined)?.[0]);
    if (!(await port.tableExists(table))) throw new Error(`no such table: ${table}`);
    const columns = ((ast.columns as (string | Node)[] | undefined) ?? []).map((column) =>
      columnName(column as Node | string),
    );
    let assignments: { column: string; value: Node }[] = [];
    if (updateSql) {
      const update = parse(updateSql);
      assignments = (update.set ?? []).map((item) => ({
        column: columnName(item.column ?? ""),
        value: item.value ?? { type: "null" },
      }));
    }
    let changes = 0;
    for (const list of insertRows(ast)) {
      changes += await insertOne(port, table, columns, list, orIgnore, conflict, assignments);
    }
    return { rows: [], changes };
  }
  if (ast.type === "update") {
    const table = tableName((ast.table as Node[] | undefined)?.[0]);
    const rows = await port.rows(table);
    let changes = 0;
    for (const row of rows) {
      const env = bindRow(copyRow(row), null);
      if (ast.where && !isTrue(await evalExpr(ast.where, env))) continue;
      const next = copyRow(row);
      for (const assignment of ast.set ?? []) {
        const column = columnName(assignment.column ?? "");
        next[column] = await evalExpr(assignment.value, env);
      }
      const id = String(row._id ?? docId(await port.primaryKey(table), row));
      await port.put(table, id, next);
      changes += 1;
    }
    return { rows: [], changes };
  }
  if (ast.type === "delete") {
    const table = tableName((ast.from as Node[] | undefined)?.[0] ?? (ast.table as Node[] | undefined)?.[0]);
    const rows = await port.rows(table);
    let changes = 0;
    for (const row of rows) {
      const env = bindRow(copyRow(row), null);
      if (ast.where && !isTrue(await evalExpr(ast.where, env))) continue;
      const id = String(row._id ?? docId(await port.primaryKey(table), row));
      if (await port.del(table, id)) changes += 1;
    }
    return { rows: [], changes };
  }
  throw new Error(`Unsupported statement ${ast.type ?? "unknown"}`);
}

export async function executeSql(port: SqlPort, sql: string) {
  const pragmaInfo = sql.match(/^\s*PRAGMA\s+table_info\s*\(\s*["'`]?(\w+)["'`]?\s*\)\s*;?\s*$/i);
  if (pragmaInfo) {
    const columns = await port.columns(pragmaInfo[1] ?? "");
    return {
      rows: columns.map((column, cid) => ({
        cid,
        name: column.name,
        type: column.type,
        notnull: column.notNull ? 1 : 0,
        dflt_value: column.defaultValue,
        pk: column.pk,
      })) as SqlRow[],
      changes: 0,
    };
  }
  const pragmaSet = sql.match(/^\s*PRAGMA\s+(journal_mode|foreign_keys)\b/i);
  if (pragmaSet) {
    const name = (pragmaSet[1] ?? "").toLowerCase();
    return { rows: [{ [name]: name === "journal_mode" ? "wal" : 1 }], changes: 0 };
  }
  const prepared = prepare(sql);
  const ast = parse(prepared.text);
  return ports.run(port, async () => {
    const statements = Array.isArray(ast) ? (ast as Node[]) : [ast];
    let rows: SqlRow[] = [];
    let changes = 0;
    for (const statement of statements) {
      const result = await runAst(port, statement, prepared.orIgnore, prepared.conflict, prepared.updateSql);
      rows = result.rows;
      changes += result.changes;
    }
    return { rows, changes };
  });
}
