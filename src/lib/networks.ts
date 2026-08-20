export const NETWORKS = [
  {
    id: "eth",
    name: "Ethereum",
    standard: "ERC-20",
    asset: "USDT",
    family: "evm",
    hint: "Send USDT on Ethereum only.",
  },
  {
    id: "bsc",
    name: "BNB Smart Chain",
    standard: "BEP-20",
    asset: "USDT",
    family: "evm",
    hint: "Send USDT on BNB Smart Chain (BEP-20).",
  },
  {
    id: "tron",
    name: "Tron",
    standard: "TRC-20",
    asset: "USDT",
    family: "tron",
    hint: "Send USDT on Tron (TRC-20). Address starts with T.",
  },
  {
    id: "polygon",
    name: "Polygon",
    standard: "ERC-20",
    asset: "USDT",
    family: "evm",
    hint: "Send USDT on Polygon.",
  },
  {
    id: "arbitrum",
    name: "Arbitrum One",
    standard: "ERC-20",
    asset: "USDT",
    family: "evm",
    hint: "Send USDT on Arbitrum One.",
  },
  {
    id: "sol",
    name: "Solana",
    standard: "SPL",
    asset: "USDT",
    family: "sol",
    hint: "Send USDT on Solana (SPL).",
  },
  {
    id: "btc",
    name: "Bitcoin",
    standard: "BTC",
    asset: "BTC",
    family: "btc",
    hint: "Send BTC. Credited as USDT play balance in demo.",
  },
] as const;

export type NetworkId = (typeof NETWORKS)[number]["id"];
export type NetworkFamily = (typeof NETWORKS)[number]["family"];

export function isNetworkId(value: string): value is NetworkId {
  return NETWORKS.some((network) => network.id === value);
}

export function networkById(id: NetworkId) {
  return NETWORKS.find((network) => network.id === id)!;
}

export function validateAddress(family: NetworkFamily, address: string) {
  const value = address.trim();
  if (family === "evm") {
    return /^0x[a-fA-F0-9]{40}$/.test(value);
  }
  if (family === "tron") {
    return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(value);
  }
  if (family === "sol") {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
  }
  if (family === "btc") {
    return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(value);
  }
  return false;
}
