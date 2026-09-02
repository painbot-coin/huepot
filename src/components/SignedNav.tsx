"use client";

import { LogoutButton } from "@/components/LogoutButton";
import { MessageLaunch } from "@/components/MessageDock";
import { NotificationBell } from "@/components/NotificationBell";
import { PresencePing } from "@/components/PresencePing";
import { SitClock } from "@/components/SitClock";
import { SoundToggle } from "@/components/SoundToggle";

export function SignedNav() {
  return (
    <>
      <SitClock />
      <SoundToggle className="pit-ico header-sound" />
      <MessageLaunch />
      <NotificationBell />
      <PresencePing />
      <LogoutButton />
    </>
  );
}
