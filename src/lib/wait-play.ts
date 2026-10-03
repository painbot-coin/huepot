import type { PublicMark } from "@/lib/house-mark-list";
import type { WatchFrame } from "@/lib/lab-watch";
import { weightsFile } from "@/lib/tetris-style";

export type PlayReply = {
  error?: string;
  id?: string;
  name?: string;
  kind?: string;
  desk?: string;
  version?: string;
  playerType?: string;
  how?: string;
  games?: number;
  features?: string[];
  weights?: number[];
  score?: number;
  watchNote?: string;
  style?: string;
  steps?: number;
  frames?: WatchFrame[];
  marks?: PublicMark[];
  signedIn?: boolean;
  balanceCents?: number;
};

export function takeWeightsFile(data: PlayReply) {
  if (!data.weights?.length) return false;
  const body = weightsFile({
    name: data.name,
    playerType: data.playerType,
    how: data.how,
    games: data.games,
    features: data.features,
    weights: data.weights,
    watchScore: data.score,
    watchNote: data.watchNote,
    style: data.style,
  });
  const blob = new Blob([body], { type: "text/plain" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const slug = (data.name || data.id || "house-mark")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  link.href = href;
  link.download = `${slug || "trained"}-weights.txt`;
  link.click();
  URL.revokeObjectURL(href);
  return true;
}

export async function fetchPlay(id: string) {
  const res = await fetch("/api/wait/marks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, take: "play" }),
  });
  const data = (await res.json()) as PlayReply;
  if (!res.ok || !data.weights?.length || !data.id) return null;
  return data;
}

export async function fetchWatch(id: string) {
  const res = await fetch("/api/wait/marks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, take: "watch" }),
  });
  const data = (await res.json()) as PlayReply;
  if (!res.ok || !data.frames?.length || !data.id) return null;
  return data;
}

export async function fetchDownload(id: string) {
  const res = await fetch("/api/wait/marks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, take: "download" }),
  });
  const data = (await res.json()) as PlayReply;
  return { ok: res.ok, data };
}
