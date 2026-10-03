export type SqlRow = Record<string, unknown>;

export type SqlColumn = {
  name: string;
  type: string;
  notNull: boolean;
  defaultValue: unknown;
  pk: number;
};

export interface SqlPort {
  tableExists(table: string): Promise<boolean>;
  columns(table: string): Promise<SqlColumn[]>;
  primaryKey(table: string): Promise<string[]>;
  createTable(table: string, columns: SqlColumn[], ifNotExists: boolean, uniques?: string[][]): Promise<void>;
  uniques(table: string): Promise<string[][]>;
  addColumn(table: string, column: SqlColumn): Promise<void>;
  rows(table: string): Promise<SqlRow[]>;
  find(table: string, match: Record<string, unknown>): Promise<SqlRow | null>;
  add(table: string, id: string, row: SqlRow): Promise<boolean>;
  put(table: string, id: string, row: SqlRow): Promise<void>;
  del(table: string, id: string): Promise<boolean>;
  transaction<T>(fn: (port: SqlPort) => Promise<T>, timeoutMs?: number): Promise<T>;
}

export function docId(primary: string[], row: SqlRow) {
  return primary.map((key) => (row[key] == null ? "" : String(row[key]))).join("\u001f");
}

export function copyRow(row: SqlRow): SqlRow {
  const next: SqlRow = {};
  for (const [key, value] of Object.entries(row)) {
    if (key !== "_id") next[key] = value;
  }
  return next;
}

export class MemoryPort implements SqlPort {
  private tables = new Map<string, Map<string, SqlRow>>();
  private schema = new Map<string, SqlColumn[]>();
  private uniqueKeys = new Map<string, string[][]>();

  async transaction<T>(fn: (port: SqlPort) => Promise<T>, _timeoutMs?: number): Promise<T> {
    const tables = new Map(
      [...this.tables].map(([name, rows]) => [
        name,
        new Map([...rows].map(([id, row]) => [id, { ...row }])),
      ]),
    );
    const schema = new Map(
      [...this.schema].map(([name, columns]) => [name, columns.map((column) => ({ ...column }))]),
    );
    const uniqueKeys = new Map([...this.uniqueKeys].map(([name, groups]) => [name, groups.map((group) => [...group])]));
    try {
      return await fn(this);
    } catch (error) {
      this.tables = tables;
      this.schema = schema;
      this.uniqueKeys = uniqueKeys;
      throw error;
    }
  }

  async tableExists(table: string) {
    return this.schema.has(table) || this.tables.has(table);
  }

  async columns(table: string) {
    return (this.schema.get(table) ?? []).map((column) => ({ ...column }));
  }

  async primaryKey(table: string) {
    const keys = (this.schema.get(table) ?? []).filter((column) => column.pk > 0);
    keys.sort((a, b) => a.pk - b.pk);
    if (keys.length) return keys.map((column) => column.name);
    if ((this.schema.get(table) ?? []).some((column) => column.name === "id")) return ["id"];
    return ["id"];
  }

  async uniques(table: string) {
    return (this.uniqueKeys.get(table) ?? []).map((group) => [...group]);
  }

  async createTable(table: string, columns: SqlColumn[], ifNotExists: boolean, uniques: string[][] = []) {
    if (this.schema.has(table)) {
      if (ifNotExists) return;
      throw new Error(`table ${table} already exists`);
    }
    this.schema.set(
      table,
      columns.map((column) => ({ ...column })),
    );
    this.uniqueKeys.set(
      table,
      uniques.map((group) => [...group]),
    );
    if (!this.tables.has(table)) this.tables.set(table, new Map());
  }

  async addColumn(table: string, column: SqlColumn) {
    const columns = this.schema.get(table);
    if (!columns) throw new Error(`no such table: ${table}`);
    if (columns.some((item) => item.name === column.name)) {
      throw new Error(`duplicate column name: ${column.name}`);
    }
    columns.push({ ...column });
    for (const row of this.tables.get(table)?.values() ?? []) {
      if (row[column.name] === undefined) row[column.name] = column.defaultValue;
    }
  }

  async rows(table: string) {
    if (!this.schema.has(table) && !this.tables.has(table)) {
      throw new Error(`no such table: ${table}`);
    }
    return [...(this.tables.get(table)?.values() ?? [])].map((row) => ({ ...row }));
  }

  async find(table: string, match: Record<string, unknown>) {
    for (const row of this.tables.get(table)?.values() ?? []) {
      let same = true;
      for (const [key, value] of Object.entries(match)) {
        if (row[key] !== value) {
          same = false;
          break;
        }
      }
      if (same) return { ...row };
    }
    return null;
  }

  async add(table: string, id: string, row: SqlRow) {
    const rows = this.tables.get(table) ?? new Map<string, SqlRow>();
    this.tables.set(table, rows);
    if (rows.has(id)) return false;
    rows.set(id, { ...row, _id: id });
    return true;
  }

  async put(table: string, id: string, row: SqlRow) {
    const rows = this.tables.get(table) ?? new Map<string, SqlRow>();
    this.tables.set(table, rows);
    rows.set(id, { ...row, _id: id });
  }

  async del(table: string, id: string) {
    return this.tables.get(table)?.delete(id) ?? false;
  }
}
