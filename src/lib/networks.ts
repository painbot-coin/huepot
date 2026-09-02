export const NETWORKS = [
  {
    id: "bsc",
    name: "BNB Smart Chain",
    standard: "BEP-20",
    asset: "USDT",
    family: "evm",
    hint: "Live rail. Send USDT on BNB Smart Chain (BEP-20).",
  },
] as const;

export type NetworkId = (typeof NETWORKS)[number]["id"];
export type NetworkFamily = (typeof NETWORKS)[number]["family"];

export function liveNetwork() {
  return NETWORKS[0];
}

export function isNetworkId(value: string): value is NetworkId {
  return value === "bsc";
}

export function networkById(id: NetworkId) {
  return liveNetwork();
}

export function validateAddress(family: NetworkFamily, address: string) {
  const value = address.trim();
  if (family === "evm") {
    return /^0x[a-fA-F0-9]{40}$/.test(value);
  }
  return false;
}
