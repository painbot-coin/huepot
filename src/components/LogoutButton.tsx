"use client";

import { useState } from "react";
import { HouseButton } from "@/components/HouseUi";
import { useCopy } from "@/components/LocaleRoot";

export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  const { copy } = useCopy();

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <HouseButton disabled={busy} ghost onClick={() => void logout()}>
      {busy ? copy.cta.signingOut : copy.cta.logOut}
    </HouseButton>
  );
}
