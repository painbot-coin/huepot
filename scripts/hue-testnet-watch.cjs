#!/usr/bin/env node
/**
 * Wait for testnet BNB, then deploy HUE and restart the app.
 * If the cashier wallet is funded on chain 97, sweep a little gas to the HUE hot wallet.
 */

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { JsonRpcProvider, Wallet, formatEther, parseEther } = require("ethers");

const ROOT = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env.local");
const RPC = "https://bsc-testnet-rpc.publicnode.com";
const CHAIN = 97;
const MAX_MS = 90 * 60 * 1000;
const STEP_MS = 20_000;

function parseEnv(text) {
  const map = new Map();
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith("#") || !raw.includes("=")) continue;
    const name = raw.split("=", 1)[0];
    map.set(name, raw.slice(name.length + 1).trim());
  }
  return map;
}

function wallet(key) {
  const raw = (key || "").trim();
  if (!raw) return null;
  return new Wallet(raw.startsWith("0x") ? raw : `0x${raw}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  const started = Date.now();
  const provider = new JsonRpcProvider(RPC, CHAIN, { staticNetwork: true });
  const net = await provider.getNetwork();
  if (Number(net.chainId) !== CHAIN) throw new Error(`refusing chain ${net.chainId}`);

  while (Date.now() - started < MAX_MS) {
    const map = parseEnv(fs.readFileSync(ENV_PATH, "utf8"));
    if (map.get("HUE_TOKEN")) {
      console.log("token already set");
      break;
    }
    const hot = wallet(map.get("HUE_HOT_KEY"));
    const cashier = wallet(map.get("WITHDRAW_KEY"));
    if (!hot) throw new Error("missing HUE_HOT_KEY");
    const hotBal = await provider.getBalance(hot.address);
    const cashBal = cashier ? await provider.getBalance(cashier.address) : 0n;
    console.log(
      new Date().toISOString(),
      "hot",
      formatEther(hotBal),
      "cashier",
      formatEther(cashBal),
    );
    if (hotBal === 0n && cashBal > parseEther("0.005")) {
      const send = cashBal > parseEther("0.12") ? parseEther("0.08") : cashBal - parseEther("0.002");
      const tx = await cashier.connect(provider).sendTransaction({ to: hot.address, value: send });
      console.log("swept", tx.hash);
      await tx.wait();
      continue;
    }
    if (hotBal > 0n) {
      const run = spawnSync("node", ["scripts/hue-testnet-run.cjs"], {
        cwd: ROOT,
        stdio: "inherit",
      });
      if (run.status !== 0) throw new Error("deploy failed");
      const restart = spawnSync("pm2", ["restart", "huepot", "--update-env"], {
        cwd: ROOT,
        stdio: "inherit",
      });
      if (restart.status !== 0) throw new Error("pm2 restart failed");
      console.log("HUE rail started");
      process.exit(0);
    }
    await sleep(STEP_MS);
  }
  if (!parseEnv(fs.readFileSync(ENV_PATH, "utf8")).get("HUE_TOKEN")) {
    console.log("TIMEOUT waiting for testnet BNB");
    process.exit(2);
  }
})().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
