"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HouseFloor, type HouseYou } from "@/components/HouseFloor";
import { HouseButton, PageHead } from "@/components/HouseUi";
import { noticeAlertClass, noticeKindLabel } from "@/lib/notice-desk";
import type { Notice } from "@/lib/types";

const NOTICE_STEP = 40;

export function NotificationsClient({ you }: { you?: HouseYou | null }) {
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

  const unread = items.filter((item) => !item.read).length;

  return (
    <HouseFloor kicker="Notifications" you={you}>
    <main className="app-page is-in-floor">
      <PageHead
        lead="Takes, gold, and company land here as alerts. Unread stays marked until you open it."
        title="Alerts"
      />
      <div className="notice-toolbar">
        <p className="notice-toolbar-line">
          {unread > 0 ? `${unread} unread on this desk` : "All clear on this desk"}
        </p>
        <button className="notice-mark" onClick={() => void markAll()} type="button">
          Mark all read
        </button>
      </div>
      <ul className="notice-desk" role="list">
        {items.map((item) => (
          <li key={item.id}>
            <Link className={noticeAlertClass(item.kind, item.read)} href={item.href || "/"}>
              <em className="notice-kind">{noticeKindLabel(item.kind)}</em>
              <strong className="notice-title">{item.title}</strong>
              <p className="notice-body">{item.body}</p>
              <time className="notice-time" dateTime={new Date(item.createdAt).toISOString()}>
                {new Date(item.createdAt).toLocaleString()}
              </time>
            </Link>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="notice-empty">
            No alerts yet. Takes, gold in, and company asks land here.
          </li>
        ) : null}
      </ul>
      {total > items.length ? (
        <div className="li-deeper">
          <HouseButton ghost onClick={() => setDepth((was) => was + NOTICE_STEP)}>
            Show older
          </HouseButton>
          <span className="li-deeper-n">
            {items.length} of {total.toLocaleString()}
          </span>
        </div>
      ) : null}
    </main>
    </HouseFloor>
  );
}
