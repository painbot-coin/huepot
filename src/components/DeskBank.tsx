"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { deskWalletHref, deskWalletLine } from "@/lib/house-mark-list";

type DeskWell = {
  needCents: number;
  next: string;
};

type DeskGold = {
  priced: number;
  needCents: number;
  next: string;
  setWell: (id: string, on: boolean, well?: Partial<DeskWell>) => void;
  signedIn: boolean;
  balanceCents: number;
  setGold: (next: { signedIn?: boolean; balanceCents?: number }) => void;
};

const DeskGoldContext = createContext<DeskGold | null>(null);

export function DeskGoldRoot({ children }: { children: ReactNode }) {
  const [wells, setWells] = useState<Record<string, DeskWell>>({});
  const [signedIn, setSignedIn] = useState(false);
  const [balanceCents, setBalanceCents] = useState(0);

  const setWell = useCallback((id: string, on: boolean, well?: Partial<DeskWell>) => {
    setWells((prev) => {
      if (on) {
        const next: DeskWell = {
          needCents: Math.max(0, well?.needCents ?? prev[id]?.needCents ?? 0),
          next: well?.next || prev[id]?.next || "/wait",
        };
        const cur = prev[id];
        if (cur && cur.needCents === next.needCents && cur.next === next.next) return prev;
        return { ...prev, [id]: next };
      }
      if (!prev[id]) return prev;
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }, []);

  const setGold = useCallback((next: { signedIn?: boolean; balanceCents?: number }) => {
    if (typeof next.signedIn === "boolean") setSignedIn(next.signedIn);
    if (typeof next.balanceCents === "number") setBalanceCents(next.balanceCents);
  }, []);

  const rows = Object.values(wells);
  const priced = rows.length;
  const needCents = rows.reduce((max, row) => Math.max(max, row.needCents), 0);
  const next = rows.find((row) => row.needCents > 0)?.next || rows[0]?.next || "/wait";
  const value = useMemo(
    () => ({ priced, needCents, next, setWell, signedIn, balanceCents, setGold }),
    [priced, needCents, next, setWell, signedIn, balanceCents, setGold],
  );

  return <DeskGoldContext.Provider value={value}>{children}</DeskGoldContext.Provider>;
}

export function useDeskGold() {
  return useContext(DeskGoldContext);
}

export function DeskBank() {
  const gold = useDeskGold();
  if (!gold || gold.priced <= 0) return null;
  const line = deskWalletLine(gold.signedIn, gold.balanceCents, gold.needCents);
  const href = deskWalletHref(gold.signedIn, gold.balanceCents, gold.needCents, gold.next);
  if (href) {
    return (
      <Link className="wait-desk-bank" href={href}>
        {line}
      </Link>
    );
  }
  return <p className="wait-desk-bank">{line}</p>;
}
