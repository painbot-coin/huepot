/**
 * Deploy HUE.
 *
 *   npx hardhat run scripts/deploy-coin.cjs --config hardhat.config.cjs --network bscTestnet
 *
 * Mainnet is gated on purpose: this mints the entire supply once, to the
 * deploying key, and there is no second chance. Set COIN_CONFIRM_MAINNET=yes
 * to allow --network bsc.
 */
const { ethers, network } = require("hardhat");

const SUPPLY_HUE = process.env.COIN_SUPPLY || "100000000"; // 100,000,000 HUE

async function main() {
  const supply = ethers.parseUnits(SUPPLY_HUE, 18);

  // Check where we are pointed before anything else, so a misdirected mainnet
  // run fails on the destination rather than on a missing key.
  if (network.name === "bsc" && process.env.COIN_CONFIRM_MAINNET !== "yes") {
    throw new Error(
      "Refusing to deploy to BSC mainnet. This mints the whole supply once and cannot be undone. Set COIN_CONFIRM_MAINNET=yes if that is really what you want.",
    );
  }

  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error(
      "No signer. Set COIN_DEPLOYER_KEY in .env.local to the treasury key.",
    );
  }

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("network   :", network.name, `(chainId ${network.config.chainId})`);
  console.log("deployer  :", deployer.address);
  console.log("gas funds :", ethers.formatEther(balance), "BNB");
  console.log("supply    :", SUPPLY_HUE, "HUE");

  if (balance === 0n) {
    throw new Error(
      "Deployer has no BNB for gas. Fund it first (testnet: use a BNB Smart Chain testnet faucet).",
    );
  }

  const Coin = await ethers.getContractFactory("HuepotCoin");
  const coin = await Coin.deploy(supply);
  console.log("tx        :", coin.deploymentTransaction()?.hash);
  await coin.waitForDeployment();

  const address = await coin.getAddress();
  console.log("");
  console.log("HUE deployed at :", address);
  console.log("treasury holds  :", ethers.formatUnits(await coin.balanceOf(deployer.address), 18), "HUE");
  console.log("");
  console.log("Next:");
  console.log("  1. Put the address in .env.local as HUE_TOKEN_ADDRESS");
  console.log("  2. Keep the treasury key off the web server; bonuses are signed separately");
  console.log("  3. A price only exists once you add HUE/USDT liquidity on a DEX");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
