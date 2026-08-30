# Huepot v1.1 review and v1.2 update plan

**Live now:** https://huepot.net — product v1.3.3  
**Read with:** `GROWTH.md`

v1.1 made the cashier safer: BSC-only Invest, min 10 USDT, pending confirms, withdraw queue copy, a public paid-out strip, a zero-balance pit CTA, and a support address. A stranger can send the first 10 USDT without guessing the chain.

They still have no reason to tell a friend. There is no invite code, no `?ref=`, and no rake split. House rooms are empty except whoever is sitting Classic. The paid-out strip is in the code but hidden until staff marks a withdrawal **paid** — live `/api/payouts` is `[]`.

The next update is **v1.2 — invite that pays itself**. Not more rooms. Not more atmosphere. Not ads.

---

## What v1.1 already does well

- Timed same-price color pots, ties refund, empty rounds skip, Fog hides public counts in the last 12 seconds.
- Classic / Lightning / Duo / High Table / Fog Pit, plus custom rooms with optional fog.
- Google-only sign-in, 18+ gate, loss cap / cool-off / self-exclude.
- Live BSC USDT deposits (12 confirms), pending-tx list, staff withdrawal queue with on-chain send.
- Withdraw page: queued / sent / rejected, BscScan when `txHash` exists, min/max/daily caps.
- Fairness sheet: seed committed at open, revealed at settle.
- Host pause, mute, slow chat, close; staff freeze, void, ledger, reports.
- After a take: copy table link, open a Fog table.
- Footer + privacy: `support@huepot.net`.

Do not reopen those in v1.2 unless something is broken.

---

## What v1.1 still gets wrong

These are the reasons a visitor will sit once and not come back with a friend.

1. **No invite loop.** Account has no code. Google callback ignores `?ref=`. Settle puts 100% of house rake on the house user. Sharing a table link does not pay anyone.
2. **Paid-out strip is invisible.** `PublicPayouts` returns `null` when the list is empty. Strangers still cannot see that money leaves. That is now an ops job first (pay the first real withdrawal same day), then a small empty-state if you want the slot to exist before the first send.
3. **Unused wallets are still minted.** Every account still gets ETH, Tron, Polygon, Arbitrum, Solana, and Bitcoin addresses. They sit under “More networks (not live).” A curious player who sends there still loses the money. Welcome copy still says “Your wallets are ready.”
4. **Dead password doors.** `/signup`, `/forgot-password`, `/reset-password`, `/verify-email` redirect to sign-in. The 410 APIs (`/api/auth/signup`, `signin`, `forgot`, `reset`, `verify`, `resend`) are still on the public map. Google-only is the product; leftover doors look unfinished.
5. **Share is clipboard only.** After a take you can copy the room URL. House rooms have no `?ref=`. Host “copy invite” is custom-table only.
6. **Tables look dead.** Live lobby: Classic has one seat; Lightning, Duo, High, Fog, and the open custom table are empty pots. That is not a code bug. Sit Classic. Empty rooms kill the invite loop before it starts.

Growth items from `GROWTH.md` that are still not in the code: rake invite codes, weekly Fog cup. The payout strip exists; it has no paid rows yet.

---

## v1.2 scope (one update)

Ship one release. Keep it small enough to deploy in a few sittings. Order is the product: **invite attribution → rake split that stays solvent → stop unused wallets from looking live**.

### Must ship

| Item | Why | Where |
|------|-----|--------|
| **Invite code on Account** | Every Google user gets a short code they can copy. | New `referrals.ts`, `AccountClient.tsx` |
| **`?ref=` on sign-in** | New Google user from a friend’s link is tagged once. Cookie or oauth state carries the code through the Google callback. Existing accounts are not retagged. | `SigninForm.tsx`, `auth.ts` `loginWithGoogle`, `google/callback` |
| **Rake share on settle** | When a referred player’s clicks create house rake, a **fraction of that rake** (not stake, not treasury) goes to the inviter. House keeps the rest. | `game.ts` settle, `house.ts`, new tx type or `adjust`/`rake` note |
| **Daily inviter cap** | One whale referrer cannot drain the house wallet. Hard stop per UTC day. | `referrals.ts`, settle |
| **Inviter ledger line** | Inviter sees “Invite · N USDT from @name” in Account history, not a mystery credit. | `AccountClient.tsx`, `addTx` |

### Should ship in the same update if time

