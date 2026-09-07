"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Fade } from "@/components/Fade";
import { IconSearch, IconUsers } from "@/components/Icons";
import { formatUsdt } from "@/lib/money";
import type { SearchHit } from "@/lib/types";

export function SearchDock({
  onPickRoom,
}: {
  onPickRoom: (slug: string) => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<SearchHit>({ rooms: [], users: [] });
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits({ rooms: [], users: [] });
      return;
    }
    const id = window.setTimeout(async () => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!response.ok) return;
      setHits((await response.json()) as SearchHit);
    }, 180);
    return () => window.clearTimeout(id);
  }, [q]);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="search-dock" ref={box}>
      <IconSearch />
      <input
        onChange={(event) => {
          setQ(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Find a table or a seat…"
        value={q}
      />
      <Fade className="search-pop" show={open}>
          {q.trim().length < 2 ? (
            <span>Type a table or a seat.</span>
          ) : (
            <>
          <p aria-label="Tables">
            <IconSearch />
          </p>
          {hits.rooms.length === 0 ? <span>No tables match.</span> : null}
          {hits.rooms.map((room) => (
            <button
              key={room.slug}
              onClick={() => {
                onPickRoom(room.slug);
                setOpen(false);
                setQ("");
              }}
              type="button"
            >
              <strong>{room.name}</strong>
              <em>
                {room.buttonCount} coins · {formatUsdt(room.clickPrice)} · pot {formatUsdt(room.pot)}
              </em>
            </button>
          ))}
          <p aria-label="Seats">
            <IconUsers />
          </p>
          {hits.users.length === 0 ? <span>No seats match.</span> : null}
          {hits.users.map((user) => (
            <button
              key={user.username}
              onClick={() => {
                router.push(`/network/u/${encodeURIComponent(user.username)}`);
                setOpen(false);
                setQ("");
              }}
              type="button"
            >
              <strong>@{user.username}</strong>
              <em>Seat</em>
            </button>
          ))}
            </>
          )}
      </Fade>
    </div>
  );
}
