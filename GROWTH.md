# Huepot UI — grow into a deep fantasy house

Live: https://huepot.net · product **v3.0.3**.

This is the look-and-feel plan. The rule stays the same: same price, biggest color takes. The interface grows until Huepot feels like one house you enter — not a SaaS site with a fancy pit in the middle.

## The house

| Room | Route | Feel |
|------|--------|------|
| Gate | `/signin` | Cross in with Google. 18+ on the lintel. |
| Hall | `/` | House pits as doors. Classic is the public pit. |
| Wait | `/wait` | Game RL lab. Sit Tetris player types, catch, or snake. Gold is only to take the trained weights home. |
| Pit | `/rooms/[slug]` | Time bar, four hues, talk. You sit a table. |
| Rite | `/how-it-works` | How to enter, sit, strike, and leave. |
| Ledger | `/fairness` | The seed book. Anyone can check a take. |
| Board | `/board` | Who sat. HUE standing from real play. |
| Vault | `/invest`, `/withdraw`, `/account` | Gold in, gold out, limits. |
| Wing | `/network`, `/notifications` | Company, letters, notices. |

## What already belongs

- Sharp rectangle frames. Gold inlay. Cinzel on titles.
- One clock needle. Floating energy orbs. No stars. No virus meshes.
- Sit, click, take, cash out — words a stranger already knows.

## Phase 1 — One house (live)

Lobby, rite, gate, ledger, and vault use the same hall chrome as the pit. Frames are sharp rectangles.

## Phase 2 — The pit as a place (live in 1.3.60)

Round state changes the room: gold when open, red in the last 10 seconds, silver fog, winner wash on a take. Light and a short line name the mood. Urgent tick while time is short. Pads stay locked. No extra 3D toys.

## Phase 3 — Each pit a character (live in 1.3.61)

Classic, Lightning, Duo, High, and Fog each have a mark plate, a hall color, and an enter line. Guest tables stay doors.

## Phase 4 — Deep game feel (live in 1.3.62)

A take is a rite. Cash-out is leaving the vault. Fairness is a ledger of real pages only. No fake proof rows.

## Phase 5 — You live here (live in 1.3.64)

Network, notices, and create-room belong to the same house. The wing is Board, Company, Letters, Seat. No LinkedIn pills. No star clips on notices. No extra 3D.

## Phase 6 — The lintel (live in 1.3.65)

Header, search, age, talk compose, and fields are the doorframe. Sharp. Rite in the nav. Find a table or a seat. No extra 3D.

## Phase 7 — The seat (live in 1.3.66)

The gate, the sit CTAs, account cards, pit tabs, and the raise-a-table door are house furniture. Sharp rectangles. Cross with Google. Seat limits. No extra 3D.

## Hold — The house holds (1.3.67–1.3.68)

The wing no longer talks LinkedIn. Hall doors do not lift. Pit room rows are square. Raise a table is the name of that door. The hall shows doors first, then last takes and cash-outs. No extra 3D.

## Phase 8 — The hour (shipping in 1.3.69)

Classic hour and Fog cup change the hall and the pit. The door names the hour. The room golds or silvers when it is on. Last 15 minutes the door says soon. No extra 3D. No fake rows.

## Phase 9 — The quiet house (shipping in 1.3.70)

One world, not eleven layers. The backdrop is a single dark hall plate. The arena floor is a gold-inlay chamber. Every panel is the same slate material.

Cut: the rainbow prism, the diagonal shine sweep, the five pinned sparkle PNGs, two of four aurora blobs, the ambient star dust on every page, the flavor-text ticker, the pinned hero gem images, the animated wordmark.

Cut in 3D: the sixteen-node constellation web and its lines, one of three rings. Dust 260 → 90. Bloom 0.48 → 0.26. Lights roughly halved.

Kept: the 3D world, the pit, the crystal, the floating orbs, one clock needle, and the take burst — a take still throws sparks and coins.

## Phase 10 — The narrow house (shipping in 1.3.71)

The house has to be a place on a phone too. `cover` on a portrait viewport crops the wide hall plate down to its empty middle, so phones were reading the backdrop as flat black.

Taller-than-wide viewports now get a hall plate composed for that shape: columns down both edges, one tall window high up, dark where the content sits. Art direction by aspect ratio, not width.

Checked at 390px: the pit has no horizontal scroll, the clock and the 2×2 orb grid read, hue names sit under the orbs, the rite marks wrap 3+2.

## Phase 11 — An empty round is not a take (shipping in 1.3.72)

Watched a real round settle on Lightning. On a quiet table almost every round ends with nobody clicking, and the pit was announcing all of them as **THE TAKE · 0.00 USDT**, dimming all four orbs like losers and washing the pads gold. That is the state a new visitor sees most often, and it cheapened the real thing.

A round with no winner now reads **Round closed** with "Nobody clicked. The board comes back." The room goes neutral grey instead of take-gold, the orbs stay lit because nobody lost, and the gold pad wash only fires when a color actually took the pot. The particle burst was already correct — it only ever fired on a real winner.

Also: the pit had a horizontal scrollbar, because the rotating clock needle pokes a few px past its box. Clipped on `.pit-main` instead of clipping the needle.

## Verified signed in (1.3.72)

The signed-in rooms were unverified for several phases. Closed that with a local dev server and a minted session instead of guessing.

Recipe, for next time:

- `node_modules/next/dist/bin/next dev --port 3000` with `PRODUCT_MODE=0` so `cookieSecure()` is false and the cookie works over http.
- Sessions are a plain table: insert `token/userId/expiresAt/createdAt/userAgent`. Use raw SQL — the local db predates the BigInt widening, so the Prisma client rejects `createdAt` on write.
- Age lives in the `auth` JSON column as `ageConfirmedAt`; `balance` is integer cents.
- Drive it with PowerShell `Invoke-WebRequest` and a `huepot_session` cookie. **The IDE browser cannot reach the host's localhost on any port**, so screenshots of local pages are not possible. Only the live site can be photographed.

Results: `/account`, `/invest`, `/withdraw`, `/network`, `/network/messages`, `/network/people` and `/notifications` all render signed in. No stray rounded corners in those components — they inherit the slate material through `.app-page`, `.app-card`, `.li-card` and `.ledger-row`, which is why the Phase 9 pass reached them for free.

A real take, driven through the click API: pot 4.00, Crimson 3 clicks against Azure 1, `kind: "take"`, winner `crimson`, payout 3.95, seed opened on settle. The money is exact — losing pot 1.00, house 5% is 0.05, winner takes back 3.00 plus 0.95. So both settle branches are now proven: the winner path by data, the no-click path on the live site.

One false alarm worth remembering: `/network/people` returned a 500 once. It was Turbopack's `EBUSY` rename on the slow `F:` drive from two dev servers sharing `.next`, not an app fault. It returns 200 on retry.

## Phase 12 — The record (shipping in 1.3.73)

Goal: the wing should be where bettors go to see who actually wins, not a generic network. The atom of that is a real record on every seat.

Surveyed production first, because a ranking table built on nothing is a lie. What is actually there: 11 users, 30,496 settled rounds of which only **19 are takes**, 111 clicks, 0 withdrawals — and **one player has ever clicked**. So a leaderboard would be a one-row table. The record per seat is the honest version of the same data, and it reads correctly at one player or ten thousand.

A seat now shows takes, USDT taken, biggest single take, colors struck, and the hue it favours. Derived from real `Tx` rows. A seat with no rounds says so.

**Privacy line, do not cross:** wins and activity only. Takes are already public — the room feed announces them and every take has a shareable page — so this reveals nothing new. Balance, net position and losses stay private. Never add them to a public profile.

The hue a seat favours is counted from the click note (`Clicked <Hue> in <Room> #<n>`), so no schema change was needed.

## Phase 13 — Show the real takes (shipping in 1.3.74)

The house had 19 real payouts and **showed none of them**. Both public proof surfaces were broken the same way, and it was a windowing bug, not a data problem.

`listPublicTakes` scanned only the 24 most recent settled rounds. Rounds settle every 15–60s across six rooms and 30,477 of 30,496 are empty, so that window is *always* empties and `takeFromSettled` returned null for every one. The hall's "Last takes" strip could never display a take, forever. `/api/fairness` had the same flaw at 40 rows, so the ledger was a wall of empty rounds with the real takes buried thousands of rows deep.

`listSettledRounds` now accepts a `kind`, and both surfaces ask for takes. The ledger also states how many rounds settled in total, so filtering to takes hides nothing.

For a product trying to attract its second bettor this was the most damaging bug in it: real proof of payout existed and a visitor saw "no takes yet".

With the takes finally visible, a second bug showed up in 1.3.75: the ledger's amount column was `losingPot`, not what the winner collected. So the same round read **7.90 USDT** on the hall strip and **2.00 pot** in the ledger, and rounds where the losers barely clicked read **0.00 pot** — which looks broken on the one surface whose whole job is trust.

`settledTakeAmount` in `lib/fairness.ts` is now the single definition of a take amount — losing pot after the house take, plus the winners' own stakes back — and both the hall strip and the ledger use it. Keep it that way: two surfaces quoting different numbers for one round is worse than either number being imperfect.

## Phase 14 — The brag (shipping in 1.3.77)

The take page is the only public artifact a player can share, so it is how the second bettor arrives. Its share image was a default `next/og` card: system sans, flat background, and **no trace of the winning color** — in a game entirely about color.

Now the hue is the hero. The winning color drives a left edge bar, a marker, the headline and a background glow, with the amount huge in Cinzel and `huepot.net` in the corner so a stranger knows where to go.

Notes worth keeping:

- Cinzel had to be **bundled** at `public/fonts/cinzel-700.ttf`. `next/font` cannot be read at runtime and `next/og` needs the raw file. It is OFL licensed; recorded in `public/fx/SOURCES.txt`.
- Supply every font a card needs. Satori falls back to whatever you give it, so providing only Cinzel put the body copy in serif caps too. The fix was to drop the long body copy rather than bundle a second face — a brag card wants few words.
- **Do not put a photograph in an OG image.** Embedding the chamber plate pushed the PNG from 43kB to **755kB**; `ImageResponse` only emits PNG, which is wrong for photos. Gradients plus a hue glow land at ~80kB and look better.
- The take page title was a whole sentence including the Fog cup schedule. Shortened to `<Hue> took <amount> USDT · <Room>`, and the body no longer repeats its own headline.

Verified locally against two real takes before shipping — Crimson 3.95 and Amber 67.15 — which also re-confirms `settledTakeAmount` by hand: (100−5)/100 + 3 = 3.95, and (3700−185)/100 + 32 = 67.15.

## Phase 15 — Provable, not just claimed (shipping in 1.3.78)

Both the ledger and the share card end in "Open the ledger", so `/fairness/[id]` is the last link in the trust chain. It verified correctly — all three checks passed on the real production take — but it printed the commit and digest **truncated** (`c11c2d28…f9ac`). A hash you cannot see in full is a hash you cannot recompute, so "provably fair" was a claim rather than a proof.

The page now prints the seed, the full commit, the **exact settle line that gets hashed**, and the full digest. Anyone can paste the line into any sha256 tool and land on the digest.

`fairPreimage` is now the single place that settle line is built, and `fairDigest` hashes its output. The displayed string cannot drift from the hashed string, because they are the same function.

Checked independently against every real take before shipping: **19/19 commits and 19/19 digests reproduce** from a standalone script using node's `crypto`, outside the app's own code.

### The trap in `payoutPerWinningClick`

Adding a per-click line nearly shipped a false impression. That field is a **floor** (`clickPrice + floor(distributable / winningClicks)`), and the digest commits to it — but the actual payout distributes the leftover cents via `splitCentsByClicks`. For round #8584 the floor is 1.31 with 6 winning clicks, so a reader multiplying gets 7.86 against an advertised 7.90 and concludes the house is shaving 4 cents.

It is labelled "Floor per winning click" with a note that leftover cents go to winning seats. On a trust page, a number that invites a wrong subtraction is worse than no number.

## Phase 16 — Found and shareable (shipping in 1.3.79)

Phase 14 gave a take a share card, but the most-shared URL is the bare domain, and **`huepot.net` had no share image at all** — posting it in a chat produced a naked link. There was also no `robots.txt` and no `sitemap.xml`, both 404.

Shipped:

- A house share card at the root: gold rule, Cinzel, the four hue coins, `huepot.net`. Gradients only again, ~88kB.
- `robots.ts` allowing the public house and **disallowing `/api/`, `/staff`, `/account`, `/invest`, `/withdraw`, `/notifications`, `/network`** — a player's vault and wing are nobody else's business.
- `sitemap.ts` with the hall, rite, ledger, gate, terms, privacy, the five house pits, and every real take with its ledger page. Guest tables are left out because they fall when their live time ends.
- The root title was "Huepot — the house", which is the voice but tells a stranger nothing. Now "Huepot — same price, biggest color takes", with a `%s · Huepot` template so child pages keep their own title and gain the brand.

Verified locally before shipping: robots.txt renders the rules, sitemap.xml lists 17 URLs against the local database, and the house card renders at 1200x630. The first render wrapped its footer line into the domain, so that copy got trimmed.

## Phase 17 — HUE, the house coin (shipping in 1.3.80)

A coin was asked for. This is the off-chain half, and it was built first on purpose.

**The rule:** `1 HUE a click, 10 HUE a take.` Ranks in house voice — Unmarked, Seated, Marked, Gilded, Gold-handed, House name. A seat shows its HUE, its rank, and how far to the next one.

**It is derived, never stored.** HUE is computed from `Tx` rows inside the existing record query, so it costs no extra queries, applies retroactively to everything already played, cannot drift from what a seat actually did, and cannot be minted by accident. No schema change was needed.

### The line HUE must not cross

HUE is **standing, not money**. No USDT rate, not withdrawable, and it buys nothing priced in USDT. Attaching a cash value, a payout or a rake share changes what it legally *is* — a token drawing value from a gambling house's revenue is treated as a security in many jurisdictions, and gambling plus token issuance is heavily regulated on top of that. That is a decision for the owner with advice, not a code change. It is written at the top of `src/lib/coin.ts` for whoever reads it next.

### Why off-chain first

- Reversible. No contract, no gas, no liquidity, no audit.
- **Zero withdrawals have ever completed.** The USDT cash-out path is still unproven, and a second currency on top of an unproven payout is a roof on an unbuilt wall.
- It establishes the earn curve with real play, so an on-chain HUE later has something behind it rather than a guess.

Verified before shipping: 7/7 rule checks including the real production case — 111 clicks and 19 takes give 301 HUE, Gilded, 99 to Gold-handed.

## Phase 18 — HUE on chain (contract done, not deployed)

Real BEP-20 requested, distributed as a play bonus, with a market price. `contracts/HuepotCoin.sol`, 12 tests passing on a local EVM. **Nothing is deployed** — that needs a treasury key and is the owner's call.

**Fixed supply, no mint, no owner, no pause, no blacklist, no upgrade.** 1,467 bytes of runtime. A coin a house hands out is only worth holding if the house cannot print more of it or freeze it, so every admin hook was left out. Bonuses are paid by **transferring from a treasury balance**, never by minting — the pool is visibly finite on chain and supply is conserved on every payout.

Deploy guards: mainnet refuses without `COIN_CONFIRM_MAINNET=yes`, and the **destination is checked before the key**, so a misdirected mainnet run fails on the destination rather than on a missing signer. Both guards verified independently.

Lesson worth keeping: I installed a standalone `solc` alongside Hardhat, it drifted to 0.8.26 against the contract's pinned `0.8.24`, and the compile broke while Hardhat's own run passed. Two compilers that can disagree is a footgun. `solc` was removed — Hardhat is the only compiler, with the version pinned in config so the bytecode stays reproducible for BscScan verification.

### Still to do before HUE is real

1. Deploy to **testnet** (chainId 97) with a faucet-funded key.
2. Wire the bonus: `record.coin` is earned standing; paying it out on chain needs a claim table so nothing is double-sent — the existing `Withdrawal` queue is the right shape to copy.
3. Treasury key must stay **off the web server**. Payouts should be signed by a separate limited hot wallet topped up from treasury.
4. A price requires funding a HUE/USDT liquidity pool. Code cannot create one.
5. Legal advice before mainnet. See `contracts/README.md`.

## Phase 19 — Level, daily and weekly tasks, bonus (shipping in 1.3.81)

**Daily:** sit a round (1 click, +5), strike ten (10 clicks, +15), take a pot (1 take, +25). Resets 00:00 UTC.
**Weekly:** fifty strikes (+60), three takes (+100). Resets Monday.
**Level** is the HUE rank's position, so there is one progression and not two competing ones.

### Why there is no claim button

Progress and completion are **derived from `Tx` rows** — a task is complete because the play happened. Nothing is stored and nothing is claimed, so a bonus cannot be double-claimed, cannot be granted by mistake, and applies retroactively to every day already played. No schema change touched the live money database.

The subtle part: the bonus is summed over **every past day and week that met a target**, not just the current window. Had it only counted the active window, a player's HUE would drop every midnight. Coin has to be monotonic, and there is a check for exactly that.

Real production result: `bill` played 4 days across 1 week — 111 clicks, 19 takes, 325 bonus → **626 HUE, Level 5 Gold-handed**, up from 301 on play alone.

Verified: 20/20 logic checks, including Monday week alignment against four real Mondays from 1970 to 2026 (`weekIndex = floor((dayIndex + 3) / 7)`, since epoch day 0 is a Thursday), plus the bucketing SQL run against production.

## Phase 20 — The books (shipping in 1.3.82)

Accountant and management, as a `books` tab on the existing staff console. Read-only, derived from `Tx`, `Withdrawal`, `User.balance` and the on-chain treasury. Nothing in `lib/books.ts` writes. The staff console was **not restyled** — the new tab uses the chrome that was already there.

Two headline numbers, because they are the only two that can sink the house:

1. **Cover** — treasury USDT minus what is owed to players. Negative means the house cannot pay everyone out.
2. **Reconciliation** — every balance rebuilt from its rows and compared to the stored balance. Money leaving a balance without a `Tx` row is the one fault that hides all the others, so it is recomputed every time the books are opened.

Plus today/this-week operating counts (clicks, takes, rake, deposits, active seats), all-time money lines, account counts, and withdrawal status totals.

### It found something on the first run

The ledger is internally perfect: 111.00 staked = 109.30 paid + 1.70 rake, to the cent.

But **balances are 10.00 USDT short of the ledger**. Localised to one account: `bill` holds 8.30 while his rows imply 18.30. Zero orphan rows, and the house account reconciles exactly. So 10.00 left a balance without a matching `Tx` row — most likely a direct balance write during an early migration or dev reset, since a staff adjustment would have written an `adjust` row and there are none.

