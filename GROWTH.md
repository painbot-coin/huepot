# Huepot UI Ã¢â‚¬â€ grow into a deep fantasy house

Live: https://huepot.net Ã‚Â· product **v1.3.84**.

This is the look-and-feel plan. The rule stays the same: same price, biggest color takes. The interface grows until Huepot feels like one house you enter Ã¢â‚¬â€ not a SaaS site with a fancy pit in the middle.

## The house

| Room | Route | Feel |
|------|--------|------|
| Gate | `/signin` | Cross in with Google. 18+ on the lintel. |
| Hall | `/` | House pits as doors. Classic is the public pit. |
| Pit | `/rooms/[slug]` | Clock, four hues, talk. You sit a table. |
| Rite | `/how-it-works` | How to enter, sit, strike, and leave. |
| Ledger | `/fairness` | The seed book. Anyone can check a take. |
| Vault | `/invest`, `/withdraw`, `/account` | Gold in, gold out, limits. |
| Wing | `/network`, `/notifications` | Company, letters, notices. |

## What already belongs

- Sharp rectangle frames. Gold inlay. Cinzel on titles.
- One clock needle. Floating energy orbs. No stars. No virus meshes.
- Sit, click, take, cash out Ã¢â‚¬â€ words a stranger already knows.

## Phase 1 Ã¢â‚¬â€ One house (live)

Lobby, rite, gate, ledger, and vault use the same hall chrome as the pit. Frames are sharp rectangles.

## Phase 2 Ã¢â‚¬â€ The pit as a place (live in 1.3.60)

Round state changes the room: gold when open, red in the last 10 seconds, silver fog, winner wash on a take. Light and a short line name the mood. Urgent tick while time is short. Pads stay locked. No extra 3D toys.

## Phase 3 Ã¢â‚¬â€ Each pit a character (live in 1.3.61)

Classic, Lightning, Duo, High, and Fog each have a mark plate, a hall color, and an enter line. Guest tables stay doors.

## Phase 4 Ã¢â‚¬â€ Deep game feel (live in 1.3.62)

A take is a rite. Cash-out is leaving the vault. Fairness is a ledger of real pages only. No fake proof rows.

## Phase 5 Ã¢â‚¬â€ You live here (live in 1.3.64)

Network, notices, and create-room belong to the same house. The wing is Board, Company, Letters, Seat. No LinkedIn pills. No star clips on notices. No extra 3D.

## Phase 6 Ã¢â‚¬â€ The lintel (live in 1.3.65)

Header, search, age, talk compose, and fields are the doorframe. Sharp. Rite in the nav. Find a table or a seat. No extra 3D.

## Phase 7 Ã¢â‚¬â€ The seat (live in 1.3.66)

The gate, the sit CTAs, account cards, pit tabs, and the raise-a-table door are house furniture. Sharp rectangles. Cross with Google. Seat limits. No extra 3D.

## Hold Ã¢â‚¬â€ The house holds (1.3.67Ã¢â‚¬â€œ1.3.68)

The wing no longer talks LinkedIn. Hall doors do not lift. Pit room rows are square. Raise a table is the name of that door. The hall shows doors first, then last takes and cash-outs. No extra 3D.

## Phase 8 Ã¢â‚¬â€ The hour (shipping in 1.3.69)

Classic hour and Fog cup change the hall and the pit. The door names the hour. The room golds or silvers when it is on. Last 15 minutes the door says soon. No extra 3D. No fake rows.

## Phase 9 Ã¢â‚¬â€ The quiet house (shipping in 1.3.70)

One world, not eleven layers. The backdrop is a single dark hall plate. The arena floor is a gold-inlay chamber. Every panel is the same slate material.

Cut: the rainbow prism, the diagonal shine sweep, the five pinned sparkle PNGs, two of four aurora blobs, the ambient star dust on every page, the flavor-text ticker, the pinned hero gem images, the animated wordmark.

Cut in 3D: the sixteen-node constellation web and its lines, one of three rings. Dust 260 Ã¢â€ â€™ 90. Bloom 0.48 Ã¢â€ â€™ 0.26. Lights roughly halved.

Kept: the 3D world, the pit, the crystal, the floating orbs, one clock needle, and the take burst Ã¢â‚¬â€ a take still throws sparks and coins.

## Phase 10 Ã¢â‚¬â€ The narrow house (shipping in 1.3.71)

The house has to be a place on a phone too. `cover` on a portrait viewport crops the wide hall plate down to its empty middle, so phones were reading the backdrop as flat black.

Taller-than-wide viewports now get a hall plate composed for that shape: columns down both edges, one tall window high up, dark where the content sits. Art direction by aspect ratio, not width.

Checked at 390px: the pit has no horizontal scroll, the clock and the 2Ãƒâ€”2 orb grid read, hue names sit under the orbs, the rite marks wrap 3+2.

## Phase 11 Ã¢â‚¬â€ An empty round is not a take (shipping in 1.3.72)

Watched a real round settle on Lightning. On a quiet table almost every round ends with nobody clicking, and the pit was announcing all of them as **THE TAKE Ã‚Â· 0.00 USDT**, dimming all four orbs like losers and washing the pads gold. That is the state a new visitor sees most often, and it cheapened the real thing.

A round with no winner now reads **Round closed** with "Nobody clicked. The board comes back." The room goes neutral grey instead of take-gold, the orbs stay lit because nobody lost, and the gold pad wash only fires when a color actually took the pot. The particle burst was already correct Ã¢â‚¬â€ it only ever fired on a real winner.

Also: the pit had a horizontal scrollbar, because the rotating clock needle pokes a few px past its box. Clipped on `.pit-main` instead of clipping the needle.

## Verified signed in (1.3.72)

The signed-in rooms were unverified for several phases. Closed that with a local dev server and a minted session instead of guessing.

Recipe, for next time:

- `node_modules/next/dist/bin/next dev --port 3000` with `PRODUCT_MODE=0` so `cookieSecure()` is false and the cookie works over http.
- Sessions are a plain table: insert `token/userId/expiresAt/createdAt/userAgent`. Use raw SQL Ã¢â‚¬â€ the local db predates the BigInt widening, so the Prisma client rejects `createdAt` on write.
- Age lives in the `auth` JSON column as `ageConfirmedAt`; `balance` is integer cents.
- Drive it with PowerShell `Invoke-WebRequest` and a `huepot_session` cookie. **The IDE browser cannot reach the host's localhost on any port**, so screenshots of local pages are not possible. Only the live site can be photographed.

