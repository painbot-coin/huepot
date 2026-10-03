"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatCents } from "@/lib/money";
import { WatchSit } from "@/components/WatchSit";
import { useCopy } from "@/components/LocaleRoot";
import { potLine, storeSentence } from "@/lib/house-tongue";
import {
  canDownloadWeights,
  canWatchMark,
  deskHref,
  deskSitNeed,
  deskWalletLine,
  groupMarks,
  storeShortMark,
  storeVaultHref,
  watchVaultHref,
  watchVaultLine,
  type PublicMark,
} from "@/lib/house-mark-list";
import type { WatchSit as WatchSitData } from "@/lib/lab-watch";
import { fetchDownload, fetchWatch, takeWeightsFile } from "@/lib/wait-play";
import { WORLD_BOOKS } from "@/lib/lab-world";
import { seatTag } from "@/lib/house-seats";
import type { PublicProject } from "@/lib/seat-project-public";
import {
  STORE_SHELVES,
  filterShelfMarks,
  filterShelfProjects,
  shelfShowsMarks,
  shelfShowsProjects,
  shelfShowsWorld,
  type StoreShelf,
} from "@/lib/store-shelf";
type MarkReply = {
  error?: string;
  marks?: PublicMark[];
  signedIn?: boolean;
  balanceCents?: number;
  id?: string;
  name?: string;
  playerType?: string;
  how?: string;
  games?: number;
  features?: string[];
  weights?: number[];
};

type ProjectReply = {
  error?: string;
  projects?: PublicProject[];
  signedIn?: boolean;
  balanceCents?: number;
  href?: string;
};

