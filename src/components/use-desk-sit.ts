"use client";

import { useEffect, useState } from "react";
import { deskPair, type MarkKind } from "@/lib/house-mark-list";

export function useDeskSit(kind: MarkKind, sit: string) {
  const pair = deskPair(kind, sit);
  const [westId, setWestId] = useState(pair.west);
  const [eastId, setEastId] = useState(pair.east);

  useEffect(() => {
    const next = deskPair(kind, sit);
    setWestId(next.west);
    setEastId(next.east);
  }, [kind, sit]);

  return { westId, eastId, setWestId, setEastId };
}
