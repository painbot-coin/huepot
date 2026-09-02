import { Wallet } from "ethers";
import { LIVE_CHAIN_ID } from "./config";
import { liveNetwork, type NetworkId } from "./networks";
import { encryptSecret } from "./secret";
import type { StoredWallet, User } from "./types";

function generateBsc(): StoredWallet {
  const wallet = Wallet.createRandom();
  return {
    address: wallet.address,
    secretEnc: encryptSecret(wallet.privateKey),
  };
}

export function ensureUserWallets(user: User) {
  user.wallets ??= {};
  if (!user.wallets[LIVE_CHAIN_ID]) {
    user.wallets[LIVE_CHAIN_ID] = generateBsc();
  }
}

export function publicWallets(user: User) {
  ensureUserWallets(user);
  const live = liveNetwork();
  const stored = user.wallets[LIVE_CHAIN_ID];
  if (!stored) return [];
  return [
    {
      id: live.id as NetworkId,
      name: live.name,
      standard: live.standard,
      asset: live.asset,
      family: live.family,
      hint: live.hint,
      address: stored.address,
      live: true,
    },
  ];
}
