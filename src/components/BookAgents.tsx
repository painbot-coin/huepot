"use client";

import Link from "next/link";
import { useState } from "react";
import { WatchSit } from "@/components/WatchSit";
import { useDeskGold } from "@/components/DeskBank";
import { deskHref, freePricedLine, storeVaultHref } from "@/lib/house-mark-list";
import type { AgentSit } from "@/lib/lab-watch";
import { fetchDownload, takeWeightsFile } from "@/lib/wait-play";

export type AgentCard = AgentSit & { owned: boolean };

export function BookAgents({
  agents,
  focusId = "",
}: {
  agents: AgentCard[];
  focusId?: string;
}) {
  const gold = useDeskGold();
  const signedIn = gold?.signedIn ?? false;
  const balanceCents = gold?.balanceCents ?? 0;
  const [owned, setOwned] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  if (!agents.length) return null;

  const download = (id: string) => {
    setBusyId(id);
    setError("");
    void fetchDownload(id)
      .then(({ ok, data }) => {
        if (typeof data.signedIn === "boolean" || typeof data.balanceCents === "number") {
          gold?.setGold({ signedIn: Boolean(data.signedIn), balanceCents: data.balanceCents ?? 0 });
        }
        const row = data.marks?.find((mark) => mark.id === id);
        if (row?.owned) setOwned((prev) => ({ ...prev, [id]: true }));
        if (!ok || !takeWeightsFile(data)) {
          setError(data.error || "That file could not download.");
        }
      })
      .catch(() => setError("That file could not download."))
      .finally(() => setBusyId(""));
  };

  return (
    <section className="wait-agents-desk" aria-label="The book">
      <p className="wait-shelf-kicker">The book</p>
      <p className="wait-shelf-lead">
        Anyone can watch a sit. The card shows that watch. The file is that book. {freePricedLine()}{" "}
        The pot stays on Classic.
      </p>
      <ul className="wait-agents">
        {agents.map((agent) => {
          const have = owned[agent.id] ?? agent.owned;
          const mark = {
            id: agent.id,
            status: "live" as const,
            priceCents: agent.priceCents,
            owned: have,
          };
          const door = storeVaultHref(signedIn, balanceCents, mark);
          const canTake = agent.priceCents <= 0 || have;
          return (
            <li key={agent.id} className={`wait-mark ${focusId === agent.id ? "is-on" : ""}`}>
              <div className="wait-mark-top">
                <p className="wait-mark-name">
                  {agent.label}
                  <span>{agent.priceCents <= 0 ? "Free file" : "Priced file"}</span>
                </p>
                <p className="wait-mark-price">{agent.priceLabel}</p>
              </div>
              <p className="wait-mark-how">{agent.how}</p>
              <WatchSit
                sit={{
                  id: agent.id,
                  kind: agent.kind,
                  steps: agent.steps,
                  score: agent.score,
                  frames: agent.frames,
                }}
              />
              <div className="wait-mark-actions">
                {canTake ? (
                  <button className="wait-pad" type="button" disabled={busyId === agent.id} onClick={() => download(agent.id)}>
                    Download the file
                  </button>
                ) : door ? (
                  <Link className="wait-pad" href={door}>
                    {signedIn ? "A priced file needs gold" : "Sign in to buy"}
                  </Link>
                ) : (
                  <button className="wait-pad" type="button" disabled={busyId === agent.id} onClick={() => download(agent.id)}>
                    Buy · {agent.priceLabel}
                  </button>
                )}
                <Link className="wait-pad" href={deskHref(agent.id)}>
                  Sit this book
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
      {error ? <p className="wait-mark-error">{error}</p> : null}
    </section>
  );
}
