"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageLink } from "@/components/MessageDock";
import { Avatar } from "@/components/Avatar";
import { NetworkChrome, SignInGate } from "@/components/NetworkChrome";
import { hueRule, levelFor, nextRankFor } from "@/lib/coin";
import { AVATAR_HUES, hueHexOf } from "@/lib/hues";
import { formatUsdt } from "@/lib/money";
import type { PlayerRecord } from "@/lib/record";
import type { TaskProgress } from "@/lib/tasks";
import type { NetworkPost, NetworkProfile as Profile, NetworkYou } from "@/lib/types";

function ageLabel(at: number | null) {
  if (!at) return "offline";
  const mins = Math.floor(Math.max(0, Date.now() - at) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function SeatRecord({ record, you }: { record: PlayerRecord; you: boolean }) {
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
            Level {level.level} Â· {level.title}
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
          {done}/{tasks.length} Â· {resets}
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

export function NetworkProfile({ username }: { username: string }) {
  const [you, setYou] = useState<NetworkYou | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<NetworkPost[]>([]);
  const [error, setError] = useState("");
  const [needSignIn, setNeedSignIn] = useState(false);
  const [booted, setBooted] = useState(false);
  const [edit, setEdit] = useState(false);
  const [headline, setHeadline] = useState("");
  const [about, setAbout] = useState("");
  const [location, setLocation] = useState("");
  const [avatar, setAvatar] = useState("");
  const [busyPic, setBusyPic] = useState(false);

  async function load() {
    const response = await fetch(`/api/network/profile?u=${encodeURIComponent(username)}`);
    if (response.status === 401) {
      setNeedSignIn(true);
      return;
    }
    const data = (await response.json()) as {
      you?: NetworkYou;
      profile?: Profile;
      posts?: NetworkPost[];
      error?: string;
    };
    if (!response.ok) throw new Error(data.error || "Could not load profile");
    setNeedSignIn(false);
    setYou(data.you ?? null);
    setPosts(data.posts ?? []);
    if (data.profile) {
      setProfile(data.profile);
      setHeadline(data.profile.headline === "Huepot player" ? "" : data.profile.headline);
      setAbout(data.profile.about);
      setLocation(data.profile.location);
    setAvatar(data.profile.avatar);
    }
  }

  useEffect(() => {
    void load()
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load"))
      .finally(() => setBooted(true));
  }, [username]);

  async function pickFile(file?: File) {
    if (!file) return;
    setBusyPic(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || "Could not send that picture");
      // Chosen but not saved yet, so Save is still the one thing that commits.
      setAvatar(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that picture");
    } finally {
      setBusyPic(false);
    }
  }

  async function save() {
    setError("");
    try {
      const response = await fetch("/api/network/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headline, about, location, avatar }),
      });
      const data = (await response.json()) as { you?: NetworkYou; profile?: Profile; error?: string };
      if (!response.ok) throw new Error(data.error || "Could not save");
      setYou(data.you ?? null);
      if (data.profile) setProfile(data.profile);
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

  if (!booted) {
    return (
      <NetworkChrome>
        <p className="px-4 py-16 text-center text-zinc-400">Opening profileâ€¦</p>
      </NetworkChrome>
    );
  }
  if (needSignIn) return <SignInGate />;
  if (!profile) {
    return (
      <NetworkChrome you={you}>
        <p className="px-4 py-16 text-center text-zinc-400">{error || "Opening profileâ€¦"}</p>
      </NetworkChrome>
    );
  }

  return (
    <NetworkChrome you={you}>
      <main className="li-main">
        <section className="li-col">
          <div className="li-card overflow-hidden">
            <div className="li-cover is-tall" />
            <div className="li-profile">
              <Avatar avatar={profile.avatar} size="lg" username={profile.username} />
              <h1 className="font-display text-3xl text-white">@{profile.username}</h1>
              <p className="li-head">{profile.headline}</p>
              {profile.location ? <p className="text-sm text-zinc-500">{profile.location}</p> : null}
              <p className="mt-2 text-xs text-zinc-500">
                {profile.friends} in company Â·{" "}
                {profile.online
                  ? profile.room
                    ? `Online Â· ${profile.room.name}`
                    : "Online"
                  : `Last seen ${ageLabel(profile.lastSeen)}`}
                {` Â· Joined ${new Date(profile.createdAt).toLocaleDateString()}`}
              </p>
              <SeatRecord record={profile.record} you={profile.you} />
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.you ? (
                  <button className="chip-btn" onClick={() => setEdit((open) => !open)} type="button">
                    {edit ? "Close" : "Edit profile"}
                  </button>
                ) : (
                  <>
                    <MessageLink className="chip-btn" username={profile.username} />
                    {profile.room ? (
                      <Link className="chip-btn chip-btn-ghost" href={`/rooms/${profile.room.slug}`}>
                        Sit with them
                      </Link>
                    ) : null}
                    {profile.relation === "none" ? (
                      <button className="chip-btn chip-btn-ghost" onClick={() => void act("request")} type="button">
                        Ask
                      </button>
                    ) : null}
                    {profile.relation === "outgoing" ? (
                      <span className="chip-btn chip-btn-ghost pointer-events-none">Ask sent</span>
                    ) : null}
                    {profile.relation === "incoming" ? (
                      <>
                        <button className="chip-btn" onClick={() => void act("accept")} type="button">
                          Accept
                        </button>
                        <button className="chip-btn chip-btn-ghost" onClick={() => void act("ignore")} type="button">
                          Ignore
                        </button>
                      </>
                    ) : null}
                    {profile.relation === "friends" ? (
                      <button className="chip-btn chip-btn-ghost" onClick={() => void act("unfriend")} type="button">
                        Remove connection
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="li-card mt-4 p-5">
            <p className="lobby-label">About</p>
            {edit ? (
              <div className="mt-3 space-y-3">
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
                    {busyPic ? "Sending…" : "Upload"}
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(event) => void pickFile(event.target.files?.[0])}
                      type="file"
                    />
                  </label>
                </div>
                <input
                  className="field"
                  maxLength={80}
                  onChange={(event) => setHeadline(event.target.value)}
                  placeholder="Headline"
                  value={headline}
                />
                <input
                  className="field"
                  maxLength={40}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="Location"
                  value={location}
                />
                <textarea
                  className="field min-h-28"
                  maxLength={500}
                  onChange={(event) => setAbout(event.target.value)}
                  placeholder="About"
                  value={about}
                />
                <button className="chip-btn" onClick={() => void save()} type="button">
                  Save
                </button>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                {profile.about || "No about yet."}
              </p>
            )}
          </div>
          <div className="li-card mt-4 p-5">
            <p className="lobby-label">Activity</p>
            {posts.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">No posts yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {posts.map((post) => (
                  <li className="li-activity" key={post.id}>
                    <p>{post.body}</p>
                    <span>
                      {post.likes} like{post.likes === 1 ? "" : "s"}
                      {post.comments.length
                        ? ` Â· ${post.comments.length} comment${post.comments.length === 1 ? "" : "s"}`
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        </section>
      </main>
    </NetworkChrome>
  );
}