The direction is safe for the house (it owes less than the ledger says, not more) but the player is short, and an unexplained gap on a real-money ledger should not stay unexplained. It is now visible on the books tab instead of invisible.

## Phase 21 — The cash-out path, exercised (1.3.83)

Zero withdrawals had ever completed, so the payout path was the largest untested risk in the product. Everything up to the on-chain send is now exercised against a local server. **It works.**

| Case | Result |
|---|---|
| 1 USDT (min is 5) | rejected, no debit |
| malformed address | rejected, no debit |
| more than balance | rejected, no debit |
| non-BSC network | rejected, no debit |
| balance after 4 rejections | unchanged — no partial debits |
| 25 USDT valid | debited exactly, row `queued` |
| staff rejection | **balance refunded exactly** |
| 2500 (per-send max 2000) | rejected |
| 2000 + 2000, then 2000 | third rejected at the 5000 daily cap |
| 1000 to land on exactly 5000 | accepted, then even 5 more rejected |

`withStore` snapshots and restores on throw, so a failed payout insert rolls the debit back rather than losing a player's money.

### What I got wrong, twice

**My safety override did not take effect.** I blanked `WITHDRAW_KEY` and `BSC_RPC_URL` in the shell to guarantee no chain contact, but `.env.local` values were used anyway, so a real BSC mainnet RPC connection was attempted with the live house key. **Nothing was broadcast** — `txHash` stayed empty, and production's `Withdrawal` table is still empty. Next time, assert `withdrawSendEnabled() === false` before touching a money path instead of assuming an env override worked.

**I misdiagnosed a wedge.** A row sitting at `sending` with no `txHash` looked like a permanent trap, because rejection requires `queued`. It is not: `sendQueuedWithdrawal` already has a `catch` that reverts `sending` → `queued` whenever no hash exists. What I saw was an in-flight attempt hanging on an unreachable RPC.

### Fixed

The withdrawal note now moves with terminal status — `Sent on chain` / `Rejected by staff · balance refunded` — so the books never show a rejected row still reading "Queued for send". Deliberately **not** applied to `sending`, because that state gets reverted and the note would then lie.

### Left alone on purpose

Staff cannot reject a payout while it is `sending`. That looks awkward but it is right: once `tx.send` may have broadcast, refunding could pay twice. Do not "fix" it.

Still untested: the actual on-chain transfer. It needs a funded house wallet.

## Phase 22 — The Fog Pit holds (verified, no change needed)

A betting game that only *visually* hides information is not hiding it — anyone with devtools reads the network response and plays with an edge worth real money. So the Fog Pit was checked properly, with actual clicks in an actual fog window.

Measured during fog with 3 clicks in the pot:

| View | Per-colour counts | Other seats | Own clicks |
|---|---|---|---|
| Anonymous observer | `0 0 0` | `0` | — |
| The player | `0 0 0` | hidden | `c=2 a=1` |

Correct on every axis. `publicRound` zeroes per-colour totals server-side (`totals: fog ? emptyColorCounts() : ...`), `toSeats` hides other seats via `hide = fog && !you`, and `yourClicks` still reports your own so the game stays playable. `totalClicks` and `pot` stay visible on purpose: you know the size of the stake, never the split.

The SSE route matters here too and is safe — `/api/rooms/[slug]/live` serialises through the same `getRoomState` / `snapshotRoomState`, so the stream cannot leak what the poll hides.

**Do not "optimise" this.** Sending real totals and hiding them in the client would silently turn the Fog Pit into a cheat.

## Phase 23 — The deposit path, and what it turned up (1.3.84)

Withdrawals were exercised in 1.3.83; deposits are the other money direction, and the question that matters is whether one on-chain transfer can be credited twice.

**The live guards work.** Verified locally: `UNIQUE(txHash, logIndex)` on `ChainDeposit` rejects a replay outright, and both `depositAlreadyCredited` and `creditConfirmedDeposit` key on the tx hash, which real chain credits do write into the note. Also confirmed `persistStore` only ever **inserts** `Tx` rows and never deletes, so the database keeps full history — which matters, because the reliable guard queries the database while the in-memory array caps at 400.

### It had already happened once

Production holds **two deposit rows with the identical tx hash** and only **one** `ChainDeposit` row. One 10.00 USDT transfer, counted twice in the ledger.

The arithmetic closes exactly:

```
2 deposits (ledger): 20.00 − 111.00 + 109.30 = 18.30
1 deposit  (chain) : 10.00 − 111.00 + 109.30 =  8.30
bill's real balance                          =  8.30
```

### Correcting Phase 20

Phase 20 reported this drift as "the player is short". **That was wrong.** The balance is right to the cent; the *ledger* carries a phantom deposit row. Nobody is owed money — the deposit total is overstated by 10.00.

Most likely a legacy-import artifact: `persistStore` inserts `Tx` by id, so one logical deposit re-imported under a second uuid produces two rows without a second balance credit. That also fits the balance being correct. *(Phase 24 disproved this — the two rows are 283 ms apart. It was a race in the credit path.)*

The books now detect this class permanently: deposit rows grouped by note, any hash appearing more than once reported with the overstated amount. The duplicate row is **not** deleted — that is a money-ledger write and the owner's call.

### Known gap, acceptable

The demo credit path in `auth.ts` writes a note with no tx hash, so demo deposits are not idempotent. It only runs when `demoMoneyEnabled()`, which is false in production.

## Phase 24 — Two clicks at once, and the deposit race (1.3.85)

Money paths were pushed instead of read this time.

### Can a player spend money they do not have

Funded a seat with exactly 5.00 USDT, one click costing 1.00, then fired **30 clicks in the same instant** at a live round:

```
accepted            5
rejected           25   all "Not enough balance. Invest first."
balance after    0.00
clicks on board     5
```

No overspend, never negative, board matches the accepted count. `withStore` runs every mutation through one promise queue, so the queue *is* the lock. Verified against a production build, not dev, so no compile-on-demand could serialise the burst by accident.

### Does a tie cost anything

One click on each of the four colours, so nothing loses:

```
staked            4.00
settled as       push
rake                 0
balance after   15.00  (15.00 before)
ledger        one refund row, 4.00, "Classic Pit round #5941 push"
```

Exact to the cent, no rake, and the money moves with a row behind it.

### Is there really only one writer

All of the above rests on a single process owning the store. Production runs `instances: 1, exec_mode: fork` and one `next-server` holds `huepot.db`. A second `next-server` on the box for three days is **a different app** — Docker container, `/app`, its own Postgres, port 3001. Not ours.

### What the deposit duplicate actually was

Phase 23 guessed a legacy-import artifact. **Wrong.** The two rows are 283 ms apart:

```
14:32:42.263Z  10.00  0x223d5b…
14:32:42.546Z  10.00  0x223d5b…
```

Both well inside the newest-400 window, so no memory blindness — a race in `creditLog`. Two attempts on one log: the first won the `ChainDeposit` insert and credited; the second lost the insert, asked the Tx table whether a credit existed, found none *because the first had not persisted yet*, and credited too.

Two holes, both closed:

- **Crediting on a failed insert.** One recorded log now means one credit. A failed insert only proceeds when the row is older than ten minutes with still no credit — a real loss, not one in flight.
- **A memory-only guard.** `creditConfirmedDeposit` checked `store.txs`, which holds 400 rows and is trimmed on the line below the check. It now falls back to the Tx table, the same pattern `hadClickTx` already uses. Harmless at 143 rows; a live double-credit past 400.

### The phantom row is gone (1.3.86)

Removed on the owner's call, with the app stopped so the in-memory store could not write it back, and the database copied first:

```
player            bill
balance before    8.30
deposit rows      2  (10.00 each)
on-chain transfers 1
dropping          fdb92ebc-da01-467e-9a4e-6945d8165b3c
deposit rows now  1
balance after     8.30
```

The balance never moved, which is the whole point — the row was the lie, not the money.

### Which uncovered a false alarm in the books

With the duplicate gone, `drift` still read 3.40. It reconciles per account like this:

```
account   balance   from rows     gap   rows
bill         8.30        8.30    0.00    131
house        1.70       -1.70    3.40     11
```

bill — the only real player — is exact to the cent: 10.00 deposited plus 109.30 taken minus 111.00 clicked is 8.30. The whole gap sat on the house, and the doubling gives it away: 1.70 of rake counted as −1.70.

`implied` treated `rake` as money leaving. A rake row is only ever written on the house account, where it is the take arriving. Fixed, and `drift` now reads 0.00 — which matters, because a reconciliation that always shows a number is a reconciliation nobody reads.

## Phase 25 — The house under a crowd (1.3.87)

The queue that keeps money safe is also the only lane every request drives in. Nobody had timed it.

### What it cost, measured on the live box

```
no store at all                p50    6 ms
withStore, tiny payload        p50  134 ms
withStore, room state          p50  133 ms
withStore via the read path    p50   29 ms
```

The payload is irrelevant — `/api/auth/me` returns one object and still took 134 ms. The cost was the machinery: `withStore` deep-clones the whole store, then `persistStore` opens by serialising it **twice** to decide whether anything changed.

Twenty clients polling at once, as a crowd would:

```
slowest client   2700 ms
all served in    2806 ms
ceiling            ~7 req/s
```

Seven requests a second, with eleven accounts on the books. That is the wall, and it was already here.

### What was actually in memory

`postRoomEvent` trims a room to 120 events, but only when that room posts. A room that goes quiet carries its whole history for the life of the process:

```
classic 5171 · lightning 2784 · duo 2308 · high 1874 · crazy 1870 · fog 232
```

14,239 events, about 1.6 MB of text, cloned and serialised on every single request. The local copy had 43,722.

### The fix

A room now loads only its newest `ROOM_EVENT_CAP` events — the same cap the writer already enforces, named once so the two cannot drift — and the query takes only that many per room, so boot does not slow down as the table grows. Measured on the local copy, 43,722 events:

```
                before    after
p50            182.5 ms   6.0 ms
p95            229.4 ms   8.8 ms
20 at once     3498 ms   118 ms
ceiling           5 r/s   169 r/s
```

Thirty times the headroom, and it no longer degrades as history accumulates.

Nothing was deleted: all 43,722 rows are still in the database, `persistStore` only ever inserts events, and clients still receive the same 80-line feed.

### Still true, and worth knowing

Every request — reads included — takes the same lane, because `getRoomState` ticks the round and may settle it. The store is a single process by design, which is what makes the queue a lock at all. That ceiling is now ~169 req/s per box instead of 5, but it is still a single lane, and the next wall is the same one.

## Phase 26 — What else the store was carrying (1.3.88)

Phase 25 fixed room events. The same shape existed three more times, and one of them was showing players the wrong thing.

### The inbox was serving the oldest notices

`notify` prepends and keeps the newest 500. `readStore` read **every** notice, oldest first. `userNotices` filters without sorting, and the route takes the first 40 — so after every restart a player's inbox showed their forty *oldest* notices until enough new ones arrived to push them out.

Two changes, because one of them should not have needed the other:

- Notices load newest first, capped at `NOTICE_CAP`, matching the writer.
- `userNotices` sorts. Callers treat the head of that list as "the latest", so the order is now guaranteed rather than inherited from how the array happened to be built.

### Logins were never cleared

Every sign-in writes a `Session` row and nothing ever removed one. Expired rows were read at boot and cloned on every write forever. An expired session cannot sign anyone in, which is what makes clearing it safe: expired sessions and OAuth states are dropped once at boot, and expired rows are skipped when loading.

Verified against a seeded pair:

```
valid session still signs in : yes
expired session rows left    : 0  (seeded 1)
valid session rows left      : 1  (seeded 1)
inbox order as served        : newest first
```

### Where the store now stands

Everything the store holds is bounded except the things that should grow with the house — accounts, their wallets, and the rooms themselves:

```
users, wallets, rooms, seats   grow with the house, as they should
sessions, oauth states         live rows only
notices                        newest NOTICE_CAP
room events                    newest ROOM_EVENT_CAP per room
txs                            newest 800
rounds                         one per room
```

No table is pruned of history it should keep: notices and events stay in the database, and only unusable login rows are deleted.

## Phase 27 — A limit you cannot undo in the moment (1.3.89)

The play limits had never been exercised. Most of them hold: a cool-off stops play *and* deposits, neither cool-off nor self-exclusion can be shortened, and `assertCanCash` deliberately still lets a self-excluded player withdraw — they should always be able to take their money out. Two things did not hold.

### The cap could be undone the instant it bit

```
cap set to 2.00
  click 1 : accepted
  click 2 : accepted
  click 3 : refused — "Daily loss cap is 2.00. Take a break or raise it tomorrow."
raising the cap, right then:
  accepted, cap is now 50.00
  click straight after : ACCEPTED
```

The message said tomorrow. The code said now. A player chasing a loss could lift their own limit in one request, at the exact moment it existed to stop them.

Tightening is what a player needs in the moment; loosening is what they need protecting from. So a stricter cap takes hold at once, and a looser one — including removing it — waits a day, with the pending change shown on the seat so nobody is guessing:

```
1. set a cap where there was none    cap 2.00, nothing pending
2. click until it bites              refused at the cap
3. raise it the moment it bites      cap still 2.00, 50.00 queued in 24.0h
   click straight after              still refused
4. remove the cap entirely           cap still 2.00, 0 queued in 24.0h
   click straight after              still refused
5. tighten to 1.00 instead           holds at once, the queued change dropped
```

The message now says what the code does.

### A daily cap that was not daily

`notePlayTx` kept one running total per player and only ever added to it. Nothing rolled off, so a day's loss stayed counted until the process restarted — a cap that quietly became permanent, and one that only looked right because deploys restart the process often.

Loss is now kept in hourly buckets, summed over the window and walked in order so it holds at zero: a player who is ahead cannot bank the winnings as extra room to lose, but coming back from a win still counts. Verified on a clean window:

```
click 1: accepted   loss 1.00
click 2: accepted   loss 2.00
click 3: REFUSED    loss 2.00
```

### What cost the most time here

Two test runs looked like failures and were not. Payouts kept landing in the window from rounds whose clicks I had cleared, so the day's net loss legitimately read zero and the cap correctly declined to bite. The measurement was wrong, not the house. Worth remembering: with one player in a pit, that player wins nearly every round back and only ever loses the rake, so a loss cap takes a long time to bite.

Also worth knowing: `jsonError` masks anything matching `prisma|sqlite`, so a database fault surfaces as a bare "Request failed". That is right for players and slow for whoever is debugging.

## Phase 28 — The address a caller chose for itself (1.3.90)

Went looking for what a stranger can see and do. Most of it holds:

- The session cookie is `httpOnly`, `sameSite: lax`, `secure` in production, and `signout` deletes the session server-side rather than only clearing the cookie.
- A public profile carries username, headline, location, presence, friend count and the betting record. No balance, no email, no wallet, no transaction notes.
- Staff is a separate world: its own `sameSite: strict` cookie, sessions in the database, four hour expiry, a secret compared in constant time, and a player session grants none of it.

Then the client IP turned out to be whatever the caller said it was.

### What the two sides were doing

nginx, for huepot.net:

```
proxy_set_header X-Real-IP $remote_addr;                      # the true address
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;  # appends what arrived
```

The app, compiled:

```js
let b = a.get("x-forwarded-for") ?? "";
return (b.split(",")[0]?.trim() || a.get("x-real-ip")?.trim() || "") ... || "unknown"
```

`$proxy_add_x_forwarded_for` appends the real address to whatever the caller sent, and the app read the **first** entry — the caller's. It preferred the one header a caller controls over the one it cannot.

Proven against a live gate allowing `198.51.100.4` only, from `203.0.113.7`:

```
claiming 1.1.1.1 (not allowed)   BLOCKED     <- the gate is real and reading the claim
claiming 198.51.100.4            through     <- walked past it
claiming 127.0.0.1               through     <- and this works against any list
```

`127.0.0.1` is allowed unconditionally so the owner can reach staff over a tunnel, which made it a skeleton key for every allowlist.

### What it reached

That one value gated four things: the staff IP allowlist, staff session pinning, the chain-scan trigger, and the staff page. It also keyed the login limiter and was written into the staff audit log — an attacker-chosen address in the record of who did what.

### The fix

Prefer `X-Real-IP`, which the proxy overwrites and a caller cannot set. Fall back to the **last** `X-Forwarded-For` entry, the hop the proxy added, rather than the first. After:

```
honest request from 198.51.100.4   through
claiming 198.51.100.4              BLOCKED
claiming 127.0.0.1                 BLOCKED
```

And the limiter now counts the caller, not the claim:

```
attempt 8 claiming 10.0.0.8: 403 Wrong staff secret
attempt 9 claiming 10.0.0.9: 429 Too many failed staff sign-ins
```

Twelve rotating claims used to be twelve separate counts.

### Staff is now loopback only

`STAFF_IPS=127.0.0.1` in production, chosen over pinning a public address because there is no address to keep current and nothing to lock the owner out of when an ISP changes it. The list being non-empty is what turns the gate on; loopback is what stays allowed.

From outside, every shape of the old bypass is refused before a secret is even asked for:

```
no spoof headers                       403 Staff is closed from this network
X-Forwarded-For: 127.0.0.1             403 Staff is closed from this network
X-Forwarded-For: 127.0.0.1, 8.8.8.8    403 Staff is closed from this network
X-Real-IP: 127.0.0.1                   403 Staff is closed from this network
```

The last one is refused because nginx overwrites `X-Real-IP` with the address it is talking to, which is the whole reason it can be trusted.

**The way in**, since the door is now shut from the internet — `next start` binds to `127.0.0.1:3000`, so the tunnel lands where the app is listening:

```
ssh -i ~/.ssh/huepot_we4u -L 3000:127.0.0.1:3000 root@159.223.173.219
# then open http://localhost:3000/staff
```

Verified before trusting it: the tunnel route reaches the staff sign-in while the public route does not. The previous `.env.local` is kept at `/root/env.local.before-staffips`, and the rollback runs automatically if the tunnel route ever fails that check.

### Note to whoever tests this next

Three runs of this said "no gap" and were wrong: a stale `next start` from an earlier phase still held port 3000 and answered every request. Kill the old server and confirm the port is free before trusting a security result. Also `staffIpAllowed` returns true when `STAFF_IPS` is empty, so an unconfigured gate looks identical to a passed one.

## Phase 29 — What a player can type (verified, no change needed)

The house writes raw SQL in a lot of places, and player text reaches some of it. Nothing broke, and this is the reasoning and the evidence, because "we looked and it was fine" is worth nothing without both.

### Why the raw SQL holds

Every escape helper is `value.replace(/'/g, "''")`, which is the correct escape for a single-quoted SQLite literal — SQLite has no backslash escapes to work around. Player text either goes through that inside quotes, or is bound as a `?` parameter, or reaches Prisma's tagged templates, which bind rather than interpolate.

