export type FxKind = "click" | "pot" | "take" | "urgent" | "round" | "fog";

export type FxDetail = {
  kind: FxKind;
  color?: string;
  label?: string;
};

export type PadBoardPad = {
  color: string;
  leading: boolean;
  spark: boolean;
  share: number;
  winner: boolean;
};

export type PadBoardDetail = {
  pads: PadBoardPad[];
  fog: boolean;
};

let audioPulse = 0;

export function bumpAudioPulse(amount = 1) {
  audioPulse = Math.min(2.4, audioPulse + amount);
}

export function sampleAudioPulse() {
  const value = audioPulse;
  audioPulse *= 0.9;
  if (audioPulse < 0.01) audioPulse = 0;
  return value;
}

export function emitFx(detail: FxDetail) {
  if (typeof window === "undefined") return;
  const kick =
    detail.kind === "take"
      ? 1.4
      : detail.kind === "click"
        ? 0.85
        : detail.kind === "pot"
          ? 0.7
          : detail.kind === "urgent"
            ? 0.55
            : 0.4;
  bumpAudioPulse(kick);
  window.dispatchEvent(new CustomEvent<FxDetail>("huepot:fx", { detail }));
}

export function emitPads(detail: PadBoardDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<PadBoardDetail>("huepot:pads", { detail }));
}

declare global {
  interface WindowEventMap {
    "huepot:fx": CustomEvent<FxDetail>;
    "huepot:pads": CustomEvent<PadBoardDetail>;
  }
}
