"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Notice } from "@/lib/types";

type Payload = { items: Notice[]; unread: number };

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Payload>({ items: [], unread: 0 });
  const box = useRef<HTMLDivElement>(null);

  async function load() {
    const response = await fetch("/api/notifications");
    if (!response.ok) return;
    setData((await response.json()) as Payload);
  }

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 8000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function mark(id?: string) {
    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : {}),
    });
    if (response.ok) setData((await response.json()) as Payload);
  }

  return (
    <div className="notice-wrap" ref={box}>
      <button
        aria-label="Notifications"
        className={`notice-bell ${data.unread > 0 ? "has-unread" : ""}`}
        onClick={() => {
          setOpen((value) => !value);
          if (!open && data.unread) void mark();
        }}
        type="button"
      >
        Alerts
        {data.unread > 0 ? <span className="notice-count">{data.unread}</span> : null}
      </button>
      {open ? (
        <div className="notice-panel">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
              Notifications
            </p>
            <Link className="text-xs text-zinc-400 hover:text-white" href="/notifications">
              See all
            </Link>
          </div>
          <ul className="mt-3 space-y-2">
            {data.items.slice(0, 7).map((item) => (
              <li key={item.id}>
                <Link
                  className={`notice-item ${item.read ? "" : "is-unread"}`}
                  href={item.href || "/"}
                  onClick={() => void mark(item.id)}
                >
                  <strong>{item.title}</strong>
                  <span>{item.body}</span>
                </Link>
              </li>
            ))}
            {data.items.length === 0 ? (
              <li className="text-sm text-zinc-500">No notifications yet.</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