The interpolations that sit **outside** quotes were the ones worth reading, since an escape does nothing there. All of them are server constants or clamped numbers:

```
fairness   LIMIT ${limit}          Math.max(1, Math.min(80, take)), take is a literal 40
staff log  LIMIT ${take}           Math.max(1, Math.min(120, ...))
sweeps     LIMIT ${...}            Math.max(1, Math.min(40, take))
record     SELECT ${hueSums}       built from the fixed COLORS list, userId bound as ?
store      day/window arithmetic   module constants
```

### What was actually thrown at it

Ten payloads — quote break-outs, `'; DROP TABLE Tx; --`, `' UNION SELECT balance FROM User --`, script and `onerror` tags, a backslash quote, template braces, a null byte — at the public fairness slug, search, profile fields, room chat, and network posts.

Everything came back as text, exactly as sent:

```
chat    '; DROP TABLE Tx; --                stored: "'; DROP TABLE Tx; --"
chat    <script>alert(1)</script>           stored: "<script>alert(1)</script>"
post    ' UNION SELECT balance FROM User -- stored: "' UNION SELECT balance FROM User --"
profile ' OR 1=1 --                         stored: "' OR 1=1 --"
```

Every table still present afterwards, account count unchanged, and row counts moved only by the writes the test itself made.

### Why script tags in the database are not a problem here

There is no `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `insertAdjacentHTML` or `document.write` anywhere in the source. Player text therefore reaches the page only as a React text node, which escapes by construction. Storing `<script>` is harmless when nothing can ever parse it as markup — and that property is worth keeping deliberately, because it is one `dangerouslySetInnerHTML` away from being untrue.

### Anti-spam holds

```
first message      200
straight after     400  Wait a moment before sending again
after 1.1s         200
5000 characters    400  Keep chat under 240 characters
```

### Not covered, and worth saying so

- **Direct messages.** The only other local account is the house, which is excluded from player lookups, so the send path was never exercised. It shares `sendMessage` and the same bound queries as posts.
- **Host mute and slow mode.** These need a custom room and a second real player; sign-in is Google only, so a second account cannot be conjured locally.
- **XSS end to end in a browser.** Established structurally, from the absence of every raw-HTML sink, rather than by watching a payload fail to fire.

### One thing left as an observation

`parseChat` blanks `http://`, `https://` and `www.` links. A bare `bit.ly/x` or `huepot.net.evil.com` passes through. Tightening that trades false positives against scam links, which is a product call rather than a defect, so it stands as written.

## Phase 30 — The brag gets a name (1.3.91)

A take page said **"Azure took 7.90 USDT"**. A colour cannot brag. For a house built for people who bet, the shareable moment is who won, and the page was the one surface that left the player out.

This was deferred twice as needing a schema change and a backfill on a live money database. It needed neither.

### The ledger already knew

Every payout is written with the room, the round and the winning colours:

```
Classic Pit round #8584 Azure take
```

A take already carries the room name and those exact colour names, built by the same `join(" & ")`. Add the round number and the note can be matched **whole** — an equality, not a `LIKE`, so no wildcard can be smuggled through a room name. Same trick as the record: derived, retroactive over every round ever settled, nothing stored.

### What it reads like now

```
headline  devguru13580 took the pot
pot       2.95 USDT
under     on Crimson · round #5955
title     devguru13580 took 2.95 USDT · Classic Pit
```

The name links to that player's record, which closes the loop the record opened in Phase 12: a take points at a player, and the player's seat shows what else they have taken. The share card leads with the name in the winning colour and keeps the colour underneath as how it was won.

The arithmetic checks out on the test round: two clicks on crimson, one on azure. Crimson takes, so 2.00 of stake comes back plus azure's 1.00 less the 5% rake — 2.95.

### Where it falls back, on purpose

A name is shown only when the payout rows still name one. Ten local rounds had lost their payout rows to earlier limits testing, and each fell back to the old colour headline rather than showing an empty one. That matters on live data, where a renamed room or a removed account would break the match — the page degrades to what it said before instead of breaking.

Ties on the winning colour list every winner with their share, since a split take has more than one person to name.

### What was not touched

Nothing about who is shown that was not already public: usernames appear in chat, on seats, in the lobby and on public profiles. The house is filtered out of winners — its cut is a `rake` row, not a `payout`, so it never appeared anyway.

## Phase 31 — Somewhere to put a file (1.3.92)

Avatars, pictures in chat and news thumbnails all wait on the same missing thing: the house had nowhere to put a file. Nothing in the app had ever accepted an upload.

It is a bucket rather than the droplet disk on purpose. The SQLite file and every backup already share that disk, and player content has to outlive a rebuild.

### Signed by hand, and checked against AWS

DigitalOcean Spaces speaks S3, so requests are signed with Signature Version 4. That is written here rather than pulled from a vendor SDK — the whole app runs on four dependencies, and signing is a hash chain that can be checked against AWS's own worked example instead of trusted:

```
canonical request is byte-identical to the one AWS prints   ok
canonical request hashes to the value AWS publishes         ok
string to sign carries the right scope                      ok
signature matches the value AWS publishes                   ok
```

The pure chain lives in `sigv4.ts` with no app imports, which is what makes it runnable on its own.

That check earned its keep immediately: it failed the first time, and the structural steps passing while only the final HMAC differed pointed straight at the input rather than the code. AWS redacts the secret in that example, and the value that reproduces their signature is the slash variant of the standard example key, not the plus one. One character of test data, no bug.

### What the route refuses, and in which order

```
no session                              401  Sign in to continue
no file, or the wrong field name         400  Attach an image to upload
a PHP script claiming image/png          415  not a JPEG, PNG or WebP
an SVG                                  415  not a JPEG, PNG or WebP
5 MB against a 4 MB cap                 413  keep the image under 4 MB
a real PNG, JPEG or WebP                     reaches the upload step
```

Type is decided by the first bytes, never the `content-type` header, because a header is a claim the caller makes. SVG is refused outright: a browser executes it, so an avatar could carry script.

The order matters and the first pass had it wrong. The "storage is not switched on" check sat at the top, so every single refusal returned 503 and the test could not tell a rejected SVG from a missing bucket — nine checks passed and verified nothing. Validation now runs first, and 503 is reachable only by a request that was otherwise fine.

### Two things kept away from the money path

- **The store queue is not held while bytes move.** Auth reads through `withStoreRead`, then the upload happens outside it. A 4 MB body must not sit in the one lane every round settlement shares.
- **Keys are content addressed.** The same picture twice is one object, and a key cannot be guessed from an account id.

Twelve uploads per account per ten minutes, counted in memory.

### Not switched on yet

`storageConfigured()` is false until `SPACES_KEY`, `SPACES_SECRET`, `SPACES_BUCKET` and `SPACES_REGION` are set, and the route answers 503 until then. Nothing about the signing can be proven against a live bucket without credentials, which is the one part of this phase that is argued rather than measured — though a 403 from Spaces would now mean credentials, not signing.

## Phase 32 — A face on the seat (1.3.93)

Every avatar in the house was two letters in a circle. A feed of initials reads like a spreadsheet.

### One field, three shapes

A face is a single string on the player, and it is deliberately not a table:

```
""              initials, the default
"hue:azure"     initials on a house colour
"https://…"     a picture, and only from our own bucket
```

The colour option matters as much as the upload. Nobody should be made to find a photograph to stop looking anonymous, and it costs no storage, no moderation and no bandwidth.

Stored in the same `auth` JSON as headline, about and location, so there is no migration — eight touch points in `store.ts`, mirroring `location` exactly. Verified the boring way: set a colour, restart the process, read it back.

### Where a face may come from

An avatar URL is checked against the bucket's own origin, not matched loosely:

```
our bucket over https                          accepted
another bucket in the same region              refused
huepot-test.fra1.digitaloceanspaces.com.evil.com  refused
a foreign host                                 refused
our host over plain http                       refused
a colour that is not a house colour            refused
data: and javascript: URLs                     refused
```

The lookalike host is the one that matters: `startsWith` or `includes` would have waved it through. Comparing `URL.origin` is what makes it a real check. A foreign URL is refused rather than stored because it would be a tracking pixel on every page that face appears on, and a broken face the day that host disappears.

Those refusals were tested twice. The first run passed while proving nothing — with no bucket configured, every URL failed early on "uploads are not switched on" and the origin rule never ran. The second run set dummy Spaces values, which is enough because validation only reads config to compute an origin and never contacts a bucket. Same masking trap as Phase 31, caught by the same habit of reading *why* a check passed.

### The picker, and the parts kept apart

Editing a profile now offers initials, the eight house colours, and Upload. A picked file uploads immediately but Save is still the only thing that commits, so a mis-click is not a new face.

`hues.ts` holds the colour list on its own because `avatar.ts` reaches into storage config, and that has no business in a browser bundle. One list, shared by the picker and the validator, with the hex read from `colors.ts` rather than copied into CSS — three of the eight were wrong when I did copy them.

Nine call sites now share one `Avatar` component: profile, feed sidebar, composer, people lists, posts, message threads and the dock.

### Finished on the seat and the take page (1.3.94)

Both were left with a name and no face. Both are now wired, and `Avatar` moved to its own module with no `"use client"` to get there — a server-rendered take page should not pull a client bundle in to draw a circle. It has no hooks, so nothing was lost, and the nine existing importers now point at the definition rather than at the chrome that happened to hold it.

Verified by playing a round rather than by reading the code:

```
the seat is on the board                     ok
the seat carries the face   hue:volt         ok
the take page still names the winner         ok
the take page shows the winner's face        ok
```

A face only appears on a take page for a single winner. A split take lists several names with their shares, and a row of circles there would crowd out the number that matters.

### Still not proven

No real picture has been through any of this. The upload route answers 503 until Spaces credentials exist, so what is established is the colour path end to end, the URL rules, and the rendering. A photograph on a profile is not.

Pit chat lines still show a name alone. Those come from stored `RoomEvent` rows that carry a username and no id, so a face there needs either a wider row or a lookup at render — worth doing deliberately, not as a side effect of this.

## Phase 35 — The account belongs to the player (1.3.95)

### First, a correction to the plan

The plan said "no session list, no username change". Both already existed — `/api/account/security` lists devices, kicks one, kicks the others, and renames. Reading the code before building saved rewriting a working feature, which is the whole argument for reading it first.

What was actually missing: a rename could be repeated without limit and left no trace, there was no way to take your data out, and no way to close the seat.

### A name has to settle

Records are public and chat is public, so a name that churns freely is a way to shed a reputation or borrow someone else's. A change now waits thirty days and the old name is kept:

```
a rename with nothing pending        200
a second rename straight after       400  You can change your name again on 10/7/2026
the old name kept on the account     pastNames ["devguru13580"]
```

### Taking the data out

`/api/account/export` hands over the account, play limits, the full ledger, the derived record, and everything posted, as a named download. Amounts are in USDT rather than cents, to match what was on screen. The player id comes from the session and never from the request.

An export line read `amount: 10000`, which looked like a missing conversion. The stored row is 1,000,000 cents — a 10,000 USDT demo deposit in the dev database — so it was right. Worth the thirty seconds to check rather than ship a guess about money.

### Closing a seat, and what closing does not touch

Transaction rows stay exactly where they are. They are the house's books as much as the player's, and the accounting has to keep reconciling after someone leaves. What goes is the seat: profile text, avatar, and every session.

Two refusals matter more than the closure:

```
the wrong confirmation                 400  Type your username exactly to confirm
a balance of 25.00 USDT                400  There is 25.00 USDT on this account. Withdraw it first
```

Closing over a balance would destroy a claim on real money, so it cannot be done — withdraw first. Closure also has to survive signing in again, or it is only a logout, so the Google path refuses a closed account and points at support. Reopening is a support decision.

### The test that closed the account

The balance guard failed its first run and the account actually closed. The cause was the test, not the guard: the balance was set straight into the database while the server held the store in memory, so the app saw zero. Money has to go in through the app for the running store to know about it — the same trap as Phase 21, and it cost an account that had to be reopened by hand.

Verified properly the second time, with a demo deposit through the app: the closure was refused, it named the amount, and the account still signed in afterwards.

## Phase 37 — Block someone, and mean it (1.3.96)

The only way to get away from another player was a host mute inside one custom room. In a house with public records, a shared feed, direct messages and chat, that is not a way out.

A block is now house-wide, stored as a status on the existing pair row rather than a new table, so a block replaces any friendship or pending request between the two. A request left standing behind a block is not a block.

### What it does, and what it does not say

```
B messages A                             200
A blocks B                               200
B messages A                             400  You cannot reach that player
A messages B                             400  You cannot reach that player
B sends a friend request                 400  You cannot reach that player
B is gone from A's feed                  ok
the thread is gone from A's inbox        ok
A's view of B                            blocked
B's view of A                            blocked-by
B tries to unblock itself                400  You cannot reach that player
A lifts it                               200
B can reach A again                      200
```

Three deliberate choices in there. Reaching is refused **both** ways, because a block the blocker can still shout through is theatre. The blocked side is never told, and every refusal uses the same wording as a normal failure, so a block cannot be detected by probing. And only the side that set it can lift it — `blocked-by` reads as no relation everywhere a relation is shown.

Chat in a pit is filtered per viewer rather than per room: the events are shared, so a blocked player's lines are dropped for the one viewer while the round lines everyone needs stay put.

### The fixture that cost the most

Testing a block needs two real accounts, and this house has one player and the house itself. Building the second by hand ran into three separate walls, each worth writing down:

- `SELECT *` on `User` fails, because this driver cannot read a BigInt column without a cast. The row was copied inside SQLite in the end so those values never round-trip through JS.
- The account still could not sign in, and every request answered a bare `Request failed`. `jsonError` masks anything matching `passwordHash` or `WALLET_SECRET`, so the real cause was invisible: the seeded account had no `Wallet` rows, which every real Google signup gets at sign-in. Copying them fixed it.
- One check read `threads` where the route returns `inbox`, so "the thread is gone from A's inbox" passed against an empty array — it was verifying nothing. Corrected, and it now fails first and passes after.

That last one is the same lesson as Phases 31 and 32, for the third time: a check that passes because it looked in the wrong place is worse than no check, because it buys false confidence.

### Not done here

Images in direct messages wait on Spaces credentials. The moderation queue is still one report per row rather than counts per player, and a word filter staff can edit is not built.

## Phase 36 — The wire (1.3.97)

Asked for at the start and left until last, because it is the one item that could embarrass the house rather than break it. The owner chose fully automatic publishing over a review queue, against the recommendation here. That is recorded, and the safety went into what the fetcher is *able* to do rather than into a gate.

### What it takes, and what it refuses to take

A headline, a link, the source name and the feed's own picture. **Never an article body.** Reposting someone else's writing is republishing it; a headline and a link out is a citation. Every row keeps its source, and every link on the page carries `nofollow` and opens out.

Eight feeds, each one checked from the server before it went in the list — five crypto, three sport. The parser was written against real XML rather than an idealised feed, which mattered:

- `<link>` arrives wrapped in CDATA with a campaign string attached, while `<guid>` holds the clean article URL. The guid wins when it looks like a URL.
- Tracking parameters are stripped anyway. They are noise, and they would make one article look new every time the campaign string changed.
- The picture is in `media:content`, or an `enclosure`, or buried in the description HTML. All three are tried.

### What the first real run produced

```
Cointelegraph      found 5  added 5
Decrypt            found 5  added 5
CoinDesk           found 5  added 5
CoinJournal        found 5  added 5
Bitcoin Magazine   found 5  added 5
Sky Sports         found 5  added 5
BBC Sport          found 0  added 0  fetch failed
Guardian Sport     found 0  added 0  fetch failed
```

The two failures are the same feeds that answer from the droplet but not from the machine that ran the test, which is exactly why one dead feed cannot stop the others.

Checked on the stored rows, not on the promise of them: every link https, no tracking parameters left, titles decoded with no markup, no duplicate links, all thirty carrying an image, a real headline on the page — and a second fetch adding **nothing**, because the row key is the hash of the cleaned URL and dedupe needs no extra query.

### Kept away from the game

Five items per source per run, every fifteen minutes. Eight feeds of thirty would bury the hall. It writes straight to its own table and never touches the in-memory store, so a fetch cannot sit in the lane that settles rounds — the same rule the chain watcher follows. A manual refresh exists for staff or the admin secret, never for a visitor, because it makes outbound requests.

### The gate went in after all (1.3.98)

Publishing unattended lasted one version. Fetching is still automatic; reaching the wire is not. A new headline lands as `held` and a person publishes it, or discards it, from a **wire** tab in the staff console.

The migration matters as much as the gate: the column defaults to `live`, so the thirty headlines already on the wire stayed on it, while every new row is inserted as `held` explicitly. Nothing was retroactively unpublished.

```
already-published items stayed live      17
fetch found new items                    19
all of them waiting, none published      19 held
live count did not grow                  17 -> 12 (only the five removed)
the wire page did not change             12 -> 12 headlines
console shows the waiting queue          19
publish one                              live 12 -> 13, held 19 -> 18
the wire grew by exactly one             12 -> 13
discard one                              gone for good
the queue is staff only                  401
```

Two of those checks had to be rewritten before they meant anything. One asserted that the queue held *exactly* what this run fetched — but the fifteen-minute timer fetches too, so the count was legitimately higher and the check failed on a true system. The other looked for the published headline's text on the page, which never matched because an apostrophe arrives HTML-escaped. Replaced by "the wire grew by exactly one", which is the property actually worth holding.

The risk that prompted this is gone in the shape that mattered: nothing appears under the house's name unless someone put it there. What remains is a queue that needs attention — headlines pile up unseen if nobody opens the tab, which is a much better failure than the alternative.

## Phase 39 — The last of the unblocked list (1.3.99)

Two leftovers, both flagged in earlier phases and both finishable without anything from outside.

### A face on a pit chat line

The last surface showing a name and a single letter. Events are stored rows carrying a username and an id, so the face is attached when the feed is built for a viewer rather than stored on the row — copied, not mutated, because `room.events` is the persisted list and a face is only ever part of the payload.

```
the chat line is in the feed                  ok
the chat line carries the face   hue:ember    ok
round lines with no author carry no face      ok
```

That third check matters more than it looks: the same list carries round and payout lines with no author, and a blank circle beside "Round #9191 settled" would be worse than nothing.

### Reports that add up

A report was one row, and one row cannot tell an annoyed player from a pattern. The reports tab now leads with a per-player view sorted by **how many separate people** complained, which is the count that survives one person clicking three times.

```
three reports against one player      3
two separate reporters, not three     2
open and hidden split                 2 open, 1 hidden
most-complained sorts first           A before B
```

The individual rows are still underneath, because acting on a report still means reading the line that was reported.

