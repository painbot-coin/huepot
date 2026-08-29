"use client";

import { useEffect } from "react";
import type { FxDetail } from "@/lib/fx";
import { beginUrgent, playFx, stopUrgent, unlockSound } from "@/lib/sound";

export function SoundBus() {
  useEffect(() => {
    function unlock() {
      unlockSound();
    }
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    function onFx(event: CustomEvent<FxDetail>) {
      const detail = event.detail;
      if (!detail) return;
      if (detail.kind === "urgent") {
        beginUrgent();
        return;
      }
      if (detail.kind === "take" || detail.kind === "round") stopUrgent();
      playFx(detail.kind, detail.color);
    }

    window.addEventListener("huepot:fx", onFx);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("huepot:fx", onFx);
      stopUrgent();
    };
  }, []);

  return null;
}
