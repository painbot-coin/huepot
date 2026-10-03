export const LOCALE_COOKIE = "huepot-lang";

export const LOCALES = [
  { id: "en", name: "English", dir: "ltr" },
  { id: "es", name: "Español", dir: "ltr" },
  { id: "zh", name: "中文", dir: "ltr" },
  { id: "hi", name: "हिन्दी", dir: "ltr" },
  { id: "ar", name: "العربية", dir: "rtl" },
  { id: "pt", name: "Português", dir: "ltr" },
  { id: "ru", name: "Русский", dir: "ltr" },
  { id: "ja", name: "日本語", dir: "ltr" },
  { id: "fr", name: "Français", dir: "ltr" },
  { id: "de", name: "Deutsch", dir: "ltr" },
  { id: "ko", name: "한국어", dir: "ltr" },
  { id: "id", name: "Bahasa Indonesia", dir: "ltr" },
] as const;

export type LocaleId = (typeof LOCALES)[number]["id"];

export const DEFAULT_LOCALE: LocaleId = "en";

export function isLocale(value: string | null | undefined): value is LocaleId {
  return LOCALES.some((row) => row.id === value);
}

export function parseLocale(value: string | null | undefined): LocaleId | null {
  if (!value) return null;
  const raw = value.trim().toLowerCase().replace("_", "-");
  const base = raw.split("-")[0] ?? "";
  if (isLocale(raw)) return raw;
  if (isLocale(base)) return base;
  return null;
}

export function localeMeta(id: LocaleId) {
  return LOCALES.find((row) => row.id === id) ?? LOCALES[0];
}

/** First matching house language from an Accept-Language header. */
export function pickFromAccept(header: string | null | undefined): LocaleId {
  if (!header) return DEFAULT_LOCALE;
  const parts = header
    .split(",")
    .map((part) => {
      const [tag, ...rest] = part.trim().split(";");
      const q = rest.find((bit) => bit.trim().startsWith("q="));
      const quality = q ? Number(q.trim().slice(2)) : 1;
      return { tag: (tag ?? "").trim(), quality: Number.isFinite(quality) ? quality : 0 };
    })
    .filter((part) => part.tag)
    .sort((a, b) => b.quality - a.quality);
  for (const part of parts) {
    const hit = parseLocale(part.tag);
    if (hit) return hit;
  }
  return DEFAULT_LOCALE;
}