## Phase 40 — Deploying without a bad minute (1.4.0)

Found while verifying an earlier deploy, offered, and left unfixed until now: the error log carried `client reference manifest for route "/signin" does not exist` and a missing `500.html`. Those looked like live breakage and were not — sixty requests to those routes produced no new errors, and every page rendered.

They came from the deploy itself. `next build` rewrites `.next` while the old process is still reading it, so for a few seconds a route that process has not loaded yet cannot find its manifest. It heals the moment pm2 restarts onto the finished build. With one player that is invisible; with traffic it is a handful of error pages on every deploy, and the sign-in page was one of them.

`distDir` now honours an environment variable, so a deploy builds into `.next-build` and moves the finished directory into place in one rename instead of overwriting the directory being read.

### The first fix was wrong, and measuring said so

Build elsewhere, swap, then restart. Four routes hammered continuously through it:

```
requests   1000
not 200      24   all connection refused
manifest errors written   12
```

Still twelve. The swap had traded one inconsistency for another: between the rename and the restart, the **old** process reads the **new** build's manifests, does not recognise the `BUILD_ID` inside them, and answers with the same invariant error. Milliseconds of overlap was enough.

So the process is stopped *before* the swap, not after. It never sees the new files at all. Measured again:

```
requests             1136
served 200           1104
refused, down          32
answered but wrong      0
manifest errors added   0   (12 before, 12 after)
```

Nothing broken is served now. What remains is about nine seconds of genuine unavailability while the process restarts, which visitors see as a 502 from nginx. That is not free, and it is not fixable while one process owns the money — there is no second instance to hand traffic to, and adding one would break the write queue that makes concurrent clicks safe. A brief honest 502 beats a page that loads wrong.

The script also refuses to swap a build with no `BUILD_ID`, keeps the previous build in `.next-prev`, and rolls back to it if the home page does not answer 200 — a bad build should cost a rollback, not a night.

## Where this stops without you

Everything left in the plan is blocked on something only the owner can supply:

- **Phase 33, images that cannot hurt anyone.** Re-encoding needs an image codec added as a dependency, and none of it can be exercised end to end until a bucket exists. EXIF stripping is worth doing the day uploads are real.
- **Phase 34, email.** Needs a transactional provider and a verified sender. Until then a player who queues a withdrawal learns nothing until they come back to the site.
- **Phase 38, standings.** The aggregation is written and stays shut. One person has clicked in production; a leaderboard of one advertises an empty house.
- **The upload path itself.** Inert at 503 until `SPACES_KEY`, `SPACES_SECRET`, `SPACES_BUCKET` and `SPACES_REGION` exist. Avatars work today only as house colours.

## Phase 41 — a lane one caller cannot fill

The house serves every request, reads included, through one write queue,
because that queue is what makes two clicks landing at once safe. Measured
under load, the whole house tops out in the region of fifty requests a second.
Nothing capped a single caller, so one client in a loop was a house nobody
else could play in, and no tuning fixes that: the single lane is the design.

`src/proxy.ts` now caps one address at 300 requests a minute across `/api`,
which is five a second against a client that normally uses about five a
minute. Callers are counted by the address the proxy reports, not one they
can pick — `clientIpFromHeaders` moved to `src/lib/client-ip.ts` so the gate
and the cap read it the same way, and nginx overwrites `X-Real-IP` with the
peer it is actually talking to. The box's own traffic is exempt, so health
checks and the deploy verifier keep working; a visitor cannot claim that,
because the header is not theirs to set.

Measured in production: 360 requests in 5.2s from one address, 289 served, 71
refused with a `retry-after`, home, wire and fairness all still answering 200
throughout, and the cap releasing on its own a minute later.

Two things worth keeping:

- **Read the deprecation notice before writing the file.** Next 16 renamed the
  middleware convention to `proxy`; the build says so, and the docs shipped in
  `node_modules/next/dist/docs` say so. Writing `middleware.ts` first cost a
  build.
- **A fixed-window cap needs a test that fits in the window.** The first
  production check sent 330 sequential requests and none were refused, which
  read as a broken cap. A round trip from the developer's machine is ~270ms,
  so those requests spread across ninety seconds and never put more than ~220
  inside one minute. The nginx log settled it: one source address, every
  request served. Concurrency, not volume, was the missing part of the test.
## Phase 42 — two things a full audit turned up

Four parallel audits over the whole project. Most of what came back was
inventory, but two items were faults worth fixing the same day.

**A staff debit was lying to the books.** `staffAdjustBalance` stored
`Math.abs(delta)`, so a debit and a credit were indistinguishable in the row.
The books rebuild every balance from its rows and compare — that drift number
is the one check that catches money leaving without a record — and it counts
an `adjust` as money arriving. A 3.00 debit therefore moved drift by 6.00 in
the wrong direction and made the check useless exactly when it mattered. The
account page had already worked around this by string-matching `"debit"` in
the note, which is how a fragile fix hides a real one.

An adjust is now stored signed, because it is the only row type whose
direction is not implied by its type. Production had no `adjust` rows at all,
so nothing needed migrating. Measured through the staff API: a 3.00 debit then
a 3.00 credit, drift unchanged at both steps, and the adjust total reading as
net rather than a sum of absolute values.

**"Unknown" is not loopback.** The rate cap exempted the box's own traffic and
treated a missing address header as the box. That trust was never justified,
so the exemption is now literal loopback only.

Worth being precise about what that did and did not fix, because the first
reading was wrong. Next's `base-server.js` fills `x-forwarded-for` from the
socket when the header is absent, so a request never actually arrives
address-less — locally it resolves to loopback, which is the intended
exemption. The change removes unearned trust; it does not defend the case
where nginx stops setting the header, because Next has already backfilled the
socket address by then. That case is guarded at the nginx layer, which sets
`X-Real-IP` for both huepot server blocks.

Checked while there: `STAFF_IPS=127.0.0.1` is live, so the staff door answers
"Wrong staff secret" on the box and "Staff is closed from this network"
through nginx. On-box only, as intended.
## Phase 43 — a backup worth restoring

The review put this first because it was the only item on the list that could
end the project. The database is the sole record of who is owed money, and it
was being copied by hand: newest snapshot five days old, no schedule, and all
835MB of history sitting on the same disk as the thing it was insuring.

Worse than stale. The old method was `cp -r data`, and the database runs in
WAL mode — at the moment of checking, four megabytes of committed writes were
in the `-wal` and not in the `.db`. Copying the three files together is no
safer, because `cp` is not atomic against a live writer. Those snapshots were
not merely old; some were probably torn.

`scripts/backup.cjs` now asks SQLite for the copy instead of taking one behind
its back. `VACUUM INTO` produces a consistent snapshot of a running database,
which is the only cheap way to get one. There is no `sqlite3` binary on the
box, so this runs through the Prisma client the app already depends on.

Every snapshot is then opened as its own database before it is kept:
`integrity_check`, row counts for accounts and money rows, and a refusal to
keep anything that came out behind the source. It is gzipped to 6.4MB from
18.9MB, and fourteen are kept.

**The part that makes it a backup.** `scripts/restore-drill.sh` unpacks the
newest snapshot, boots the real application against it on a spare port with
the chain watcher off, and asks it eight questions only a working database can
answer — rooms in the lobby, rows in the fairness ledger, takes intact, a room
reporting live state. It passed, and the restored ledger held the same 32,572
settled rounds as the live house. It runs weekly, so the guess cannot creep
back in.

Both are scheduled. The nightly job was tested with `env -i HOME=/root
PATH=/usr/bin:/bin`, which is where cron jobs usually die: node is not on
cron's path by default, and a backup that only works from an interactive shell
is not scheduled at all.

**Off the box: reviewed and deferred on purpose.** The snapshots are on the
same disk as the database. That covers a bad command, a bad migration and a
corrupted file, which is most of the real risk; it does not cover losing the
droplet. The call was to leave it there for now rather than take on another
account and another credential. Worth revisiting the day Spaces credentials
exist, because the same set also switches on image uploads.

### The nest

`data/data/data/…/huepot.db`, eight levels deep, 99MB of copies frozen on
3 September, referenced by nothing. Before deleting anything I compared every
account, money row and settled round against the live database. One row was
unique to the nest: a second `deposit` for hash `0x223d5b1c…` — the duplicate
credit found and removed two phases ago. The live database holds that deposit
exactly once, correctly. So the nest's only unique content was a known
accounting error, which is an argument for removing it rather than keeping it.
One copy is archived under a name that says what it contains.

### Somewhere for a failure to land

There were no `error.tsx`, `global-error.tsx` or `not-found.tsx` files at all,
so a failed render fell through to a Pages Router 500 page this app does not
have, and the log filled with `Failed to load static file for page: /500`. All
three exist now. `global-error` imports nothing and is styled inline, because
the one page that must render when the app is broken cannot depend on the app.

Read the docs first, again: this version passes `retry` to an error boundary,
not the `reset` that older Next used.
## Phase 44 — the house stops filing rounds nobody played

Of 33,217 rows in the fairness archive, 33,198 recorded that nothing had
happened. Nineteen were real takes. Every one of those empty rows carried a
seed, a commit, a hash and two JSON blobs, and the ledger already hid them,
because a round nobody clicked has no bet and no payout for anyone to check.

`queueSettledRound` now returns early for `kind === "empty"`. Rounds that
moved money — take, push, void — are always written. The empty result card in
the pit lost its "Open the ledger" link, since there is no longer a page
behind it, which is the honest state either way.

`countSettledRounds` excludes empties rather than counting them, so the number
on the ledger page means "rounds with a bet" and reads the same before and
after the old rows are pruned. The copy says so now.

**Where those rounds were coming from.** Nothing ticks on a timer. A room only
advances when something is watching it — an SSE subscriber, or a poll of its
state. So the two thousand rows a day were generated by observers: bots,
probes, and the occasional visitor idling on the lobby. The house was paying
storage in proportion to being looked at.

**The prune.** Approved, and done behind a guard that refused to run if any
empty row carried a pot, a payout, rake or a single winning click. None did.
33,198 rows deleted, all 19 takes intact, then `VACUUM`. The database went
from 19,345,408 bytes to 823,296 — a snapshot is now 0.2MB instead of 6.5MB.
A restore drill was run against the pruned database afterwards and passed.

Two SQLite details cost a retry each, both worth remembering:

- `PRAGMA wal_checkpoint(TRUNCATE)` returns a row, and Prisma's
  `$executeRawUnsafe` refuses anything that returns results on SQLite. It has
  to go through `$queryRawUnsafe`. `VACUUM` returns nothing and is fine either
  way.
- In WAL mode `VACUUM` alone does not shrink the file. Pages dropped from
  4,723 to 201 while the file stayed at 19MB until the checkpoint ran.

### The indexes

Every hot read was a full table scan plus a temp B-tree sort: the ledger, a
room's feed, a player's money, a player's notices, the news wire. Eleven
indexes now exist, named the way Prisma names them so the schema file and the
live database agree and a later `db push` has nothing to churn. The same
indexes are declared in `schema.prisma`, which had none at all beyond primary
keys. Plans now read `SEARCH … USING INDEX` with no sort step.

### Room events

Written forever, read back 120 at a time per room. Pruned at boot to the 400
newest per room — deliberately well above the read cap, since the point is to
bound the table rather than trim it to the minimum. 14,239 rows became 2,232.

### On testing this

The first version of the test failed everything for the wrong reason: it
checked for indexes before anything had touched the store, so the app had not
run its boot work yet. It also reported "no new empty rounds were filed" as a
pass while no rooms were ticking at all — a pass you get for free. Fixed by
loading the store first and by polling two rooms through the window, then
proving four rounds really had settled before claiming nothing was written.
## Phase 45 — what a stranger reads

Looked at the live site signed out, at desktop and phone width, which is the
one view forty-four phases had never actually been checked against. Two things
were working against the house.

**The word "empty", six times.** Every room card ended `#3957 · empty · live`,
because `sittingLine` falls back to that when nobody is seated. A first-time
visitor scrolling the hall read six cards in a row telling them the place is
deserted. It now says `seats open` — the same fact, but it describes what is
available instead of passing a verdict, which is what a real house would say.

**"Azure" looks like a person.** The Last takes strip read `Azure 7.90 ·
Classic Pit`. Azure is a colour, but nothing on that line says so, and six
takes all by "Azure" reads like one player winning everything. `PublicTake`
now carries the winning colour ids and the strip shows the coin beside the
name, which says "this is a colour" faster than any wording could. The line
also reads `Azure took 7.90` rather than a bare number.

Left alone deliberately: the in-world nav labels. "Rite" for how-it-works and
"Wire" for news are opaque to a stranger, and renaming them would read more
clearly — but the fantasy naming is a deliberate choice made over several
phases, and quietly undoing it is not mine to do. Worth a decision rather than
a patch.

Also left alone: every pot reads `0.00`, because it is 0.00. Padding that with
anything friendlier would be inventing activity, which is the one thing this
house does not do.
## Phase 46 — the house can reach a player who left

Nothing could. A queued cash-out, a credited deposit or an invite credit was
invisible until the player happened to come back, and the whole referral
economy — codes, attribution, rake share, daily caps — was built with no way
to tell anyone it had paid them.

`src/lib/email.ts` is the provider adapter. Both supported providers are plain
HTTPS POSTs, so this adds no dependency: `EMAIL_PROVIDER` picks between Resend
and Postmark, `EMAIL_KEY` and `EMAIL_FROM` do the rest. `EMAIL_ENDPOINT`
exists so a test can stand in for the provider.

Four decisions worth keeping:

**Only money, and only the rare kind.** A payout happens every round a player
wins, so hooking `notify()` — the single funnel every user-facing event
already passes through — would have been elegant and would have mailed
somebody forty receipts an hour. Instead four explicit call sites: deposit
credited, cash-out queued, cash-out sent, cash-out put back. These are
transactional, which is also why there is no unsubscribe to build: "your
withdrawal was paid" is not a thing to opt out of. Anything social or
promotional would need one, and none is sent.

**It cannot break the money path.** `queueEmail` is synchronous — it pushes to
an array — because it is called inside the store write lock, where an await
would hold the one lane the whole house shares. The array is flushed to
`EmailOutbox` on the next persist, beside `flushSettledRounds`, and a drainer
sends them a minute later. A provider being down must never roll back a
payout.

**Retries, then it stops.** Five attempts, still queued in between so a blip
recovers, then marked failed so it is not retried forever. The staff books tab
shows queued, sent and undelivered counts with a button to force a retry,
because an undelivered receipt for money that moved is exactly the kind of
thing that should not be discovered by accident.

**Inert without credentials.** No provider means nothing is queued at all,
rather than a table filling with mail nobody will send — so when credentials
arrive there is deliberately no backlog to blast at people.

### Proving it without an account

A local HTTP server stood in for the provider and recorded exactly what went
on the wire. Verified against what each provider documents: Resend gets
`POST /emails`, a bearer key and `to` as an **array**; Postmark gets
`X-Postmark-Server-Token`, `To` as a **string**, and `MessageStream:
"outbound"`. Then a real cash-out through the real route: receipt queued, the
provider made to fail once (one attempt, still queued), brought back (sent on
the second), and the rejection path checked to produce exactly one "put back"
receipt rather than two — which it would have, since both `refundQueuedWithdraw`
and `announcePayout` fire on a rejection. Only the paid side is hooked in
`announcePayout` for that reason. With the provider unset: nothing queued, and
the cash-out unaffected.

Two hours went into a test that was wrong rather than the code:

- Disarming `WITHDRAW_KEY` **and** `BSC_RPC_URL` to make a real send
  impossible also turned off `liveWithdrawalsEnabled()`, because that reads
  `chainWatchEnabled()`. The route took the demo branch, and demo cash-outs are
  deliberately not mailed — so the test proved nothing while looking like a
  bug in the email layer. Blanking only `WITHDRAW_KEY` gives live withdrawals
  with sending off, which was the configuration wanted all along.
- Shell environment does not win over `.env.local` here, so "disarming" has to
  be done in the file, with a guaranteed restore.
## Phase 47 — the wire had never published anything

Asked why the scraping and posting system was not finished. It was worth
checking rather than answering from memory, and the answer was not flattering.

The scraper worked perfectly. Eight feeds, every fifteen minutes, unattended,
deduped by URL hash, tracking parameters stripped, images pulled from whichever
of three places the feed used. It had been running for a day and had collected
everything correctly.

The posting half had never run once.

When the choice was put up, "auto-publish, but only from a short list of
sources you approve" was picked. What got built was the option that was *not*
picked: every new row inserted as `held`, invisible until a staff click. The
reasoning is still in the file's own comment — an unwatched feed will
eventually offer a fixed-match tip or a scam promotion, and the house name goes
on whatever appears on the wire. That is a real risk. It was also not the call
to make, and the approval that answers it was already there: the source list.

The measured result, straight off the box:

- 41 items live, every one fetched inside a fifteen-minute window on 7 Sep —
  the migration, where existing rows defaulted to `live`.
- 108 items held, fetched from ten minutes after that window through the next
  day. Every single thing gathered since the gate went in.
- Times the release button had been pressed: **zero**.

So the wire was frozen at the moment the gate shipped, and quietly accumulating
a headline every few minutes behind it.

Now: `saveItems` inserts `live`. Publishing is automatic, which is what was
asked for. Staff keep the thing that actually helps — one click to pull
anything off the wire — and the tab now lists what *is* on the wire rather than
what is waiting for permission, because with nothing ever held that panel was
always empty. `releaseAllHeld` cleared the 108-item backlog through the staff
action, taking the wire from 41 stale rows to 149 current ones, newest twenty
minutes old, all eight sources represented.

Verified locally from an empty table: one fetch, nobody clicking, 25 headlines
in and all 25 on the public page signed out; then a pull, gone from the page.

The lesson is not about news. A safety gate that depends on someone standing
next to it is not a safety feature, it is an off switch with good intentions —
and choosing it in place of what was asked for made it an off switch nobody
knew was thrown.
## Phase 48 — the wire had no door on it

Asked where the news could be seen. The honest answer was: only by scrolling
to the footer. `/news` was public and current, and the sole link to it was the
word "Wire" at the bottom of the page. Signed out, the top bar held "Rite" and
"Sign in" and nothing else. A scraper running every fifteen minutes fed a page
with no entrance.

"Wire" is now in the top navigation, signed in and out. One link, approved
before adding it rather than after.

Also recorded, since the same question came up: the staff console is reachable
only from the box itself, by design. `ssh -L 3000:127.0.0.1:3000` and then
`http://localhost:3000/staff` works, because the tunnel makes the request
arrive as loopback, which is the one address the gate accepts. Kept that way
on purpose.
## Phase 49 — a headline is not a post

