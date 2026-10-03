"use client";
import { HouseButton, HouseField, HouseSelect, HouseTabs, MenuItem } from "@/components/HouseUi";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { MessageLink } from "@/components/MessageDock";
import { Avatar } from "@/components/Avatar";
import { CopyInvite } from "@/components/CopyInvite";
import { NetworkChrome } from "@/components/NetworkChrome";
import { hueRule, levelFor, nextRankFor } from "@/lib/coin";
import { AVATAR_HUES, hueHexOf } from "@/lib/hues";
import { openMessageDock } from "@/lib/message-dock";
import { formatUsdt } from "@/lib/money";
import { BASIC_ROOMS } from "@/lib/rooms";
import { AGENT_BOOKS } from "@/lib/house-mark-list";
import type { HistoryLine } from "@/lib/seat-history";
import { houseLadder } from "@/lib/house-ladder";
import { seatJobs } from "@/lib/seat-jobs";
import type { SeatBook } from "@/lib/seat-book";
import { useCopy } from "@/components/LocaleRoot";
import { HOUSE_SEATS, seatLabel, seatTag, seatWho } from "@/lib/house-seats";
import { seatLead, spokenSeat } from "@/lib/house-tongue";
import { writerLabel } from "@/lib/line-writer";
import { pitLabel } from "@/lib/seat-alike";
import type { PublicProject } from "@/lib/seat-project-public";
import { NOTE_MAX, SIT_MARKS, sitMarkLabel } from "@/lib/seat-note";
import {
  COMPANY_CLASSIC_HREF,
  sitClassicLabel,
  sitWithThemLabel,
} from "@/lib/company-door";
import type { PlayerRecord } from "@/lib/record";
import { seatHueNames } from "@/lib/take-copy";
import type { TaskProgress } from "@/lib/tasks";
import type {
  ClassicHour,
  FogCup,
  NetworkPost,
  NetworkProfile as Profile,
  NetworkYou,
  NightHour,
  SeatNote,
} from "@/lib/types";

type VisitTab = "posts" | "about" | "projects" | "notes";
type SeatJobs = ReturnType<typeof seatJobs>;

function SeatHues({ hue, takes }: { hue: string; takes: { names: string }[] }) {
  const hues = seatHueNames(hue, takes);
  if (!hues.length) return null;
  return <p className="li-profile-meta">Hues · {hues.join(", ")}</p>;
}

