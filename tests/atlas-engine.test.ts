import assert from "node:assert/strict";
import test from "node:test";
import { executeSql } from "@/lib/atlas-engine";
import { prismaFacade } from "@/lib/atlas-prisma";
import { MemoryPort } from "@/lib/atlas-port";

async function sql(port: MemoryPort, text: string) {
  return executeSql(port, text);
}

test("closing a seat removes its wallet row and keeps the other seat", async () => {
  const client = prismaFacade(new MemoryPort());
  await client.$executeRawUnsafe(
    "INSERT INTO User (id, email, username) VALUES ('a', 'a@b.c', 'ada'), ('b', 'b@b.c', 'bee')",
  );
  await client.wallet.createMany({
    data: [
      { userId: "a", network: "56", address: "0xa", secretEnc: "x" },
      { userId: "b", network: "56", address: "0xb", secretEnc: "y" },
    ],
  });
  await client.tx.createMany({
    data: [{ id: "t1", playerId: "a", type: "deposit", amount: 100, createdAt: 1, note: "" }],
  });
  await client.user.deleteMany({ where: { id: { in: ["a"] } } });
  const wallets = await client.wallet.findMany();
  const txs = await client.tx.findMany();
  assert.equal(wallets.length, 1);
  assert.equal(wallets[0]?.userId, "b");
  assert.equal(txs.length, 0);
});

test("visit counts and a door conflict stay exact", async () => {
  const port = new MemoryPort();
  await sql(
    port,
    `CREATE TABLE IF NOT EXISTS HouseVisitDay (
      day TEXT PRIMARY KEY,
      hits INTEGER NOT NULL DEFAULT 0,
      visitors INTEGER NOT NULL DEFAULT 0
    )`,
  );
  await sql(port, "INSERT OR IGNORE INTO HouseVisitDay (day, hits, visitors) VALUES ('2026-10-03', 0, 0)");
  await sql(port, "INSERT OR IGNORE INTO HouseVisitDay (day, hits, visitors) VALUES ('2026-10-03', 9, 9)");
  await sql(port, "UPDATE HouseVisitDay SET hits = hits + 1 WHERE day = '2026-10-03'");
  await sql(
    port,
    `CREATE TABLE IF NOT EXISTS HouseVisitDoor (
      day TEXT NOT NULL,
      door TEXT NOT NULL,
      hits INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (day, door)
    )`,
  );
  await sql(port, "INSERT INTO HouseVisitDoor (day, door, hits) VALUES ('2026-10-03', 'home', 1) ON CONFLICT(day, door) DO UPDATE SET hits = hits + 1");
  await sql(port, "INSERT INTO HouseVisitDoor (day, door, hits) VALUES ('2026-10-03', 'home', 1) ON CONFLICT(day, door) DO UPDATE SET hits = hits + 1");
  const day = await sql(port, "SELECT hits, visitors FROM HouseVisitDay WHERE day = '2026-10-03'");
  const door = await sql(port, "SELECT hits FROM HouseVisitDoor WHERE day = '2026-10-03'");
  assert.equal(day.rows[0]?.hits, 1);
  assert.equal(day.rows[0]?.visitors, 0);
  assert.equal(door.rows[0]?.hits, 2);
});

test("a user upsert keeps the columns it does not set", async () => {
  const port = new MemoryPort();
  await sql(port, "CREATE TABLE User (id TEXT PRIMARY KEY, email TEXT, balance REAL, limits TEXT)");
  await sql(port, "INSERT INTO User (id, email, balance, limits) VALUES ('u1', 'a@b.c', 100, '{}')");
  await sql(
    port,
    `INSERT INTO User (id, email, balance) VALUES ('u1', 'c@d.e', 250)
     ON CONFLICT(id) DO UPDATE SET email=excluded.email, balance=excluded.balance`,
  );
  const rows = await sql(port, "SELECT email, balance, limits FROM User WHERE id = 'u1'");
  assert.equal(rows.rows[0]?.email, "c@d.e");
  assert.equal(rows.rows[0]?.balance, 250);
  assert.equal(rows.rows[0]?.limits, "{}");
});

