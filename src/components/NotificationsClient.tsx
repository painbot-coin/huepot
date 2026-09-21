"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Notice } from "@/lib/types";

const NOTICE_STEP = 40;

export function NotificationsClient() {
  const [items, setItems] = useState<Notice[]>([]);
  const [depth, setDepth] = useState(NOTICE_STEP);
  const [total, setTotal] = useState(0);

  async function load(want = depth) {
    const response = await fetch(`/api/notifications?limit=${want}`);
    if (response.status === 401) {
      window.location.href = "/signin";
      return;
    }
    const data = (await response.json()) as { items?: Notice[]; total?: number };
    setItems(data.items ?? []);
    if (typeof data.total === "number") setTotal(data.total);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depth]);

  async function markAll() {
    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: depth }),
    });
    const data = (await response.json()) as { items?: Notice[]; total?: number };
    setItems(data.items ?? []);
    if (typeof data.total === "number") setTotal(data.total);
  }

  return (
    <main className="app-page">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="hall-kicker">House notices</p>
          <h1 className="font-display text-4xl text-white">Notices</h1>
        </div>
        <button className="nav-link" onClick={() => void markAll()} type="button">
          Mark all read
        </button>
      </div>
      <ul className="ledger-list">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              className={`ledger-row notice-item is-stack is-${item.kind} ${item.read ? "" : "is-unread"}`}
              href={item.href || "/"}
            >
              <p className="text-white">{item.title}</p>
              <p className="mt-1 text-sm">{item.body}</p>
              <p className="mt-2 text-xs text-zinc-600">
                {new Date(item.createdAt).toLocaleString()}
              </p>
            </Link>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="empty-note">
            No notices yet. Takes, gold in, and company asks land here.
          </li>
        ) : null}
      </ul>
      {total > items.length ? (
        <div className="li-deeper">
          <button
            className="chip-btn chip-btn-ghost"
            onClick={() => setDepth((was) => was + NOTICE_STEP)}
            type="button"
          >
            Show older
          </button>
          <span className="li-deeper-n">
            {items.length} of {total.toLocaleString()}
          </span>
        </div>
      ) : null}
    </main>
  );
}