function whenLabel(at: number) {
  const mins = Math.floor(Math.max(0, Date.now() - at) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function signInNext(username: string) {
  return `/signin?next=${encodeURIComponent(`/network/u/${username}`)}`;
}

function coverStyle(cover: string): CSSProperties {
  if (cover.startsWith("hue:")) {
    const hex = hueHexOf(cover.slice(4));
    return hex ? { background: hex } : {};
  }
  if (cover.startsWith("https://")) {
    return {
      backgroundImage: `url("${cover}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  return {};
}

function doorEntries(doors: Profile["doors"] | undefined) {
  const row = doors ?? { x: "", telegram: "", discord: "" };
  return (
    [
      ["x", "X", row.x],
      ["telegram", "Telegram", row.telegram],
      ["discord", "Discord", row.discord],
    ] as const
  ).filter(([, , href]) => Boolean(href));
}

function ageLabel(at: number | null) {
  if (!at) return "offline";
  const mins = Math.floor(Math.max(0, Date.now() - at) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function SeatRecord({
  record,
  you,
  place,
}: {
  record: PlayerRecord;
  you: boolean;
  place: number | null;
}) {
  if (!record || record.clicks === 0) {
    return (
      <p className="seat-record-empty">
        {you
          ? "No rounds yet. Sit a table and your record starts here."
          : "This seat has not sat a round yet."}
      </p>
    );
  }
  const level = levelFor(record.coin);
  const next = nextRankFor(record.coin);

  return (
    <div className="seat-record">
      <p className="hall-kicker">The record</p>
      <div className="seat-coin">
        <div>
          <p className="seat-coin-value">{record.coin.toLocaleString()} HUE</p>
          <p className="seat-coin-rank">
            Level {level.level} · {level.title}
            {place != null ? ` · #${place}` : ""}
          </p>
        </div>
        <p className="seat-coin-note">
          {hueRule()}
          {record.bonus > 0
            ? ` ${record.bonus.toLocaleString()} of it from tasks.`
            : ""}
          {next
            ? ` ${(next.at - record.coin).toLocaleString()} to ${next.name}.`
            : " Top of the house."}
        </p>
      </div>
      <dl>
        <div>
          <dt>Takes</dt>
          <dd>{record.takes}</dd>
        </div>
        <div>
          <dt>Taken</dt>
          <dd>{formatUsdt(record.taken)}</dd>
        </div>
        <div>
          <dt>Biggest</dt>
          <dd>{formatUsdt(record.biggest)}</dd>
        </div>
        <div>
          <dt>Struck</dt>
          <dd>{record.clicks}</dd>
        </div>
        {record.hue ? (
          <div>
            <dt>Favours</dt>
            <dd>{record.hue}</dd>
          </div>
        ) : null}
      </dl>
      {you ? (
        <div className="seat-tasks">
          <TaskList title="Today" tasks={record.daily} resets="Resets 00:00 UTC" />
          <TaskList title="This week" tasks={record.weekly} resets="Resets Monday" />
        </div>
      ) : null}
    </div>
  );
}

function TaskList({
  title,
  tasks,
  resets,
}: {
  title: string;
  tasks: TaskProgress[];
  resets: string;
}) {
  if (!tasks?.length) return null;
  const done = tasks.filter((task) => task.done).length;
  return (
    <div className="task-col">
      <p className="task-head">
        <span>{title}</span>
        <em>
          {done}/{tasks.length} · {resets}
        </em>
      </p>
      <ul className="task-list">
        {tasks.map((task) => (
          <li className={task.done ? "is-done" : ""} key={task.id}>
            <span className="task-mark" aria-hidden="true" />
            <span className="task-name">
              {task.name}
              <em>{task.note}</em>
            </span>
            <span className="task-score">
              {task.progress}/{task.target}
              <em>+{task.bonus} HUE</em>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SeatLine({
  post,
  signedIn,
  busy,
  onAct,
}: {
  post: NetworkPost;
  you: string;
  signedIn: boolean;
  busy: boolean;
  onAct: (body: Record<string, string>) => Promise<void>;
}) {
  const [comment, setComment] = useState("");
  return (
    <li className="li-seat-line">
      {post.writer === "seat" ? (
        <Link className="li-name" href={`/network/u/${encodeURIComponent(post.username)}`}>
          {writerLabel("seat", post.username)}
        </Link>
      ) : (
        <span className="li-name">{writerLabel(post.writer, post.username)}</span>
      )}
      {seatTag(post.kind) ? <em className="seat-tag">{seatTag(post.kind)}</em> : null}
      <span className="li-when"> · {whenLabel(post.createdAt)}</span>
      <p>{post.body || post.title}</p>
      <div className="li-actions">
        {signedIn ? (
          <HouseButton
            className={post.liked ? "is-on" : undefined}
            disabled={busy}
            ghost
            onClick={() => void onAct({ action: "like", postId: post.id })}
          >
            {post.liked ? "Liked" : "Like"} · {post.likes}
          </HouseButton>
        ) : (
          <HouseButton ghost href="/signin?next=/network">
            Like · {post.likes}
          </HouseButton>
        )}
        <HouseButton ghost href={`/network?post=${encodeURIComponent(post.id)}`}>
          Talk
        </HouseButton>
      </div>
      {post.comments.length ? (
        <ul className="li-comments">
          {post.comments.map((item) => (
            <li key={item.id}>
              {item.writer === "seat" ? (
                <Link href={`/network/u/${encodeURIComponent(item.username)}`}>
                  {writerLabel("seat", item.username)}
                </Link>
              ) : (
                <span>{writerLabel(item.writer, item.username)}</span>
              )}
              {` ${item.body}`}
            </li>
          ))}
        </ul>
      ) : null}
      {signedIn ? (
        <form
          className="li-comment"
          onSubmit={(event) => {
            event.preventDefault();
            if (!comment.trim()) return;
            void onAct({ action: "comment", postId: post.id, body: comment }).then(() => setComment(""));
          }}
        >
          <HouseField
            inputProps={{ maxLength: 240 }}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Add a comment"
            value={comment}
          />
        </form>
      ) : null}
    </li>
  );
}

export function NetworkProfile({ username }: { username: string }) {
  const { locale } = useCopy();
  const [you, setYou] = useState<NetworkYou | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<NetworkPost[]>([]);
  const [recommended, setRecommended] = useState<NetworkPost[]>([]);
  const [tab, setTab] = useState<VisitTab>("posts");
  const [feedMode, setFeedMode] = useState<"recent" | "recommended">("recent");
  const [letter, setLetter] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteMark, setNoteMark] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [booted, setBooted] = useState(false);
  const [hour, setHour] = useState<ClassicHour | null>(null);
  const [night, setNight] = useState<NightHour | null>(null);
  const [cup, setCup] = useState<FogCup | null>(null);
  const [edit, setEdit] = useState(false);
  const [headline, setHeadline] = useState("");
  const [about, setAbout] = useState("");
  const [location, setLocation] = useState("");
  const [avatar, setAvatar] = useState("");
  const [cover, setCover] = useState("");
  const [sitSlug, setSitSlug] = useState("");
  const [book, setBook] = useState("");
  const [bookFace, setBookFace] = useState<SeatBook | null>(null);
  const [history, setHistory] = useState<{
    takes: HistoryLine[];
    files: HistoryLine[];
    applications: HistoryLine[];
  } | null>(null);
  const [jobs, setJobs] = useState<SeatJobs | null>(null);
  const [seat, setSeat] = useState("");
  const [projects, setProjects] = useState<PublicProject[]>([]);
  const [projectName, setProjectName] = useState("");
  const [projectHow, setProjectHow] = useState("");
  const [projectHref, setProjectHref] = useState("");
  const [projectPrice, setProjectPrice] = useState("0");
  const [doors, setDoors] = useState({ x: "", telegram: "", discord: "" });
  const [busyPic, setBusyPic] = useState("");
  const [depth, setDepth] = useState(12);
  const [total, setTotal] = useState(0);

  async function load(want = depth) {
    const search = new URLSearchParams({ u: username, limit: String(want) });
    const response = await fetch(`/api/network/profile?${search}`);
    const data = (await response.json()) as {
      you?: NetworkYou;
      profile?: Profile;
      posts?: NetworkPost[];
      recommended?: NetworkPost[];
      projects?: PublicProject[];
      bookFace?: SeatBook | null;
      history?: { takes: HistoryLine[]; files: HistoryLine[]; applications: HistoryLine[] };
      jobs?: SeatJobs;
      total?: number;
      error?: string;
    };
    if (!response.ok) throw new Error(data.error || "Could not load profile");
    setYou(data.you ?? null);
    setPosts(data.posts ?? []);
    setRecommended(data.recommended ?? []);
    if (typeof data.total === "number") setTotal(data.total);
    if (data.projects) setProjects(data.projects);
    if (data.profile) {
      if (data.profile.yourNote) {
        setNoteBody(data.profile.yourNote.body);
        setNoteMark(data.profile.yourNote.mark);
      }
      setProfile(data.profile);
      setHeadline(
        !data.profile.headline ||
          data.profile.headline === "Huepot player" ||
          data.profile.headline === seatLabel(data.profile.seat)
          ? ""
          : data.profile.headline,
      );
      setAbout(data.profile.about);
      setLocation(data.profile.location);
      setAvatar(data.profile.avatar);
      setCover(data.profile.cover ?? "");
      setSitSlug(data.profile.sitSlug ?? "");
      setBook(data.profile.book ?? "");
      setBookFace(data.bookFace ?? null);
      setHistory(data.history ?? null);
      setJobs(data.jobs ?? null);
      setSeat(data.profile.seat ?? "");
      setDoors(data.profile.doors ?? { x: "", telegram: "", discord: "" });
    }
  }

  useEffect(() => {
    void load()
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load"))
      .finally(() => setBooted(true));
    void fetch("/api/rooms")
      .then(
        (response) =>
          response.json() as Promise<{
            classicHour?: ClassicHour;
            nightHour?: NightHour;
            fogCup?: FogCup;
          }>,
      )
      .then((data) => {
        if (data.classicHour) setHour(data.classicHour);
        if (data.nightHour) setNight(data.nightHour);
        if (data.fogCup) setCup(data.fogCup);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, depth]);

  async function pickFile(kind: "avatar" | "cover", file?: File) {
    if (!file) return;
    setBusyPic(kind);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || "Could not send that picture");
      // Chosen but not saved yet, so Save is still the one thing that commits.
      if (kind === "cover") setCover(data.url);
      else setAvatar(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that picture");
    } finally {
      setBusyPic("");
    }
  }

  async function save() {
    setError("");
    try {
      const response = await fetch("/api/network/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headline, about, location, avatar, cover, sitSlug, book, seat, doors }),
      });
      const data = (await response.json()) as {
        you?: NetworkYou;
        profile?: Profile;
        projects?: PublicProject[];
        bookFace?: SeatBook | null;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Could not save");
      setYou(data.you ?? null);
      if (data.profile) setProfile(data.profile);
      if (data.profile) setBook(data.profile.book ?? "");
      if ("bookFace" in data) setBookFace(data.bookFace ?? null);
      if (data.projects) setProjects(data.projects);
      setEdit(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    }
  }

  async function act(action: string) {
    if (!profile) return;
    setError("");
    try {
      const response = await fetch("/api/network", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, username: profile.username, tab: "pit" }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not update");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update");
    }
  }

  async function sendLetter() {
    if (!profile || !letter.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/network/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "message", username: profile.username, body: letter }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not send");
      setLetter("");
      openMessageDock(profile.username);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }

  async function sendNote() {
    if (!profile || !noteBody.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/network/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "note",
          username: profile.username,
          body: noteBody,
          mark: noteMark,
        }),
      });
      const data = (await response.json()) as {
        notes?: SeatNote[];
        yourNote?: SeatNote | null;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Could not write that note");
      setProfile((was) =>
        was
          ? { ...was, notes: data.notes ?? was.notes, yourNote: data.yourNote ?? null }
          : was,
      );
      setTab("notes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not write that note");
    } finally {
      setBusy(false);
    }
  }

  async function removeNote(noteId: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/network/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-note", noteId }),
      });
      const data = (await response.json()) as {
        notes?: SeatNote[];
        yourNote?: SeatNote | null;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Could not remove that note");
      setProfile((was) =>
        was
          ? { ...was, notes: data.notes ?? [], yourNote: data.yourNote ?? null }
          : was,
      );
      if (!data.yourNote) {
        setNoteBody("");
        setNoteMark("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove that note");
    } finally {
      setBusy(false);
    }
  }

  async function feedAct(body: Record<string, string>) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/network/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not update");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update");
    } finally {
      setBusy(false);
    }
  }

  async function projectAct(action: "add" | "drop" | "buy", id = "") {
    setBusy(true);
    setError("");
    try {
      const cents = Math.max(0, Math.round(Number(projectPrice || 0) * 100));
      const response = await fetch("/api/wait/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "add"
            ? { name: projectName, how: projectHow, href: projectHref, seat, priceCents: cents }
            : { action, id },
        ),
      });
      const data = (await response.json()) as {
        projects?: PublicProject[];
        href?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Could not update that project");
      if (action === "add") {
        setProjectName("");
        setProjectHow("");
        setProjectHref("");
        setProjectPrice("0");
      }
      if (action === "buy" && data.href) window.open(data.href, "_blank", "noopener,noreferrer");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update that project");
    } finally {
      setBusy(false);
    }
  }

  function openProject(row: PublicProject) {
    if (row.href) {
      window.open(row.href, "_blank", "noopener,noreferrer");
      return;
    }
    void projectAct("buy", row.id);
  }

  if (!booted) {
    return (
      <NetworkChrome>
        <p className="px-4 py-16 text-center text-zinc-400">Opening profile…</p>
      </NetworkChrome>
    );
  }
  if (!profile) {
    return (
      <NetworkChrome you={you}>
        <p className="px-4 py-16 text-center text-zinc-400">{error || "Opening profile…"}</p>
      </NetworkChrome>
    );
  }

  return (
    <NetworkChrome you={you}>
      <main className="li-main is-visit">
        <section className="li-col">
          <div className="li-card overflow-hidden">
            <div
              className={`li-cover is-tall${profile.cover?.startsWith("https://") ? " has-pic" : ""}${profile.cover?.startsWith("hue:") ? " has-hue" : ""}`}
              style={coverStyle(profile.cover ?? "")}
            />
            <div className="li-profile">
              <div className="li-profile-top">
                <Avatar avatar={profile.avatar} size="lg" username={profile.username} />
                <div className="li-profile-id">
                  <h1>@{profile.username}</h1>
                  <p className="li-head">{profile.headline}</p>
                  {profile.seat ? (
                    <p className="li-profile-place">
                      <em className="seat-tag">{seatTag(profile.seat)}</em>
                      {seatLabel(profile.seat)}
                      {seatWho(profile.seat) ? ` · ${seatWho(profile.seat)}` : ""}
                    </p>
                  ) : null}
                  {profile.sitSlug ? (
                    <p className="li-profile-place">Sits {pitLabel(profile.sitSlug)}</p>
                  ) : null}
                  {profile.location ? <p className="li-profile-place">{profile.location}</p> : null}
                  {doorEntries(profile.doors).length ? (
                    <p className="li-doors">
                      {doorEntries(profile.doors).map(([key, label, href]) => (
                        <a href={href} key={key} rel="noreferrer noopener" target="_blank">
                          {label}
                        </a>
                      ))}
                    </p>
                  ) : null}
                  <p className="li-profile-meta">
                    {(profile.notes ?? []).length === 1
                      ? "1 note"
                      : `${(profile.notes ?? []).length} notes`}{" "}
                    · {profile.friends} in company ·{" "}
                    {profile.online
                      ? profile.room
                        ? `Online · ${profile.room.name}`
                        : "Online"
                      : `Last seen ${ageLabel(profile.lastSeen)}`}
                    {` · Joined ${new Date(profile.createdAt).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
              <SeatRecord
                place={profile.place ?? null}
                record={profile.record}
                you={profile.you}
              />
              <SeatHues hue={profile.record.hue} takes={profile.lastTakes ?? []} />
              {jobs ? (
                <section aria-label="Three jobs">
                  <p className="hall-kicker">Three jobs</p>
                  <div className="hall-doors">
                    <div className="hall-door">
                      <strong>Social</strong>
                      {jobs.social.people.length ? (
                        <span>
                          {jobs.social.people.map((row) => (
                            <Link href={row.href} key={row.username}>
                              @{row.username}{" "}
                            </Link>
                          ))}
                        </span>
                      ) : (
                        <span>No company yet. The house does not add one.</span>
                      )}
                      {jobs.social.circles.length ? (
                        <span>
                          {jobs.social.circles.map((row) => (
                            <Link href={row.href} key={row.id}>
                              {row.label}{" "}
                            </Link>
                          ))}
                        </span>
                      ) : (
                        <span>No room yet. The house does not add one.</span>
                      )}
                    </div>
                    <div className="hall-door">
                      <strong>AI</strong>
                      {jobs.ai.bookName ? (
                        <>
                          <span>
                            <Link href={jobs.ai.sitHref}>{jobs.ai.bookName}</Link>
                          </span>
                          {jobs.ai.watch ? <span>{jobs.ai.watch}</span> : null}
                          <span>The book does not speak as this seat. It holds no wallet.</span>
                          {jobs.ai.sameBook.length ? (
                            <span>
                              {jobs.ai.sameBook.map((row) => (
                                <Link href={row.href} key={row.username}>
                                  @{row.username}{" "}
                                </Link>
                              ))}
                            </span>
                          ) : (
                            <span>No other seat sits this book.</span>
                          )}
                          {jobs.ai.pairHref ? (
                            <span>
                              <Link href={jobs.ai.pairHref}>Sit against the house</Link>
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span>
                          <Link href={jobs.ai.sitHref}>Sit a book.</Link> The house does not name one. A book does not speak as a seat and holds no wallet.
                        </span>
                      )}
                      <span>The house</span>
                      {jobs.ai.lines.length ? (
                        <span>
                          {jobs.ai.lines.map((line) => (
                            <Link href={line.href} key={`${line.title}-${line.href}`}>
                              {line.title}{" "}
                            </Link>
                          ))}
                        </span>
                      ) : (
                        <span>No line yet. The house does not add one.</span>
                      )}
                    </div>
                    <div className="hall-door">
                      <strong>Web3</strong>
                      {jobs.web3.files.length ? (
                        <span>
                          {jobs.web3.files.map((row) => (
                            <Link href={row.href} key={row.href}>
                              {row.title}{" "}
                            </Link>
                          ))}
                        </span>
                      ) : (
                        <span>No owned file. The house does not add one.</span>
                      )}
                      <span>History is the proof. There is no second lifetime number. {jobs.web3.charge}</span>
                      {jobs.web3.vaultHref ? (
                        <span>
                          <Link href={jobs.web3.vaultHref}>Balance stays on the vault.</Link>
                        </span>
                      ) : null}
                    </div>
                  </div>
                </section>
              ) : null}
              <section aria-label="Seven doors">
                <p className="hall-kicker">Seven doors</p>
                <div className="hall-doors">
                  {houseLadder({
                    bookId: jobs?.ai.bookId ?? "",
                    fileHref: jobs?.web3.files[0]?.href ?? "",
                    profileHref: `/network/u/${profile.username}`,
                  }).map((step) => (
                    <Link className="hall-door" href={step.href} key={step.id}>
                      <strong>{step.title}</strong>
                      <span>{step.line}</span>
                    </Link>
                  ))}
                </div>
              </section>
              <section aria-label="Agents">
                <p className="hall-kicker">Agents</p>
                <p className="account-note">
                  Paid work locks vault USDT. It does not change HUE or the pot.
                </p>
                <p>
                  <Link href={`/atrium/u/${encodeURIComponent(profile.username)}`}>Paid work</Link>
                </p>
              </section>
              <section aria-label="History" id="history">
                <p className="hall-kicker">History</p>
                <p className="account-note">
                  Takes, owned files, and finished applications. HUE stands from clicks and takes. There is no second lifetime number. USDT plays, buys a priced file, or locks a contract.
                </p>
                {!history || history.takes.length + history.files.length + history.applications.length === 0 ? (
                  <p className="li-profile-meta">No history yet. The house does not add one.</p>
                ) : (
                  <ul className="seat-takes">
                    {history.takes.map((row) => (
                      <li key={`take-${row.id}`}>
                        <Link href={row.href}>Take · {row.title}</Link>
                      </li>
                    ))}
                    {history.files.map((row) => (
                      <li key={`file-${row.id}`}>
                        <Link href={row.href}>File · {row.title}</Link>
                      </li>
                    ))}
                    {history.applications.map((row) => (
                      <li key={`job-${row.id}`}>
                        <Link href={row.href}>Application · {row.title}</Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              {bookFace ? (
                <section aria-label="The book" className="li-card house-post">
                  <p className="lobby-label">The book</p>
                  <h2>
                    <Link href={bookFace.sitHref}>{bookFace.name}</Link>
                  </h2>
                  <p>{bookFace.how}</p>
                  <p>{bookFace.watch}</p>
                  <p>{bookFace.file}</p>
                  {bookFace.goldHref ? (
                    <p className="guide-cta">
                      <HouseButton href={bookFace.goldHref}>Add gold for this file</HouseButton>
                    </p>
                  ) : null}
                  <p className="guide-cta">
                    <HouseButton ghost href={`/wait?pair=${encodeURIComponent(bookFace.id)}`}>
                      Sit against the house
                    </HouseButton>
                  </p>
                </section>
              ) : (
                <p className="li-profile-meta">
                  {profile.you ? "Name the book you sit." : "This seat has not named a book."}
                </p>
              )}
              {profile.you ? (
                <p className="li-profile-meta">
                  <Link href="/account">Balance stays on the vault.</Link>
                </p>
              ) : null}
              <div className="li-profile-act">
                {profile.you ? (
                  <>
                    <HouseButton
                      onClick={() => {
                        setTab("about");
                        setEdit((open) => !open);
                      }}
                    >
                      {edit ? "Close" : "Edit profile"}
                    </HouseButton>
                    {profile.inviteCode ? (
                      <CopyInvite
                        className="chip-btn chip-btn-ghost"
                        code={profile.inviteCode}
                        cup={cup}
                        hour={hour?.hour}
                        href="/signin"
                        night={night?.hour}
                      />
                    ) : null}
                  </>
                ) : !you ? (
                  <>
                    <HouseButton href={signInNext(profile.username)}>
                      Sign in to write
                    </HouseButton>
                    <Link className="li-ask" href={signInNext(profile.username)}>
                      Sign in to ask
                    </Link>
                    {profile.room ? (
                      <HouseButton ghost href={`/rooms/${profile.room.slug}`}>
                        {sitWithThemLabel()}
                      </HouseButton>
                    ) : (
                      <HouseButton ghost href={COMPANY_CLASSIC_HREF}>
                        {sitClassicLabel()}
                      </HouseButton>
                    )}
                  </>
                ) : (
                  <>
                    <MessageLink username={profile.username} />
                    <HouseButton ghost onClick={() => setTab("notes")}>
                      How they sit
                    </HouseButton>
                    {profile.room ? (
                      <HouseButton ghost href={`/rooms/${profile.room.slug}`}>
                        {sitWithThemLabel()}
                      </HouseButton>
                    ) : profile.relation === "friends" ? (
                      <HouseButton ghost href={COMPANY_CLASSIC_HREF}>
                        {sitClassicLabel()}
                      </HouseButton>
                    ) : null}
                    {profile.relation === "none" ? (
                      <button className="li-ask" onClick={() => void act("request")} type="button">
                        Ask
                      </button>
                    ) : null}
                    {profile.relation === "outgoing" ? (
                      <span className="li-ask is-sent">Sent</span>
                    ) : null}
                    {profile.relation === "incoming" ? (
                      <>
                        <HouseButton onClick={() => void act("accept")}>
                          Accept
                        </HouseButton>
                        <HouseButton ghost onClick={() => void act("ignore")}>
                          Ignore
                        </HouseButton>
                      </>
                    ) : null}
                    {profile.relation === "friends" ? (
                      <HouseButton ghost onClick={() => void act("unfriend")}>
                        Remove
                      </HouseButton>
                    ) : null}
                    {profile.relation === "blocked" ? (
                      <HouseButton ghost onClick={() => void act("unblock")}>
                        Unblock
                      </HouseButton>
                    ) : (
                      <HouseButton ghost onClick={() => void act("block")}>
                        Block
                      </HouseButton>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="house-profile-tabs" role="tablist" aria-label="Seat">
            <HouseTabs
              items={
                [
                  { id: "posts", label: "Posts" },
                  { id: "about", label: "About" },
                  { id: "projects", label: "Projects" },
                  {
                    id: "notes",
                    label: (profile.notes ?? []).length
                      ? `Notes · ${profile.notes.length}`
                      : "Notes",
                  },
                ]
              }
              onChange={(id) => setTab(id as VisitTab)}
              value={tab}
            />
          </div>
          {tab === "about" ? (
          <div className="li-card mt-4 p-5">
            <p className="lobby-label">About</p>
            {edit ? (
              <div className="mt-3 space-y-3">
                <p className="lobby-label">Cover</p>
                <div className="avatar-pick">
                  <button
                    className={`avatar-swatch is-initials${cover === "" ? " is-on" : ""}`}
                    onClick={() => setCover("")}
                    title="House plate"
                    type="button"
                  >
                    —
                  </button>
                  {AVATAR_HUES.map((id) => (
                    <button
                      className={`avatar-swatch${cover === `hue:${id}` ? " is-on" : ""}`}
                      key={`cover-${id}`}
                      onClick={() => setCover(`hue:${id}`)}
                      style={{ background: hueHexOf(id) }}
                      title={id}
                      type="button"
                    />
                  ))}
                  <label className="chip-btn chip-btn-ghost cursor-pointer">
                    {busyPic === "cover" ? "Sending…" : "Upload cover"}
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(event) => void pickFile("cover", event.target.files?.[0])}
                      type="file"
                    />
                  </label>
                </div>
                <p className="lobby-label">Your face</p>
                <div className="avatar-pick">
                  <Avatar avatar={avatar} size="sm" username={profile.username} />
                  <button
                    className={`avatar-swatch is-initials${avatar === "" ? " is-on" : ""}`}
                    onClick={() => setAvatar("")}
                    title="Just initials"
                    type="button"
                  >
                    Aa
                  </button>
                  {AVATAR_HUES.map((id) => (
                    <button
                      className={`avatar-swatch${avatar === `hue:${id}` ? " is-on" : ""}`}
                      key={id}
                      onClick={() => setAvatar(`hue:${id}`)}
                      style={{ background: hueHexOf(id) }}
                      title={id}
                      type="button"
                    />
                  ))}
                  <label className="chip-btn chip-btn-ghost cursor-pointer">
                    {busyPic === "avatar" ? "Sending…" : "Upload"}
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(event) => void pickFile("avatar", event.target.files?.[0])}
                      type="file"
                    />
                  </label>
                </div>
                <HouseField
                  inputProps={{ maxLength: 80 }}
                  onChange={(event) => setHeadline(event.target.value)}
                  placeholder="Headline"
                  value={headline}
                />
                <HouseField
                  inputProps={{ maxLength: 40 }}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="City"
                  value={location}
                />
                <label className="seat-field">
                  <span>Role</span>
                  <HouseSelect onChange={setSeat} value={seat}>
                    <MenuItem value="">No role yet</MenuItem>
                    {HOUSE_SEATS.map((row) => (
                      <MenuItem key={row.id} value={row.id}>
                        {spokenSeat(locale, row.id).label}
                      </MenuItem>
                    ))}
                  </HouseSelect>
                </label>
                <p className="li-profile-meta">{seatLead(locale)}</p>
                <label className="seat-field">
                  <span>Preferred pit</span>
                  <HouseSelect onChange={setSitSlug} value={sitSlug}>
                    <MenuItem value="">No pick yet</MenuItem>
                    {BASIC_ROOMS.map((room) => (
                      <MenuItem key={room.slug} value={room.slug}>
                        {room.name}
                      </MenuItem>
                    ))}
                  </HouseSelect>
                </label>
                <label className="seat-field">
                  <span>Book</span>
                  <HouseSelect onChange={setBook} value={book}>
                    <MenuItem value="">No book yet</MenuItem>
                    {AGENT_BOOKS.map((row) => (
                      <MenuItem key={row.id} value={row.id}>
                        {row.label}
                      </MenuItem>
                    ))}
                  </HouseSelect>
                </label>
                <p className="li-profile-meta">
                  The profile shows this book, its watch, and its file. Gold added for the file returns to this sit. Balance stays on the vault.
                </p>
                <p className="lobby-label">Doors out</p>
                <HouseField
                  onChange={(event) => setDoors((was) => ({ ...was, x: event.target.value }))}
                  placeholder="https://x.com/you"
                  value={doors.x}
                />
                <HouseField
                  onChange={(event) => setDoors((was) => ({ ...was, telegram: event.target.value }))}
                  placeholder="https://t.me/you"
                  value={doors.telegram}
                />
                <HouseField
                  onChange={(event) => setDoors((was) => ({ ...was, discord: event.target.value }))}
                  placeholder="https://discord.gg/invite"
                  value={doors.discord}
                />
                <HouseField
                  className="min-h-36"
                  inputProps={{ maxLength: 1600 }}
                  multiline
                  minRows={6}
                  onChange={(event) => setAbout(event.target.value)}
                  placeholder="About this seat — how you sit, what you chase, what you will not."
                  value={about}
                />
                <p className="li-profile-meta">{about.length}/1600</p>
                <HouseButton onClick={() => void save()}>
                  Save
                </HouseButton>
              </div>
            ) : (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                {profile.about || "No about yet."}
              </p>
            )}
          </div>
          ) : null}
          {tab === "projects" ? (
          <div className="li-card mt-4 p-5">
            <p className="lobby-label">Projects</p>
            <p className="li-suggest-lead">
              Share a sit, a book, a tool, or a table. Gold is only to take a priced door home.
              The pot stays on Classic.
            </p>
            {projects.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">
                {profile.you ? "No project on this seat yet." : "This seat has not shared a project yet."}
              </p>
            ) : (
              <ul className="seat-projects">
                {projects.map((row) => (
                  <li key={row.id}>
                    <div>
                      <strong>{row.name}</strong>
                      <em>
                        {seatTag(row.seat)} · {row.priceLabel}
                      </em>
                      <p>{row.how}</p>
                    </div>
                    <div className="seat-project-act">
                      {row.owned || row.priceCents <= 0 ? (
                        <HouseButton onClick={() => openProject(row)}>
                          Open
                        </HouseButton>
                      ) : you ? (
                        <HouseButton
                          disabled={busy}
                          onClick={() => void projectAct("buy", row.id)}
                        >
                          Buy · {row.priceLabel}
                        </HouseButton>
                      ) : (
                        <HouseButton href={signInNext(profile.username)}>
                          Sign in to buy
                        </HouseButton>
                      )}
                      {profile.you ? (
                        <HouseButton
                          disabled={busy}
                          ghost
                          onClick={() => void projectAct("drop", row.id)}
                        >
                          Drop
                        </HouseButton>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {profile.you ? (
              <form
                className="seat-project-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void projectAct("add");
                }}
              >
                <p className="lobby-label">Put a project on the shelf</p>
                <HouseField
                  inputProps={{ maxLength: 48 }}
                  onChange={(event) => setProjectName(event.target.value)}
                  placeholder="Name"
                  value={projectName}
                />
                <HouseField
                  inputProps={{ maxLength: 180 }}
                  onChange={(event) => setProjectHow(event.target.value)}
                  placeholder="How it sits"
                  value={projectHow}
                />
                <HouseField
                  onChange={(event) => setProjectHref(event.target.value)}
                  placeholder="https://…"
                  value={projectHref}
                />
                <label className="seat-field">
                  <span>Price in USDT · 0 is a free door</span>
                  <HouseField
                    inputProps={{ inputMode: "decimal", min: 0, step: 0.01 }}
                    onChange={(event) => setProjectPrice(event.target.value)}
                    type="number"
                    value={projectPrice}
                  />
                </label>
                <HouseButton disabled={busy} type="submit">
                  Share project
                </HouseButton>
              </form>
            ) : null}
          </div>
          ) : null}
          {tab === "notes" ? (
            <div className="li-card mt-4 p-5">
              <p className="lobby-label">How they sit</p>
              <p className="li-suggest-lead">
                A note from a seat that sat with them. Not a score. Not a ranking.
              </p>
              {(profile.notes ?? []).length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500">No notes on this seat yet.</p>
              ) : (
                <ul className="li-notes">
                  {(profile.notes ?? []).map((note) => (
                    <li key={note.id}>
                      <Link href={`/network/u/${encodeURIComponent(note.username)}`}>
                        <Avatar avatar={note.avatar} size="sm" username={note.username} />
                        <span>
                          <strong>@{note.username}</strong>
                          <em>
                            {sitMarkLabel(note.mark) ? `${sitMarkLabel(note.mark)} · ` : ""}
                            {whenLabel(note.createdAt)}
                          </em>
                        </span>
                      </Link>
                      <p>{note.body}</p>
                      {you && (note.you || profile.you) ? (
                        <button
                          className="li-tiny"
                          disabled={busy}
                          onClick={() => void removeNote(note.id)}
                          type="button"
                        >
                          remove
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : tab === "posts" ? (
            <div className="li-card mt-4 p-5">
              <div className="house-filters">
                <HouseButton ghost={feedMode !== "recent"} onClick={() => setFeedMode("recent")}>
                  Posts
                </HouseButton>
                <HouseButton ghost={feedMode !== "recommended"} onClick={() => setFeedMode("recommended")}>
                  Recommended
                </HouseButton>
              </div>
              {feedMode === "recommended" ? (
                <p className="li-suggest-lead">
                  Louder lines from this seat and the ones who sit like them.
                </p>
              ) : null}
              {(feedMode === "recommended" ? recommended : posts).length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500">
                  {feedMode === "recommended"
                    ? "Nothing to recommend from this seat yet."
                    : "No posts yet."}
                </p>
              ) : (
                <ul className="li-seat-feed">
                  {(feedMode === "recommended" ? recommended : posts).map((post) => (
                    <SeatLine
                      busy={busy}
                      key={post.id}
                      onAct={feedAct}
                      post={post}
                      signedIn={Boolean(you)}
                      you={you?.username ?? ""}
                    />
                  ))}
                </ul>
              )}
              {feedMode === "recent" && total > posts.length ? (
                <div className="li-deeper">
                  <HouseButton ghost onClick={() => setDepth((was) => was + 12)}>
                    Show older
                  </HouseButton>
                  <span className="li-deeper-n">
                    {posts.length} of {total.toLocaleString()}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}
          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        </section>
        <aside className="li-visit-side">
          {!profile.you ? (
            <div className="li-card p-5">
              <p className="lobby-label">Write them</p>
              {you ? (
                <form
                  className="li-letter"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void sendLetter();
                  }}
                >
                  <HouseField
                    className="min-h-24"
                    inputProps={{ maxLength: 500 }}
                    minRows={3}
                    multiline
                    onChange={(event) => setLetter(event.target.value)}
                    placeholder={`A letter to @${profile.username}`}
                    value={letter}
                  />
                  <HouseButton disabled={busy || letter.trim().length < 1} type="submit">
                    Send
                  </HouseButton>
                </form>
              ) : (
                <p className="li-suggest-lead">
                  <Link href={signInNext(profile.username)}>Sign in to send a letter.</Link>
                </p>
              )}
            </div>
          ) : null}
          {!profile.you ? (
            <div className="li-card mt-4 p-5">
              <p className="lobby-label">How they sit</p>
              {you ? (
                <form
                  className="li-letter"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void sendNote();
                  }}
                >
                  <div className="avatar-pick">
                    {SIT_MARKS.map((mark) => (
                      <HouseButton
                        className={noteMark === mark.id ? "is-on" : undefined}
                        ghost
                        key={mark.id}
                        onClick={() => setNoteMark(noteMark === mark.id ? "" : mark.id)}
                      >
                        {mark.label}
                      </HouseButton>
                    ))}
                  </div>
                  <HouseField
                    className="min-h-24"
                    inputProps={{ maxLength: NOTE_MAX }}
                    minRows={3}
                    multiline
                    onChange={(event) => setNoteBody(event.target.value)}
                    placeholder="How do they sit?"
                    value={noteBody}
                  />
                  <p className="li-profile-meta">{noteBody.length}/{NOTE_MAX}</p>
                  <HouseButton disabled={busy || noteBody.trim().length < 2} type="submit">
                    {profile.yourNote ? "Update note" : "Post note"}
                  </HouseButton>
                </form>
              ) : (
                <p className="li-suggest-lead">
                  <Link href={signInNext(profile.username)}>Sign in to write how they sit.</Link>
                </p>
              )}
            </div>
          ) : null}
          {(profile.alike ?? []).length ? (
            <div className={`li-card p-5${!profile.you ? " mt-4" : ""}`}>
              <p className="lobby-label">{profile.you ? "Seats like yours" : "Seats like this one"}</p>
              <ul className="li-alike">
                {profile.alike.map((seat) => (
                  <li key={seat.username}>
                    <Link href={`/network/u/${encodeURIComponent(seat.username)}`}>
                      <Avatar avatar={seat.avatar} size="sm" username={seat.username} />
                      <span>
                        <strong>@{seat.username}</strong>
                        <em>{seat.why || seat.headline}</em>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </main>
    </NetworkChrome>
  );
}
