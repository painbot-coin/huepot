"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Notice } from "@/lib/types";

export function NotificationsClient() {
  const [items, setItems] = useState<Notice[]>([]);

  async function load() {
    const response = await fetch("/api/notifications");
    if (response.status === 401) {
      window.location.href = "/signin";
      return;
    }
    const data = (await response.json()) as { items?: Notice[] };
    setItems(data.items ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function markAll() {
    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const data = (await response.json()) as { items?: Notice[] };
    setItems(data.items ?? []);
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
    </main>
  );
}
