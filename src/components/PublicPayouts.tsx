"use client";

import { useEffect, useState } from "react";
import { IconCash } from "@/components/Icons";
import { formatUsdt } from "@/lib/money";

const EXPLORER = "https://bscscan.com";

type PublicPayout = { amount: number; at: number; txHash?: string };

function ageLabel(at: number, now: number) {
  const delta = Math.max(0, now - at);
  const mins = Math.floor(delta / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function PublicPayouts() {
  const [payouts, setPayouts] = useState<PublicPayout[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const response = await fetch("/api/payouts");
        const data = (await response.json()) as { payouts?: PublicPayout[] };
        if (alive && Array.isArray(data.payouts)) setPayouts(data.payouts);
      } catch {
        /* keep last */
      }
    }
    void load();
    const poll = window.setInterval(() => void load(), 20_000);
    const tick = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => {
      alive = false;
      window.clearInterval(poll);
      window.clearInterval(tick);
    };
  }, []);

  return (
    <section className="payout-strip" aria-label="Recent cash-outs">
      <p className="lobby-label">Paid out</p>
      {payouts.length === 0 ? (
        <p className="strip-empty">
          <IconCash />
          A cash-out lands here with a BscScan link. Same-day send.
        </p>
      ) : (
        <ul>
          {payouts.map((item, index) => (
            <li key={`${item.at}-${index}`}>
              <strong>{formatUsdt(item.amount)} USDT</strong>
              <span>{ageLabel(item.at, now)}</span>
              {item.txHash ? (
                <a
                  href={`${EXPLORER}/tx/${item.txHash}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  BscScan
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
