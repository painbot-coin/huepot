import { classicHourClock } from "./classic-hour";
import { fogCupClock } from "./fog-cup";

export function inviteSitLead(input: {
  hour?: number | null;
  cup?: { weekday: number; hour: number } | null;
}) {
  return [
    input.hour != null ? `Classic sits ${classicHourClock(input.hour)}.` : "",
    input.cup ? `Fog cup ${fogCupClock(input.cup.weekday, input.cup.hour)}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function inviteText(
  url: string,
  sit?: { hour?: number | null; cup?: { weekday: number; hour: number } | null },
) {
  const lead = sit ? inviteSitLead(sit) : "";
  const prefix = lead ? `${lead} ` : "";
  return `${prefix}Enter the house with this link. If you sit, I get a slice of the house take only — not your bank.\n${url}`;
}
