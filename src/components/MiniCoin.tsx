import type { CSSProperties } from "react";
import { colorById, type ColorId } from "@/lib/colors";

export function MiniCoin({
  id,
  size = 28,
}: {
  id: ColorId;
  size?: number;
}) {
  const color = colorById(id);
  return (
    <span
      aria-hidden="true"
      className="mini-coin"
      style={
        {
          width: size,
          height: size,
          "--pad": color.hex,
          "--ink": color.ink,
        } as CSSProperties
      }
      title={color.name}
    />
  );
}