Results: `/account`, `/invest`, `/withdraw`, `/network`, `/network/messages`, `/network/people` and `/notifications` all render signed in. No stray rounded corners in those components Ã¢â‚¬â€ they inherit the slate material through `.app-page`, `.app-card`, `.li-card` and `.ledger-row`, which is why the Phase 9 pass reached them for free.

A real take, driven through the click API: pot 4.00, Crimson 3 clicks against Azure 1, `kind: "take"`, winner `crimson`, payout 3.95, seed opened on settle. The money is exact Ã¢â‚¬â€ losing pot 1.00, house 5% is 0.05, winner takes back 3.00 plus 0.95. So both settle branches are now proven: the winner path by data, the no-click path on the live site.

One false alarm worth remembering: `/network/people` returned a 500 once. It was Turbopack's `EBUSY` rename on the slow `F:` drive from two dev servers sharing `.next`, not an app fault. It returns 200 on retry.

## Phase 12 Ã¢â‚¬â€ The record (shipping in 1.3.73)

Goal: the wing should be where bettors go to see who actually wins, not a generic network. The atom of that is a real record on every seat.

Surveyed production first, because a ranking table built on nothing is a lie. What is actually there: 11 users, 30,496 settled rounds of which only **19 are takes**, 111 clicks, 0 withdrawals Ã¢â‚¬â€ and **one player has ever clicked**. So a leaderboard would be a one-row table. The record per seat is the honest version of the same data, and it reads correctly at one player or ten thousand.

A seat now shows takes, USDT taken, biggest single take, colors struck, and the hue it favours. Derived from real `Tx` rows. A seat with no rounds says so.

**Privacy line, do not cross:** wins and activity only. Takes are already public Ã¢â‚¬â€ the room feed announces them and every take has a shareable page Ã¢â‚¬â€ so this reveals nothing new. Balance, net position and losses stay private. Never add them to a public profile.

The hue a seat favours is counted from the click note (`Clicked <Hue> in <Room> #<n>`), so no schema change was needed.

## Phase 13 Ã¢â‚¬â€ Show the real takes (shipping in 1.3.74)

The house had 19 real payouts and **showed none of them**. Both public proof surfaces were broken the same way, and it was a windowing bug, not a data problem.

`listPublicTakes` scanned only the 24 most recent settled rounds. Rounds settle every 15Ã¢â‚¬â€œ60s across six rooms and 30,477 of 30,496 are empty, so that window is *always* empties and `takeFromSettled` returned null for every one. The hall's "Last takes" strip could never display a take, forever. `/api/fairness` had the same flaw at 40 rows, so the ledger was a wall of empty rounds with the real takes buried thousands of rows deep.

`listSettledRounds` now accepts a `kind`, and both surfaces ask for takes. The ledger also states how many rounds settled in total, so filtering to takes hides nothing.

For a product trying to attract its second bettor this was the most damaging bug in it: real proof of payout existed and a visitor saw "no takes yet".

With the takes finally visible, a second bug showed up in 1.3.75: the ledger's amount column was `losingPot`, not what the winner collected. So the same round read **7.90 USDT** on the hall strip and **2.00 pot** in the ledger, and rounds where the losers barely clicked read **0.00 pot** Ã¢â‚¬â€ which looks broken on the one surface whose whole job is trust.

`settledTakeAmount` in `lib/fairness.ts` is now the single definition of a take amount Ã¢â‚¬â€ losing pot after the house take, plus the winners' own stakes back Ã¢â‚¬â€ and both the hall strip and the ledger use it. Keep it that way: two surfaces quoting different numbers for one round is worse than either number being imperfect.

## Phase 14 Ã¢â‚¬â€ The brag (shipping in 1.3.77)

The take page is the only public artifact a player can share, so it is how the second bettor arrives. Its share image was a default `next/og` card: system sans, flat background, and **no trace of the winning color** Ã¢â‚¬â€ in a game entirely about color.

Now the hue is the hero. The winning color drives a left edge bar, a marker, the headline and a background glow, with the amount huge in Cinzel and `huepot.net` in the corner so a stranger knows where to go.

Notes worth keeping:

- Cinzel had to be **bundled** at `public/fonts/cinzel-700.ttf`. `next/font` cannot be read at runtime and `next/og` needs the raw file. It is OFL licensed; recorded in `public/fx/SOURCES.txt`.
- Supply every font a card needs. Satori falls back to whatever you give it, so providing only Cinzel put the body copy in serif caps too. The fix was to drop the long body copy rather than bundle a second face Ã¢â‚¬â€ a brag card wants few words.
- **Do not put a photograph in an OG image.** Embedding the chamber plate pushed the PNG from 43kB to **755kB**; `ImageResponse` only emits PNG, which is wrong for photos. Gradients plus a hue glow land at ~80kB and look better.
- The take page title was a whole sentence including the Fog cup schedule. Shortened to `<Hue> took <amount> USDT Ã‚Â· <Room>`, and the body no longer repeats its own headline.

Verified locally against two real takes before shipping Ã¢â‚¬â€ Crimson 3.95 and Amber 67.15 Ã¢â‚¬â€ which also re-confirms `settledTakeAmount` by hand: (100Ã¢Ë†â€™5)/100 + 3 = 3.95, and (3700Ã¢Ë†â€™185)/100 + 32 = 67.15.

## Phase 15 Ã¢â‚¬â€ Provable, not just claimed (shipping in 1.3.78)

Both the ledger and the share card end in "Open the ledger", so `/fairness/[id]` is the last link in the trust chain. It verified correctly Ã¢â‚¬â€ all three checks passed on the real production take Ã¢â‚¬â€ but it printed the commit and digest **truncated** (`c11c2d28Ã¢â‚¬Â¦f9ac`). A hash you cannot see in full is a hash you cannot recompute, so "provably fair" was a claim rather than a proof.

The page now prints the seed, the full commit, the **exact settle line that gets hashed**, and the full digest. Anyone can paste the line into any sha256 tool and land on the digest.

`fairPreimage` is now the single place that settle line is built, and `fairDigest` hashes its output. The displayed string cannot drift from the hashed string, because they are the same function.

Checked independently against every real take before shipping: **19/19 commits and 19/19 digests reproduce** from a standalone script using node's `crypto`, outside the app's own code.

### The trap in `payoutPerWinningClick`

Adding a per-click line nearly shipped a false impression. That field is a **floor** (`clickPrice + floor(distributable / winningClicks)`), and the digest commits to it Ã¢â‚¬â€ but the actual payout distributes the leftover cents via `splitCentsByClicks`. For round #8584 the floor is 1.31 with 6 winning clicks, so a reader multiplying gets 7.86 against an advertised 7.90 and concludes the house is shaving 4 cents.

