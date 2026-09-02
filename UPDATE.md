# Huepot v1.3.22 review and v1.4 update plan

**Live now:** https://huepot.net — product **v1.3.23** (`withdrawSend:true`, `canSend:true`).
**Read with:** `GROWTH.md`, `NETWORK.md`.

The v1.2 invite job is done. Cashier, named sit times, take cards, and hour pings are live. Empty Classic and empty proof strips are the remaining growth problem — not missing features.

The next update is **v1.4 — finish the house**. Not more rooms. Not more hours. Not ads.

---

## What is already live (do not rebuild)

- Same-price timed pots, ties refund, Fog last-12s, custom rooms with a live timer.
- House rooms: Classic, Lightning, Duo, High Table, Fog Pit. Classic hour **20:00 UTC**. Fog cup **Sunday 21:00 UTC**.
- Google-only sign-in, 18+ gate, loss cap / cool-off / self-exclude.
- BSC USDT deposit watch (12 confirms), auto-withdraw with queue + retry, BscScan on paid rows, house-short copy without leaking the house address.
- Fairness commit/reveal. Staff freeze / void / ledger / queue Send (retry).
- Invite: Account code, `?ref=` through Google, 20% of house rake, 10 USDT/day cap, invite line on Account.
- Take share card + OG. Copy invite on the take card. Sit-window pings from a 30s tick (skip house, unverified, and anyone already pinged this window).
- Welcome / deposit / sign-in copy already name Classic hour and Fog cup.

Checked on this plan: `/api/takes` and `/api/payouts` are still `[]`.

---

## What a stranger still gets wrong

These are leftover, not missing loops.

1. **Proof trail is empty.** Lobby says “Takes land here” and “Cash-outs land here.” Code is fine. No contested pot and no paid withdraw have landed. That is ops.
2. **Network looks like the product.** Header is Rooms + Network. Unsigned `/network` is a feed shell that then asks for sign-in. A first visit should stay on the pit.
3. **Dead password doors.** `/signup`, `/forgot-password`, `/reset-password`, `/verify-email` 307 to `/signin?notice=google`. Password APIs are already gone. Schema still has `passwordHash` / `verifyToken` — leave the columns; do not `prisma migrate deploy`.
4. **Unused-chain code is still in the tree.** New users only mint BSC. `networks.ts` still lists ETH / Tron / Polygon / Arbitrum / Sol / BTC. Old Wallet rows may still sit in SQLite. They must never show as live.
5. **Orphan staff/click surfaces.** `StaffPayoutsClient.tsx` is unused. `/api/staff/payouts` and `/api/click` have no client.

Classic showing `@devguru13580 · @bill · @danny` is presence, not a live pot. Lightning / Duo / High / Fog stay empty unless you sit them.

---

## v1.4 scope (small, in this order)

Same deploy recipe as 1.3.22 (temp clone, tarball, keep `WALLET_SECRET`, `pm2 startOrReload`). No `prisma migrate deploy`. One PM2 fork.

### Must ship

| Item | Why | Where |
|------|-----|--------|
| **Docs match live** | UPDATE / GROWTH / NETWORK still say v1.2. | This file, `GROWTH.md`, `NETWORK.md` |
| **1.3.23 pit-first chrome** | Strangers should not land in an empty feed. | `SiteHeader.tsx`, `SiteFooter.tsx` |
| **Kill leftover auth pages** | Google-only is the product. | Delete signup / forgot / reset / verify pages; redirect leftovers to `/signin` |
| **Drop dead password helpers** | `hashPassword` / `verifyPassword` / `hasPassword` are unused. Keep `newSessionToken`. | `password.ts`, `public-user.ts` |
| **Drop orphan staff/click files** | Console already has Send. | `StaffPayoutsClient.tsx`, `/api/staff/payouts`, `/api/click` |

### Should ship next if you still say “next step”

| Item | Why |
|------|-----|
| **1.3.24 unused-chain debris** | Public wallet list stays BSC-only. Do not delete old Wallet rows. |
| **1.3.25 first-click invite nudge** | After a player’s first click, one notice: copy invite + next Classic 20:00 UTC. Also read hour-ping sitters from SQLite, not the 400-tx memory slice. |

Then stop building.

### Do not put in v1.4

- New house rooms, more FX, leaderboards, achievements, Telegram bot, RSVP.
- Multi-chain deposits, sportsbook, odds, deposit bonuses.
- Postgres / multi-process rewrite.
- Growing Network (posts, people, DMs) until Classic is busy without you.
- Fake takes or fake paid-out rows.

---

## Ops that are not code (do these in parallel)

v1.4 does not replace `NETWORK.md`.

1. Sit Classic at **20:00 UTC** with at least one other real click so `/api/takes` gets a row.
2. Cash out once (min 5 USDT) so `/api/payouts` has a BscScan row. Top the house wallet if the queue waits.
3. Sit Classic once yourself so you are in the 7-day sitter set and get the hour ping.
4. One Telegram. Pin: one-sentence rule, Classic link, your `?ref=` invite, “cash-out is same day.”
5. Send that invite to 3 people you know. 18+ only. No ads, no bots.

Week 1 still means: 3 sign-ins who are not you, 2 deposits, 1 cash-out.

---

## Done when

A stranger can: land on Rooms (not an empty feed), sign in with Google only, add USDT on BSC, sit Classic, see a real last take and a real paid cash-out, copy invite from Account or a take card, and a referred sit pays rake-only on Account.

**Build status:** v1.3.23 ships the chrome/auth cleanup. Proof rows still wait on you sitting and paying.

Then go back to `NETWORK.md`: sit Classic, pay same-day, post proof, live in one hangout.

---

## Suggested name

**Huepot v1.4 — Finish the house**

Same pit. Leftover doors gone. Proof still has to be earned.
