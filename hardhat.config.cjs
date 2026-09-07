/** Contract toolchain for HUE. Kept separate from the Next app build. */
require("@nomicfoundation/hardhat-ethers");
require("dotenv").config({ path: ".env.local", quiet: true });

const key = (process.env.COIN_DEPLOYER_KEY || "").trim();
const accounts = key ? [key.startsWith("0x") ? key : `0x${key}`] : [];

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 400 }, evmVersion: "paris" },
  },
  paths: { sources: "contracts", tests: "contracts/test", cache: ".hardhat", artifacts: ".hardhat/artifacts" },
  networks: {
    hardhat: { chainId: 31337 },
    // Testnet first. Mainnet stays opt-in and needs COIN_DEPLOYER_KEY set.
    bscTestnet: {
      url: process.env.BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
      chainId: 97,
      accounts,
    },
    bsc: {
      url: process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org",
      chainId: 56,
      accounts,
    },
  },
};
