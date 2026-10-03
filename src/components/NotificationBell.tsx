"use client";

import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import Badge from "@mui/material/Badge";
import IconButton from "@mui/material/IconButton";
import { useEffect, useState } from "react";
import { HouseLink, Menu, MenuItem } from "@/components/HouseUi";
import { noticeAlertClass, noticeKindLabel } from "@/lib/notice-desk";
import type { Notice } from "@/lib/types";

type Payload = { items: Notice[]; unread: number };

export function NotificationBell() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [data, setData] = useState<Payload>({ items: [], unread: 0 });

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

  async function mark(id?: string) {
    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : {}),
    });
    if (response.ok) setData((await response.json()) as Payload);
  }

  return (
    <div className="notice-wrap">
      <IconButton
        aria-label="Alerts"
        className={`notice-bell ${data.unread > 0 ? "has-unread" : ""}`}
        onClick={(event) => {
          setAnchor(event.currentTarget);
          if (!anchor && data.unread) void mark();
        }}
      >
        <Badge badgeContent={data.unread} color="primary">
          <NotificationsNoneIcon fontSize="small" />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        open={Boolean(anchor)}
        slotProps={{ paper: { className: "notice-tray" } }}
      >
        <MenuItem className="notice-tray-all" component={HouseLink} href="/notifications" onClick={() => setAnchor(null)}>
          See all alerts
        </MenuItem>
        {data.items.slice(0, 7).map((item) => (
          <MenuItem
            className={noticeAlertClass(item.kind, item.read)}
            component={HouseLink}
            href={item.href || "/"}
            key={item.id}
            onClick={() => {
              void mark(item.id);
              setAnchor(null);
            }}
          >
            <span className="notice-alert-copy">
              <em className="notice-kind">{noticeKindLabel(item.kind)}</em>
              <strong className="notice-title">{item.title}</strong>
              <span className="notice-body">{item.body}</span>
            </span>
          </MenuItem>
        ))}
        {data.items.length === 0 ? <MenuItem disabled>No alerts yet.</MenuItem> : null}
      </Menu>
    </div>
  );
}
