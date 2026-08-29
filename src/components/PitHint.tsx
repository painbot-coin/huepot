"use client";

import { useEffect, useState } from "react";

const KEY = "huepot-hint";
const BEATS = [
  "Pick a color. One tap is one stake.",
  "The clock runs. Biggest color takes the rest.",
  "If you win, that coin pays. Sit and watch the pot.",
];

export function PitHint() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(KEY)) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  if (!open) return null;

  function next() {
    if (step + 1 >= BEATS.length) {
      try {
        window.localStorage.setItem(KEY, "1");
      } catch {
        /* ignore */
      }
      setOpen(false);
      return;
    }
    setStep((value) => value + 1);
  }

  return (
    <button className="pit-hint" onClick={next} type="button">
      <span>{BEATS[step]}</span>
      <em>{step + 1} / {BEATS.length}</em>
    </button>
  );
}
