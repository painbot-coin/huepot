"use client";

import { useEffect, useId, useRef } from "react";
import { pitEngine, type OrbVisualState } from "@/lib/pit-engine";

export function MagicOrb({
  color,
  pressed = false,
  spark = false,
  leading = false,
  winner = false,
  fog = false,
}: {
  color: string;
  pressed?: boolean;
  spark?: boolean;
  leading?: boolean;
  winner?: boolean;
  fog?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const id = useId();
  const stateRef = useRef<OrbVisualState>({
    pressed,
    spark,
    leading,
    winner,
    fog,
    color,
  });
  stateRef.current = { pressed, spark, leading, winner, fog, color };

  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    return pitEngine.bindOrb(id, {
      canvas: node,
      getState: () => stateRef.current,
    });
  }, [id]);

  return (
    <canvas
      aria-hidden="true"
      className={`magic-orb-gl ${pressed ? "is-pressed" : ""} ${spark ? "is-spark" : ""}`}
      ref={canvasRef}
    />
  );
}
