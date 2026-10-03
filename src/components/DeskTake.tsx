"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useDeskGold } from "@/components/DeskBank";
import {
  canDownloadWeights,
  deskHref,
  deskShowsWallet,
  deskSitNeed,
  deskSitShort,
  deskWalletHref,
  type PublicMark,
} from "@/lib/house-mark-list";
import { fetchDownload, takeWeightsFile } from "@/lib/wait-play";

export function DeskTake({ mark }: { mark: PublicMark }) {
  const gold = useDeskGold();
  const setWell = gold?.setWell;
  const setGold = gold?.setGold;
  const [signedIn, setSignedIn] = useState(false);
  const [owned, setOwned] = useState(mark.owned);
  const [seen, setSeen] = useState(mark.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const priced = deskShowsWallet(mark);

  if (seen !== mark.id) {
    setSeen(mark.id);
    setOwned(mark.owned);
    setBusy(false);
    setError("");
  }

  useEffect(() => {
    setOwned(mark.owned);
  }, [mark.owned, mark.id]);

  const held = seen === mark.id ? owned : mark.owned;
  const need = deskSitNeed({ ...mark, owned: held });
  const next = deskHref(mark.id);

  useEffect(() => {
    setWell?.(mark.id, priced, { needCents: need, next });
    return () => setWell?.(mark.id, false);
  }, [setWell, mark.id, priced, need, next]);

  useEffect(() => {
    let live = true;
    void fetch("/api/wait/marks")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { signedIn?: boolean; balanceCents?: number; marks?: PublicMark[] } | null) => {
        if (!live || !data) return;
        setSignedIn(Boolean(data.signedIn));
        setGold?.({ signedIn: Boolean(data.signedIn), balanceCents: data.balanceCents ?? 0 });
        const row = data.marks?.find((item) => item.id === mark.id);
        if (row) setOwned(row.owned);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [setGold, mark.id]);

  const take = useCallback(() => {
    setBusy(true);
    setError("");
    void fetchDownload(mark.id)
      .then(({ ok, data }) => {
        setSignedIn(Boolean(data.signedIn));
        setGold?.({ signedIn: Boolean(data.signedIn), balanceCents: data.balanceCents ?? 0 });
        const row = data.marks?.find((item) => item.id === mark.id);
        if (row) setOwned(row.owned);
        if (!ok || !takeWeightsFile(data)) {
          setError(data.error || "That file could not leave the desk.");
        }
      })
      .catch(() => setError("That file could not leave the desk."))
      .finally(() => setBusy(false));
  }, [setGold, mark.id]);

  const open = canDownloadWeights(mark, held ? [mark.id] : []);
  const inSeat = gold?.signedIn ?? signedIn;
  const balance = gold?.balanceCents ?? 0;
  const short = inSeat && deskSitShort(balance, need);
  const door = deskWalletHref(inSeat, balance, need, next);

  return (
    <div className="wait-pick-take">
      {open ? (
        <button className="wait-pad" type="button" disabled={busy} onClick={take}>
          Take this file
        </button>
      ) : short && door ? (
        <Link className="wait-pad" href={door}>
          Open wallet
        </Link>
      ) : inSeat ? (
        <button className="wait-pad" type="button" disabled={busy} onClick={take}>
          Buy · {mark.priceLabel}
        </button>
      ) : (
        <Link className="wait-pad" href={`/signin?next=${encodeURIComponent(next)}`}>
          Sign in to take
        </Link>
      )}
      {error ? <p className="wait-mark-error">{error}</p> : null}
    </div>
  );
}
