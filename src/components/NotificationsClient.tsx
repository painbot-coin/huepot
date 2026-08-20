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
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-display text-4xl text-white">Notifications</h1>
        <button className="nav-link" onClick={() => void markAll()} type="button">
          Mark all read
        </button>
      </div>
      <ul className="mt-8 space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              className={`block rounded-2xl border px-4 py-3 ${item.read ? "border-white/8 text-zinc-400" : "border-white/16 bg-white/5 text-zinc-200"}`}
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
          <li className="text-zinc-500">No notifications yet.</li>
        ) : null}
      </ul>
    </main>
  );
}
