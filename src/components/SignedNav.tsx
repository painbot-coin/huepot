"use client";

import { MessageLaunch } from "@/components/MessageDock";
import { NotificationBell } from "@/components/NotificationBell";
import { PresencePing } from "@/components/PresencePing";
import { SoundToggle } from "@/components/SoundToggle";
import { YouMenu } from "@/components/YouMenu";

export function SignedNav({
  username,
  manager = false,
  reviewer = false,
}: {
  username: string;
  manager?: boolean;
  reviewer?: boolean;
}) {
  return (
    <>
      <SoundToggle className="pit-ico header-sound" />
      <MessageLaunch />
      <NotificationBell />
      <PresencePing />
      <YouMenu manager={manager} reviewer={reviewer} username={username} />
    </>
  );
}
