import { COLORS } from "@/lib/colors";

/**
 * The house colours a player can sit behind instead of a picture.
 *
 * Kept apart from `avatar.ts` because that reaches into storage config, which
 * has no business in a browser bundle. This is data only, so both the picker
 * and the validator can share one list.
 */
export const AVATAR_HUES: string[] = COLORS.map((color) => color.id);

export function hueHexOf(id: string) {
  return COLORS.find((color) => color.id === id)?.hex ?? "";
}
