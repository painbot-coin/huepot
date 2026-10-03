import { cookies, headers } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  type LocaleId,
  parseLocale,
  pickFromAccept,
} from "@/lib/locale";

export async function readRequestLocale(): Promise<LocaleId> {
  const jar = await cookies();
  const fromCookie = parseLocale(jar.get(LOCALE_COOKIE)?.value);
  if (fromCookie) return fromCookie;
  const accept = (await headers()).get("accept-language");
  return pickFromAccept(accept) ?? DEFAULT_LOCALE;
}
