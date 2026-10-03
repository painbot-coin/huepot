import { HouseFloor } from "@/components/HouseFloor";
import { SUPPORT_EMAIL } from "@/lib/config";

export default function PrivacyPage() {
  return (
    <HouseFloor
      extra={[
        { href: "/how-it-works", label: "How it works" },
        { href: "/fairness", label: "Fairness" },
        { href: "/terms", label: "Terms" },
        { href: "/privacy", label: "Privacy", match: true },
      ]}
      kicker="Privacy"
    >
    <main className="prose-page is-in-floor">
      <p className="hall-kicker">Privacy</p>
      <h1 className="font-display text-4xl text-white">Privacy</h1>
      <p>
        We store your email, username, Google account id, play
        balance, deposit addresses, and in-app notifications. Wallet private keys
        are encrypted on the server and are never shown in the browser.
      </p>
      <p>
        A session cookie keeps you signed in. We do not sell account data. Logs
        of clicks, deposits, and withdrawals stay with the game so rounds can
        be settled.
      </p>
      <p>
        To close an account, email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from the
        Google address you signed in with.
        Account data lives in the Huepot database on the server.
      </p>
    </main>
    </HouseFloor>
  );
}
