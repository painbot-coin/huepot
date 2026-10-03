/** Huepot paint. Wood green on an earth floor. Fire is an accent, never the room. */
export const HOUSE_BG = "#16140f";
export const HOUSE_INK = "#f3efe4";
export const HOUSE_GOLD = "#8ee4a8";
export const HOUSE_AMBER = "#2f9e62";
export const HOUSE_FIRE = "#a84b32";
export const HOUSE_SLATE = "#221e16";
export const HOUSE_FIELD = "#1b1812";
export const HOUSE_MUTED = "#9a8b74";
export const HOUSE_LINE = "rgba(47, 158, 98, 0.28)";

export const HOUSE_LIGHT_BG = "#efe6d2";
export const HOUSE_LIGHT_INK = "#2a2318";
export const HOUSE_LIGHT_PAPER = "#f7f1e4";
export const HOUSE_LIGHT_FIELD = "#f4ead6";
export const HOUSE_LIGHT_MUTED = "#6b5c45";
export const HOUSE_LIGHT_LINE = "rgba(90, 70, 40, 0.18)";
export const HOUSE_LIGHT_FIRE = "#8b2e3b";

export const THEME_MODES = ["light", "dark", "system"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

export const THEME_MODE_KEY = "mui-mode";

export function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}