It is labelled "Floor per winning click" with a note that leftover cents go to winning seats. On a trust page, a number that invites a wrong subtraction is worse than no number.

## Phase 16 Ã¢â‚¬â€ Found and shareable (shipping in 1.3.79)

Phase 14 gave a take a share card, but the most-shared URL is the bare domain, and **`huepot.net` had no share image at all** Ã¢â‚¬â€ posting it in a chat produced a naked link. There was also no `robots.txt` and no `sitemap.xml`, both 404.

Shipped:

- A house share card at the root: gold rule, Cinzel, the four hue coins, `huepot.net`. Gradients only again, ~88kB.
- `robots.ts` allowing the public house and **disallowing `/api/`, `/staff`, `/account`, `/invest`, `/withdraw`, `/notifications`, `/network`** Ã¢â‚¬â€ a player's vault and wing are nobody else's business.
- `sitemap.ts` with the hall, rite, ledger, gate, terms, privacy, the five house pits, and every real take with its ledger page. Guest tables are left out because they fall when their live time ends.
- The root title was "Huepot Ã¢â‚¬â€ the house", which is the voice but tells a stranger nothing. Now "Huepot Ã¢â‚¬â€ same price, biggest color takes", with a `%s Ã‚Â· Huepot` template so child pages keep their own title and gain the brand.

Verified locally before shipping: robots.txt renders the rules, sitemap.xml lists 17 URLs against the local database, and the house card renders at 1200x630. The first render wrapped its footer line into the domain, so that copy got trimmed.

## Phase 17 Ã¢â‚¬â€ HUE, the house coin (shipping in 1.3.80)

A coin was asked for. This is the off-chain half, and it was built first on purpose.

**The rule:** `1 HUE a click, 10 HUE a take.` Ranks in house voice Ã¢â‚¬â€ Unmarked, Seated, Marked, Gilded, Gold-handed, House name. A seat shows its HUE, its rank, and how far to the next one.

**It is derived, never stored.** HUE is computed from `Tx` rows inside the existing record query, so it costs no extra queries, applies retroactively to everything already played, cannot drift from what a seat actually did, and cannot be minted by accident. No schema change was needed.

### The line HUE must not cross

HUE is **standing, not money**. No USDT rate, not withdrawable, and it buys nothing priced in USDT. Attaching a cash value, a payout or a rake share changes what it legally *is* Ã¢â‚¬â€ a token drawing value from a gambling house's revenue is treated as a security in many jurisdictions, and gambling plus token issuance is heavily regulated on top of that. That is a decision for the owner with advice, not a code change. It is written at the top of `src/lib/coin.ts` for whoever reads it next.

### Why off-chain first

- Reversible. No contract, no gas, no liquidity, no audit.
- **Zero withdrawals have ever completed.** The USDT cash-out path is still unproven, and a second currency on top of an unproven payout is a roof on an unbuilt wall.
- It establishes the earn curve with real play, so an on-chain HUE later has something behind it rather than a guess.

Verified before shipping: 7/7 rule checks including the real production case Ã¢â‚¬â€ 111 clicks and 19 takes give 301 HUE, Gilded, 99 to Gold-handed.

## Phase 18 Ã¢â‚¬â€ HUE on chain (contract done, not deployed)

Real BEP-20 requested, distributed as a play bonus, with a market price. `contracts/HuepotCoin.sol`, 12 tests passing on a local EVM. **Nothing is deployed** Ã¢â‚¬â€ that needs a treasury key and is the owner's call.

**Fixed supply, no mint, no owner, no pause, no blacklist, no upgrade.** 1,467 bytes of runtime. A coin a house hands out is only worth holding if the house cannot print more of it or freeze it, so every admin hook was left out. Bonuses are paid by **transferring from a treasury balance**, never by minting Ã¢â‚¬â€ the pool is visibly finite on chain and supply is conserved on every payout.

Deploy guards: mainnet refuses without `COIN_CONFIRM_MAINNET=yes`, and the **destination is checked before the key**, so a misdirected mainnet run fails on the destination rather than on a missing signer. Both guards verified independently.

Lesson worth keeping: I installed a standalone `solc` alongside Hardhat, it drifted to 0.8.26 against the contract's pinned `0.8.24`, and the compile broke while Hardhat's own run passed. Two compilers that can disagree is a footgun. `solc` was removed Ã¢â‚¬â€ Hardhat is the only compiler, with the version pinned in config so the bytecode stays reproducible for BscScan verification.

### Still to do before HUE is real

1. Deploy to **testnet** (chainId 97) with a faucet-funded key.
2. Wire the bonus: `record.coin` is earned standing; paying it out on chain needs a claim table so nothing is double-sent Ã¢â‚¬â€ the existing `Withdrawal` queue is the right shape to copy.
3. Treasury key must stay **off the web server**. Payouts should be signed by a separate limited hot wallet topped up from treasury.
4. A price requires funding a HUE/USDT liquidity pool. Code cannot create one.
5. Legal advice before mainnet. See `contracts/README.md`.

## Phase 19 Ã¢â‚¬â€ Level, daily and weekly tasks, bonus (shipping in 1.3.81)

**Daily:** sit a round (1 click, +5), strike ten (10 clicks, +15), take a pot (1 take, +25). Resets 00:00 UTC.
**Weekly:** fifty strikes (+60), three takes (+100). Resets Monday.
**Level** is the HUE rank's position, so there is one progression and not two competing ones.

### Why there is no claim button

Progress and completion are **derived from `Tx` rows** Ã¢â‚¬â€ a task is complete because the play happened. Nothing is stored and nothing is claimed, so a bonus cannot be double-claimed, cannot be granted by mistake, and applies retroactively to every day already played. No schema change touched the live money database.

The subtle part: the bonus is summed over **every past day and week that met a target**, not just the current window. Had it only counted the active window, a player's HUE would drop every midnight. Coin has to be monotonic, and there is a check for exactly that.

Real production result: `bill` played 4 days across 1 week Ã¢â‚¬â€ 111 clicks, 19 takes, 325 bonus Ã¢â€ â€™ **626 HUE, Level 5 Gold-handed**, up from 301 on play alone.

Verified: 20/20 logic checks, including Monday week alignment against four real Mondays from 1970 to 2026 (`weekIndex = floor((dayIndex + 3) / 7)`, since epoch day 0 is a Thursday), plus the bucketing SQL run against production.

