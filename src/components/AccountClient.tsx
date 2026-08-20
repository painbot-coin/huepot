"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import { formatUsdt } from "@/lib/money";
import type { GameState } from "@/lib/types";

export function AccountClient() {
  const [state, setState] = useState<GameState | null>(null);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/state");
      const data = (await response.json()) as GameState;
      if (!data.user) {
        window.location.href = "/signin";
        return;
      }
      setState(data);
    })();
  }, []);

  if (!state?.user) {
    return (
      <p className="px-4 py-16 text-center text-zinc-400">Loading account…</p>
    );
  }

  const user = state.user;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="font-display text-4xl text-white">Account</h1>
      <p className="mt-2 text-zinc-400">
        Signed in as <strong className="text-zinc-200">@{user.username}</strong>
      </p>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
            Balance
          </p>
          <p className="font-display text-3xl text-white">
            {formatUsdt(user.balance)} USDT
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
            Wallets
          </p>
          <p className="font-display text-3xl text-white">
            {user.wallets.length}
          </p>
        </div>
      </section>

      <dl className="mt-8 space-y-3 text-sm">
        <div className="flex justify-between gap-4 border-b border-white/8 py-3">
          <dt className="text-zinc-500">Email</dt>
          <dd className="text-right text-zinc-200">
            {user.email}
            <br />
            <span className="text-xs text-zinc-500">
              {user.emailVerified ? "Verified" : "Not verified"}
              {user.hasGoogle ? " · Google" : ""}
            </span>
          </dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-white/8 py-3">
          <dt className="text-zinc-500">Member since</dt>
          <dd className="text-zinc-200">
            {new Date(user.createdAt).toLocaleDateString()}
          </dd>
        </div>
      </dl>

      <div className="mt-8 flex flex-wrap gap-3">
        {!user.emailVerified ? (
          <Link className="chip-btn" href="/verify-email">
            Verify email
          </Link>
        ) : null}
        <Link className="chip-btn" href="/invest">
          Invest
        </Link>
        <Link className="chip-btn chip-btn-ghost" href="/withdraw">
          Withdraw
        </Link>
        <LogoutButton />
      </div>

      <ul className="mt-10 space-y-2">
        {user.wallets.map((wallet) => (
          <li
            className="rounded-2xl border border-white/8 px-4 py-3"
            key={wallet.id}
          >
            <p className="text-sm text-white">
              {wallet.name}{" "}
              <span className="text-zinc-500">
                {wallet.standard} {wallet.asset}
              </span>
            </p>
            <p className="mt-1 break-all font-mono text-xs text-zinc-500">
              {wallet.address}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
