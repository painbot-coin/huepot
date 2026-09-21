import type { CompanySit, Notice } from "@/lib/types";

const HOUSE_USER_ID = "house";

/** One ping per friend per table per hour. */
export const SIT_PULSE_MS = 60 * 60 * 1000;

export function sitPulseTitle(roomName: string, username: string) {
  return `${roomName} · @${username} is sitting`;
}

export function sitPulseBody() {
  return "Sit with them before the round ends.";
}

export function alreadyPulsed(
  notices: Notice[],
  friendId: string,
  title: string,
  since: number,
) {
  return notices.some(
    (item) =>
      item.userId === friendId &&
      item.title === title &&
      item.createdAt >= since,
  );
}

export function companySitTargets(
  sitterId: string,
  company: string[],
  blocked: Iterable<string>,
) {
  const hidden = new Set(blocked);
  return company.filter(
    (id) => id && id !== sitterId && id !== HOUSE_USER_ID && !hidden.has(id),
  );
}

export function companySitLabel(slug: string, name: string) {
  if (slug === "classic") return "Classic";
  if (slug === "fog") return "Fog";
  if (slug === "night") return "Night";
  return name;
}

export function groupCompanySits(rows: CompanySit[]) {
  const groups: { slug: string; name: string; label: string; usernames: string[] }[] = [];
  for (const row of rows) {
    const have = groups.find((item) => item.slug === row.slug);
    if (have) {
      if (!have.usernames.includes(row.username)) have.usernames.push(row.username);
      continue;
    }
    groups.push({
      slug: row.slug,
      name: row.name,
      label: companySitLabel(row.slug, row.name),
      usernames: [row.username],
    });
  }
  const rank = (slug: string) => (slug === "classic" ? 0 : slug === "fog" ? 1 : 2);
  groups.sort((a, b) => rank(a.slug) - rank(b.slug) || a.label.localeCompare(b.label));
  return groups;
}

/** Compact header door. Null when nobody in company is sitting. */
export function companyNavLink(rows: CompanySit[]) {
  const group = groupCompanySits(rows)[0];
  if (!group) return null;
  return {
    href: `/rooms/${group.slug}`,
    label: `${group.usernames.map((name) => `@${name}`).join(" · ")} · ${group.label}`,
  };
}
