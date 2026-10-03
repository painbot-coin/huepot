"use client";

import { useState } from "react";
import { HouseButton, HouseLink, Menu, MenuItem } from "@/components/HouseUi";
import { LogoutButton } from "@/components/LogoutButton";
import { SitClock } from "@/components/SitClock";
import { useCopy } from "@/components/LocaleRoot";

export function YouMenu({
  username,
  manager = false,
  reviewer = false,
}: {
  username: string;
  manager?: boolean;
  reviewer?: boolean;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const { copy } = useCopy();

  function close() {
    setAnchor(null);
  }

  return (
    <div className="you-menu">
      <HouseButton
        aria-expanded={Boolean(anchor)}
        aria-haspopup="menu"
        ghost
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        @{username}
      </HouseButton>
      <Menu
        anchorEl={anchor}
        onClose={close}
        open={Boolean(anchor)}
      >
        <MenuItem component={HouseLink} href={`/network/u/${encodeURIComponent(username)}`} onClick={close}>
          {copy.page.profile}
        </MenuItem>
        <MenuItem component={HouseLink} href="/account" onClick={close}>
          {copy.page.account}
        </MenuItem>
        <MenuItem component={HouseLink} href="/invest" onClick={close}>
          {copy.cta.addUsdt}
        </MenuItem>
        <MenuItem component={HouseLink} href="/withdraw" onClick={close}>
          {copy.cta.withdraw}
        </MenuItem>
        <MenuItem component={HouseLink} href="/how-it-works" onClick={close}>
          {copy.page.howItWorks}
        </MenuItem>
        <MenuItem component={HouseLink} href="/news" onClick={close}>
          {copy.nav.news}
        </MenuItem>
        <MenuItem component={HouseLink} href="/board" onClick={close}>
          {copy.nav.leaderboard}
        </MenuItem>
        <MenuItem component={HouseLink} href="/jobs" onClick={close}>
          {copy.nav.jobs}
        </MenuItem>
        <MenuItem component={HouseLink} href="/jobs/you" onClick={close}>
          {copy.page.applications}
        </MenuItem>
        {manager || reviewer ? (
          <MenuItem component={HouseLink} href="/manage" onClick={close}>
            {copy.page.manage}
          </MenuItem>
        ) : null}
        <MenuItem disabled>
          <SitClock />
        </MenuItem>
        <MenuItem onClick={close}>
          <LogoutButton />
        </MenuItem>
      </Menu>
    </div>
  );
}
