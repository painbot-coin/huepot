import { MongoClient, type ClientSession, type Filter } from "mongodb";
import { atlasUri, redactMongo } from "@/lib/atlas-uri";
import { copyRow, type SqlColumn, type SqlPort, type SqlRow } from "@/lib/atlas-port";

const SCHEMA = "__schema";

let clientPromise: Promise<MongoClient> | null = null;

export function atlasClient() {
  if (!clientPromise) {
    const uri = atlasUri();
    if (!uri) throw new Error("MongoDB is not configured.");
    const client = new MongoClient(uri);
    clientPromise = client.connect().catch((error: unknown) => {
      clientPromise = null;
      const message = error instanceof Error ? error.message : "Could not reach the house database.";
      throw new Error(redactMongo(message));
    });
  }
  return clientPromise;
}

async function database() {
  const client = await atlasClient();
  return client.db();
}

type SchemaDoc = { _id: string; columns: SqlColumn[]; uniques: string[][] };
type RowDoc = { _id: string; [key: string]: unknown };

export class MongoPort implements SqlPort {
  private session?: ClientSession;

  constructor(session?: ClientSession) {
    this.session = session;
  }

  private async schemaCollection() {
    const db = await database();
    return db.collection<SchemaDoc>(SCHEMA);
  }

  private async collection(table: string) {
    const db = await database();
    return db.collection<RowDoc>(table);
  }

  async transaction<T>(fn: (port: SqlPort) => Promise<T>, timeoutMs = 20_000): Promise<T> {
    if (this.session) return fn(this);
    const client = await atlasClient();
    const session = client.startSession();
    const port = new MongoPort(session);
    let timer: NodeJS.Timeout | undefined;
    try {
      session.startTransaction();
      const result = await Promise.race([
        fn(port),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("Transaction timeout")), timeoutMs);
        }),
      ]);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction().catch(() => undefined);
      throw error;
    } finally {
      if (timer) clearTimeout(timer);
      await session.endSession();
    }
  }

  private async schemaDoc(table: string) {
    const docs = await this.schemaCollection();
    return docs.findOne({ _id: table }, { session: this.session });
  }

  async tableExists(table: string) {
    return Boolean(await this.schemaDoc(table));
  }

  async columns(table: string) {
    const doc = await this.schemaDoc(table);
    return (doc?.columns ?? []).map((column) => ({ ...column }));
  }

  async uniques(table: string) {
    const doc = await this.schemaDoc(table);
    return (doc?.uniques ?? []).map((group) => [...group]);
  }

  async primaryKey(table: string) {
    const keys = (await this.columns(table)).filter((column) => column.pk > 0);
    keys.sort((a, b) => a.pk - b.pk);
    if (keys.length) return keys.map((column) => column.name);
    return ["id"];
  }

  async createTable(table: string, columns: SqlColumn[], ifNotExists: boolean, uniques: string[][] = []) {
    if (await this.tableExists(table)) {
      if (ifNotExists) return;
      throw new Error(`table ${table} already exists`);
    }
    const docs = await this.schemaCollection();
    await docs.insertOne({ _id: table, columns, uniques }, { session: this.session });
    const db = await database();
    await db.createCollection(table).catch(() => undefined);
  }

  async addColumn(table: string, column: SqlColumn) {
    const doc = await this.schemaDoc(table);
    if (!doc) throw new Error(`no such table: ${table}`);
    if (doc.columns.some((item) => item.name === column.name)) {
      throw new Error(`duplicate column name: ${column.name}`);
    }
    const docs = await this.schemaCollection();
    await docs.updateOne({ _id: table }, { $push: { columns: column } }, { session: this.session });
    const rows = await this.collection(table);
    await rows.updateMany(
      { [column.name]: { $exists: false } },
      { $set: { [column.name]: column.defaultValue ?? null } },
      { session: this.session },
    );
  }

  async rows(table: string) {
    if (!(await this.tableExists(table))) throw new Error(`no such table: ${table}`);
    const rows = await this.collection(table);
    const docs = await rows.find({}, { session: this.session }).toArray();
    return docs.map((doc) => ({ ...doc, _id: doc._id }) as SqlRow);
  }

  async find(table: string, match: Record<string, unknown>) {
    if (!(await this.tableExists(table))) return null;
    const rows = await this.collection(table);
    const doc = await rows.findOne(match as Filter<RowDoc>, { session: this.session });
    return doc ? ({ ...doc, _id: doc._id } as SqlRow) : null;
  }

  async add(table: string, id: string, row: SqlRow) {
    const rows = await this.collection(table);
    try {
      await rows.insertOne({ ...copyRow(row), _id: id }, { session: this.session });
      return true;
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === 11000) return false;
      throw error;
    }
  }

  async put(table: string, id: string, row: SqlRow) {
    const rows = await this.collection(table);
    await rows.replaceOne({ _id: id }, { ...copyRow(row), _id: id }, { upsert: true, session: this.session });
  }

  async del(table: string, id: string) {
    const rows = await this.collection(table);
    const result = await rows.deleteOne({ _id: id }, { session: this.session });
    return result.deletedCount === 1;
  }
}
