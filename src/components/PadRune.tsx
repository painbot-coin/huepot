import type { ColorId } from "@/lib/colors";

const paths: Record<ColorId, string> = {
  crimson: "M12 2 L14.5 9 L22 9 L16 13.5 L18.2 21 L12 16.8 L5.8 21 L8 13.5 L2 9 L9.5 9 Z",
  azure: "M12 3 C16 7 19 10 19 14 A7 7 0 1 1 5 14 C5 10 8 7 12 3 Z",
  volt: "M13 2 L6 13 H12 L10 22 L18 10 H12 Z",
  amber: "M12 2 L20 7 V17 L12 22 L4 17 V7 Z",
};

export function PadRune({ id }: { id: ColorId }) {
  return (
    <svg aria-hidden="true" className="pad-rune" viewBox="0 0 24 24">
      <path d={paths[id]} fill="currentColor" />
    </svg>
  );
}
