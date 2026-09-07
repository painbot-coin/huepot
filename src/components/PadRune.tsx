import type { ColorId } from "@/lib/colors";

const paths: Record<ColorId, string> = {
  crimson: "M7 3 L18 4 L22 12 L16 21 L5 20 L2 11 Z",
  azure: "M12 2 L21 8 L18 20 L6 20 L3 8 Z",
  volt: "M6 4 L19 3 L22 13 L15 21 L4 18 Z",
  amber: "M5 5 L19 3 L22 14 L14 21 L3 16 Z",
  violet: "M12 2 L21 9 L17 21 L6 20 L3 8 Z",
  mint: "M8 3 L18 5 L21 15 L13 21 L3 14 Z",
  ember: "M6 4 L18 3 L21 12 L14 21 L4 17 Z",
  frost: "M12 2 L20 7 L18 18 L8 21 L3 11 Z",
};

export function PadRune({
  id,
  className = "pad-rune",
}: {
  id: ColorId;
  className?: string;
}) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      <path d={paths[id]} fill="currentColor" />
    </svg>
  );
}