## Phase 20 Ã¢â‚¬â€ The books (shipping in 1.3.82)

Accountant and management, as a `books` tab on the existing staff console. Read-only, derived from `Tx`, `Withdrawal`, `User.balance` and the on-chain treasury. Nothing in `lib/books.ts` writes. The staff console was **not restyled** Ã¢â‚¬â€ the new tab uses the chrome that was already there.

Two headline numbers, because they are the only two that can sink the house:

1. **Cover** Ã¢â‚¬â€ treasury USDT minus what is owed to players. Negative means the house cannot pay everyone out.
2. **Reconciliation** Ã¢â‚¬â€ every balance rebuilt from its rows and compared to the stored balance. Money leaving a balance without a `Tx` row is the one fault that hides all the others, so it is recomputed every time the books are opened.

Plus today/this-week operating counts (clicks, takes, rake, deposits, active seats), all-time money lines, account counts, and withdrawal status totals.

### It found something on the first run

The ledger is internally perfect: 111.00 staked = 109.30 paid + 1.70 rake, to the cent.

But **balances are 10.00 USDT short of the ledger**. Localised to one account: `bill` holds 8.30 while his rows imply 18.30. Zero orphan rows, and the house account reconciles exactly. So 10.00 left a balance without a matching `Tx` row Ã¢â‚¬â€ most likely a direct balance write during an early migration or dev reset, since a staff adjustment would have written an `adjust` row and there are none.

The direction is safe for the house (it owes less than the ledger says, not more) but the player is short, and an unexplained gap on a real-money ledger should not stay unexplained. It is now visible on the books tab instead of invisible.

## Phase 21 Ã¢â‚¬â€ The cash-out path, exercised (1.3.83)

Zero withdrawals had ever completed, so the payout path was the largest untested risk in the product. Everything up to the on-chain send is now exercised against a local server. **It works.**

| Case | Result |
|---|---|
| 1 USDT (min is 5) | rejected, no debit |
| malformed address | rejected, no debit |
| more than balance | rejected, no debit |
| non-BSC network | rejected, no debit |
| balance after 4 rejections | unchanged Ã¢â‚¬â€ no partial debits |
| 25 USDT valid | debited exactly, row `queued` |
| staff rejection | **balance refunded exactly** |
| 2500 (per-send max 2000) | rejected |
| 2000 + 2000, then 2000 | third rejected at the 5000 daily cap |
| 1000 to land on exactly 5000 | accepted, then even 5 more rejected |

`withStore` snapshots and restores on throw, so a failed payout insert rolls the debit back rather than losing a player's money.

### What I got wrong, twice

**My safety override did not take effect.** I blanked `WITHDRAW_KEY` and `BSC_RPC_URL` in the shell to guarantee no chain contact, but `.env.local` values were used anyway, so a real BSC mainnet RPC connection was attempted with the live house key. **Nothing was broadcast** Ã¢â‚¬â€ `txHash` stayed empty, and production's `Withdrawal` table is still empty. Next time, assert `withdrawSendEnabled() === false` before touching a money path instead of assuming an env override worked.

**I misdiagnosed a wedge.** A row sitting at `sending` with no `txHash` looked like a permanent trap, because rejection requires `queued`. It is not: `sendQueuedWithdrawal` already has a `catch` that reverts `sending` Ã¢â€ â€™ `queued` whenever no hash exists. What I saw was an in-flight attempt hanging on an unreachable RPC.

### Fixed

The withdrawal note now moves with terminal status Ã¢â‚¬â€ `Sent on chain` / `Rejected by staff Ã‚Â· balance refunded` Ã¢â‚¬â€ so the books never show a rejected row still reading "Queued for send". Deliberately **not** applied to `sending`, because that state gets reverted and the note would then lie.

### Left alone on purpose

Staff cannot reject a payout while it is `sending`. That looks awkward but it is right: once `tx.send` may have broadcast, refunding could pay twice. Do not "fix" it.

Still untested: the actual on-chain transfer. It needs a funded house wallet.

## Phase 22 Ã¢â‚¬â€ The Fog Pit holds (verified, no change needed)

A betting game that only *visually* hides information is not hiding it Ã¢â‚¬â€ anyone with devtools reads the network response and plays with an edge worth real money. So the Fog Pit was checked properly, with actual clicks in an actual fog window.

Measured during fog with 3 clicks in the pot:

| View | Per-colour counts | Other seats | Own clicks |
|---|---|---|---|
| Anonymous observer | `0 0 0` | `0` | Ã¢â‚¬â€ |
| The player | `0 0 0` | hidden | `c=2 a=1` |

Correct on every axis. `publicRound` zeroes per-colour totals server-side (`totals: fog ? emptyColorCounts() : ...`), `toSeats` hides other seats via `hide = fog && !you`, and `yourClicks` still reports your own so the game stays playable. `totalClicks` and `pot` stay visible on purpose: you know the size of the stake, never the split.

The SSE route matters here too and is safe Ã¢â‚¬â€ `/api/rooms/[slug]/live` serialises through the same `getRoomState` / `snapshotRoomState`, so the stream cannot leak what the poll hides.

**Do not "optimise" this.** Sending real totals and hiding them in the client would silently turn the Fog Pit into a cheat.

## Phase 23 Ã¢â‚¬â€ The deposit path, and what it turned up (1.3.84)

Withdrawals were exercised in 1.3.83; deposits are the other money direction, and the question that matters is whether one on-chain transfer can be credited twice.

**The live guards work.** Verified locally: `UNIQUE(txHash, logIndex)` on `ChainDeposit` rejects a replay outright, and both `depositAlreadyCredited` and `creditConfirmedDeposit` key on the tx hash, which real chain credits do write into the note. Also confirmed `persistStore` only ever **inserts** `Tx` rows and never deletes, so the database keeps full history Ã¢â‚¬â€ which matters, because the reliable guard queries the database while the in-memory array caps at 400.

### It had already happened once

Production holds **two deposit rows with the identical tx hash** and only **one** `ChainDeposit` row. One 10.00 USDT transfer, counted twice in the ledger.

The arithmetic closes exactly:

```
2 deposits (ledger): 20.00 Ã¢Ë†â€™ 111.00 + 109.30 = 18.30
1 deposit  (chain) : 10.00 Ã¢Ë†â€™ 111.00 + 109.30 =  8.30
bill's real balance                          =  8.30
```

### Correcting Phase 20