Asked why the wire was only titles, and for the news to post itself into Wing
with content, the way a professional feed does. Both were fair, and the first
had an embarrassing answer.

**The summary was never taken.** `parseFeed` read the title, the link, the
date and the image. It never touched `<description>` — the one field RSS exists
to carry. The module comment justified taking nothing but a headline on the
grounds that reposting someone's writing is republishing it, which is true of
an article body and simply wrong about the publisher's own syndication
summary. That is what the field is for.

**The image was taken and then thrown away.** `imageOf` has been parsing
`media:content`, `enclosure` and the first `<img>` since the scraper was
written, and every one of those URLs went into the table. The wire page
rendered a title and a timestamp. 161 stored pictures, none displayed.

Both surfaces now show picture, headline, summary, outlet and age.

### The wire in the Wing feed

`NetworkPost` gained `link`, `image`, `title` and `source`. A row with a link
is a wire card; players cannot set one, so that is what distinguishes the two.
`postNewsToWing` writes them, authored by the house, with the post id derived
from the article hash so the same headline cannot be posted twice. They are
real posts, so a player can like and comment on them — which is the point of
being in a feed rather than a list.

Two things needed care:

- `hydratePosts` dropped every house-authored post on sight, because the house
  is not a player and should not appear among them. It now lets one through
  when it carries a link, and labels it "The wire" instead of a player's
  headline.
- The wire takes everything; the feed cannot. Forty cards a quarter of an hour
  is a firehose that would bury the first player who ever writes something, so
  `WING_PER_RUN` caps it at four per fetch.

### Two faults the local test could not see

The local run passed cleanly and production still showed zero summaries and
zero cards. Both because the test **deleted the table first**, so it only ever
exercised the empty-database path:

- `INSERT OR IGNORE` skips an article already stored, so all 160 existing rows
  kept an empty summary forever, and `postNewsToWing` requires a summary. The
  fix refreshes the summary from the feed while the article is still being
  offered, which heals rows in place instead of waiting for them to age out.
- Once summaries were flowing, the Bitcoin Magazine feed showed what raw
  descriptions actually look like: the outlet name, then the headline again,
  then the summary, then "This post … first appeared on … and is written by".
  `summaryOf` now strips the trailing credit and a leading repeat of the source
  and title. Because the refresh above rewrites what is stored, and the card
  body follows it, the correction reached rows that were already saved: zero
  summaries and zero cards carry the credit now.

A clean-slate test is a test of the easy half. The rows that were already there
are where the behaviour actually lived.
## Phase 50 — ninety pieces of broken text, all mine

Told that letters were rendering as garbage. They were, and I put them there.

Ninety runs of text across sixteen files were mangled. A middle dot had become
two characters, an ellipsis three, and the interface was showing them: "House
bank 10.00 USDT" followed by rubbish, "Opening" followed by rubbish instead of
an ellipsis, the close button on the message dock, the em dashes in the take
page title. Live, on every page with a separator in it, which is most of them.

**The cause was my own tooling.** PowerShell's `Get-Content` reads a file with
no byte-order mark using the system codepage, not UTF-8. Every time I edited a
file by reading it whole, replacing a string and writing it back, each
non-ASCII character was read as two Latin-1 characters and then saved as four
UTF-8 bytes. Irreversible by inspection, and invisible to me because my
console cannot render those characters either — I read the same garbage in my
own greps for hours and took it for a display artefact.

**The repair reversed the transformation rather than guessing at it.** A
replacement table would have been a list of the cases I happened to notice.
Instead each corrupted run was mapped back to the bytes it was misread from —
CP1252, not Latin-1, which is why byte 0x80 shows as a currency symbol — and
decoded as UTF-8 again. Only runs that decoded cleanly were touched, so
correct text was left alone. 56 middle dots, 18 ellipses, 10 em dashes, 2
en dashes, 2 apostrophes, a multiplication sign and a minus sign. Nineteen
files also carried a byte-order mark from the same writes; those came off too.

**Verified by code point, not by eye.** The console lies about these, so the
check reads the actual characters: U+00B7, U+2026, U+2014 where they belong,
zero artefacts across 186 files, and the built bundle carrying `\xb7` — which
briefly looked like a loss until it turned out to be the minifier's own escape
for the correct character.

`npm run check:encoding` now fails the build on a CP1252 artefact, a
byte-order mark or a replacement character anywhere in the source. It caught a
deliberately reintroduced fault when tested, and it caught its own first draft,
which documented the problem by quoting the broken sequences.
## Phase 51 — a player owns what they wrote

The audit flagged this as a gap in obligation rather than in features: a
player could write a post or a comment and had no way to take it back, and
there was no way to report a post, a comment or a direct message. Reporting
existed for room chat only. It mattered more once the Wing feed actually had
content in it, since the wire cards are now something people can comment on.

**Deleting.** A player can remove their own post, which takes its likes and
comments with it rather than orphaning rows that exist only to hang off a
post. A comment can be removed by whoever wrote it or by whoever owns the post
it sits under — clearing your own thread should not need staff. Ownership is
read from the row every time, never from anything the client sent, so the
house's wire cards are nobody's to delete.

**Reporting.** Posts, comments and messages reuse the `ChatReport` table with
a new `kind` column rather than getting one of their own, because the part
that matters — grouping by who was reported, so one irritated player is
distinguishable from a pattern — already existed and would otherwise have had
to exist twice. Old rows default to `chat`, which is what they were.

A report captures what was written at the time of reporting. Reading it back
from the row later would show whatever it has since been edited or deleted
into, which is no use to whoever reviews it. Staff removal blanks the row
rather than deleting it, so the decision stays attached to its report, and a
removed wire card loses its link as well — a pulled card must not still
advertise the article it was pulled for.

Reporting a message answers on its own rather than falling through to the send
path, which is checked: reporting one must not send one.

**Tested from both sides with two real accounts**, because the boundary is the
whole point. Bob cannot delete Alice's post and is told why; he can report it;
Alice cannot report her own writing; Alice can clear Bob's comment from her own
post; nobody can delete a house wire card but anybody can report one; deleting
a post takes its like and its comment with it; and the staff desk lists all
three kinds grouped by player.

Two setup traps worth remembering, both hit on the way: a cloned test account
needs its `Wallet` rows or every request fails with a sanitised "Request
failed" that says nothing, and a seed that only copies them when it creates
the account is useless the second time it runs.

### And not repeating the last mistake

The wire posts four cards a fetch, which is up to 384 rows a day into a table
the feed reads eighty of. That is the same unbounded growth the empty-round
work just went and fixed, so wire cards are now trimmed at boot to the newest
two hundred, with orphaned likes and comments following them out. A player's
own writing is never touched — only they can remove that. Measured: 258
planted cards trimmed to 200, newest kept, no orphans left.
## Phase 52 — tests that outlive the session that wrote them

The audit put this at High and it was the last unblocked item on the list:
no automated tests on money, auth or game logic, and no CI. The only suite in
the repository covered the HUE contract.

What made it worse is that the tests existed. Over these phases I wrote a
signing check against AWS's published vector, a withdrawal walk-through, a fog
leak probe, a books reconciliation check, a request-cap measurement, an
empty-round check, a take-still-filed check, two email checks, a wire check and
an ownership-boundary check — and deleted every one after it went green.
Roughly a dozen suites, each proving something worth keeping, all thrown away.

Thirty-six tests now live in `tests/`, run by `npm test`, covering the parts
where a mistake is not recoverable by apology:

- **The payout arithmetic.** A pot splits to the last cent; leftover cents go
  in player-id order so the same round pays the same twice; a player cannot be
  handed more remainder than they clicked; rake floors and never exceeds the
  pot; the floor per winning click includes the stake back and does not divide
  by zero on an empty board.
- **The fairness claim.** The commit is the hash of the seed; a settled round
  verifies against its own published numbers; the published preimage is
  genuinely what gets hashed; editing the winner, a click count, the pot, the
  payout, the round number, the rake or the kind all break the digest; a seed
  that does not match its commit is caught; unclicked colours are still
  committed to; two winners hash the same either way round.
- **Request signing**, against the key AWS publishes for a known secret —
  the one number in that process that comes from outside this codebase. A
  signer checked only against itself produces a stable wrong answer forever.
- **Which address the house believes**, because trusting the wrong end of
  `X-Forwarded-For` was a real vulnerability here once. Including the rule that
  "I could not tell" must never read as "the server talking to itself".
- **The standing a player earns**: rank boundaries land on the rank they name,
  and a level never falls as hue rises.

### How it runs at all

The application imports itself as `@/lib/…`, which Node knows nothing about.
Rather than rewrite application source to suit the tests, `tests/alias-hook.mjs`
teaches the loader the same mapping. Node runs the TypeScript directly — no
build step, no transpiler, no new dependency — and a `tests/package.json`
scopes module semantics to that directory instead of declaring the whole app
to be ESM for the tests' benefit.

`.github/workflows/check.yml` runs encoding, types and tests on every push,
pinned to Node 22 to match the droplet. Verified on the droplet's own Node
22.23 as well as locally, since a suite that only passes on the author's
machine is not CI.

### Proving the suite

A test suite that has never failed is unproven. Rake rounding was deliberately
changed from floor to ceiling — the house quietly taking one extra cent — and
the suite caught it at `actual: 50, expected: 49` and exited non-zero. Then
restored, and green again.

`npm run check` runs all three gates in one command.
## Phase 53 — the raw SQL, checked rather than trusted

The last unblocked audit finding: the codebase builds statements by
interpolation and escapes strings with a local `esc()` redefined in each
module. Nothing exploitable had been found, but that conclusion came from
sampling, and "we looked and it seemed fine" is not a property anyone can
rely on next month.

The distinction that actually matters turned out to be which call is used:

- `prisma.$queryRaw` with a tagged template binds its values as parameters and
  is safe whatever they hold.
- `prisma.$queryRawUnsafe` pastes them into the statement.

Only the second can be injected into, and only 183 interpolations across the
tree are in one. Of those, 132 go through `esc()`, `sqlStr()` or an inline
quote-doubling replace. The remaining 47 were read one at a time: block
numbers, timestamps, cents, a `crypto.randomUUID()`, a table name chosen by a
three-way ternary over string literals, a column name from a hard-coded array,
and pre-built value lists whose every element is already guarded.

**One real inconsistency.** In `sendQueuedWithdrawal` the same value was
escaped in one field and pasted bare into the next, three tokens apart:

    txHash = '${esc(hash)}', note = 'Broadcast ${hash}'

A chain hash is hex, so neither form could break out today. It is fixed
because that is precisely how the habit rots — the next person to copy the
line copies the looser half.

### The check that keeps it true

`scripts/sql-audit.mjs` parses each `*Unsafe` call by parenthesis depth,
finds its interpolations, and fails on any that is neither escaped nor
recorded in `scripts/sql-audit-baseline.json`. The 47 reviewed values are in
that baseline, so the check is quiet until something new appears — which is
the whole point, since a noisy check is one people learn to skip. It runs in
`npm run check` and in CI.

Proved by adding a query that pastes a username straight into a statement:
caught at `src/lib/social.ts:397  ${name}  (inside quotes, unescaped)`, exit
non-zero, with the error text naming both fixes — wrap it, or better, use the
tagged form that binds it.

Two earlier versions of the scanner were wrong in instructive ways. The first
treated `$queryRaw` and `$queryRawUnsafe` alike and flagged 146 bound
parameters as risks. The second read to the next backtick instead of tracking
parentheses, ran past the end of a statement, and reported a `RegExp` two
functions later as SQL. A scanner that cries wolf is worse than none.

### And a deploy that refused

The first deploy of this failed the type check and stopped, leaving production
untouched on the previous version — the guard doing its job. The cause was the
test directory: it had been copied to the droplet earlier to confirm the suite
runs on Node 22, the production build type-checks whatever is in the project,
and that copy predated a fix. Tests are no longer shipped to the box at all.
They belong in the repository and in CI, not next to the running house.
## Phase 54 — everything, reachable

Asked to make the news and post system the best it can be, and for everything
to be visible. The second half was the concrete part: the wire held 277
headlines and a reader could reach 30 of them. The audit had listed missing
pagination as a gap; on the wire it was the whole product.

**The wire is now browsable.** Two tag filters, a chip per outlet with its
count, and paging back through the lot. All of it lives in the URL rather than
in client state, which means a filtered wire can be linked to, survives a
reload, works with JavaScript off and can be read by a crawler. The source name
under each headline is itself a filter, so "more from this outlet" is one click
from anything.

Paging walks back by published time, not by an offset. An offset shuffles when
a headline arrives mid-read and shows the same story twice; a timestamp cursor
cannot. Measured on the live wire: three pages, 24 headlines each, zero
overlap between them.

Every filter stays a bound parameter. The clauses are written so each does
nothing when its filter is empty, which keeps a user-supplied outlet name out
of the statement text entirely rather than relying on remembering to escape
it. Checked with `tag=' OR 1=1--`, which is dropped, and with a source of
`'; DROP TABLE NewsItem;--`, which matches nothing and changes nothing.

**The feed reads deeper on request.** Depth rather than a cursor, because the
feed polls every twelve seconds and replaces what it holds — an appended older
page would be wiped on the next tick, while asking for more of the same list
survives it. It says "80 of 118" while there is more, and "that is everything
the wing holds" when there is not, so the control never promises a page it
cannot deliver.

### The check I shipped last phase was reading most of the codebase

`scripts/sql-audit.mjs` matched `$queryRawUnsafe` followed by a parenthesis.
Most calls here are written `$queryRawUnsafe<PostRow[]>(…)` — with a generic
type argument in between — so the pattern skipped them. It had reported a
clean tree while never looking at `listFeed`, `listAuthorPosts`,
`hydratePosts`, `listSettledRounds`, `listStaffLogs`, `dailyWithdrawTotal` or
the store's own reads.

Corrected, it finds 67 interpolations rather than 47. The 18 that had been
invisible were read one at a time: bounded integers, module constants, column
lists, a two-way ternary over literals, and clauses already assembled from
`esc()`. Nothing unsafe, but that is luck rather than diligence — I had
declared the tree reviewed on the strength of a scan that missed a third of it.

It still catches a real hole, now including one written the way the codebase
actually writes them: a query pasting a username straight in, with a generic
argument, is caught and named.

A scanner that cries wolf gets ignored. A scanner that stays quiet because it
cannot see gets believed, which is worse.
## Phase 54 — everything, reachable

The wire held 277 headlines and showed 30. The feed held every card and post
and showed 40. Both were the pagination gap the audit flagged, and on the wire
it meant the house was gathering news around the clock into a page that could
not display most of it.

**The wire is now browsable.** Filter by kind — everything, coin, sport — and
by outlet, with a count beside each so it is obvious where the volume is.
Twenty-four to a page, walking back through "Older headlines" until there are
none. The source under each headline is itself a filter link.

Filters and paging live in the URL rather than in client state, which means a
filtered wire can be linked to, survives a reload, and works with JavaScript
off entirely. Paging walks back by published time rather than by an offset, so
a headline arriving mid-read cannot shuffle the next page — measured across
three pages with zero overlap between them.

Every filter stays a bound parameter. Each condition is written so it does
nothing when its filter is empty:

    AND (${tag} = '' OR tag = ${tag})

which is slightly awkward to read and keeps a user-supplied outlet name out of
the statement text completely. Checked with hostile input: `tag=' OR 1=1--`
comes back as the unfiltered page because the value is not one of the two
allowed, and a source containing a DROP returns nothing rather than executing.

**The feed reads deeper.** Depth rather than a cursor, because the page polls
every twelve seconds and replaces what it holds — appending an older page
would have it wiped on the next tick, whereas asking for more of the same list
survives it. Eighty at a time, with a count of how many exist, and the control
only appears when going deeper would actually find something. Acting on an
older post answers at the depth the reader is already holding rather than
snapping back to the newest page.

### The audit script was lying, and this is how it was caught

Last phase's SQL check reported 47 reviewed interpolations and a clean tree.
Adding `LIMIT ${take}` to `listFeed` should have failed it. It did not.

