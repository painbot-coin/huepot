import { houseWalletStatus } from "./chain";
import { prisma } from "./db";
import { HOUSE_USER_ID } from "./house";
import { fromCents } from "./money";
import { DAY_MS, dayIndex, weekIndex, weekStart } from "./tasks";

/**
 * The books. Read-only accounting derived from rows that already exist —
 * `Tx`, `Withdrawal`, `User.balance` and the on-chain treasury.
 *
 * Nothing here writes. The number that matters is `cover`: treasury USDT
 * minus what the house owes players. If that goes negative the house cannot
 * pay everyone out, and no amount of interface work fixes it.
 */

export type BooksTotals = {
  deposits: number;
  clicks: number;
  payouts: number;
  refunds: number;
  rake: number;
  invite: number;
  adjust: number;
};

export type BooksWindow = {
  label: string;
  clicks: number;
  takes: number;
  rake: number;
  deposits: number;
  seats: number;
};

export type Books = {
  totals: BooksTotals;
  owed: number;
  /** What every balance should be if rebuilt from Tx rows. */
  implied: number;
  /** Balances minus implied. Anything but zero means a balance moved without a row. */
  drift: number;
  /** Deposit rows sharing one on-chain transaction. Each extra is money the ledger claims twice. */
  doubleCredits: { groups: number; extra: number };
  treasury: { usdt: number; bnb: number; address: string; ready: boolean };
  cover: number;
  withdrawals: { status: string; n: number; usdt: number }[];
  players: { total: number; withBalance: number; everClicked: number };
  today: BooksWindow;
  week: BooksWindow;
};

function num(value: unknown) {
  if (value == null) return 0;
  return Number(value) || 0;
}

const TYPES: (keyof BooksTotals)[] = [
  "deposits",
  "clicks",
  "payouts",
  "refunds",
  "rake",
  "invite",
  "adjust",
];

const TYPE_KEY: Record<string, keyof BooksTotals> = {
  deposit: "deposits",
  click: "clicks",
  payout: "payouts",
  refund: "refunds",
  rake: "rake",
  invite: "invite",
  adjust: "adjust",
};

async function windowRow(label: string, since: number): Promise<BooksWindow> {
  const [row] = await prisma.$queryRawUnsafe<
    { clicks: number | null; takes: number | null; rake: number | null; deposits: number | null }[]
  >(
    `SELECT SUM(CASE WHEN type = 'click'   THEN 1 ELSE 0 END) AS clicks,
            SUM(CASE WHEN type = 'payout'  THEN 1 ELSE 0 END) AS takes,
            SUM(CASE WHEN type = 'rake'    THEN amount ELSE 0 END) AS rake,
            SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END) AS deposits
       FROM Tx WHERE createdAt >= ?`,
    since,
  );
  const [seats] = await prisma.$queryRawUnsafe<{ n: number | null }[]>(
    `SELECT COUNT(DISTINCT playerId) AS n FROM Tx WHERE type = 'click' AND createdAt >= ?`,
    since,
  );
  return {
    label,
    clicks: num(row?.clicks),
    takes: num(row?.takes),
    rake: fromCents(num(row?.rake)),
    deposits: fromCents(num(row?.deposits)),
    seats: num(seats?.n),
  };
}

export async function readBooks(): Promise<Books> {
  const totals: BooksTotals = {
    deposits: 0,
    clicks: 0,
    payouts: 0,
    refunds: 0,
    rake: 0,
    invite: 0,
    adjust: 0,
  };

  const byType = await prisma.$queryRawUnsafe<
    { type: string; cents: number | null }[]
  >("SELECT type, SUM(amount) AS cents FROM Tx GROUP BY type");
  for (const row of byType) {
    const key = TYPE_KEY[row.type];
    if (key) totals[key] = fromCents(num(row.cents));
  }

  // What the house owes players. The house's own account is not a liability.
  const [owedRow] = await prisma.$queryRawUnsafe<{ cents: number | null }[]>(
    "SELECT SUM(balance) AS cents FROM User WHERE id != ?",
    HOUSE_USER_ID,
  );
  const owed = fromCents(num(owedRow?.cents));

  const [playerRow] = await prisma.$queryRawUnsafe<
    { total: number | null; withBalance: number | null }[]
  >(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN balance > 0 THEN 1 ELSE 0 END) AS withBalance
       FROM User WHERE id != ?`,
    HOUSE_USER_ID,
  );
  const [clickedRow] = await prisma.$queryRawUnsafe<{ n: number | null }[]>(
    "SELECT COUNT(DISTINCT playerId) AS n FROM Tx WHERE type = 'click'",
  );

  let withdrawals: Books["withdrawals"] = [];
  try {
    const rows = await prisma.$queryRawUnsafe<
      { status: string; n: number | null; cents: number | null }[]
    >("SELECT status, COUNT(*) AS n, SUM(amount) AS cents FROM Withdrawal GROUP BY status");
    withdrawals = rows.map((row) => ({
      status: row.status,
      n: num(row.n),
      usdt: fromCents(num(row.cents)),
    }));
  } catch {
    withdrawals = [];
  }

  // Rebuild every cash balance from its rows and compare. Money leaving a
  // balance without a Tx row is the one accounting fault that hides everything
  // else, so it gets computed every time the books are opened.
  // Out: withdraw, click. Sit is signed and offsets a click (or a refund) so
  // sit chips cannot mint bank. Bonus grants are chips, not cash. A rake row
  // is written only on the house account, where it is the house take arriving.
  const [impliedRow] = await prisma.$queryRawUnsafe<{ cents: number | null }[]>(
    `SELECT SUM(CASE
              WHEN type IN ('withdraw','click') THEN -amount
              WHEN type = 'bonus' THEN 0
              ELSE amount
            END) AS cents
       FROM Tx`,
  );
  const implied = fromCents(num(impliedRow?.cents));
  const [allBalances] = await prisma.$queryRawUnsafe<{ cents: number | null }[]>(
    "SELECT SUM(balance) AS cents FROM User",
  );
  const drift = fromCents(num(allBalances?.cents)) - implied;

  // One on-chain transfer must appear once. A repeated hash means the ledger
  // counted a deposit that only arrived once.
  let doubleCredits = { groups: 0, extra: 0 };
  try {
    const dupes = await prisma.$queryRawUnsafe<
      { note: string; n: number | bigint; cents: number | null }[]
    >(
      `SELECT note, COUNT(*) AS n, SUM(amount) AS cents
         FROM Tx
        WHERE type = 'deposit' AND note LIKE '%0x%'
        GROUP BY note HAVING COUNT(*) > 1`,
    );
    let extraCents = 0;
    for (const row of dupes) {
      const n = num(row.n);
      const cents = num(row.cents);
      if (n > 1) extraCents += cents - cents / n;
    }
    doubleCredits = { groups: dupes.length, extra: fromCents(extraCents) };
  } catch {
    doubleCredits = { groups: 0, extra: 0 };
  }

  const house = await houseWalletStatus();
  const now = Date.now();

  return {
    totals,
    owed,
    implied,
    drift,
    doubleCredits,
    treasury: {
      usdt: house.usdt,
      bnb: house.bnb,
      address: house.address,
      ready: house.ready,
    },
    cover: house.usdt - owed,
    withdrawals,
    players: {
      total: num(playerRow?.total),
      withBalance: num(playerRow?.withBalance),
      everClicked: num(clickedRow?.n),
    },
    today: await windowRow("Today", dayIndex(now) * DAY_MS),
    week: await windowRow("This week", weekStart(weekIndex(now))),
  };
}

export const BOOK_LINES = TYPES;