| Item | Why | Where |
|------|-----|--------|
| **BSC-only wallets for new users** | Stop minting unused-chain addresses. Existing unused addresses stay in the DB but stay hidden unless already shown. | `wallets.ts`, `networks.ts`, Invest “More networks” |
| **Kill leftover auth doors** | Delete or 404 the 410 password APIs and leftover pages. Redirects can stay as one `/signin` hop if bookmarks exist. | `app/signup`, `forgot-password`, `reset-password`, `verify-email`, `api/auth/*` stubs |
| **Paid-out empty state** | If no paid withdrawals yet, show one quiet line (“Cash-outs land here”) instead of hiding the strip. After the first paid send, keep time + amount only. | `PublicPayouts.tsx` |
| **Welcome / README copy** | One live BNB Chain address, not “wallets.” | `auth.ts` welcome notice, `README.md` |

### Do not put in v1.2

- New house rooms, more FX, leaderboards, achievements.
- Multi-chain deposits.
- Weekly Fog cup (`GROWTH.md` Phase 4 — after payouts are boring and Classic is busy).
- Deposit bonuses, free play money, or “both people get a cut of stake.”
- Sportsbook, odds, or anything copied from another casino.
- Paid ads or bot traffic.
- Postgres / multi-process rewrite (one PM2 fork is still fine).

---

## Invite economics (keep it solvent)

- House already takes about **5% of the losing pot** (`HOUSE_RAKE_BPS`, default 500).
- Inviter reward = a **fraction of that rake only**, e.g. **20% of rake** created by the referred player’s clicks in that settle — never a bonus from treasury, never a cut of winning payouts.
- Example: losing pot 20 USDT → rake 1.00 → inviter 0.20 → house 0.80. If two referred players sat that round, split the 0.20 by each referred player’s share of the clicks that created rake (or pay only for the referred player’s own losing/winning clicks that contributed to rake — pick one rule and document it on Account).
- **Cap** per inviter per UTC day (start at **10 USDT**). Overflow stays with the house.
- Self-invite, same Google account, and house user are rejected.
- No “deposit 10 get 5 free.” You cannot afford that.

If the settle math feels fuzzy, ship attribution + Account code first and add the split in a follow-up tag **v1.2.1**. A code that does nothing is still better than a bonus that empties the hot wallet.

---

## How to build it (sequence)

Work in this order so the site is safer after each merge.

1. **Schema + code** — persist `invitedBy` (user id) and a stable `inviteCode` on User. Additive `ALTER TABLE` on live SQLite; do not `migrate deploy` over the existing DB. Prisma `migrate deploy` already failed once on this VPS (P3005).
2. **Sign-in carry** — `?ref=CODE` → cookie / oauth state → `loginWithGoogle` sets `invitedBy` only on **new** users.
3. **Account** — show code, copy link (`https://huepot.net/signin?ref=CODE`), lifetime invite credit, daily remaining cap.
4. **Settle split** — after house rake is computed, peel the inviter slice, credit inviter, leave remainder on house, write both txs. Test with two Google accounts and a 1 USDT click.
5. **Stop unused wallets** — new users get BSC only. Deploy this even if you pause before settle.
6. **Delete leftover auth stubs** — last, because it does not make money.

Each step should be playable on huepot.net the same day: copy a code, create a second Google account from the link, sit one click, see a rake line on the inviter.

---

## Ops that are not code (do these in parallel)

v1.2 does not replace Phase 1 in `GROWTH.md`.

1. **Sit Classic.** Live pots are empty. A friend’s invite lands on a dead table and they leave.
2. **Pay the first withdrawal same day** and mark it **paid** so the public strip has a real row. Until that happens, the v1.1 trust feature is invisible.
3. **Post proof**, not hype: one take, one fairness seed, one paid BscScan. No private keys.

Do not spend money on traffic until a referred player has been credited from rake and a stranger can see at least one paid cash-out.

---

## Done when

v1.2 is done when a new person can:

1. Copy an invite link from Account.
2. Open that link, tick 18+, sign in with a **different** Google account, and land tagged.
3. Sit one click; after settle the inviter sees a rake-share credit, not a mystery bonus.
4. Hit the daily cap and see further rake stay with the house.
5. (If wallet cleanup shipped) never be shown a Tron/Sol/BTC address as if it were live.

**Build status:** v1.2.0 is live on huepot.net. Sit Classic and pay the first cash-out so the strip has a real row.

Then go back to `GROWTH.md` Phase 1–2: sit Classic, pay same-day, post proof, live in one hangout. Weekly Fog cup stays later.

---

## Suggested name

**Huepot v1.2 — Invite that pays itself**

Same pit. One loop funded from house rake only.
