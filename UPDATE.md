# Huepot v2.1 — The wing is open

**Live now:** https://huepot.net — product **v2.1.5**.
**Read with:** `GROWTH.md`, `NETWORK.md`.

v2.0 opened seats and takes. The wing — the talk those takes write — still asked for a sign-in.

v2.1 is **the same door for the feed**. A stranger can read takes and wire cards. Speak, like, ask, and letters still need a seat.

---

## What is already live (do not rebuild)

- Same-price pots, Tonight (Classic 20:00 / Night 22:00 / Fog cup Sun 21:00), invite on take and board, public seats, this-week board, testnet HUE.
- Invite is rake share only. Sit chips are play-only. HUE has no price.

---

## This slice

| Item | Why |
|------|-----|
| **Public wing** | `/network` and `GET /api/network/feed` read without a session. |
| **Write stays gated** | Post, like, comment, ask, letters still 401. |
| **Header Wing** | Guests see the lintel door. |

### Do not put in this slice

- Mainnet HUE, a pool, a cash rate
- Deposit bonus
- Public letters or a second ranking

---

## Done when

A stranger opens `/network` and sees take cards. Unsigned POST still fails. Letters still ask for a sign-in.
