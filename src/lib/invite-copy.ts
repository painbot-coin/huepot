import { classicHourClock } from "./classic-hour";
import { fogCupClock } from "./fog-cup";
import { nightHourClock } from "./night-hour";

export function inviteSitLead(input: {
  hour?: number | null;
  night?: number | null;
  cup?: { weekday: number; hour: number } | null;
}) {
  return [
    input.hour != null ? `Classic plays ${classicHourClock(input.hour)}.` : "",
    input.night != null ? `Night plays ${nightHourClock(input.night)}.` : "",
    input.cup ? `Fog cup ${fogCupClock(input.cup.weekday, input.cup.hour)}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function inviteText(
  url: string,
  sit?: {
    hour?: number | null;
    night?: number | null;
    cup?: { weekday: number; hour: number } | null;
  },
) {
  const lead = sit ? inviteSitLead(sit) : "";
  const prefix = lead ? `${lead} ` : "";
  return `${prefix}Join Huepot with this link. If you play, I get a slice of house rake only — not your bank.\n${url}`;
}
