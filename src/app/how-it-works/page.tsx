import Link from "next/link";
import { MiniCoin } from "@/components/MiniCoin";
import { RoomMark } from "@/components/RoomMark";
import { hallFor } from "@/lib/hall";
import { BASIC_ROOMS } from "@/lib/rooms";
import { COLORS } from "@/lib/colors";

export default function HowItWorksPage() {
  return (
    <main className="app-page">
      <p className="hall-kicker">The rite</p>
      <h1 className="font-display text-4xl text-white">How the house works</h1>
      <p className="app-lead">
        Same price on every color. When the clock ends, the color with the most
        clicks takes the rest of the pot.
      </p>
      <p className="guide-cta">
        <Link className="chip-btn" href="/rooms/classic">
          Sit Classic
        </Link>
        <Link className="nav-link" href="/signin">
          Enter the house
        </Link>
      </p>
      <div className="guide-marks" aria-hidden="true">
        {BASIC_ROOMS.map((room) => (
          <figure key={room.slug}>
            <RoomMark fog={Boolean(room.fogSeconds)} slug={room.slug} />
            <figcaption>
              {room.name}
              <small>{hallFor(room.slug)?.kicker}</small>
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="room-coin-row guide-coins" aria-hidden="true">
        {COLORS.map((color) => (
          <MiniCoin id={color.id} key={color.id} size={32} />
        ))}
      </div>
      <ol className="app-steps">
        <li>
          <strong>Cross the gate</strong>
          Sign in with Google. Tick 18+ first. Use the same Gmail you play with.
        </li>
        <li>
          <strong>Fill the vault</strong>
          Send at least 10 USDT as BEP-20 on BNB Chain. Any other network is
          gone — Huepot does not watch it.
        </li>
        <li>
          <strong>Sit a pit</strong>
          Classic, Lightning, Duo, High Table, and Fog Pit are free to join.
          Classic hour is 20:00 UTC. Fog cup is Sunday 21:00 UTC.
        </li>
        <li>
          <strong>Strike a color</strong>
          Each click costs that room’s price. Fog tables hide public counts in
          the last 12 seconds.
        </li>
        <li>
          <strong>The take</strong>
          Winners split the rest of the pot. Ties come back. Every round posts a
          hashed seed you can check on the ledger.
        </li>
        <li>
          <strong>Leave with gold</strong>
          Withdraw to a BNB Chain address. Set a loss cap or cool-off from
          Account before a long session.
        </li>
      </ol>
    </main>
  );
}
