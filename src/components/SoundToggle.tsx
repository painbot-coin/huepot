"use client";

import { useEffect, useState } from "react";
import { IconMute, IconSound } from "@/components/Icons";
import { isMuted, onMuteChange, playFx, toggleMuted, unlockSound } from "@/lib/sound";

export function SoundToggle({ className = "pit-ico" }: { className?: string }) {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(isMuted());
    return onMuteChange(setMuted);
  }, []);

  return (
    <button
      aria-label={muted ? "Unmute table" : "Mute table"}
      className={`${className} ${muted ? "is-on" : ""}`}
      onClick={() => {
        unlockSound();
        const next = toggleMuted();
        setMuted(next);
        if (!next) playFx("click", "#ffb020");
      }}
      title={muted ? "Sound off" : "Sound on"}
      type="button"
    >
      {muted ? <IconMute /> : <IconSound />}
    </button>
  );
}
