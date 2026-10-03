"use client";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { usePathname } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import HouseLink from "@/components/HouseLink";
import { HouseButton, HouseChip } from "@/components/HouseUi";
import { HOUSE_SEATS, seatLabel, seatTag } from "@/lib/house-seats";
import { spokenSeat } from "@/lib/house-tongue";
import { type HouseYou, floorYou } from "@/lib/house-you";
import { openMessageDock } from "@/lib/message-dock";
import { safeNext } from "@/lib/next-path";
import { useCopy } from "@/components/LocaleRoot";

export type { HouseYou };
export { floorYou };

const DOORS = [
  { href: "/", key: "home", match: (path: string) => path === "/" },
  { href: "/network", key: "network", match: (path: string) => path.startsWith("/network") },
  { href: "/wait", key: "games", match: (path: string) => path === "/wait" },
  { href: "/wait/store", key: "store", match: (path: string) => path.startsWith("/wait/store") },
  { href: "/jobs", key: "jobs", match: (path: string) => path.startsWith("/jobs") },
  { href: "/companies", key: "companies", match: (path: string) => path.startsWith("/companies") },
  { href: "/contracts", key: "contracts", match: (path: string) => path.startsWith("/contracts") },
  { href: "/atrium", key: "agents", match: (path: string) => path.startsWith("/atrium") },
  { href: "/board", key: "leaderboard", match: (path: string) => path.startsWith("/board") },
  { href: "/news", key: "news", match: (path: string) => path.startsWith("/news") },
] as const;

export function HouseFloor({
  you,
  extra,
  side,
  children,
}: {
  kicker?: string;
  you?: HouseYou | null;
  extra?: { href: string; label: string; match?: boolean; dock?: boolean }[];
  side?: ReactNode;
  children: ReactNode;
}) {
  const path = usePathname();
  const { copy, locale } = useCopy();
  const me = you?.username ? `/network/u/${encodeURIComponent(you.username)}` : "/signin";
  const next = safeNext(path);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 3 } }}>
      <Box
        sx={{
          display: "grid",
          gap: 3,
          alignItems: "start",
          gridTemplateColumns: {
            xs: "1fr",
            md: side ? "200px minmax(0, 1fr) 220px" : "200px minmax(0, 1fr)",
          },
        }}
      >
        <Paper
          component="aside"
          sx={{
            display: { xs: "none", md: "block" },
            p: 2.25,
            position: { md: "sticky" },
            top: { md: 80 },
          }}
        >
          {you ? (
            <Box
              component={HouseLink}
              href={me}
              sx={{
                display: "grid",
                justifyItems: "center",
                textAlign: "center",
                color: "inherit",
                textDecoration: "none",
                mb: 1.5,
              }}
            >
              <Avatar avatar={you.avatar} username={you.username} />
              <Typography sx={{ mt: 1 }} variant="subtitle1">
                @{you.username}
              </Typography>
              <Typography color="text.secondary" variant="caption">
                {you.seat ? `${seatTag(you.seat)} · ` : ""}
                {you.headline || seatLabel(you.seat) || copy.line.player}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ mb: 1.5 }}>
              <Typography sx={{ fontWeight: 700 }} variant="subtitle1">
                {copy.cta.join}
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 1.25, mt: 0.5 }} variant="body2">
                {copy.line.join}
              </Typography>
              <HouseButton href={next ? `/signin?next=${encodeURIComponent(next)}` : "/signin"}>
                {copy.cta.join}
              </HouseButton>
            </Box>
          )}
          <List dense disablePadding>
            {DOORS.map((door) => (
              <ListItemButton
                component={HouseLink}
                href={door.href}
                key={door.href}
                selected={door.match(path)}
              >
                <ListItemText primary={copy.nav[door.key]} />
              </ListItemButton>
            ))}
            {you ? (
              <ListItemButton component={HouseLink} href="/account" selected={path.startsWith("/account")}>
                <ListItemText primary={copy.page.account} />
              </ListItemButton>
            ) : null}
            {you?.manager || you?.reviewer ? (
              <ListItemButton component={HouseLink} href="/manage" selected={path.startsWith("/manage")}>
                <ListItemText primary={copy.page.manage} />
              </ListItemButton>
            ) : null}
            {extra?.map((link) => (
              <ListItemButton
                component={HouseLink}
                href={link.href}
                key={link.label}
                onClick={(event: MouseEvent<HTMLAnchorElement>) => {
                  if (
                    link.dock &&
                    !path.startsWith("/network/messages") &&
                    !event.metaKey &&
                    !event.ctrlKey
                  ) {
                    event.preventDefault();
                    openMessageDock();
                  }
                }}
                selected={Boolean(link.match)}
              >
                <ListItemText primary={link.label} />
              </ListItemButton>
            ))}
          </List>
          <Typography color="text.secondary" sx={{ mt: 2, mb: 1 }} variant="caption">
            {copy.line.whosHere}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            {HOUSE_SEATS.map((row) => (
              <HouseChip
                href={`/network/people?seat=${encodeURIComponent(row.id)}`}
                key={row.id}
                label={spokenSeat(locale, row.id).tag}
              />
            ))}
          </Box>
        </Paper>
        <Box sx={{ minWidth: 0 }}>{children}</Box>
        {side ? (
          <Paper
            component="aside"
            sx={{
              p: 2.25,
              position: { md: "sticky" },
              top: { md: 80 },
              order: { xs: 1, md: 0 },
            }}
          >
            {side}
          </Paper>
        ) : null}
      </Box>
    </Container>
  );
}