export function WaitStore() {
  const { locale } = useCopy();
  const [marks, setMarks] = useState<PublicMark[]>([]);
  const [projects, setProjects] = useState<PublicProject[]>([]);
  const [shelf, setShelf] = useState<StoreShelf>("all");
  const [signedIn, setSignedIn] = useState(false);
  const [balanceCents, setBalanceCents] = useState(0);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [watchId, setWatchId] = useState("");
  const [watch, setWatch] = useState<WatchSitData | null>(null);

  useEffect(() => {
    let live = true;
    void Promise.all([
      fetch("/api/wait/marks").then((res) => (res.ok ? res.json() : null)),
      fetch("/api/wait/projects").then((res) => (res.ok ? res.json() : null)),
    ])
      .then(([markData, projectData]: [MarkReply | null, ProjectReply | null]) => {
        if (!live) return;
        if (markData?.marks) setMarks(markData.marks);
        if (projectData?.projects) setProjects(projectData.projects);
        setSignedIn(Boolean(markData?.signedIn || projectData?.signedIn));
        setBalanceCents(markData?.balanceCents ?? projectData?.balanceCents ?? 0);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const seeSit = useCallback((id: string) => {
    setBusyId(id);
    setError("");
    setWatchId(id);
    setWatch(null);
    void fetchWatch(id)
      .then((data) => {
        if (!data?.frames?.length || !data.id) {
          setError("That sit could not play.");
          return;
        }
        setWatch({
          id: data.id,
          kind: (data.kind as WatchSitData["kind"]) || "wait",
          steps: data.steps ?? data.frames.length,
          score: data.score ?? 0,
          frames: data.frames,
        });
      })
      .catch(() => setError("That sit could not play."))
      .finally(() => setBusyId(""));
  }, []);

  const download = useCallback((id: string) => {
    setBusyId(id);
    setError("");
    void fetchDownload(id)
      .then(({ ok, data }) => {
        if (data.marks) setMarks(data.marks);
        setSignedIn(Boolean(data.signedIn));
        setBalanceCents(data.balanceCents ?? 0);
        if (!ok || !takeWeightsFile(data)) {
          setError(data.error || "That model could not download.");
        }
      })
      .catch(() => setError("That model could not download."))
      .finally(() => setBusyId(""));
  }, []);

  const takeProject = useCallback((id: string, href?: string) => {
    if (href) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    setBusyId(id);
    setError("");
    void fetch("/api/wait/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "buy", id }),
    })
      .then(async (res) => {
        const data = (await res.json()) as ProjectReply;
        if (data.projects) setProjects(data.projects);
        setSignedIn(Boolean(data.signedIn));
        setBalanceCents(data.balanceCents ?? 0);
        if (!res.ok || !data.href) {
          setError(data.error || "That project could not open.");
          return;
        }
        window.open(data.href, "_blank", "noopener,noreferrer");
      })
      .catch(() => setError("That project could not open."))
      .finally(() => setBusyId(""));
  }, []);

  const groups = groupMarks(filterShelfMarks(marks, shelf)).filter((game) =>
    game.rows.some((row) => row.status === "live"),
  );
  const shelfProjects = filterShelfProjects(projects, shelf);
  const short = storeShortMark(marks, signedIn, balanceCents);
  const bankHref = short ? storeVaultHref(signedIn, balanceCents, short) : "";
  const bankLine = short
    ? signedIn
      ? deskWalletLine(true, balanceCents, deskSitNeed(short))
      : "A priced file needs an account."
    : signedIn
      ? `Wallet ${formatCents(balanceCents)} USDT`
      : storeSentence(locale);

  return (
    <section className="wait-store" aria-label="Model store">
      <p className="wait-shelf-lead">
        House games, public models, and member projects. Each card shows what a
        real watch scored. The file is that book. Watch a sit, sit that
        book on the games desk, and take the file from either door. A watch on
        a priced book stays on that vault sit until gold is enough. {storeSentence(locale)}{" "}
        {potLine(locale)}
      </p>
      <div className="wait-tag-list" role="tablist" aria-label="Store shelves">
        {STORE_SHELVES.map((row) => (
          <button
            key={row.id}
            className={`wait-tag ${shelf === row.id ? "is-on" : ""}`}
            type="button"
            aria-pressed={shelf === row.id}
            onClick={() => setShelf(row.id)}
          >
            {row.label}
          </button>
        ))}
      </div>
      {bankHref ? (
        <Link className="wait-shelf-bank" href={bankHref}>
          {bankLine}
        </Link>
      ) : (
        <p className="wait-shelf-bank">{bankLine}</p>
      )}
      {shelfShowsMarks(shelf)
        ? groups.map((game) => (
        <div key={game.id} className="wait-game">
          <p className="wait-game-title">{game.title}</p>
          <ul className="wait-mark-list">
            {game.rows
              .filter((mark) => mark.status === "live")
              .map((mark) => {
                const door = storeVaultHref(signedIn, balanceCents, mark);
                return (
                <li key={mark.id} className="wait-mark">
                  <div className="wait-mark-top">
                    <p className="wait-mark-name">
                      {mark.name}
                      <span>{mark.playerType || `v ${mark.version}`}</span>
                    </p>
                    <p className="wait-mark-price">{mark.priceLabel}</p>
                  </div>
                  <p className="wait-mark-how">{mark.how}</p>
                  <p className="wait-mark-tags">
                    {mark.tags.map((tag) => (
                      <em key={tag}>{tag}</em>
                    ))}
                    {typeof mark.watchScore === "number" ? (
                      <em>
                        watch {mark.watchScore}
                        {mark.watchNote ? ` · ${mark.watchNote}` : ""}
                      </em>
                    ) : mark.bestLines ? (
                      <em>best {mark.bestLines}</em>
                    ) : mark.games ? (
                      <em>{mark.games} trains</em>
                    ) : null}
                  </p>
                  <div className="wait-mark-actions">
                    {canWatchMark(mark) ? (
                      <button className="wait-pad" type="button" disabled={busyId === mark.id} onClick={() => seeSit(mark.id)}>
                        {watchId === mark.id && watch ? "Watch again" : "Watch a sit"}
                      </button>
                    ) : null}
                    {canWatchMark(mark) ? (
                      <Link className="wait-pad" href={deskHref(mark.id)}>
                        Sit this book
                      </Link>
                    ) : null}
                    {canDownloadWeights(mark, mark.owned ? [mark.id] : []) || mark.priceCents <= 0 || mark.owned ? (
                      <button className="wait-pad" type="button" disabled={busyId === mark.id} onClick={() => download(mark.id)}>
                        Download the trained weights
                      </button>
                    ) : door ? (
                      <Link className="wait-pad" href={door}>
                        {signedIn ? "Open wallet" : "Sign in to buy"}
                      </Link>
                    ) : (
                      <button className="wait-pad" type="button" disabled={busyId === mark.id} onClick={() => download(mark.id)}>
                        Buy · {mark.priceLabel}
                      </button>
                    )}
                  </div>
                  {watchId === mark.id && watch ? (
                    <WatchSit
                      sit={watch}
                      vault={watchVaultHref(signedIn, balanceCents, mark)}
                      vaultLine={watchVaultLine(signedIn)}
                    />
                  ) : null}
                </li>
                );
              })}
          </ul>
        </div>
      ))
        : null}
      {shelfShowsProjects(shelf) ? (
        <div className="wait-world">
          <p className="wait-game-title">Projects</p>
          <p className="wait-shelf-lead">
            Game developers, AI developers, gamers, and bettors share a project
            here. A free link opens. A priced link leaves the wallet.
          </p>
          {shelfProjects.length === 0 ? (
            <p className="wait-shelf-lead">No project in this filter yet.</p>
          ) : (
            <ul className="wait-mark-list">
              {shelfProjects.map((row) => (
                <li key={row.id} className="wait-mark">
                  <div className="wait-mark-top">
                    <p className="wait-mark-name">
                      {row.name}
                      <span>
                        @{row.username} · {seatTag(row.seat)}
                      </span>
                    </p>
                    <p className="wait-mark-price">{row.priceLabel}</p>
                  </div>
                  <p className="wait-mark-how">{row.how}</p>
                  <div className="wait-mark-actions">
                    {row.owned || row.priceCents <= 0 ? (
                      <button
                        className="wait-pad"
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => takeProject(row.id, row.href)}
                      >
                        Open project
                      </button>
                    ) : signedIn ? (
                      <button
                        className="wait-pad"
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => takeProject(row.id)}
                      >
                        Buy · {row.priceLabel}
                      </button>
                    ) : (
                      <Link className="wait-pad" href="/signin?next=%2Fwait%2Fstore">
                        Sign in to buy
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
      {shelfShowsWorld(shelf) ? (
      <div className="wait-world">
        <p className="wait-game-title">Public models</p>
        <p className="wait-shelf-lead">
          Famous nets that run on their own engines. Huepot does not sell
          them. Open the official file and run it on your device.
        </p>
        <ul className="wait-mark-list">
          {WORLD_BOOKS.map((row) => (
            <li key={row.id} className="wait-mark">
              <div className="wait-mark-top">
                <p className="wait-mark-name">
                  {row.bot}
                  <span>{row.game}</span>
                </p>
                <p className="wait-mark-price">{row.weights === "public" ? "Official file" : "No file"}</p>
              </div>
              <p className="wait-mark-how">{row.how}</p>
              <p className="wait-mark-how">{row.file}</p>
              <div className="wait-mark-actions">
                <a className="wait-pad" href={row.href} target="_blank" rel="noreferrer">
                  {row.weights === "public" ? "Open the official weights" : "Open the source"}
                </a>
              </div>
            </li>
          ))}
        </ul>
      </div>
      ) : null}
      {error ? <p className="wait-mark-error">{error}</p> : null}
    </section>
  );
}
