import { HouseButton, PageHead } from "@/components/HouseUi";
import Link from "next/link";
import { HouseFloor } from "@/components/HouseFloor";
import { getHeaderUser } from "@/lib/auth";
import { floorYou } from "@/lib/house-you";
import { MiniCoin } from "@/components/MiniCoin";
import { RoomMark } from "@/components/RoomMark";
import { hallFor } from "@/lib/hall";
import { houseLadder } from "@/lib/house-ladder";
import { BASIC_ROOMS } from "@/lib/rooms";
import { COLORS } from "@/lib/colors";

export default async function HowItWorksPage() {
  const user = await getHeaderUser();
  return (
    <HouseFloor
      extra={[
        { href: "/how-it-works", label: "How it works", match: true },
        { href: "/fairness", label: "Fairness" },
        { href: "/jobs", label: "Jobs" },
        { href: "/terms", label: "Terms" },
      ]}
      kicker="How it works"
      side={
        <div>
          <p className="lobby-label">Huepot</p>
          <p className="account-note">
            Same price on every color. Most clicks take the rest. USDT plays,
            buys a priced file, or locks a contract.
          </p>
          <div className="li-profile-act">
            <HouseButton href="/rooms/classic">
              Play Classic
            </HouseButton>
            <HouseButton ghost href="/jobs">
              Jobs
            </HouseButton>
          </div>
        </div>
      }
      you={floorYou(user)}
    >
    <main className="app-page is-in-floor">
      <PageHead
        lead="A seat can name a craft, or just be here. Same price on every color. When time runs out, the color with the most clicks takes the rest. The pot stays on Classic."
        title="How Huepot works"
      />
      <section aria-label="Seven doors">
        <p className="hall-kicker">Seven doors</p>
        <div className="hall-doors">
          {houseLadder().map((step) => (
            <Link className="hall-door" href={step.href} key={step.id}>
              <strong>{step.title}</strong>
              <span>{step.line}</span>
            </Link>
          ))}
        </div>
      </section>
      <p className="account-note">
        <Link href="/atrium">Agents</Link> are listed by a seat. Another seat hires one, and the price is vault USDT held until the work is delivered. Shares of a project must add to 100 and the owner's vault pays them. The market stays empty until someone lists an agent. There is no practice balance.{" "}
        <Link href="/companies">Companies</Link> are opened by a seat. A founder posts a developer, a teacher, a lawyer, or a problem solver. People join and write a note. The house does not invent a company, and a listing is not a license.{" "}
        <Link href="/contracts">A contract</Link> locks vault USDT. It returns that lock after 48 hours if the work is not delivered. A delivery left sitting is paid after 48 hours. A hire uses the same vault and the same 48 hours. It is not a chain. Wheel and Dice use the same rule as Classic: the biggest side takes the pot. The house does not pay fixed odds.
      </p>
      <p className="guide-cta">
        <HouseButton href="/rooms/classic">
          Play Classic
        </HouseButton>
        <Link className="nav-link" href="/signin">
          Join Huepot
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
          <strong>Sign in</strong>
          Sign in with Google. Tick 18+ first. Use the same Gmail you play with.
        </li>
        <li>
          <strong>Add funds</strong>
          Send at least 10 USDT as BEP-20 on BNB Chain. Any other network is
          gone — Huepot does not watch it.
        </li>
        <li>
          <strong>Join a table</strong>
          Classic is the public table. An empty pot waits for the first player. A
          play credit covers one Classic click — play only, not withdrawable. Tonight:
          Classic hour 20:00 UTC, Night hour 22:00 UTC, Fog cup Sunday 21:00 UTC.
        </li>
        <li>
          <strong>Pick a color</strong>
          Each click costs that room’s price. Fog hides public counts in the
          last 12 seconds. Night hides them in the last 8.
        </li>
        <li>
          <strong>The payout</strong>
          Winners split the rest of the pot. Ties come back. Every round posts a
          hashed seed you can check on Fairness. The network hears a real win.
        </li>
        <li>
          <strong>Three jobs</strong>
          Social opens the company and the room this seat is in. AI opens the book and the watch. The house speaks in the lines already due today. The book does not speak as the seat and it holds no wallet. Web3 opens an owned file. Balance stays on the vault. HUE stands from clicks and takes. There is no second lifetime number. USDT plays, buys a priced file, or locks a contract. The pot stays on Classic.
        </li>
        <li>
          <strong>Choose a role</strong>
          Name a craft — game, AI, play, or the table — or just be here. Share a project.
          Speak on the network. Buy and sell stays USDT-for-files on the store.
          Huepot posts work at{" "}
          <Link href="/jobs">Jobs</Link>, including a UI/UX
          designer, a backend engineer, a system architect, a machine
          learning engineer, and a marketing specialist. Read
          free. Apply from an account. The pot stays on Classic.
        </li>
        <li>
          <strong>Withdraw</strong>
          Withdraw to a BNB Chain address. Set a loss cap or cool-off from
          Account before a long session. An invite pays a slice of house rake
          only — never a deposit bonus and never their bank. The network is open to
          read. Speak, ask, and messages still need a seat.
        </li>
      </ol>
    </main>
    </HouseFloor>
  );
}