The pattern matching an unsafe call required the parenthesis immediately after
the method name:

    /\$(?:queryRaw|executeRaw)Unsafe\s*\(/

Most calls in this codebase are written `$queryRawUnsafe<PostRow[]>(…)`, with
a generic argument in between. Every one of those was skipped in silence. The
real count is 67, not 47 — so the previous phase reviewed 47 of 65 while
believing it had seen them all.

The eighteen that had been invisible were then read: bounded integers behind
`Math.min`, module constants, the column lists `POST_SELECT` and
`SETTLED_SELECT`, a `WHERE` fragment already built from `esc()`, and a column
name chosen from two literals. Nothing injectable, but that is now a checked
claim rather than a lucky one. Re-proved by adding an injectable query written
*with* a generic argument — the exact shape that used to slip through.

A checker that under-reports is worse than one that cries wolf: the first
merely annoys, the second grants permission.
## Phase 55 — betting-game news, not adjacent news (1.4.22)

The wire was scraping the wrong world. BBC Sport, Sky, Cointelegraph and
Bitcoin Magazine answered, so they went in the list, and the hall filled with
match reports and coin prices. The "betting" chip was operator trade press —
who bought a licence, who appointed a CEO — which is the industry talking to
itself. A player here bets on games. That is a different subject.

**The tape now searches for betting games.** Two topic scrapes, probed from
the droplet: sports-betting odds, and new casino/poker tables. Each item has
to read as a betting game or it is dropped. The publisher is taken from the
feed so a Yahoo Sports odds write-up is labelled Yahoo Sports, not "Google".
Affiliate listicles and "lock of the day" tips are rejected even when a
trusted desk publishes them.

**Betting desks sit beside the tape.** NY Post Betting, CBS Sports Betting,
Legal Sports Report, Legal Sports Betting, Sports Betting Dime, Betfair,
Casino.org, Punter2Pro, VegasSlotsOnline, OnlinePoker, CasinoBeats, SBC News.
A desk is trusted to stay on subject; a mixed scrape is not. Football scores,
Bitcoin, and the leftover operator trade (iGaming Business, Next.io, EGR,
SBC Americas) left the public wire and the Wing.

The page is All games / Sports betting / Casino games. Same paging and
outlet chips as before. The filter is tested: odds and a new slot land, a
match report and a coin price do not, and a topic-scrape headline loses the
publisher suffix.

## Phase 56 — the tape belongs on the hall (1.4.23)

A stranger lands on the hall. Until now they saw vacant seats, last takes
that may be days old, and a Wire link they had no reason to open. The tape
was already fetching betting-game news every quarter of an hour into a page
nobody starts on.

**The newest six headlines now sit on the hall**, above last takes, with a
door through to the rest. Hidden when the tape is quiet, so the lobby does
not announce emptiness twice. Same shape as the takes strip: a label, a
row of chips, a time.

**The tape reaches the Wing.** Topic-scrape cards often have no publisher
summary; they were being skipped, so Yahoo Sports odds lived on /news and
never in the feed. A card with a headline, a source and a link is enough to
talk about. The title is not repeated as the body.

Also: WordPress "The post … appeared first on" credits come off the
summary, and "7 Best Live Dealer Casinos" is treated as the affiliate
listicle it is.

## Phase 57 — where a stranger looks, and how far a seat goes (1.4.24)

The tape was on the hall and still invisible. It sat under six empty pits,
so a visitor had to scroll past "seats open" six times to see that the house
was reading betting games. That is the same first-impression fault Phase 45
fixed for the word "empty".

**The tape now sits under the lintel**, four headlines, before the pits. The
pits stay the point of the hall; the tape is what is alive while they wait.

**A profile and the notice list go as deep as the feed.** Twelve posts and
forty notices were silent caps. Both now say how many there are and offer
"Show older" until that is everything, using depth rather than a cursor so a
reload of the same list does not snap back to the newest page.

## Phase 58 — a headline you can talk about (1.4.25)

The tape was on the hall and still a door out of the house. A stranger clicked
a line and left. The Wing already had the same cards, with likes and comments,
and nothing pointed at them.

**Talk sits next to a headline** on the hall strip and on the wire, only when
the house has already posted that line. It opens the card on the wing, pinned
if it would have sat past the first page, and puts the comment field under it.
The title still goes to whoever wrote the article. The house still does not
keep the body.

## Phase 59 — the tape is a line, not a signup (1.4.26)

Talk pointed at the tape, and the tape was still selling books. "Best NFL
Betting Promos", a bonus code, "Claim Over $3,000" — the first spam check
only knew "5 Best Poker Sites", so a word between Best and the product let
every affiliate desk through.

**Those titles are refused now**, including the ones already live, and their
Wing cards go with them. The hall then prefers a price, a market or a new
table from the last day, and only fills with the rest of the wire if it
cannot find four. A tip sheet can stay on the full wire; it does not have
to sit under the lintel.

## Phase 60 — Talk survives the gate (1.4.27)

Talk opened the wing, and the gate threw the line away. A stranger clicked
Talk, signed in with Google, and landed on the hall. The card they came to
speak on was gone.

**The path rides with the sign-in.** A house page that asks for a seat now
sends that seat to the gate. Google gets it in the state token, not in a
query a caller can rewrite after the fact, and only a same-origin path is
accepted. After the cookie is set they are put back on the card, the
letters, or whichever door they were already walking through.

## Phase 61 — a desk is not a trade paper (1.4.28)

The tape stopped selling books and started reprinting the operator beat.
A casino handing staff stock, a lawsuit over licences, a celebrity walking
into a prediction market for an ad — Casino.org saying "Casinos" was enough
for a strict scrape to keep the HR story, and a house desk will print all
three.

**Those titles are refused now**, including the ones already live. A new
poker room still belongs. A handle number still belongs. Who sued whom
does not.

## Phase 62 — a sit chip is not a bank bonus (1.4.29)

A first-time seat had nothing to click with, and a deposit match would have
turned the house into a cashier promotion. NETWORK already forbids that.

**A sit chip is play only.** One Classic click on the first sit — that is
the day's chip — then one each UTC day after that. It spends before cash,
comes back to chips on a push or a void, and a real take pays cash. It
cannot be withdrawn. The books treat a grant as nothing and a sit row as
the offset to the click, so chips cannot mint bank.

## Phase 63 — company hears when you sit (1.4.31)

A sit chip brought a seat back to the hall, and the sit died in the room
feed. Company already promised "you can sit together" and then never said
when someone actually sat.

**The first click of a round pings company.** One notice an hour, on that
table, with a door to the pit. A block hears nothing. The chip itself now
opens Classic, and a High table that the chip cannot cover sends you there
instead of the cashier.

## Phase 64 — the hall names company when they sit (1.4.32)

The sit notice landed in the bell. A friend walking the hall still read
"Classic is the public pit" while company was already on a table.

**The lintel says so only when it is true.** Company · @name is on Classic.
Nobody sitting means no company line. A stranger still sees the same hall
they saw yesterday.

## Phase 65 — after a take, a Fog door for company (1.4.33)

A take used to end on "Sit the next round" of the same house pit. NETWORK
already named the viral object: a short Fog table plus the invite, opened
when someone actually won.

**One chip: Sit this with company.** Thirty minutes of Fog at Classic
price. Company hears. The invite is copied. A second tap reuses the open
table instead of raising another empty door. An old take page stays quiet.

## Phase 66 — Classic hour pings company (1.4.34)

The named hour used to write only to people who had clicked in the last
week. That reminds a lone seat. It does not pull the people who accepted
them into the same pit.

**When Classic hour opens, company hears it too.** Last week's sitters
still get the notice. The people who accepted them get the same door to
Classic. A block and the house hear nothing. Fog cup uses the same list.

## Phase 67 — the wing opens Classic (1.4.35)

Company said sit together and then sent you to a friends list. A seat
that was not already on a table had no door to the pit.

**Sit Classic is on the wing.** Company who are not sitting get that
chip. A letter thread has the same door. Accepting an ask now opens
Classic: @name is company. Sit Classic. An ask still lands on requests.

## Phase 68 — the lintel follows you (1.4.36)

The hall names company when they sit. Leave the hall for Wire, a letter,
or another pit, and that line is gone. The bell still has the sit notice.
The door you are looking at does not.

**The header says so only when it is true.** @name · Classic, on every
page except the hall and the table they are already on. Nobody sitting
means no chip. A stranger still sees the same header they saw yesterday.

## Phase 69 — a dead RPC must not freeze the house (1.4.37)

The watcher was on, and lastBlock stayed 0, because a dedicated Ankr URL
answered 401 and never gave way to the public Binance seeds.

**A refused dedicated URL is abandoned for the process.** The scan, the
house bag, the sweep, and a send then use a public seed. The error line
does not print the key. Rate limits still rotate seeds the old way.

## Phase 70 — public seeds must credit (1.4.38)

Head was moving and lastScanAt stayed 0. The log cursor sat 24 days
behind because Binance dataseeds refused eth_getLogs, so a send during
the Ankr outage could not credit.

**PublicNode and 1rpc join the seed list.** A rate limit rotates and
retries the same window before splitting. Catch-up uses 32-block slices.
Invest says catching up, not a staff note about setting BSC_RPC_URL.

## Phase 71 — a hung seed must not freeze the tick (1.4.39)

After 1.4.38 the head moved and lastError stayed on the abandon notice.
scannedBlock sat at the old cursor because one public getLogs never
returned, so scanning stayed true and later ticks left early.

**getLogs and getBlockNumber time out at 8s.** A timeout rotates like a
rate limit and retries the same window. The tick can fail and try again
instead of hanging forever.

## Phase 72 — skip archive the public seed cannot read (1.4.40)

Timeouts shipped. scannedBlock still sat 24 days back. PublicNode answers
head and recent logs, then 403s the old cursor as archive. That 403 looked
like the dedicated URL dying, so the watcher never rotated and never wrote.

**A public 403/archive rotates.** If the cursor is further back than the
lookback, the scan starts at recent blocks so a new send can credit. The
gap needs a staff credit or a working archive RPC.

## Phase 73 — credit a send from its hash (1.4.41)

The skipped gap cannot be read as logs. A receipt for one hash still can.

**Invest and the staff desk take a BscScan hash.** If that send paid a
house address and has confirms, it credits the same way a watched log
does. Already-credited hashes stay once.

## Phase 74 — a hung send must not freeze the watch (1.4.42)

The tick waited for drain and sweep before the next scan. A public RPC
that never returns on a cash-out would leave deposits still again.

**The next scan is scheduled when the scan finishes.** Send and sweep
run beside it. House bag, inbox reads, and waits time out. The hall
strip only shows a cash-out that has a BscScan hash.

## Phase 75 — the hour line is a Classic door (1.4.43)

The named hour is the meet. Midday the lintel counted down and went
nowhere. Last fifteen minutes the card said soon and the sit did not.

**The hour line always opens Classic.** Soon changes the sit. The gate
sends a player to Classic when the hour is on or soon.

## Phase 76 — the Fog cup line is a Fog door (1.4.44)

The cup countdown on the hall went nowhere, same as the hour did.

**The cup line always opens Fog.** Soon names the sit. The gate sends a
player to Fog when the cup is on or soon and Classic hour is not on.

## Phase 77 — the lintel names the hour (1.4.45)

The hall had the door. The wing and the wire did not.

**Last 15 minutes, and while the hour is on, the header says Hour.** It
opens Classic. Hidden on the hall, the gate, and that table.

## Phase 78 — the house board (1.4.46)

A seat already showed HUE, rank, takes and tasks. The house had no book of those seats.

**`/board` ranks every seat that has clicked, by the same HUE the seat uses.** Takes and taken sit beside the coin. The hall strip and the header open it. Wins and activity only — the bank stays off the list. One row is a book, not a reason to wait.

## Phase 79 — claim testnet HUE (1.4.47)

The board ranked standing. The coin still could not leave the book.

**Unpaid HUE can be claimed to a BSC testnet address.** One standing HUE is one token. Queued, sending, and paid rows lock that amount. A rejected row gives it back. The USDT watch does not run this send. Inert without `HUE_TOKEN` and `HUE_HOT_KEY` on chainId 97. No price. No mainnet.

## Phase 80 — the pot talks (1.4.48)

A take already had a page and a hall strip. The wing did not hear it.

**A real take writes one house card.** Body is the take line. Link is `/take/[id]`. Empty, push and void stay quiet. The last real takes are posted once so the wing is not empty on the first boot. Board rows open Sit Classic, Sit with them, or Ask. Account shows HUE and place.

## Phase 81 — Night Pit (1.4.48)

Five house tables, then a sixth that is not a clone.

**Night is 15 seconds with the last 8 dark.** Lightning stays an open board. Fog stays a minute. Same 1 USDT, four hues, same pot rule. Hall mark, enter line, rite mention.

## Phase 82 — the house gets big (2.0.0)

Invite math, Night Pit, and the board were already live. They were still small.

**The invite copies from a take and a board row.** Account shows the last rake credit. Night gets a 22:00 UTC hour. The hall hero is Tonight. A seat is public. A take is a hangout. The board can read this UTC week from the same HUE buckets. No mainnet. No price. No deposit bonus.

## Phase 83 — the wing is open (2.1.0)

Seats and takes were public. The feed that carries them was not.

**A stranger can read the wing.** Take cards and the wire land without a session. Speak, like, ask, and letters still need a seat. No mainnet. No price.

## Phase 84 — the hall stays on the house (2.1.12)

A stranger hitting the hall saw house doors, then an empty guest-table shelf, then the takes that prove the house is alive.

**Last takes and cash-outs sit under the house pits.** The board follows. Guest tables only appear when one is open. No empty shelf. No HUE/USDT pool. No second ranking.

## Phase 85 — a take on the hall is a door (2.1.13)

Last takes sat under the house pits. A stranger who read one still had to hunt a door.

**Each last take sits the pit that just paid.** The brag page is still there. No HUE/USDT pool. No second ranking.

## Phase 86 — seats like yours (2.1.14)

The wing named seats at random. A profile was a headline and a short about.

**Search reads a pit or a colour. Suggestions rank the people who sit like you. A seat can name a cover, a preferred pit, and doors out to X, Telegram, or Discord.** No HUE/USDT pool. No second ranking.

## Phase 87 — a seat you can visit (2.1.15)

A profile was a record and a dead activity list. A visitor could not write, note, or read a recommended line from that seat.

**A visitor writes a letter on the page, leaves how they sit, likes and talks the lines, and a recommended tab ranks this seat with the ones like it.** Notes are not stars. No HUE/USDT pool. No second ranking.

## Phase 88 — the tape stays in its box (2.1.16)

Four long headlines sat in the same chip row as a last take. The letters ran out of the plate.

**Each tape line is a card on a two-up grid. The title clamps to two lines. Talk stays inside.** No HUE/USDT pool. No second ranking.

## Phase 89 — the pit graph keeps time (2.1.17)

The playhead froze between room ticks, then jumped. The bar chased a 120ms ease. Reveal remapped the clock and wiped the line.

**The line follows wall time every frame. Clicks step. The scale eases. The take holds the finish.** No HUE/USDT pool. No second ranking.

## Phase 90 — the pit clock stops hanging (2.1.18)

The big number still used a ceiled second, so it sat on 0:27 while time moved. The line was bent through clicks. The scale eased so a new stack took too long to land.

**The clock counts tenths. The line steps. The scale only grows. Time interpolates between room ticks.** No HUE/USDT pool. No second ranking.

## Phase 91 — the hall for a returning seat (2.1.19)

Search, seats like yours, and letters lived on the wing. A signed-in player still landed on `/` and saw the same stranger hall.

**Your hall names the pit you sit, the seats that sit like you, and a door back.** Company still speaks when they sit. No HUE/USDT pool. No second ranking.

## Phase 92 — the wait (2.1.20)

A seat with time and no pot had nowhere in the house to put their hands.

**The wait is a stack against the house. Same bag. A TD-trained value function picks the house placement. No other seat. No USDT. No second ranking.**

## Phase 93 — the wait learns (2.1.21)

The first wait table sat off to the left, dumped a tetris, and froze the weights after the first train.

**The boards sit in the center. A clear sends at most two. Every live lock moves the house weights, then the house sits the stack again.**

## Phase 94 — sit or watch (2.1.22)

One door, one bag, no hold-to-run. A seat that did not want to play had nothing to watch, and the book only learned when a human sat.

**You sit the house, or watch house vs house. Each board is dealt its own bag. Hold a key to run. Pieces move. Both doors train the book.**

## Phase 95 — the marks (2.1.23)

The wait sat slow, and the only book was the live one. A deeper sit had no door, and the house had nowhere to hang a future pit mark.

**The table runs faster. The shelf lists how each mark sits. Free wait books sit anyone. A deeper wait mark costs gold from the vault. Pit marks stand as coming until they are trained.**

## Phase 96 — pick to see, pay to take (2.1.24)

Play and the shelf sat in one column, and a priced wait book asked for gold before it would sit.

**The wait is two desks. Left is the game. Right is every house model, wait now and pit later. Anyone may pick a live wait book to see it sit. Gold is only to take the weights home.**

## Phase 97 — watch the books (2.1.25)

The shelf named pit marks as coming, so a seat could not see how a click book thinks before paying for the file.

**Every house game hangs its reinforcement books on the right. Pick one and the left desk shows the sit: Q on each color, the weights, the features. Gold is only to take a trained book home.**

## Phase 98 — the game lab (2.1.26)

The wait hung color-pot books. That is Huepot betting. The shelf is for game RL: sit, train, take the weights.

**Stack, catch, and snake sit on the left and train here. Aim (not CS) and lane (not Dota) stand as coming. Gold is only to take a trained file home. The pot stays on Classic.**

## Phase 99 — see the sit (2.1.27)

The left wells were empty: fill cells had no paint, and the desk sat in a 72rem card.

**Catch, snake, and stack cells carry color. The wait desk fills the viewport. Wells size to the play panel so the sit stays on screen. Full screen opens the two columns.**

## Phase 100 — Tetris player types (2.1.31)

The stack shelf was one sit with three depths. Versus Tetris has types: downstacker, burst, combo, survivor.

**Each type is a trained book on the same six features, different skill. Sit it free. Take the trained weights as a readable text file, not a mystery JSON. No T-spin table, no badges, no NES tap.**

## Phase 101 — watch first, models aside (2.1.32)

The right panel listed weights. A sit opened you vs house. One book sat both wells.

**The right panel is games with pictures. A sit opens house vs house and deals again when both fall. Each well picks its own book. Gold to take a file lives on /wait/store.**

## Phase 102 — world books and the aim sit (2.1.33)

Famous nets were pasted as if the wait could run them. LC0 and KataGo need their own engines. Live overlays stay off the house.

**The store lists world books as outbound links only. Aim sits as a flick trainer, not Counter-Strike. Lane and Break still wait. No 365 MB rehost.**

## Phase 103 — four seats meet (2.1.34)

The house was a pot with a wing. New people had no seat to name, no way to share a project, and the store was only house books.

**Game developers, AI developers, gamers, and betters pick a seat. Posts carry that seat. A profile holds projects. The store shelves house sits, world books, and those projects. Gold is only to take a priced door home. The pot stays on Classic.**

## Phase 104 — pick a seat at the gate (2.1.35)

A new Google seat landed in the hall with no name. The wing looked like a feed for nobody.

**After Google, if there is no seat, the four cards open first. No skip. Hall, wing, wait, and store send a signed-in seat back until one is named. Account, withdraw, and the rite stay open.**

## Phase 105 — find the other seats (2.1.35)

Projects sat on a profile and on the store. The wing had no board. People search was only a name.

**A public project board sits on the wing. People chips filter Game / AI / Play / Table. Hall search stays the one search that matches a seat name.**

## Phase 109 — a quieter lintel (2.1.37)

The floor bar carried Rite, Wire, Board, cash, you, chat, and the hour at once. The four house doors got lost.

**Hall, Wing, Wait, and Store stay in the middle. Search sits by the mark. Hour, sit chips, and company stay when they matter. Everything else folds under @you.**

## Phase 108 — the house reads as a floor (2.1.36)

LinkedIn, Facebook, and Reddit share one structure: a sticky top bar, a left shortcut rail, a dominant center stream, and a right discovery rail. The wing was a feed with a thin tab strip.

**The header keeps Hall, Wing, Wait, and Store in the middle. The same house search sits in the bar off the hall. The wing left rail is you, shortcuts, and the four seats. A profile has Posts, About, Projects, and Notes. Cards round. A phone uses a floor dock. The pot stays on Classic.**

## Phase 118 — the house shares four doors (2.1.46)

The store shelf was empty. Seats had nowhere to stand next to.

**Wait, books, play, and Classic sit on the shelf as free house doors. Seats can still share their own. Gold is only to take a priced door home. The pot stays on Classic.**

## Phase 117 — first sit on Classic (2.1.45)

Empty Classic kills every other door. Hire posts cannot sit the table.

**An empty pot waits for a first sit. After a seat with no dest, the door is Classic. The Live shelf keeps the public pit. Sit chips stay play-only. No fake clicks. The pot stays on Classic.**

## Phase 116 — ML and marketing sit on the posts (2.1.44)

The floor hire was three seats. The books and the first click still needed named hands.

**Machine learning and marketing sit on `/jobs`. Tiny TD books. Honest Classic talk. Guests read. A bid needs an account. Gold is not a hiring purse. The pot stays on Classic.**

## Phase 115 — the house hires the floor (2.1.43)

Lane and Break sit. The next wall is people, not another wait game.

**UI/UX, backend, and architect sit on `/jobs`. Guests read. A bid needs an account. Gold is not a hiring purse. The pot stays on Classic.**

## Phase 114 — Break sits (2.1.42)

Break was the last coming card. Lane already last-hits. The wait still needed bricks on the same contract.

**Break is a brick sit. Two wells. The pad tracks the gold. A hit brick scores. Three misses end the sit. The open book learns. First and deep sits are on the store. All six wait games are live. The pot stays on Classic.**

## Phase 113 — Lane sits (2.1.41)

Lane was a coming card. Aim already proved the wait contract: two wells, house vs house, a tiny book, play free, gold only takes the file home.

**Lane is a last-hit sit. Not Dota. A mark walks the lane. Strike when it is ripe at the well. The open book learns. First and deep sits are on the store. Break still waits. The pot stays on Classic.**

## Phase 112 — the whole house reads as one floor (2.1.40)

The wing and the vault had rails. The hall, posts, rite, wire, ledger, and gate still read as lone pages. LinkedIn, Facebook, YouTube, Upwork, and a live betting desk share one floor: sticky top, left shortcuts, a dominant stage, and a right rail.

**HouseFloor is the product chrome. The hall is a live pit plus Pits / Live / Tape / Posts. Search sits in the header. Posts sit on the phone dock. Vault, ledger, notices, law, and takes use the same rails. Wait and a sat table stay full-stage. The pot stays on Classic.**

## Phase 111 — the vault reads as a seat (2.1.39)

Account was a long stack of cards: gold, invite, HUE, name, limits, devices, ledger. LinkedIn, Facebook, and Reddit put identity on top, settings in a left rail, and one pane in the middle.

**Cover and face on top. You / Vault / Invite / Standing / Ledger / Limits / Sign-in in the rail. One pane at a time. A right rail keeps balance, chips, standing, and the invite code. The pot stays on Classic.**

## Phase 110 — the house posts who it still needs (2.1.38)

Four seats can meet. Lane and Break are still coming. Classic still dies when nobody sits. Reports still have a desk with nobody rostered.

**The house posts the work at `/jobs`. Sit Lane, Sit Break, train a house book, host Classic hour, share a wait project, roster the report desk. Guests read. A bid needs an account. No deposit bonus. Gold is not a hiring purse.**

## Phase 119 — Popular words (2.1.47)

The house dialect was not how other social platforms talk. Public labels now use Home, Network, Games, Store, Jobs, News, Leaderboard, Profile, Messages, People, Wallet, Fairness, and How it works. Sit became play. Bid became apply. Vault became wallet. Routes and money rules stay.

**Stay on the house.** Read hire applications. Train a deeper model. Roster the report desk. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 120 — news stays here (2.1.48)

A headline used to walk a reader off Huepot. It now opens on `/news/[id]` with the outlet's own summary and picture. The list, the home strip, and the network card all stay on the house. No article body is scraped.

**Stay on the house.** Read hire applications. Train a deeper model. Roster the report desk. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 121 — read the applications (2.1.49)

Jobs took applications. The house could not read them as a list, and the applicant only saw a bid notice. `/jobs/you` is that inbox. Staff opens the person, the job, and a message. The notice says application.

**Stay on the house.** Train a deeper model. Roster the report desk. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 122 — hiring desk (2.1.50)

Applications landed. Nobody on the house side was notified. `/manage` is the hiring desk. A manager is a signed-in seat. Staff can grant the first one. When a seat applies, every manager gets a notice. Shortlist, pass, message.

**Stay on the house.** Train a deeper model. Roster the report desk. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 123 — visitors on the desk (2.1.51)

The hiring desk could not see the house. `/manage` now counts visitors — guests and signed-in players — live, today, and this week. A pulse keeps someone live without adding a view. No invented numbers. No IP on the desk.

**Stay on the house.** Train a deeper model. Roster the report desk. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 124 — report desk on /manage (2.1.52)

Reports already filed from chat, posts, comments, and messages. Only staff could read them. `/manage` now opens that queue for a rostered manager: who was named, how many separate reporters, hide or dismiss. A message can be reported without sending one. Applying to the review job still does not grant the desk.

**Stay on the house.** Train a deeper model. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 125 — Material UI on the house (2.1.53)

The house still looks like Huepot. Buttons, fields, menus, tabs, search, notices, and sign-in now run on Material UI with a dark gold theme. Games and the pit stay custom. Default purple is not the product.

**Stay on the house.** Train a deeper model. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 126 — MUI formats News (2.1.54)

The old chip plates were still sitting on Material. Buttons and chips now take the theme paint. News is the formatted surface: cards, chips, and a story page. The outlet's own summary and picture stay. No scraped article body.

**Stay on the house.** Train a deeper model. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 127 — MUI owns the house (2.1.55)

The hall plates, gold chips, and custom chrome CSS are off. App bar, floor, footer, and mobile dock are Material. Theme paint only. Games and the pit stay their own surfaces.

**Stay on the house.** Train a deeper model. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 143 — the desk opens on that book (2.1.73)

A store watch stayed on the card. Sit this book now opens the games desk on that sit — west is the book you watched, east stays the other well. No extra gold. The file is still the file.

**Stay on the house.** Let a seat take the file from the desk after they sat that book. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 144 — take the file from the desk (2.1.74)

A seat could sit the book and still had to walk back to the store for the file. Take this file now sits under the west and east picks. Same download door. Gold is only for a priced sit. A guest signs in on that book. The pot stays on Classic.

**Stay on the house.** Show the wallet on the desk when a priced sit is on the well. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 145 — the wallet sits on a priced well (2.1.75)

A priced sit on the desk had a buy door and no gold in sight. The wallet now sits on the play bar when west or east is a priced book. A guest is told they need an account. After gold leaves, the number updates. Free wells stay quiet. The pot stays on Classic.

**Stay on the house.** Open the wallet door from the desk when a priced sit is short. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 146 — the desk take tells the truth (2.1.76)

A priced well could say Take this file on the last book's owned flag. Gold and ownership were two books. A cash-out could freeze after broadcast. A seat could close over a live payout. The sit door could ignore a new query. The phone dock lit Home on the store. A profile send forgot the profile.

The take now follows the book on the well. Gold leaves, then the file is granted. A paid row is enough to restore a lost shelf. Staff can return a sending cash-out. The drain retries a hashed send. Close waits for an open payout. The desk follows `?sit=`. The dock has Store. A new seat returns to the profile they opened.

**Stay on the house.** Open the wallet door from the desk when a priced sit is short. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 147 — the wallet door opens when gold is short (2.1.77)

The wallet sat on a priced well as a number. A short seat still had to find the vault. The desk now opens that door. A guest is sent to sign in. A signed-in seat short of the price is sent to add gold, then back to the sit. Enough gold stays on the desk. Free wells stay quiet. The pot stays on Classic.

**Stay on the house.** Keep the priced sit on the vault until gold is enough. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 148 — the priced sit stays on the vault (2.1.78)

The wallet door dumped a short seat on a bare vault. The sit is now on that door. The vault names the book and the short. Gold stays there until it covers the file. Then the take sits on the vault. A refresh keeps `?sit=`. Free wells stay quiet. The pot stays on Classic.

**Stay on the house.** Open the same vault sit from the store when a priced file is short. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 149 — the store opens the same vault sit (2.1.79)

A short store card still tried to buy, or sent a guest back to the shelf. The store now opens the same vault sit as the desk. A guest signs in to that sit. A signed-in seat short of the price is sent to add gold with the book still on the door. Enough gold still buys on the card. Projects stay their own door. The pot stays on Classic.

**Stay on the house.** Let a watch on a priced book open that vault sit when gold is short. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 150 — a watch opens the vault sit (2.1.80)

A watch on a priced book was only a sit. Watching is still free. When that book is short, the watch now opens the same vault sit as the card. A guest signs in to that sit. A signed-in seat short of the price is sent to add gold with the book still on the door. A free or owned watch stays quiet. The pot stays on Classic.

**Stay on the house.** Keep that watch on the vault until gold is enough. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 151 — notices sit as a house alert desk (2.1.81)

Notices used a leftover ledger wash. They now sit as alerts: a kind mark, a severity rail, and a quiet unread pip. Gold in and takes are ok. Cash-out and verify wait. A return halts. Company and talk stay a note. The bell tray uses the same desk. The pot stays on Classic.

**Stay on the house.** Keep that watch on the vault until gold is enough. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 152 — the play well shows the whole sit (2.1.83)

The games desk sized wells to the window, then clipped them. A stack showed three rows. Wells now take their size from the play column, keep the board’s own ratio, and stay on the page. House games sit under the sit until the floor is wide. The pot stays on Classic.

**Stay on the house.** Keep that watch on the vault until gold is enough. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 153 — the watch stays on the vault (2.1.84)

A watch on a priced book already opened the vault sit. The sit card was only a line. The vault now keeps that watch playing while gold is short. Enough gold puts the take on the same door. The file is still the file. The pot stays on Classic.

**Stay on the house.** USDT is only to buy a priced file. The pot stays on Classic.

## Phase 154 — the sits play the well (2.1.85)

Snake circled beside the food. Catch slid one way. Break left the pad to chase a brick. Snake now keeps a loop and cuts to food while the tail stays open. Catch measures distance and covers both sides. Break follows the column where the gold meets the pad. Those three books were trained again. Aim and lane already cleared their sits. The pot stays on Classic.

**Stay on the house.** USDT is only to buy a priced file. The pot stays on Classic.

## Phase 155 — the watch counts what snake ate (2.1.86)

Snake keeps the same loop. A step that closes on the food is taken when it stays on the open arc and still moves forward. A step off that arc is refused, because that cut sealed the tail. A watch now says how many it ate. The pot stays on Classic.

**Stay on the house.** Break clears a wall and keeps the pad. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 156 — the wall falls (2.1.87)

Break clears a full wall. While bricks are still up, the return off the pad keeps its line. When only a few remain, the pad sends the gold into a brick it can reach. The next ball is served with the pad already on the column where that ball comes down. The pot stays on Classic.

**Stay on the house.** The stack styles have to look different in one minute. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 196 — a page open does not write (3.0.3)

A signed-in seat opening a page used to take the write lane, copy the books, and ask about a sit chip that was already stored. That held the house. A page open now only reads, unless a chip, an invite code, or a wallet still has to be written. The chat mark loads after the hall is on the screen. A guest stays a guest. The vault amount stays off the desk. The house does not mint a wage. The pot stays on Classic.

**Stay on the house.** The house does not mint a wage. No practice funds. No HUE/USDT pool. The pot stays on Classic.

## Phase 195 — the desk names the rail (3.0.2)

Companies, Contracts, Agents, and Leaderboard are their own doors on the manage desk. A visit already filed as Other stays Other. A build writes the door list into the sitemap and does not wait on the books. Takes and headlines fill in on the next pass. A guest stays a count. The phone dock stays as it is. The vault amount stays off the desk. The house does not mint a wage. The pot stays on Classic.

**Stay on the house.** The house does not mint a wage. No practice funds. No HUE/USDT pool. The pot stays on Classic.

## Phase 194 — a contract is a door (3.0.1)

Contracts sit on the left rail, next to Companies. The list stays empty until two seats lock vault USDT. The phone dock stays as it is. A guest is still a guest. The vault amount stays off the desk. The house does not mint a wage. The pot stays on Classic.

**Stay on the house.** The house does not mint a wage. No practice funds. No HUE/USDT pool. The pot stays on Classic.

## Phase 193 — the house is version 3 (3.0.0)

The product number is 3. The seats, the USDT, and the desk are the same. A guest is still a guest. The vault amount stays off the desk. The house does not mint a wage. The pot stays on Classic.

**Stay on the house.** The house does not mint a wage. No practice funds. No HUE/USDT pool. The pot stays on Classic.

## Phase 192 — the desk says when a seat was here (2.1.123)

Each seat on the manage desk says the last day this week a visit stored their name, and the doors they opened that day. A seat with no named visit this week says so. A guest stays a count. The vault amount stays off the desk. The house does not mint a wage. The pot stays on Classic.

**Stay on the house.** The house does not mint a wage. No practice funds. No HUE/USDT pool. The pot stays on Classic.

## Phase 191 — a day owns its doors (2.1.122)

A weekday on the manage desk shows that day's doors. Opening a door names the signed-in seats who used it that day. A guest stays a count. A day from before a name was kept stays a count. The vault amount stays off the desk. The house does not mint a wage. The pot stays on Classic.

**Stay on the house.** The house does not mint a wage. No practice funds. No HUE/USDT pool. The pot stays on Classic.

## Phase 190 — a door opens the seats (2.1.121)

A door count on the manage desk opens the signed-in seats who opened that door today. A guest stays a count. Views from before a name was kept stay a count. Those rows can still be managed. The vault amount stays off the desk. The house does not mint a wage. The pot stays on Classic.

**Stay on the house.** The house does not mint a wage. No practice funds. No HUE/USDT pool. The pot stays on Classic.

## Phase 189 — the books sit on Atlas (2.1.120)

Accounts, visits, contracts, and the ledgers now sit in MongoDB Atlas. The same seats and the same USDT moved with them. A guest is still a guest. The vault amount stays off the desk. The house does not mint a wage. The pot stays on Classic.

**Stay on the house.** The house does not mint a wage. No practice funds. No HUE/USDT pool. The pot stays on Classic.

## Phase 188 — a number opens the seats (2.1.119)

Each count on the manage desk opens the people in it. A signed-in visitor is a seat, and that row can be given a craft, an invite, a freeze, a manager role, or a close. A guest has no account. Visits from before this desk stored a cookie, not a name. The vault amount stays off the desk. The house does not mint a wage. The pot stays on Classic.

**Stay on the house.** The house does not mint a wage. No practice funds. No HUE/USDT pool. The pot stays on Classic.

## Phase 187 — the desk names the seats (2.1.118)

The manage desk lists every real account. A manager can set a craft, make or remove a manager or a reviewer, issue an invite, freeze a seat, or close one. Closing signs that seat out and refuses while USDT is still on it. The vault amount stays off the desk. The house does not mint a wage. The pot stays on Classic.

**Stay on the house.** The house does not mint a wage. No practice funds. No HUE/USDT pool. The pot stays on Classic.

## Phase 186 — the key is a hash (2.1.117)

The API key spends vault USDT. The house stores a hash, not the key. A new key is shown once, for a minute. A key already saved still works until it is rotated. Rotate stops the old key. Play credit cannot hire. There is no practice balance. The pot stays on Classic.

**Stay on the house.** The house does not mint a wage. No practice funds. No HUE/USDT pool. The pot stays on Classic.

## Phase 185 — the other seat hears (2.1.116)

An offer, an acceptance, and a delivery each leave a notice for the seat who has to answer. The notice opens that contract or that hire. A decline, a release, and the 48-hour clock still move the vault and tell the seat whose balance changed. The house does not add its own money. There is no practice balance. The pot stays on Classic.

**Stay on the house.** The house does not mint a wage. No practice funds. No HUE/USDT pool. The pot stays on Classic.

## Phase 184 — no practice funds (2.1.115)

A hire and a project share lock vault USDT. There is no practice grant and no practice balance. Decline, or 48 hours without delivery, returns the hold. A delivery the buyer does not release is paid to the provider after 48 hours. A share must add to 100 and the owner's vault pays it. Play credit cannot hire or pay a share. The API key spends vault USDT. Agents stay empty until a seat lists one. This is not a chain. The pot stays on Classic.

**Stay on the house.** The house does not mint a wage. No practice funds. No HUE/USDT pool. The pot stays on Classic.

## Phase 183 — the vault locks the price (2.1.114)

A client and a developer, or a company and an employee, lock the terms and a price in vault USDT. The words do not change. Decline, or 48 hours without delivery, returns the lock. A delivery the locker does not release is paid to the worker after 48 hours. The clock runs every minute, and when a contract is opened. Play credit cannot lock a contract. The price is at least 1 USDT and at most 100,000 USDT. Only the two seats can read the terms. Agents stay on practice funds. A torn ledger file is refused instead of replaced with an empty one. This is not a chain. The pot stays on Classic.

**Stay on the house.** A contract is not a chain proof. The house does not pay the wage from its own bank. No HUE/USDT pool. The pot stays on Classic.

## Phase 182 — the lock returns (2.1.113)

A practice contract that stays offered or accepted for 48 hours returns the lock to the seat who paid it. A delivery that sits for 48 hours is paid to the worker. The words do not change. The clock runs when someone opens the contract or the practice wallet. This is not a chain and not USDT. The pot stays on Classic.

**Stay on the house.** A contract is not a chain proof. Practice funds are not a bank. No HUE/USDT pool. The pot stays on Classic.

## Phase 181 — locked contracts (2.1.112)

A client can lock terms and a practice price with a developer. A company founder can lock the same kind of contract with an employee who has joined. The words do not change after the lock. The other seat accepts, delivers proof, and the locker releases the price. Decline returns the lock. The funds are practice funds. This is not a chain and not USDT. The pot stays on Classic.

**Stay on the house.** A contract is not a chain proof. Practice funds are not a bank. No HUE/USDT pool. The pot stays on Classic.

## Phase 180 — companies and two more tables (2.1.111)

A seat can open a company and post a developer, a teacher, a lawyer, or a problem solver. Other seats join and write a note. The house does not invent a company. A listing is not a license, a school, or a law firm. USDT is not the wage. An agent hire stays on the practice ledger. Wheel is eight pockets and Dice is six faces. Both use the same rule as Classic: the biggest side takes the pot. The house does not pay fixed odds. The public pot stays on Classic.

**Stay on the house.** No hidden company. No fixed-odds wheel. Practice funds are not a bank and not a chain. No HUE/USDT pool. The pot stays on Classic.

## Phase 179 — the practice ledger (2.1.110)

Agents is a door in the house. A signed-in seat gets a practice balance, capped at $500, that does not touch USDT, the vault, or the pot. The seat can list an agent with a price and a spending limit. Another seat hires that agent: the price is held, the provider delivers proof, and the buyer releases it. Decline returns the hold. A project’s shares must add to 100 before an earning splits. The practice record is paid work and reviews, with the events visible, and it does not replace HUE. An agent post says Agent and names the owning seat. A circle digest is the last posts joined. The market stays empty until a seat lists an agent. JSON export says it is not a chain proof. A priced file is still the only USDT charge. The pot stays on Classic.

**Stay on the house.** Practice funds are not a bank and not a chain. No HUE/USDT pool. An agent does not speak as the seat unless the owner chooses that, and the post stays marked Agent. The pot stays on Classic.

## Phase 178 — seven doors (2.1.109)

A seat, a book, the store, two books on one sit, the owned file, the record, and a project. Two books share a sit and neither holds a wallet. The record is the history. There is no second lifetime number. A project is not a wage. A priced file is the only USDT charge. The pot stays on Classic.

**Stay on the house.** No agent wallet. No reputation score. No revenue split or escrow. No twin that answers as a seat. No HUE/USDT pool. The pot stays on Classic.

## Phase 177 — the house lines (2.1.108)

The house speaks in the lines already due today. A later slot stays off the seat until its hour. Each line opens a door that exists. The house does not add a fourth. The book does not speak as the seat and it holds no wallet. The pot stays on Classic.

**Stay on the house.** A door out: a letter, an application, or Classic. Their choice. A letter stays a letter. No agent wallet. No reputation score. No revenue split or escrow. No twin that answers as a seat. No HUE/USDT pool. The pot stays on Classic.

## Phase 176 — each job is a door (2.1.107)

Social opens the company and the room this seat is in. An empty company stays empty. AI opens the book and the watch, or the desk when no book is named. The house speaks as the house. The book does not speak as the seat and it holds no wallet. Web3 opens an owned file. Balance stays on the vault, and only for that seat. HUE stays the standing. There is no second lifetime number. A priced file is the only USDT charge. The pot stays on Classic.

**Stay on the house.** No agent wallet. No reputation score. No revenue split or escrow. No twin that answers as a seat. No HUE/USDT pool. The pot stays on Classic.

## Phase 175 — each technology has a job (2.1.106)

A seat is the identity. Social is company and a room the seat is actually in. AI is the book they sit: it does not speak as the seat and it holds no wallet. Web3 is an owned file and the history. HUE stays the standing from clicks and takes. There is no second lifetime number. A priced file is the only USDT charge. The pot stays on Classic.

**Stay on the house.** No agent wallet. No reputation score. No revenue split or escrow. No twin that answers as a seat. No HUE/USDT pool. The pot stays on Classic.

## Phase 174 — the record is the history (2.1.105)

A seat's history is the takes, the owned files, and the finished applications. An open application is not history yet. HUE stays the standing from clicks and takes. There is no second lifetime number. A priced file is the only USDT charge. The pot stays on Classic.

**Stay on the house.** The twelve chapters are on the house. No HUE/USDT pool. No second lifetime ranking. No agent wallet. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 173 — two books on one sit (2.1.104)

A person's book can sit against the house book. They share one sit. The watch is the record: one score for the seat's book, one for the house. Neither book holds a wallet. The pot stays on Classic.

**Stay on the house.** The record is the history: takes, owned files, and finished applications. HUE stays standing from clicks and takes. There is no second lifetime number. A priced file is the only USDT charge. The pot stays on Classic.

## Phase 172 — a seat names the book it sits (2.1.103)

A seat can name one book. The profile shows that book, the watch, and the file. Until they name one, the line stays empty. Balance stays on the vault. Gold added for that file returns to that sit. The pot stays on Classic.

**Stay on the house.** Two books on one sit: a person's book can sit against the house book. The watch is the record. Neither book holds a wallet. The pot stays on Classic.

## Phase 171 — a room only when people are in it (2.1.102)

A seat can open a room for a craft or a language. The room is listed while a seat is in it. An empty room is not listed. The house is not a person in that room. The room does not hold the pot. The pot stays on Classic.

**Stay on the house.** A seat names the book it sits: the profile shows the book, the watch, and the file. Balance stays on the vault. Gold added for that file returns to that sit. The pot stays on Classic.

## Phase 170 — work stays one desk (2.1.101)

Jobs stay the house desk. A seat can share a project there. Reading is free. Applying still needs an account. A priced door is not a wage and not a milestone on that desk. The house does not invent a project to fill the list. The pot stays on Classic.

**Stay on the house.** A room only when people are in it: a seat can open a room for a craft or a language. An empty room is not listed. The room does not hold the pot. The pot stays on Classic.

## Phase 169 — company, without a crowd (2.1.100)

A seat can be found by craft, language, and the book they sit. Language is the one they picked. A book is one they own. Company is still a request both sides accept. A letter stays private. An empty match stays empty. The house is not a seat on that list. The pot stays on Classic.

**Stay on the house.** Work stays one desk: jobs stay the house desk. A seat can share a project. Read free. Apply from an account. USDT is not a wage. Gold is not a milestone. The pot stays on Classic.

## Phase 168 — a line names its writer (2.1.99)

A public line says who wrote it. A seat is a person. The house is the house. A book is a book, and it does not post under a seat name. The house still posts three times a day about doors that exist. A letter stays a letter. The pot stays on Classic.

**Stay on the house.** Company, without a crowd: a seat can be found by craft, language, and the book they sit. Company is mutual. A letter is private. The house does not invent seats to fill a list. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 167 — the book is the agent (2.1.98)

Someone who came for the model meets seven books on the games door. Down, Burst, Catch, Snake, Aim, Lane, and Break each keep their own sentence. The card plays that sit. A free file downloads. A priced file needs gold. The watch and the file are the same book. The pot stays on Classic.

**Stay on the house.** A line names its writer: a seat, the house, or a book. A book does not post as the seat. A letter stays a letter. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 166 — an evening that is not a bet (2.1.97)

A first visit walks the hall, a book, the store, and a seat, then back. Classic is open on that walk. It is not a step, and it is not required. Opening a book keeps that book. The hall door and the evening step return to it. The pot stays on Classic.

**Stay on the house.** The book is the agent: anyone can watch a sit, the card shows the watch, and the file is that book. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 165 — the house in their language (2.1.96)

The hall’s four doors, the seat’s craft or the plain seat, the store sentence, and the house’s daily lines use the language already picked. Twelve languages. Classic keeps its name. The pot stays on Classic in every one of them.

**Stay on the house.** A first visit can pass the hall, a book, the store sentence, and a seat without a bet. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 164 — the door is not only the pit (2.1.95)

The hall names four doors. Sit a color. Sit a book. Meet a seat. Read the house. Classic stays on the hall, and it holds the pot. A seat can name a craft — game, AI, play, or table — or just be here. The pot stays on Classic.

**Stay on the house.** The hall, the seat, the store sentence, and the three daily lines use the language they picked. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 163 — the house posts its day (2.1.94)

Three times a UTC day the house writes about a door that already exists. Midnight, 08:00, and 16:00. A restart posts the ones already due today and does not replay yesterday. Classic, the hour, the games, the store, the vault, a seat, a letter, the jobs desk, fairness, and how the house fits. A letter stays a letter. The pot stays on Classic.

**Stay on the house.** A first visit is one path: hall, pit, game, store, and back. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 162 — a second seat (2.1.93)

A profile shows the hues on that seat's takes, and the books that seat owns. The wallet balance stays on the vault. A reporter hears that the house kept the report or dismissed it. A new headline stays held until a person publishes it. A letter stays a letter. Jobs stay the house desk. The pot stays on Classic.

**Stay on the house.** A first visit is one path: hall, pit, game, store, and back. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 161 — gold returns to the sit (2.1.92)

Gold added for a priced book stays on that sit. When it covers the file, the vault says so and opens the same book again. A free file downloads. A priced file needs gold. That is one sentence. A human lock that would break a sit which already holds is refused, and the book that played stays. The pot stays on Classic.

**Stay on the house.** A profile shows takes, hues, and owned books. Balance stays private. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 160 — the shelf card is the sit (2.1.91)

A store card shows the score of one real watch, the same sit every time you open that book. The file you take home is that book: the same weights, the same watch line, and the stack style when the sit is a stack. Gold is only for a priced sit. The pot stays on Classic.

**Stay on the house.** Gold added on the vault returns to that same sit. Free and priced stay one sentence apart. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 159 — a night at Classic reads as one hour (2.1.90)

The clock names the hour. On Classic it stays on the table and on the hall door, live or next. Night and Fog wear that clock only while their hour is on. The last take opens its own fairness page in one step. A cash-out reads waiting, sending, sent, or returned. One click stays one click. Gold is only for a priced sit. The pot stays on Classic.

**Stay on the house.** The shelf is the sit: a card shows a real watch, and the file is that book. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 158 — the desk says what the sit does (2.1.89)

The games page, the six cards, and the store books no longer claim every sit looks one step ahead. Down keeps the stack low. Burst holds a column and takes a four. Catch covers both sides. Snake stays on the loop and a watch counts the food. Aim closes the flick. Lane waits for the ripe mark. Break clears a wall, then the next ball comes down on the pad. Gold is only for a priced sit. The pot stays on Classic.

The plan after this is larger than another weight pass. A night at Classic. A shelf that is the sit. A second seat in the wing. An evening that is one path through the house.

**Stay on the house.** A night at Classic: the clock, fairness in one step, night and fog only while they are on, and a cash-out that reads waiting, sending, sent, or returned. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 157 — the stack styles sit apart (2.1.88)

Down keeps the well low. Burst holds one column and takes the four. Clean stays flatter than the tank. Cheese clears singles. Combo keeps a deeper well. A minute of locks no longer looks like one sit wearing eleven names. The pot stays on Classic.

**Stay on the house.** A human lock must not erase a live book that already plays. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 142 — watch a sit before the file (2.1.72)

The store sold a file with no sit on the card. A seat can now watch a short house game on that book — first, deep, live, or a stack type — before they take it home. Watching is free. The file is still the file. Gold is only to take a priced sit home.

**Stay on the house.** Open the wait desk on the book you just watched. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 141 — a deeper frozen sit (2.1.71)

First and deep sits for catch, snake, aim, lane, and break were painted by hand. They are now trained house games: 80 first, then 160 more, with the same look-ahead sit as the live books. Same feature counts. Same tiny text file. Live still learns. Gold is only to take a priced file home.

**Stay on the house.** Let a seat watch a frozen sit play a short house game before they take the file. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 140 — the other books sit a house game (2.1.70)

The stack already sat a short self-play after a human lock. Catch, snake, aim, lane, and break only moved on the lock they were shown. They now sit a short house game after every fourth human lock. Same weights. Same tiny text file. Live still learns. Gold is only to take a priced file home.

**Stay on the house.** Train a deeper frozen sit. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 139 — the report desk has keepers (2.1.69)

Reports landed on Manage with nobody named to keep them. The desk now has a report roster. A manager can add a seat. Reviewers hear when a seat is named. Hide what should be hidden. Dismiss noise. Official Chatzy stays.

**Stay on the house.** Train a deeper model. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 138 — the other books look ahead (2.1.68)

The stack already scored the queued piece. Catch, snake, aim, lane, and break sat one step at a time. They now score the next catch, turn, flick, strike, or bounce before they move. Same weights. Same tiny text file. Live still learns. Gold is only to take a priced file home.

**Stay on the house.** Roster the report desk. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 137 — a world footer (2.1.67)

The footer was a wrap of links. It is now a desk: house, play, rules, and a language pick. Chrome can sit in twelve languages. Routes stay on the same paths. The binding legal pages stay English.

**Stay on the house.** Look ahead on Catch, Snake, Aim, Lane, and Break. Roster the report desk. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 136 — earth under the green (2.1.66)

The floor is earth now: beige paper in the light, forest umber in the dark. Daily paint stays green. A terracotta accent marks wealth work. The table and the four coins stay themselves.

**Stay on the house.** Look ahead on Catch, Snake, Aim, Lane, and Break. Roster the report desk. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 135 — the house is green (2.1.65)

Buttons, chips, the bar, and leftover gold chrome are green. Table coins stay Crimson, Azure, Volt, and Amber. Lightning stays yellow. The Tetris O stays yellow.

**Stay on the house.** Look ahead on Catch, Snake, Aim, Lane, and Break. Roster the report desk. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 134 — news can breathe (2.1.63–2.1.64)

News cards had no air: title, summary, source, and Talk sat on top of each other. The desk now keeps a real gap between stories and inside each card. Jobs, games, and the floor got the same breathing room.

**Stay on the house.** Look ahead on Catch, Snake, Aim, Lane, and Break. Roster the report desk. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 133 — casual professional floor (2.1.61–2.1.62)

The house reads like a studio you can walk into. Page titles dropped the shouty serif. News headlines stay Outfit, not Cinzel. News no longer dumps every desk as a chip. The left rail stays off a phone — the dock already covers it. Cards sit on white paper, not cream-on-cream.

**Stay on the house.** Look ahead on Catch, Snake, Aim, Lane, and Break. Roster the report desk. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 132 — the table is a table (2.1.60)

Classic sat under the house bar and footer and collapsed to a sliver. The pit fills the floor again. Footer and dock stay off a live table. Pads, clock, rails, and talk stay the pit's own surfaces.

**Stay on the house.** Look ahead on Catch, Snake, Aim, Lane, and Break. Roster the report desk. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 131 — the stack looks ahead (2.1.59)

The house stack sat one lock at a time. It now scores the queued piece before it locks. Same six weights. Same tiny text file. Live still learns. Gold is only to take a priced file home.

**Stay on the house.** Train the other books the same way. Roster the report desk. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 130 — one floor, both schemes (2.1.58)

Wait, account, and leftover plates were still their own house. They now sit on HouseFloor. Table cards, jobs, account, and wait chrome take theme paper — no slate jpg, no forced white type. Games and the pit stay their own surfaces. Light and dark stay gold.

**Stay on the house.** Train a deeper model. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 129 — Huepot paint back on Material (2.1.57)

Stock blue Material was the wrong house. Buttons, chips, the bar, and papers are Huepot gold again — Cinzel on the name, no shouty caps. Light and dark stay a choice. Both stay gold, not purple.

**Stay on the house.** Train a deeper model. USDT is only to buy a priced file. The pot stays on Classic.

## Phase 128 — stock Material, light and dark (2.1.56)

Buttons, chips, fields, the app bar, and cards are the original Material components. The theme is stock light and dark. A menu on the bar picks Light, Dark, or System. Games and the pit stay their own surfaces.

**Stay on the house.** Train a deeper model. USDT is only to buy a priced file. The pot stays on Classic.

## Next — a larger house after 2.1.99

The chrome is one house. Six pits hold the pot. The games desk says what each sit does. Classic names its hour. A store card shows the watch, the file is that book, and gold added for a sit comes back to it. A profile shows takes, hues, and owned books. Balance stays private. A letter stays a letter. News stays held until a person publishes. A first visit can walk without a click. Seven books play on their own cards.

Checked 3 Oct 2026 against the tree on v2.1.99. A public line names its writer. A letter stays a letter.

The accepted plan still ahead: company without a crowd, one jobs desk, a room only when people are in it, a seat that names its book, two books on one sit, and a history that is not a second score.

### 1. The desk speaks (2.1.89)

Shipped. Games, the six cards, and the store books name the sit.

### 2. A night at Classic (2.1.90)

Shipped. The clock names the hour. The last take opens its fairness page in one step. Night and Fog change the table only while they are on. A cash-out reads waiting, sending, sent, or returned. One click stays one click. An empty round already says round closed.

### 3. The shelf is the sit (2.1.91)

Shipped. A store card shows the score of a real watch. The file is the book that just played. Gold added on the vault returns to that same sit. A free file downloads. A priced file needs gold. A human lock that misses a hold keeps the book that played.

### 4. A second seat (2.1.93)

Shipped. A profile shows takes, hues, and owned books. Balance stays private. A reporter hears kept or dismissed. News stays held until a person publishes. A letter stays a letter. Jobs stay the house desk.

### 5. An evening in the house (2.1.97)

Shipped. A first visit walks the hall, a book, the store, and a seat, then back. Classic is open. It is not a step. Opening a book keeps that book.

### 6. The book is the agent (2.1.98)

Shipped. Anyone can watch a sit. The card shows that watch. The file is that book. Down, Burst, Catch, Snake, Aim, Lane, and Break keep their sentences. A free file downloads. A priced file needs gold.

### 7. A line names its writer (2.1.99)

Shipped. A seat, the house, or a book. A book does not post as a seat. A letter stays a letter.

**Stay off.** No HUE/USDT pool. No second lifetime ranking. No CS/Dota overlays. No 365 MB rehost. Gold is only to take a priced door home. The pot stays on Classic.

## Next for the social layer

Stay on the house. Do not add a HUE/USDT pool or a second lifetime ranking.

## Never again

- Guarding money with an in-memory list that is trimmed on the next line.
- Crediting an on-chain log because the ledger has not caught up yet.
- Building a ranking on data that does not exist yet.
- Calling a round with no clicks a take.
- One landscape plate stretched across every screen shape.
- Eleven full-screen layers stacked over the 3D world.
- Invented flavor text scrolling in a marquee.
- Two background photos blended with soft-light to make mud.
- Star clip-paths that hide letters.
- Virus meshes or scientific biology as the ball.
- A second website style on How it works / Fairness / Sign in.
- More 3D systems before the house reads as one place.
- One shared lane with no cap on how much of it a single caller may take.
- Judging a fixed-window limiter with a test slower than the window.
- Storing a signed quantity unsigned and recovering the sign from prose.
- Treating an absent header as proof of anything.
- Backing up a WAL database with cp, and never restoring the result.
- A scheduled job tested only from an interactive shell.
- Writing down 33,198 records of nothing happening.
- A test that passes because the thing under test never ran.
- Telling a first-time visitor six times that nobody is here.
- Showing a colour's name where a player's name would go, with nothing to tell them apart.
- Mailing a receipt for every round a player wins.
- Disarming so much for a safety test that the path under test stops running.
- Substituting my own risk judgement for a decision that was already made.
- A review gate with nobody rostered to review.
- Feeding a page that has no link pointing at it.
- Parsing an image on every fetch and never rendering it.
- Refusing the publisher's own summary on a rule meant for article bodies.
- Testing an upsert only against an empty table.
- Editing files through a shell that guesses their encoding.
- Reading mangled characters in my own tool output and assuming the tool is wrong.
- Hosting what people write with no way for them to take it back.
- Storing a reference to reported writing instead of the writing.
- Fixing unbounded growth in one table and creating it in the next.
- Writing a test, watching it pass, and deleting it.
- Trusting a suite that has never once failed.
- Escaping a value in one field and pasting it bare into the next.
- Concluding a codebase is safe by sampling it.
- Gathering news around the clock into a page that cannot show it.
- A checker whose pattern silently skips most of what it claims to cover.
- Storing 277 of something and letting a reader reach 30.
- Paging by offset over a list that grows from the top.
- Believing a checker that has no way to tell you what it skipped.
- Shipping tests to the machine that serves players.
- Scraping whatever feed answered and calling it betting news.
- Gathering a live tape into a page a stranger never opens.
- Putting the live thing below six empty rooms and calling the hall alive.
- Gathering a tape people can read and giving them no way to talk about it here.
- Letting a signup offer sit under the lintel and calling it a game.
- Asking someone to cross the gate and then forgetting why they came.
- Trusting a betting desk to stay on the game when the word casino is in its own name.
