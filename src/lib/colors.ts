export const COLORS = [
  {
    id: "crimson",
    name: "Crimson",
    hex: "#ff355e",
    ink: "#3a0010",
    glow: "rgba(255, 53, 94, 0.55)",
  },
  {
    id: "azure",
    name: "Azure",
    hex: "#2ea8ff",
    ink: "#001a33",
    glow: "rgba(46, 168, 255, 0.5)",
  },
  {
    id: "volt",
    name: "Volt",
    hex: "#d4ff2e",
    ink: "#1a2200",
    glow: "rgba(212, 255, 46, 0.42)",
  },
  {
    id: "amber",
    name: "Amber",
    hex: "#ffb020",
    ink: "#2a1600",
    glow: "rgba(255, 176, 32, 0.5)",
  },
] as const;

export type ColorId = (typeof COLORS)[number]["id"];

export function isColorId(value: string): value is ColorId {
  return COLORS.some((color) => color.id === value);
}

export function colorById(id: ColorId) {
  return COLORS.find((color) => color.id === id)!;
}

export function emptyColorCounts(): Record<ColorId, number> {
  return { crimson: 0, azure: 0, volt: 0, amber: 0 };
}