Phase 20 reported this drift as "the player is short". **That was wrong.** The balance is right to the cent; the *ledger* carries a phantom deposit row. Nobody is owed money Ã¢â‚¬â€ the deposit total is overstated by 10.00.

Most likely a legacy-import artifact: `persistStore` inserts `Tx` by id, so one logical deposit re-imported under a second uuid produces two rows without a second balance credit. That also fits the balance being correct. *(Phase 24 disproved this Ã¢â‚¬â€ the two rows are 283 ms apart. It was a race in the credit path.)*

The books now detect this class permanently: deposit rows grouped by note, any hash appearing more than once reported with the overstated amount. The duplicate row is **not** deleted Ã¢â‚¬â€ that is a money-ledger write and the owner's call.

### Known gap, acceptable

The demo credit path in `auth.ts` writes a note with no tx hash, so demo deposits are not idempotent. It only runs when `demoMoneyEnabled()`, which is false in production.

## Phase 24 Ã¢â‚¬â€ Two clicks at once, and the deposit race (1.3.85)

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

All of the above rests on a single process owning the store. Production runs `instances: 1, exec_mode: fork` and one `next-server` holds `huepot.db`. A second `next-server` on the box for three days is **a different app** Ã¢â‚¬â€ Docker container, `/app`, its own Postgres, port 3001. Not ours.

### What the deposit duplicate actually was

Phase 23 guessed a legacy-import artifact. **Wrong.** The two rows are 283 ms apart:

```
14:32:42.263Z  10.00  0x223d5bÃ¢â‚¬Â¦
14:32:42.546Z  10.00  0x223d5bÃ¢â‚¬Â¦
```

Both well inside the newest-400 window, so no memory blindness Ã¢â‚¬â€ a race in `creditLog`. Two attempts on one log: the first won the `ChainDeposit` insert and credited; the second lost the insert, asked the Tx table whether a credit existed, found none *because the first had not persisted yet*, and credited too.

Two holes, both closed:

- **Crediting on a failed insert.** One recorded log now means one credit. A failed insert only proceeds when the row is older than ten minutes with still no credit Ã¢â‚¬â€ a real loss, not one in flight.
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

The balance never moved, which is the whole point Ã¢â‚¬â€ the row was the lie, not the money.

### Which uncovered a false alarm in the books

With the duplicate gone, `drift` still read 3.40. It reconciles per account like this:

```
account   balance   from rows     gap   rows
bill         8.30        8.30    0.00    131
house        1.70       -1.70    3.40     11
```

bill Ã¢â‚¬â€ the only real player Ã¢â‚¬â€ is exact to the cent: 10.00 deposited plus 109.30 taken minus 111.00 clicked is 8.30. The whole gap sat on the house, and the doubling gives it away: 1.70 of rake counted as Ã¢Ë†â€™1.70.

`implied` treated `rake` as money leaving. A rake row is only ever written on the house account, where it is the take arriving. Fixed, and `drift` now reads 0.00 Ã¢â‚¬â€ which matters, because a reconciliation that always shows a number is a reconciliation nobody reads.

## Phase 25 Ã¢â‚¬â€ The house under a crowd (1.3.87)

The queue that keeps money safe is also the only lane every request drives in. Nobody had timed it.

### What it cost, measured on the live box

```
no store at all                p50    6 ms
withStore, tiny payload        p50  134 ms
withStore, room state          p50  133 ms
withStore via the read path    p50   29 ms
```

The payload is irrelevant Ã¢â‚¬â€ `/api/auth/me` returns one object and still took 134 ms. The cost was the machinery: `withStore` deep-clones the whole store, then `persistStore` opens by serialising it **twice** to decide whether anything changed.

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
classic 5171 Ã‚Â· lightning 2784 Ã‚Â· duo 2308 Ã‚Â· high 1874 Ã‚Â· crazy 1870 Ã‚Â· fog 232
```

14,239 events, about 1.6 MB of text, cloned and serialised on every single request. The local copy had 43,722.

### The fix

A room now loads only its newest `ROOM_EVENT_CAP` events Ã¢â‚¬â€ the same cap the writer already enforces, named once so the two cannot drift Ã¢â‚¬â€ and the query takes only that many per room, so boot does not slow down as the table grows. Measured on the local copy, 43,722 events:

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

Every request Ã¢â‚¬â€ reads included Ã¢â‚¬â€ takes the same lane, because `getRoomState` ticks the round and may settle it. The store is a single process by design, which is what makes the queue a lock at all. That ceiling is now ~169 req/s per box instead of 5, but it is still a single lane, and the next wall is the same one.

## Phase 26 Ã¢â‚¬â€ What else the store was carrying (1.3.88)

Phase 25 fixed room events. The same shape existed three more times, and one of them was showing players the wrong thing.

### The inbox was serving the oldest notices

`notify` prepends and keeps the newest 500. `readStore` read **every** notice, oldest first. `userNotices` filters without sorting, and the route takes the first 40 Ã¢â‚¬â€ so after every restart a player's inbox showed their forty *oldest* notices until enough new ones arrived to push them out.

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

Everything the store holds is bounded except the things that should grow with the house Ã¢â‚¬â€ accounts, their wallets, and the rooms themselves:

```
users, wallets, rooms, seats   grow with the house, as they should
sessions, oauth states         live rows only
notices                        newest NOTICE_CAP
room events                    newest ROOM_EVENT_CAP per room
txs                            newest 800
rounds                         one per room
```

No table is pruned of history it should keep: notices and events stay in the database, and only unusable login rows are deleted.

## Phase 27 Ã¢â‚¬â€ A limit you cannot undo in the moment (1.3.89)

The play limits had never been exercised. Most of them hold: a cool-off stops play *and* deposits, neither cool-off nor self-exclusion can be shortened, and `assertCanCash` deliberately still lets a self-excluded player withdraw Ã¢â‚¬â€ they should always be able to take their money out. Two things did not hold.

### The cap could be undone the instant it bit

```
cap set to 2.00
  click 1 : accepted
  click 2 : accepted
  click 3 : refused Ã¢â‚¬â€ "Daily loss cap is 2.00. Take a break or raise it tomorrow."
raising the cap, right then:
  accepted, cap is now 50.00
  click straight after : ACCEPTED
