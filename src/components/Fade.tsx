"use client";

import { useEffect, useState, type ReactNode } from "react";

export function Fade({
  show,
  children,
  className,
  ms = 220,
}: {
  show: boolean;
  children: ReactNode;
  className?: string;
  ms?: number;
}) {
  const [kept, setKept] = useState(show);

  useEffect(() => {
    if (show) {
      setKept(true);
      return;
    }
    const id = window.setTimeout(() => setKept(false), ms);
    return () => window.clearTimeout(id);
  }, [show, ms]);

  if (!show && !kept) return null;
  return (
    <div className={`${className ?? ""} ${show ? "is-fade-in" : "is-fade-out"}`.trim()}>
      {children}
    </div>
  );
}
