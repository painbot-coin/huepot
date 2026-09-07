# HUE — the Huepot coin

BEP-20 on BNB Smart Chain. `contracts/HuepotCoin.sol` is the source of truth.

```
npm run coin:compile          # solc 0.8.24, pinned in hardhat.config.cjs
npm run coin:test             # 12 tests on a local EVM
npm run coin:deploy:testnet   # BSC testnet (chainId 97)
npm run coin:deploy:mainnet   # gated, see below
```

Hardhat is the only compiler here, on purpose. The contract pins
`pragma solidity 0.8.24` so the bytecode is reproducible for BscScan
verification, and a second standalone compiler drifted to 0.8.26 and broke the
build — one toolchain, one pinned version.

## What the contract is

| | |
|---|---|
| Name / symbol | Huepot / HUE |
| Decimals | 18 |
| Supply | fixed at construction, default 100,000,000 |
| Mint function | **none** |
| Owner / pause / blacklist / upgrade | **none** |
| Runtime size | 1,467 bytes |

A coin a house hands out as a bonus is only worth holding if the house cannot
print more of it or freeze it. Every admin hook is a reason not to trust the
supply, so the contract has none. That is also why bonuses are paid by
**transferring from a treasury balance**, not by minting: the bonus pool is
visibly finite on chain, and supply is conserved on every payout.

## Deploying

Needs `COIN_DEPLOYER_KEY` in `.env.local` — the treasury key, funded with BNB
for gas. Testnet BNB comes from a BNB Smart Chain testnet faucet.

Mainnet refuses to run unless `COIN_CONFIRM_MAINNET=yes`, because deployment
mints the entire supply once to the deploying key and cannot be undone. The
destination is checked before the key, so a misdirected mainnet run fails on
the destination rather than on a missing signer.

Keep the treasury key **off the web server**. The app never needs to hold the
supply; bonus payouts should be signed by a separate, limited hot wallet that
is topped up from treasury.

## Price

The contract does not create a price. HUE has a market price only once it is
paired with USDT or BNB in a liquidity pool that someone funds with real
capital. Until then it is a transferable token with no market.

## The regulatory part, stated once

A token whose value derives from a gambling house's revenue is treated as a
security in many jurisdictions, and gambling plus token issuance is separately
regulated. Distribution as a play bonus, any buy-back, and any rake share are
the decisions that carry that exposure — not the code in this folder. Get
advice before mainnet.
