/** NETWORK: the named hour pulls company, not only last week's clickers. */
import { companySitTargets } from "@/lib/sit-pulse";

export function classicHourNoticeTitle() {
  return "Classic hour is on";
}

export function classicHourNoticeBody() {
  return "Sit Classic with company. The named hour just opened.";
}

export function fogCupNoticeTitle() {
  return "Fog cup is on";
}

export function fogCupNoticeBody(clock: string) {
  return `Sit Fog with company. ${clock}.`;
}

export function nightHourNoticeTitle() {
  return "Night hour is on";
}

export function nightHourNoticeBody() {
  return "Sit Night with company. The named hour just opened.";
}

/**
 * Last week's sitters still hear the hour. The people who accepted them hear it too.
 * House and a block never do.
 */
export function hourAudience(
  sitterIds: string[],
  companyOf: (id: string) => string[],
  blockedOf: (id: string) => Iterable<string>,
) {
  const out = new Set<string>();
  for (const sitter of sitterIds) {
    if (!sitter || sitter === "house") continue;
    out.add(sitter);
    for (const id of companySitTargets(sitter, companyOf(sitter), blockedOf(sitter))) {
      out.add(id);
    }
  }
  return [...out];
}
