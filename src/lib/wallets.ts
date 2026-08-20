import { createHash } from "crypto";
import { getBytes, sha256, SigningKey, Wallet } from "ethers";
import nacl from "tweetnacl";
import { encodeBase58 } from "./base58";
import { NETWORKS, type NetworkId } from "./networks";
import { encryptSecret } from "./secret";
import type { StoredWallet, User } from "./types";

function doubleSha256(bytes: Uint8Array) {
  return getBytes(sha256(getBytes(sha256(bytes))));
}

function encodeBase58Check(payload: Uint8Array) {
  const checksum = doubleSha256(payload).slice(0, 4);
  const combined = new Uint8Array(payload.length + 4);
  combined.set(payload);
  combined.set(checksum, payload.length);
  return encodeBase58(combined);
}

function ethHexToTron(ethAddress: string) {
  const payload = new Uint8Array(21);
  payload[0] = 0x41;
  payload.set(getBytes(ethAddress), 1);
  return encodeBase58Check(payload);
}

function p2pkhAddress(compressedPubKey: Uint8Array) {
  const sha = createHash("sha256").update(compressedPubKey).digest();
  const hash160 = createHash("ripemd160").update(sha).digest();
  const payload = Buffer.concat([Buffer.from([0x00]), hash160]);
  return encodeBase58Check(payload);
}

function generateOne(family: (typeof NETWORKS)[number]["family"]): StoredWallet {
  if (family === "sol") {
    const pair = nacl.sign.keyPair();
    return {
      address: encodeBase58(pair.publicKey),
      secretEnc: encryptSecret(Buffer.from(pair.secretKey).toString("hex")),
    };
  }

  const wallet = Wallet.createRandom();
  if (family === "evm") {
    return {
      address: wallet.address,
      secretEnc: encryptSecret(wallet.privateKey),
    };
  }
  if (family === "tron") {
    return {
      address: ethHexToTron(wallet.address),
      secretEnc: encryptSecret(wallet.privateKey),
    };
  }

  const compressed = getBytes(
    SigningKey.computePublicKey(wallet.privateKey, true),
  );
  return {
    address: p2pkhAddress(compressed),
    secretEnc: encryptSecret(wallet.privateKey),
  };
}

export function ensureUserWallets(user: User) {
  user.wallets ??= {};
  for (const network of NETWORKS) {
    if (!user.wallets[network.id]) {
      user.wallets[network.id] = generateOne(network.family);
    }
  }
}

export function publicWallets(user: User) {
  ensureUserWallets(user);
  return NETWORKS.map((network) => ({
    id: network.id as NetworkId,
    name: network.name,
    standard: network.standard,
    asset: network.asset,
    family: network.family,
    hint: network.hint,
    address: user.wallets[network.id]!.address,
  }));
}
