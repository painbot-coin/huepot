#!/usr/bin/env node
/**
 * Deploy HUE on BSC testnet and turn the VPS claim rail on.
 *
 * Reads / writes /var/www/huepot/.env.local. Never prints keys.
 * Uses the already-built artifact + ethers (no Hardhat on the droplet).
 *
 *   node scripts/hue-testnet-run.cjs
 */

const fs = require("node:fs");
const path = require("node:path");
const { ContractFactory, JsonRpcProvider, Wallet, formatEther, parseUnits } = require("ethers");

const ROOT = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env.local");
const ARTIFACT = path.join(__dirname, "HuepotCoin.json");
const RPC = "https://bsc-testnet-rpc.publicnode.com";
const CHAIN = 97;
const SUPPLY = parseUnits("100000000", 18);

function parseEnv(text) {
  const map = new Map();
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith("#") || !raw.includes("=")) continue;
    const name = raw.split("=", 1)[0];
    map.set(name, raw.slice(name.length + 1));
  }
  return map;
}

function upsertEnv(file, updates) {
  const existing = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const map = parseEnv(existing);
  for (const [key, value] of Object.entries(updates)) map.set(key, value);
  const kept = existing
    .split(/\r?\n/)
    .filter((line) => {
      if (!line.trim() || line.trim().startsWith("#") || !line.includes("=")) return true;
      return !Object.prototype.hasOwnProperty.call(updates, line.split("=", 1)[0]);
    })
    .filter((line, index, all) => !(index === all.length - 1 && line === ""));
  const added = Object.entries(updates).map(([key, value]) => `${key}=${value}`);
  const body = `${kept.join("\n").replace(/\s*$/, "")}\n${added.join("\n")}\n`;
  fs.writeFileSync(file, body, { encoding: "utf8", mode: 0o600 });
}

function envGet(map, key) {
  return (map.get(key) || "").trim();
}

(async () => {
  if (!fs.existsSync(ARTIFACT)) throw new Error(`missing ${ARTIFACT}`);
  const artifact = JSON.parse(fs.readFileSync(ARTIFACT, "utf8"));
  const map = fs.existsSync(ENV_PATH) ? parseEnv(fs.readFileSync(ENV_PATH, "utf8")) : new Map();

  let hot = envGet(map, "HUE_HOT_KEY");
  if (!hot) {
    const created = Wallet.createRandom();
    hot = created.privateKey;
    upsertEnv(ENV_PATH, { HUE_HOT_KEY: hot });
    console.log("hot wallet created");
  }

  const wallet = new Wallet(hot.startsWith("0x") ? hot : `0x${hot}`);
  const provider = new JsonRpcProvider(RPC, CHAIN, { staticNetwork: true });
  const net = await provider.getNetwork();
  if (Number(net.chainId) !== CHAIN) throw new Error(`refusing chain ${net.chainId}`);
  const signer = wallet.connect(provider);
  const bnb = await provider.getBalance(signer.address);
  console.log("address", signer.address);
  console.log("testnetBnb", formatEther(bnb));

  upsertEnv(ENV_PATH, {
    HUE_CHAIN_ID: "97",
    HUE_RPC_URL: RPC,
  });

  let token = envGet(parseEnv(fs.readFileSync(ENV_PATH, "utf8")), "HUE_TOKEN");
  if (token) {
    console.log("token", token);
    console.log("already deployed");
    return;
  }

  if (bnb === 0n) {
    console.log("NEED_FAUCET", signer.address);
    process.exit(2);
  }

  const factory = new ContractFactory(artifact.abi, artifact.bytecode, signer);
  const coin = await factory.deploy(SUPPLY);
  console.log("deployTx", coin.deploymentTransaction()?.hash);
  await coin.waitForDeployment();
  token = await coin.getAddress();
  upsertEnv(ENV_PATH, { HUE_TOKEN: token });
  const held = await coin.balanceOf(signer.address);
  console.log("token", token);
  console.log("treasuryHue", held.toString());
})().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
