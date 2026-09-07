const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
const n = (v) => Number(v ?? 0);

(async () => {
  const rows = await p.$queryRawUnsafe(
    "SELECT id, playerId, amount, createdAt, note FROM Tx WHERE type = 'deposit' ORDER BY createdAt",
  );
  console.log("deposit rows, oldest first:");
  for (const r of rows) {
    console.log("  id        : " + r.id);
    console.log("  player    : " + r.playerId);
    console.log("  amount    : " + (r.amount / 100).toFixed(2));
    console.log("  createdAt : " + new Date(n(r.createdAt)).toISOString());
    console.log("");
  }
  const cd = await p.$queryRawUnsafe("SELECT txHash, logIndex, amount FROM ChainDeposit");
  console.log("ChainDeposit rows (the on-chain truth):");
  for (const r of cd) {
    console.log("  " + r.txHash + "  log " + r.logIndex + "  " + (r.amount / 100).toFixed(2));
  }
  console.log("");
  const users = await p.$queryRawUnsafe(
    "SELECT username, balance FROM User WHERE id IN (SELECT DISTINCT playerId FROM Tx WHERE type = 'deposit')",
  );
  console.log("balances of players holding a deposit row (must not change):");
  for (const u of users) console.log("  " + u.username + " : " + (u.balance / 100).toFixed(2));
  await p.$disconnect();
})();
