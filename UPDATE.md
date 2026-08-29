# Huepot v1 review and v1.1 update plan

**Live now:** https://huepot.net — product v1.0.0  
**Read with:** `GROWTH.md`

v1 is a complete custodial color pot: five house rooms (including Fog Pit), custom tables, Google sign-in, BNB Chain USDT in and out, 5% rake, commit-reveal fairness, and a staff payout queue. It is good enough to sit. It is not yet good enough for a stranger to send the first 10 USDT and tell a friend.

The next update is **v1.1 — trust and the first loop**. Not more atmosphere. Not more rooms. Not ads.

---

## What v1 already does well

- Timed same-price color pots, ties refund, empty rounds skip, Fog hides public counts in the last 12 seconds.
- Classic / Lightning / Duo / High Table / Fog Pit, plus custom rooms with optional fog.
- Google-only sign-in, 18+ gate, loss cap / cool-off / self-exclude.
- Live BSC USDT deposits (12 confirms), staff withdrawal queue with on-chain send.
- Fairness sheet: seed committed at open, revealed at settle.
- Host pause, mute, slow chat, close; staff freeze, void, ledger, reports.

Do not reopen those in v1.1 unless something is broken.

---

## What v1 gets wrong for a new user

These are the reasons a visitor will not deposit.

1. **Invest shows seven wallets.** Only BNB Chain USDT is watched. Sending on Tron, Solana, or Bitcoin is a silent loss. That is the highest-trust bug on the site.
2. **No “I sent it” state.** Between broadcast and credit the player sees nothing. They refresh, they panic, they leave.
3. **Min deposit (10 USDT) is not shown** on the live Invest page.
4. **No public proof that money leaves.** Withdrawals exist only in staff tools and the player’s own history. A stranger cannot see that anyone was paid.
5. **Invite is host-only clipboard.** After a take there is no “send this table to three people.” House rooms have no share moment.
6. **Zero bank, then a click error.** There is no “Invest to sit” banner when the signed-in balance is below the click price.
7. **Dead password routes still exist** (`/signup`, `/forgot-password`, 410 APIs). Google-only is the product; leftover doors look unfinished.
8. **Privacy says “contact support” with no address.**

Growth features from `GROWTH.md` that are not in the code at all: rake invite codes, public last-payouts strip, post-win share card, weekly Fog cup.

---

## v1.1 scope (one update)

Ship one release. Keep it small enough to deploy in a few sittings. Order is the product: **safer deposit → visible payouts → invite that pays itself**.

### Must ship

| Item | Why | Where |
|------|-----|--------|
| **BSC-only Invest by default** | Stop wrong-chain losses. Other addresses stay under “More networks (not live)” or Account only. | `InvestClient.tsx`, `networks.ts` |
| **Show min 10 USDT + confirm count + “wrong chain is gone”** | First-time copy that matches the watcher. | `InvestClient.tsx`, how-it-works |
| **Pending deposit** | “Waiting for N/12 confirms” from the chain watcher, not a fake spinner. | `chain.ts`, deposit/chain API, `InvestClient.tsx` |
| **Public last payouts** | Time + amount only, no addresses. Homepage and/or footer. | New public list from paid withdrawals, `RoomLobby.tsx` / `SiteFooter.tsx` |
| **Withdraw queue copy** | Queued / sent / rejected, BscScan link when `txHash` exists, empty history line, show min/max/daily caps. | `WithdrawClient.tsx` |
| **Zero-balance pit banner** | Signed in, bank &lt; click price → Invest. | `GameClient.tsx` |

### Should ship in the same update if time

| Item | Why | Where |
|------|-----|--------|
| **Rake invite** | Code on the account. New Google user can enter or carry `?ref=`. On settle, a slice of **house rake** (not player stake) goes to the inviter. Solvent. No free play money. | New `referrals.ts`, `game.ts` settle, Google callback, Account |
| **Post-win share** | After a take: copy room link, optional “open a 30-min Fog table.” | `GameClient.tsx` result / take veil |
| **Kill leftover auth doors** | Redirects stay or become 404; drop dead 410 password APIs from the public map if unused. | `app/signup`, `forgot-password`, `api/auth/*` stubs |
| **Support line** | One email in privacy + footer. | `privacy/page.tsx`, `SiteFooter.tsx` |

### Do not put in v1.1

- New house rooms, more FX, leaderboards, achievements.
- Multi-chain deposits (until BSC is unmistakable).
- Weekly Fog cup (Phase 4 in `GROWTH.md` — after payouts are boring).
- Sportsbook, odds, or anything copied from another casino.
- Paid ads or bot traffic.
- Postgres / multi-process rewrite (one PM2 fork is fine at this size).

---

## How to build it (sequence)

Work in this order so the site is safer after each merge, not only at the end.

1. **Invest safety** — BSC-first layout, min deposit, wrong-chain warning. Deploy this alone if you have to stop.
2. **Pending deposits** — watcher already knows in-flight txs; expose them to the signed-in user.
3. **Payout strip + withdraw statuses** — strangers see money leave; players see queue state.
4. **Pit CTA + support email** — small, no schema.
5. **Invite + rake split** — needs a schema field (who invited whom) and a settle change. Test with two Google accounts and a tiny click.
6. **Post-win share** — last, because it only matters if 1–5 already make the table worth sending.

Each step should be playable on huepot.net the same day: deposit copy, then a test withdraw appearing on the strip, then a test invite credit from rake only.

---

## Invite economics (so it stays solvent)

- House already takes about **5% of the losing pot** (`HOUSE_RAKE_BPS`).
- Inviter reward = a **fraction of that rake**, e.g. 20% of rake on the referred player’s winning/losing clicks that created rake — never a bonus from treasury.
- Cap per day so one whale referrer cannot drain the house wallet.
- No “deposit 10 get 5 free.” You cannot afford that.

If the numbers feel fuzzy, ship the payout strip first and add invite in a follow-up tag **v1.1.1**. Trust still comes first.

---

## Done when

v1.1 is done when a new person can:

1. See only the live BSC address and the 10 USDT minimum.
2. Send USDT and watch confirms instead of guessing.
3. See that someone else was paid recently (public strip).
4. Withdraw and understand queued vs sent.
5. (If invite shipped) sit from a friend’s link and that friend later sees a rake credit, not a mystery bonus.

**Build status (local):** Must-ship items and post-win share are in the tree as v1.1.0. Rake invite is not in this sitting — do that next (`referrals.ts` + settle split). Leftover password APIs were left as 410 redirects.

Then go back to `GROWTH.md` Phase 1: sit Classic, pay same-day, post proof. Do not spend money on traffic until this update is live and withdrawals are still same-day.

---

## Suggested name

**Huepot v1.1 — Trust and invite**

Not a new product. The same pit, safer first deposit, visible cash-out, one loop that pays from rake.
