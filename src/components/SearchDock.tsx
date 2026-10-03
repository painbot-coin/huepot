"use client";

import InputBase from "@mui/material/InputBase";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Fade } from "@/components/Fade";
import { IconSearch, IconUsers } from "@/components/Icons";
import { HOUSE_SEATS } from "@/lib/house-seats";
import { formatUsdt } from "@/lib/money";
import type { SearchHit } from "@/lib/types";
import { useCopy } from "@/components/LocaleRoot";

export function SearchDock({
  onPickRoom,
  className = "",
}: {
  onPickRoom: (slug: string) => void;
  className?: string;
}) {
  const router = useRouter();
  const { copy } = useCopy();
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
    <Paper
      className={`search-dock ${className}`.trim()}
      ref={box}
      sx={{ display: "flex", alignItems: "center", px: 1.5, py: 0.25, width: "100%" }}
    >
      <IconSearch />
      <InputBase
        inputProps={{ "aria-label": copy.line.find }}
        onChange={(event) => {
          setQ(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={copy.line.find}
        sx={{ flex: 1 }}
        value={q}
      />
      <Fade className="search-pop" show={open}>
        {q.trim().length < 2 ? (
          <span>{copy.line.findHint}</span>
        ) : (
          <>
            <p aria-label="Tables">
              <IconSearch />
            </p>
            <List dense disablePadding>
              {hits.rooms.length === 0 ? <span>{copy.line.noTables}</span> : null}
              {hits.rooms.map((room) => (
                <ListItemButton
                  key={room.slug}
                  onClick={() => {
                    onPickRoom(room.slug);
                    setOpen(false);
                    setQ("");
                  }}
                >
                  <ListItemText
                    primary={room.name}
                    secondary={`${room.buttonCount} coins · ${formatUsdt(room.clickPrice)} · pot ${formatUsdt(room.pot)}`}
                  />
                </ListItemButton>
              ))}
            </List>
            <p aria-label="People">
              <IconUsers />
            </p>
            <List dense disablePadding>
              {hits.users.length === 0 ? <span>No people match.</span> : null}
              {hits.users.map((user) => (
                <ListItemButton
                  key={user.username}
                  onClick={() => {
                    router.push(`/network/u/${encodeURIComponent(user.username)}`);
                    setOpen(false);
                    setQ("");
                  }}
                >
                  <ListItemText
                    primary={`@${user.username}`}
                    secondary={
                      user.why
                        ? user.why
                        : user.headline &&
                            user.headline !== "Huepot player" &&
                            !HOUSE_SEATS.some((row) => row.label === user.headline)
                          ? user.headline
                          : "Seat"
                    }
                  />
                </ListItemButton>
              ))}
            </List>
          </>
        )}
      </Fade>
    </Paper>
  );
}