test("round conflict follows roomId", async () => {
  const port = new MemoryPort();
  await sql(port, "CREATE TABLE Round (id TEXT PRIMARY KEY, roomId TEXT, number INTEGER, status TEXT)");
  await sql(port, "INSERT INTO Round (id, roomId, number, status) VALUES ('old', 'room', 1, 'open') ON CONFLICT(roomId) DO UPDATE SET id=excluded.id, number=excluded.number, status=excluded.status");
  await sql(port, "INSERT INTO Round (id, roomId, number, status) VALUES ('new', 'room', 2, 'closed') ON CONFLICT(roomId) DO UPDATE SET id=excluded.id, number=excluded.number, status=excluded.status");
  const rows = await sql(port, "SELECT id, number, status FROM Round");
  assert.equal(rows.rows.length, 1);
  assert.equal(rows.rows[0]?.id, "new");
  assert.equal(rows.rows[0]?.number, 2);
});

test("aggregates, casts, and the newest room lines", async () => {
  const port = new MemoryPort();
  await sql(port, "CREATE TABLE Tx (id TEXT PRIMARY KEY, playerId TEXT, type TEXT, amount REAL, createdAt INTEGER, note TEXT)");
  await sql(
    port,
    "INSERT INTO Tx (id, playerId, type, amount, createdAt, note) VALUES ('1', 'p', 'click', 10, 100, 'Clicked red in hall'), ('2', 'p', 'payout', 25, 200, 'take'), ('3', 'q', 'click', 5, 300, 'Clicked blue in hall')",
  );
  const sums = await sql(port, "SELECT type, SUM(amount) AS cents FROM Tx GROUP BY type");
  const click = sums.rows.find((row) => row.type === "click");
  assert.equal(click?.cents, 15);
  const distinct = await sql(port, "SELECT COUNT(DISTINCT playerId) AS n FROM Tx WHERE type = 'click'");
  assert.equal(distinct.rows[0]?.n, 2);
  const empty = await sql(port, "SELECT COALESCE(SUM(amount), 0) as total FROM Tx WHERE type = 'invite'");
  assert.equal(empty.rows[0]?.total, 0);
  const cast = await sql(port, "SELECT CAST(createdAt AS TEXT) as createdAt FROM Tx WHERE id = '1'");
  assert.equal(cast.rows[0]?.createdAt, "100");
  const dup = await sql(
    port,
    "SELECT note, COUNT(*) AS n FROM Tx GROUP BY note HAVING COUNT(*) > 1",
  );
  assert.equal(dup.rows.length, 0);

  await sql(port, "CREATE TABLE RoomEvent (id TEXT PRIMARY KEY, roomId TEXT, kind TEXT, createdAt INTEGER)");
  await sql(
    port,
    "INSERT INTO RoomEvent (id, roomId, kind, createdAt) VALUES ('a', 'r', 'talk', 1), ('b', 'r', 'talk', 3), ('c', 'r', 'talk', 2), ('d', 's', 'talk', 4)",
  );
  const windowed = await sql(
    port,
    `SELECT id, roomId, createdAt FROM (
       SELECT id, roomId, kind, CAST(createdAt AS TEXT) AS createdAt,
              ROW_NUMBER() OVER (PARTITION BY roomId ORDER BY createdAt DESC) AS rn
         FROM RoomEvent
     ) WHERE rn <= 2 ORDER BY createdAt ASC`,
  );
  assert.deepEqual(
    windowed.rows.map((row) => row.id),
    ["c", "b", "d"],
  );
});

