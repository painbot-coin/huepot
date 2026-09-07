import { hueHexOf } from "@/lib/hues";

/**
 * A player's face, used from both server and client components — no hooks and
 * no "use client", so a server-rendered page does not pull a client bundle in
 * to draw a circle.
 */

export function initials(name: string) {
  const clean = name.replace(/[^a-zA-Z0-9]/g, "");
  return (clean.slice(0, 2) || "HP").toUpperCase();
}

export function Avatar({
  username,
  avatar,
  size,
}: {
  username: string;
  avatar?: string;
  size?: "sm" | "lg";
}) {
  const cls = `li-avatar${size ? ` is-${size}` : ""}`;
  const value = (avatar ?? "").trim();

  if (value.startsWith("http")) {
    return (
      <span className={`${cls} has-pic`}>
        {/* Sized by CSS and served from our own bucket, so next/image would
            only add a proxy hop. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="" src={value} />
      </span>
    );
  }
  if (value.startsWith("hue:")) {
    const hex = hueHexOf(value.slice(4));
    if (hex) {
      return (
        <span className={`${cls} has-hue`} style={{ background: hex }}>
          {initials(username)}
        </span>
      );
    }
  }
  return <span className={cls}>{initials(username)}</span>;
}
