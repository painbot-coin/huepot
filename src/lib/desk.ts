export const DESK_ROLES = [
  { id: "developer", label: "Developer" },
  { id: "teacher", label: "Teacher" },
  { id: "lawyer", label: "Lawyer" },
  { id: "solver", label: "Problem solver" },
] as const;

export type DeskRole = (typeof DESK_ROLES)[number]["id"];

export function deskRole(id: string) {
  return DESK_ROLES.find((row) => row.id === id) ?? null;
}

export function companyName(raw: string) {
  const name = raw.trim().replace(/\s+/g, " ").slice(0, 40);
  return name.length >= 2 ? name : "";
}

export function openingTitle(raw: string) {
  const title = raw.trim().replace(/\s+/g, " ").slice(0, 80);
  return title.length >= 2 ? title : "";
}

export function helpNote(raw: string) {
  const note = raw.trim().slice(0, 400);
  return note.length >= 8 ? note : "";
}