```

The message said tomorrow. The code said now. A player chasing a loss could lift their own limit in one request, at the exact moment it existed to stop them.

Tightening is what a player needs in the moment; loosening is what they need protecting from. So a stricter cap takes hold at once, and a looser one Ã¢â‚¬â€ including removing it Ã¢â‚¬â€ waits a day, with the pending change shown on the seat so nobody is guessing:

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

`notePlayTx` kept one running total per player and only ever added to it. Nothing rolled off, so a day's loss stayed counted until the process restarted Ã¢â‚¬â€ a cap that quietly became permanent, and one that only looked right because deploys restart the process often.

Loss is now kept in hourly buckets, summed over the window and walked in order so it holds at zero: a player who is ahead cannot bank the winnings as extra room to lose, but coming back from a win still counts. Verified on a clean window:

```
click 1: accepted   loss 1.00
click 2: accepted   loss 2.00
click 3: REFUSED    loss 2.00
```

### What cost the most time here

Two test runs looked like failures and were not. Payouts kept landing in the window from rounds whose clicks I had cleared, so the day's net loss legitimately read zero and the cap correctly declined to bite. The measurement was wrong, not the house. Worth remembering: with one player in a pit, that player wins nearly every round back and only ever loses the rake, so a loss cap takes a long time to bite.

Also worth knowing: `jsonError` masks anything matching `prisma|sqlite`, so a database fault surfaces as a bare "Request failed". That is right for players and slow for whoever is debugging.

## Phase 28 Ã¢â‚¬â€ The address a caller chose for itself (1.3.90)

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

`$proxy_add_x_forwarded_for` appends the real address to whatever the caller sent, and the app read the **first** entry Ã¢â‚¬â€ the caller's. It preferred the one header a caller controls over the one it cannot.

Proven against a live gate allowing `198.51.100.4` only, from `203.0.113.7`:

```
claiming 1.1.1.1 (not allowed)   BLOCKED     <- the gate is real and reading the claim
claiming 198.51.100.4            through     <- walked past it
claiming 127.0.0.1               through     <- and this works against any list
```

`127.0.0.1` is allowed unconditionally so the owner can reach staff over a tunnel, which made it a skeleton key for every allowlist.

### What it reached

That one value gated four things: the staff IP allowlist, staff session pinning, the chain-scan trigger, and the staff page. It also keyed the login limiter and was written into the staff audit log Ã¢â‚¬â€ an attacker-chosen address in the record of who did what.

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

**The way in**, since the door is now shut from the internet Ã¢â‚¬â€ `next start` binds to `127.0.0.1:3000`, so the tunnel lands where the app is listening:

```
ssh -i ~/.ssh/huepot_we4u -L 3000:127.0.0.1:3000 root@159.223.173.219
# then open http://localhost:3000/staff
```

Verified before trusting it: the tunnel route reaches the staff sign-in while the public route does not. The previous `.env.local` is kept at `/root/env.local.before-staffips`, and the rollback runs automatically if the tunnel route ever fails that check.

### Note to whoever tests this next

Three runs of this said "no gap" and were wrong: a stale `next start` from an earlier phase still held port 3000 and answered every request. Kill the old server and confirm the port is free before trusting a security result. Also `staffIpAllowed` returns true when `STAFF_IPS` is empty, so an unconfigured gate looks identical to a passed one.

## Phase 29 Ã¢â‚¬â€ What a player can type (verified, no change needed)

The house writes raw SQL in a lot of places, and player text reaches some of it. Nothing broke, and this is the reasoning and the evidence, because "we looked and it was fine" is worth nothing without both.

### Why the raw SQL holds

Every escape helper is `value.replace(/'/g, "''")`, which is the correct escape for a single-quoted SQLite literal Ã¢â‚¬â€ SQLite has no backslash escapes to work around. Player text either goes through that inside quotes, or is bound as a `?` parameter, or reaches Prisma's tagged templates, which bind rather than interpolate.

The interpolations that sit **outside** quotes were the ones worth reading, since an escape does nothing there. All of them are server constants or clamped numbers:

```
fairness   LIMIT ${limit}          Math.max(1, Math.min(80, take)), take is a literal 40
staff log  LIMIT ${take}           Math.max(1, Math.min(120, ...))
sweeps     LIMIT ${...}            Math.max(1, Math.min(40, take))
record     SELECT ${hueSums}       built from the fixed COLORS list, userId bound as ?
store      day/window arithmetic   module constants
```

### What was actually thrown at it

Ten payloads Ã¢â‚¬â€ quote break-outs, `'; DROP TABLE Tx; --`, `' UNION SELECT balance FROM User --`, script and `onerror` tags, a backslash quote, template braces, a null byte Ã¢â‚¬â€ at the public fairness slug, search, profile fields, room chat, and network posts.

Everything came back as text, exactly as sent:

```
chat    '; DROP TABLE Tx; --                stored: "'; DROP TABLE Tx; --"
chat    <script>alert(1)</script>           stored: "<script>alert(1)</script>"
post    ' UNION SELECT balance FROM User -- stored: "' UNION SELECT balance FROM User --"
profile ' OR 1=1 --                         stored: "' OR 1=1 --"
```

Every table still present afterwards, account count unchanged, and row counts moved only by the writes the test itself made.

### Why script tags in the database are not a problem here

There is no `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `insertAdjacentHTML` or `document.write` anywhere in the source. Player text therefore reaches the page only as a React text node, which escapes by construction. Storing `<script>` is harmless when nothing can ever parse it as markup Ã¢â‚¬â€ and that property is worth keeping deliberately, because it is one `dangerouslySetInnerHTML` away from being untrue.

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

## Phase 30 Ã¢â‚¬â€ The brag gets a name (1.3.91)

A take page said **"Azure took 7.90 USDT"**. A colour cannot brag. For a house built for people who bet, the shareable moment is who won, and the page was the one surface that left the player out.

This was deferred twice as needing a schema change and a backfill on a live money database. It needed neither.

### The ledger already knew

Every payout is written with the room, the round and the winning colours:

```
Classic Pit round #8584 Azure take
```

A take already carries the room name and those exact colour names, built by the same `join(" & ")`. Add the round number and the note can be matched **whole** Ã¢â‚¬â€ an equality, not a `LIKE`, so no wildcard can be smuggled through a room name. Same trick as the record: derived, retroactive over every round ever settled, nothing stored.

### What it reads like now

```
headline  devguru13580 took the pot
pot       2.95 USDT
under     on Crimson Ã‚Â· round #5955
title     devguru13580 took 2.95 USDT Ã‚Â· Classic Pit
```

The name links to that player's record, which closes the loop the record opened in Phase 12: a take points at a player, and the player's seat shows what else they have taken. The share card leads with the name in the winning colour and keeps the colour underneath as how it was won.

The arithmetic checks out on the test round: two clicks on crimson, one on azure. Crimson takes, so 2.00 of stake comes back plus azure's 1.00 less the 5% rake Ã¢â‚¬â€ 2.95.

### Where it falls back, on purpose

A name is shown only when the payout rows still name one. Ten local rounds had lost their payout rows to earlier limits testing, and each fell back to the old colour headline rather than showing an empty one. That matters on live data, where a renamed room or a removed account would break the match Ã¢â‚¬â€ the page degrades to what it said before instead of breaking.

Ties on the winning colour list every winner with their share, since a split take has more than one person to name.

### What was not touched

Nothing about who is shown that was not already public: usernames appear in chat, on seats, in the lobby and on public profiles. The house is filtered out of winners Ã¢â‚¬â€ its cut is a `rake` row, not a `payout`, so it never appeared anyway.

## Phase 31 Ã¢â‚¬â€ Somewhere to put a file (1.3.92)

Avatars, pictures in chat and news thumbnails all wait on the same missing thing: the house had nowhere to put a file. Nothing in the app had ever accepted an upload.

It is a bucket rather than the droplet disk on purpose. The SQLite file and every backup already share that disk, and player content has to outlive a rebuild.

### Signed by hand, and checked against AWS

DigitalOcean Spaces speaks S3, so requests are signed with Signature Version 4. That is written here rather than pulled from a vendor SDK Ã¢â‚¬â€ the whole app runs on four dependencies, and signing is a hash chain that can be checked against AWS's own worked example instead of trusted:

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

The order matters and the first pass had it wrong. The "storage is not switched on" check sat at the top, so every single refusal returned 503 and the test could not tell a rejected SVG from a missing bucket Ã¢â‚¬â€ nine checks passed and verified nothing. Validation now runs first, and 503 is reachable only by a request that was otherwise fine.

### Two things kept away from the money path

- **The store queue is not held while bytes move.** Auth reads through `withStoreRead`, then the upload happens outside it. A 4 MB body must not sit in the one lane every round settlement shares.
- **Keys are content addressed.** The same picture twice is one object, and a key cannot be guessed from an account id.

Twelve uploads per account per ten minutes, counted in memory.

### Not switched on yet

`storageConfigured()` is false until `SPACES_KEY`, `SPACES_SECRET`, `SPACES_BUCKET` and `SPACES_REGION` are set, and the route answers 503 until then. Nothing about the signing can be proven against a live bucket without credentials, which is the one part of this phase that is argued rather than measured Ã¢â‚¬â€ though a 403 from Spaces would now mean credentials, not signing.

## Phase 32 Ã¢â‚¬â€ A face on the seat (1.3.93)

Every avatar in the house was two letters in a circle. A feed of initials reads like a spreadsheet.

### One field, three shapes

A face is a single string on the player, and it is deliberately not a table:

```
""              initials, the default
"hue:azure"     initials on a house colour
"https://Ã¢â‚¬Â¦"     a picture, and only from our own bucket
```

The colour option matters as much as the upload. Nobody should be made to find a photograph to stop looking anonymous, and it costs no storage, no moderation and no bandwidth.

Stored in the same `auth` JSON as headline, about and location, so there is no migration Ã¢â‚¬â€ eight touch points in `store.ts`, mirroring `location` exactly. Verified the boring way: set a colour, restart the process, read it back.

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

Those refusals were tested twice. The first run passed while proving nothing Ã¢â‚¬â€ with no bucket configured, every URL failed early on "uploads are not switched on" and the origin rule never ran. The second run set dummy Spaces values, which is enough because validation only reads config to compute an origin and never contacts a bucket. Same masking trap as Phase 31, caught by the same habit of reading *why* a check passed.

### The picker, and the parts kept apart

Editing a profile now offers initials, the eight house colours, and Upload. A picked file uploads immediately but Save is still the only thing that commits, so a mis-click is not a new face.

`hues.ts` holds the colour list on its own because `avatar.ts` reaches into storage config, and that has no business in a browser bundle. One list, shared by the picker and the validator, with the hex read from `colors.ts` rather than copied into CSS Ã¢â‚¬â€ three of the eight were wrong when I did copy them.

Nine call sites now share one `Avatar` component: profile, feed sidebar, composer, people lists, posts, message threads and the dock.

### Finished on the seat and the take page (1.3.94)

Both were left with a name and no face. Both are now wired, and `Avatar` moved to its own module with no `"use client"` to get there Ã¢â‚¬â€ a server-rendered take page should not pull a client bundle in to draw a circle. It has no hooks, so nothing was lost, and the nine existing importers now point at the definition rather than at the chrome that happened to hold it.

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

Pit chat lines still show a name alone. Those come from stored `RoomEvent` rows that carry a username and no id, so a face there needs either a wider row or a lookup at render Ã¢â‚¬â€ worth doing deliberately, not as a side effect of this.

## Phase 35 Ã¢â‚¬â€ The account belongs to the player (1.3.95)

### First, a correction to the plan

The plan said "no session list, no username change". Both already existed Ã¢â‚¬â€ `/api/account/security` lists devices, kicks one, kicks the others, and renames. Reading the code before building saved rewriting a working feature, which is the whole argument for reading it first.

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

An export line read `amount: 10000`, which looked like a missing conversion. The stored row is 1,000,000 cents Ã¢â‚¬â€ a 10,000 USDT demo deposit in the dev database Ã¢â‚¬â€ so it was right. Worth the thirty seconds to check rather than ship a guess about money.

### Closing a seat, and what closing does not touch

Transaction rows stay exactly where they are. They are the house's books as much as the player's, and the accounting has to keep reconciling after someone leaves. What goes is the seat: profile text, avatar, and every session.

Two refusals matter more than the closure:

```
the wrong confirmation                 400  Type your username exactly to confirm
a balance of 25.00 USDT                400  There is 25.00 USDT on this account. Withdraw it first
```

Closing over a balance would destroy a claim on real money, so it cannot be done Ã¢â‚¬â€ withdraw first. Closure also has to survive signing in again, or it is only a logout, so the Google path refuses a closed account and points at support. Reopening is a support decision.

### The test that closed the account

The balance guard failed its first run and the account actually closed. The cause was the test, not the guard: the balance was set straight into the database while the server held the store in memory, so the app saw zero. Money has to go in through the app for the running store to know about it Ã¢â‚¬â€ the same trap as Phase 21, and it cost an account that had to be reopened by hand.

Verified properly the second time, with a demo deposit through the app: the closure was refused, it named the amount, and the account still signed in afterwards.

## Phase 37 Ã¢â‚¬â€ Block someone, and mean it (1.3.96)

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

Three deliberate choices in there. Reaching is refused **both** ways, because a block the blocker can still shout through is theatre. The blocked side is never told, and every refusal uses the same wording as a normal failure, so a block cannot be detected by probing. And only the side that set it can lift it Ã¢â‚¬â€ `blocked-by` reads as no relation everywhere a relation is shown.

Chat in a pit is filtered per viewer rather than per room: the events are shared, so a blocked player's lines are dropped for the one viewer while the round lines everyone needs stay put.

### The fixture that cost the most

Testing a block needs two real accounts, and this house has one player and the house itself. Building the second by hand ran into three separate walls, each worth writing down:

- `SELECT *` on `User` fails, because this driver cannot read a BigInt column without a cast. The row was copied inside SQLite in the end so those values never round-trip through JS.
- The account still could not sign in, and every request answered a bare `Request failed`. `jsonError` masks anything matching `passwordHash` or `WALLET_SECRET`, so the real cause was invisible: the seeded account had no `Wallet` rows, which every real Google signup gets at sign-in. Copying them fixed it.
- One check read `threads` where the route returns `inbox`, so "the thread is gone from A's inbox" passed against an empty array Ã¢â‚¬â€ it was verifying nothing. Corrected, and it now fails first and passes after.

That last one is the same lesson as Phases 31 and 32, for the third time: a check that passes because it looked in the wrong place is worse than no check, because it buys false confidence.

### Not done here

Images in direct messages wait on Spaces credentials. The moderation queue is still one report per row rather than counts per player, and a word filter staff can edit is not built.

## Phase 36 Ã¢â‚¬â€ The wire (1.3.97)

Asked for at the start and left until last, because it is the one item that could embarrass the house rather than break it. The owner chose fully automatic publishing over a review queue, against the recommendation here. That is recorded, and the safety went into what the fetcher is *able* to do rather than into a gate.

### What it takes, and what it refuses to take

A headline, a link, the source name and the feed's own picture. **Never an article body.** Reposting someone else's writing is republishing it; a headline and a link out is a citation. Every row keeps its source, and every link on the page carries `nofollow` and opens out.

Eight feeds, each one checked from the server before it went in the list Ã¢â‚¬â€ five crypto, three sport. The parser was written against real XML rather than an idealised feed, which mattered:

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

Checked on the stored rows, not on the promise of them: every link https, no tracking parameters left, titles decoded with no markup, no duplicate links, all thirty carrying an image, a real headline on the page Ã¢â‚¬â€ and a second fetch adding **nothing**, because the row key is the hash of the cleaned URL and dedupe needs no extra query.

### Kept away from the game

Five items per source per run, every fifteen minutes. Eight feeds of thirty would bury the hall. It writes straight to its own table and never touches the in-memory store, so a fetch cannot sit in the lane that settles rounds Ã¢â‚¬â€ the same rule the chain watcher follows. A manual refresh exists for staff or the admin secret, never for a visitor, because it makes outbound requests.

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

Two of those checks had to be rewritten before they meant anything. One asserted that the queue held *exactly* what this run fetched Ã¢â‚¬â€ but the fifteen-minute timer fetches too, so the count was legitimately higher and the check failed on a true system. The other looked for the published headline's text on the page, which never matched because an apostrophe arrives HTML-escaped. Replaced by "the wire grew by exactly one", which is the property actually worth holding.

The risk that prompted this is gone in the shape that mattered: nothing appears under the house's name unless someone put it there. What remains is a queue that needs attention Ã¢â‚¬â€ headlines pile up unseen if nobody opens the tab, which is a much better failure than the alternative.

## Phase 39 Ã¢â‚¬â€ The last of the unblocked list (1.3.99)

Two leftovers, both flagged in earlier phases and both finishable without anything from outside.

### A face on a pit chat line

The last surface showing a name and a single letter. Events are stored rows carrying a username and an id, so the face is attached when the feed is built for a viewer rather than stored on the row Ã¢â‚¬â€ copied, not mutated, because `room.events` is the persisted list and a face is only ever part of the payload.

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

## Phase 40 Ã¢â‚¬â€ Deploying without a bad minute (1.4.0)

Found while verifying an earlier deploy, offered, and left unfixed until now: the error log carried `client reference manifest for route "/signin" does not exist` and a missing `500.html`. Those looked like live breakage and were not Ã¢â‚¬â€ sixty requests to those routes produced no new errors, and every page rendered.

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

Nothing broken is served now. What remains is about nine seconds of genuine unavailability while the process restarts, which visitors see as a 502 from nginx. That is not free, and it is not fixable while one process owns the money Ã¢â‚¬â€ there is no second instance to hand traffic to, and adding one would break the write queue that makes concurrent clicks safe. A brief honest 502 beats a page that loads wrong.

The script also refuses to swap a build with no `BUILD_ID`, keeps the previous build in `.next-prev`, and rolls back to it if the home page does not answer 200 Ã¢â‚¬â€ a bad build should cost a rollback, not a night.

## Where this stops without you

Everything left in the plan is blocked on something only the owner can supply:

- **Phase 33, images that cannot hurt anyone.** Re-encoding needs an image codec added as a dependency, and none of it can be exercised end to end until a bucket exists. EXIF stripping is worth doing the day uploads are real.
- **Phase 34, email.** Needs a transactional provider and a verified sender. Until then a player who queues a withdrawal learns nothing until they come back to the site.
- **Phase 38, standings.** The aggregation is written and stays shut. One person has clicked in production; a leaderboard of one advertises an empty house.
- **The upload path itself.** Inert at 503 until `SPACES_KEY`, `SPACES_SECRET`, `SPACES_BUCKET` and `SPACES_REGION` exist. Avatars work today only as house colours.

## Phase 41 â€” a lane one caller cannot fill

The house serves every request, reads included, through one write queue,
because that queue is what makes two clicks landing at once safe. Measured
under load, the whole house tops out in the region of fifty requests a second.
Nothing capped a single caller, so one client in a loop was a house nobody
else could play in, and no tuning fixes that: the single lane is the design.

`src/proxy.ts` now caps one address at 300 requests a minute across `/api`,
which is five a second against a client that normally uses about five a
minute. Callers are counted by the address the proxy reports, not one they
can pick â€” `clientIpFromHeaders` moved to `src/lib/client-ip.ts` so the gate
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
## Next for the social layer

Standings across the house are the obvious follow-on, and the aggregation is already written Ã¢â‚¬â€ but hold until more than one person has clicked, otherwise it ships as a table of one.

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