test("a left join and a missing post", async () => {
  const port = new MemoryPort();
  await sql(port, "CREATE TABLE NewsItem (id TEXT PRIMARY KEY, title TEXT, hidden INTEGER, status TEXT)");
  await sql(port, "CREATE TABLE NetworkPost (id TEXT PRIMARY KEY, link TEXT)");
  await sql(port, "INSERT INTO NewsItem (id, title, hidden, status) VALUES ('abc', 'One', 0, 'live'), ('def', 'Two', 0, 'live')");
  await sql(port, "INSERT INTO NetworkPost (id, link) VALUES ('wire-abc', '/news/abc')");
  const joined = await sql(
    port,
    `SELECT n.id, COALESCE(p.id, '') AS talkId
       FROM NewsItem n
       LEFT JOIN NetworkPost p ON p.id = ('wire-' || n.id)
      WHERE n.hidden = 0 AND n.status = 'live'`,
  );
  const byId = new Map(joined.rows.map((row) => [row.id, row.talkId]));
  assert.equal(byId.get("abc"), "wire-abc");
  assert.equal(byId.get("def"), "");
  const fresh = await sql(
    port,
    `SELECT n.id FROM NewsItem n
      WHERE NOT EXISTS (
        SELECT 1 FROM NetworkPost p WHERE p.id = ('wire-' || n.id)
      )`,
  );
  assert.deepEqual(fresh.rows.map((row) => row.id), ["def"]);

  await sql(port, "CREATE TABLE NetworkLike (id TEXT PRIMARY KEY, postId TEXT)");
  await sql(port, "INSERT INTO NetworkLike (id, postId) VALUES ('1', 'wire-abc'), ('2', 'gone')");
  await sql(port, "DELETE FROM NetworkLike WHERE postId NOT IN (SELECT id FROM NetworkPost)");
  const likes = await sql(port, "SELECT id FROM NetworkLike");
  assert.deepEqual(likes.rows.map((row) => row.id), ["1"]);
});

test("pragma sees a column added later", async () => {
  const port = new MemoryPort();
  await sql(port, "CREATE TABLE HouseVisitWho (day TEXT NOT NULL, vid TEXT NOT NULL, PRIMARY KEY (day, vid))");
  await sql(port, "ALTER TABLE HouseVisitWho ADD COLUMN userId TEXT NOT NULL DEFAULT ''");
  const info = await sql(port, "PRAGMA table_info(HouseVisitWho)");
  assert.equal(info.rows.some((row) => row.name === "userId"), true);
  await assert.rejects(() => sql(port, "ALTER TABLE HouseVisitWho ADD COLUMN userId TEXT"), /duplicate column/);
});

test("notice read, a floor at zero, and a news rewrite", async () => {
  const port = new MemoryPort();
  await sql(
    port,
    "CREATE TABLE Notice (id TEXT PRIMARY KEY, userId TEXT, kind TEXT, title TEXT, body TEXT, href TEXT, read INTEGER, createdAt INTEGER)",
  );
  await sql(
    port,
    "INSERT INTO Notice (id, userId, kind, title, body, href, read, createdAt) VALUES ('n', 'u', 'system', 'Hi', 'There', '/contracts/1', 0, 5) ON CONFLICT(id) DO UPDATE SET read=excluded.read",
  );
  const notice = await sql(port, "SELECT read FROM Notice WHERE id = 'n'");
  assert.equal(notice.rows[0]?.read, 0);

  await sql(port, "CREATE TABLE HouseVisitDay (day TEXT PRIMARY KEY, guests INTEGER, players INTEGER)");
  await sql(port, "INSERT INTO HouseVisitDay (day, guests, players) VALUES ('d', 1, 0)");
  await sql(port, "UPDATE HouseVisitDay SET guests = MAX(0, guests - 1), players = players + 1 WHERE day = 'd'");
  const day = await sql(port, "SELECT guests, players FROM HouseVisitDay");
  assert.equal(day.rows[0]?.guests, 0);
  assert.equal(day.rows[0]?.players, 1);

  await sql(port, "CREATE TABLE NetworkPost (id TEXT PRIMARY KEY, link TEXT)");
  await sql(port, "INSERT INTO NetworkPost (id, link) VALUES ('wire-abcdefabcdefabcdefabcdefabcdefab', 'https://out')");
  await sql(
    port,
    "UPDATE NetworkPost SET link = '/news/' || substr(id, 6) WHERE id LIKE 'wire-%' AND length(id) = 37 AND link NOT LIKE '/news/%'",
  );
  const post = await sql(port, "SELECT link FROM NetworkPost");
  assert.equal(post.rows[0]?.link, "/news/abcdefabcdefabcdefabcdefabcdefab");

  await sql(port, "CREATE TABLE Tx (id TEXT PRIMARY KEY, playerId TEXT)");
  await sql(port, "INSERT INTO Tx (id, playerId) VALUES ('1', 'a'), ('2', 'a'), ('3', 'b')");
  const people = await sql(port, "SELECT DISTINCT playerId FROM Tx ORDER BY playerId ASC");
  assert.deepEqual(people.rows.map((row) => row.playerId), ["a", "b"]);
});

