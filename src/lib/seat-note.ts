/** How another seat says this one sits. Not stars. Not a ranking. */

export const SIT_MARKS = [
  { id: "company", label: "Good teammate" },
  { id: "sharp", label: "Sharp player" },
  { id: "late", label: "Late player" },
  { id: "quiet", label: "Quiet player" },
  { id: "fog", label: "Plays Fog" },
] as const;

export type SitMark = (typeof SIT_MARKS)[number]["id"];

export const NOTE_MAX = 240;

export function parseSitMark(raw: unknown): SitMark | "" {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!value) return "";
  return SIT_MARKS.some((mark) => mark.id === value) ? (value as SitMark) : "";
}

export function sitMarkLabel(mark: string) {
  return SIT_MARKS.find((item) => item.id === mark)?.label ?? "";
}

export function parseSeatNote(raw: unknown) {
  const body = typeof raw === "string" ? raw.replace(/\s+/g, " ").trim() : "";
  if (body.length < 2) throw new Error("Write a little more about this player.");
  return body.slice(0, NOTE_MAX);
}
