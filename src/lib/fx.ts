export type FxKind = "click" | "pot" | "take" | "urgent" | "round";

export type FxDetail = {
  kind: FxKind;
  color?: string;
  label?: string;
};

export function emitFx(detail: FxDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<FxDetail>("huepot:fx", { detail }));
}

declare global {
  interface WindowEventMap {
    "huepot:fx": CustomEvent<FxDetail>;
  }
}