test("a deposit log cannot be recorded twice, and old room lines drop", async () => {
  const port = new MemoryPort();
  await sql(
    port,
    `CREATE TABLE ChainDeposit (
      id TEXT PRIMARY KEY,
      txHash TEXT NOT NULL,
      logIndex INTEGER NOT NULL,
      UNIQUE(txHash, logIndex)
    )`,
  );
  await sql(port, "INSERT INTO ChainDeposit (id, txHash, logIndex) VALUES ('a', '0x1', 0)");
  await assert.rejects(
    () => sql(port, "INSERT INTO ChainDeposit (id, txHash, logIndex) VALUES ('b', '0x1', 0)"),
    /duplicate key/,
  );

  await sql(port, "CREATE TABLE RoomEvent (id TEXT PRIMARY KEY, roomId TEXT, createdAt INTEGER)");
  await sql(
    port,
    "INSERT INTO RoomEvent (id, roomId, createdAt) VALUES ('a', 'r', 1), ('b', 'r', 2), ('c', 'r', 3)",
  );
  await sql(
    port,
    `DELETE FROM RoomEvent WHERE id IN (
       SELECT id FROM (
         SELECT id, ROW_NUMBER() OVER (PARTITION BY roomId ORDER BY createdAt DESC) AS seat
           FROM RoomEvent
       ) WHERE seat > 2
     )`,
  );
  const left = await sql(port, "SELECT id FROM RoomEvent ORDER BY createdAt ASC");
  assert.deepEqual(left.rows.map((row) => row.id), ["b", "c"]);
});

test("joined books and a case sum", async () => {
  const port = new MemoryPort();
  await sql(port, "CREATE TABLE User (id TEXT PRIMARY KEY, username TEXT)");
  await sql(port, "CREATE TABLE Tx (id TEXT PRIMARY KEY, playerId TEXT, type TEXT, amount REAL, createdAt INTEGER)");
  await sql(port, "INSERT INTO User (id, username) VALUES ('p', 'ada')");
  await sql(port, "INSERT INTO Tx (id, playerId, type, amount, createdAt) VALUES ('1', 'p', 'click', 10, 86400000), ('2', 'p', 'payout', 40, 86400000)");
  const rows = await sql(
    port,
    `SELECT t.playerId, u.username,
            SUM(CASE WHEN t.type = 'payout' THEN t.amount ELSE 0 END) AS taken
       FROM Tx t JOIN User u ON u.id = t.playerId
      GROUP BY t.playerId, u.username`,
  );
  assert.equal(rows.rows[0]?.username, "ada");
  assert.equal(rows.rows[0]?.taken, 40);
  const day = await sql(port, "SELECT CAST(createdAt / 86400000 AS INTEGER) AS day FROM Tx WHERE id = '1'");
  assert.equal(day.rows[0]?.day, 1);
});
