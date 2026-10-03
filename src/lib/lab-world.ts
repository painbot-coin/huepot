/**
 * Famous nets the house will not sit.
 * Outbound links only. Never a HouseMark. Never buyMark.
 */

export type WorldWeight = "public" | "none";

export type WorldBook = {
  id: string;
  game: string;
  bot: string;
  how: string;
  file: string;
  weights: WorldWeight;
  href: string;
};

export const WORLD_BOOKS: WorldBook[] = [
  {
    id: "chess-lc0",
    game: "Chess",
    bot: "Leela Chess Zero",
    how: "Standard chess. Search plus a policy/value net.",
    file: ".pb.gz on lczero.org. 30–365 MB. Needs the lc0 engine.",
    weights: "public",
    href: "https://lczero.org/play/networks/bestnets/",
  },
  {
    id: "chess-az",
    game: "Chess",
    bot: "AlphaZero (reimplementation)",
    how: "Standard chess. AlphaZero-style self-play.",
    file: "DeepMind original weights were never released.",
    weights: "none",
    href: "https://github.com/ZhengtongYan/AlphaGOZero-python-tensorflow",
  },
  {
    id: "go-kata",
    game: "Go",
    bot: "KataGo",
    how: "19x19 and other sizes. Self-play net plus MCTS.",
    file: ".bin.gz Network File on katagotraining.org.",
    weights: "public",
    href: "https://katagotraining.org/networks/",
  },
  {
    id: "go-leela",
    game: "Go",
    bot: "Leela Zero",
    how: "19x19. AlphaGo Zero style, no human priors.",
    file: "A public best-network file. Strength now sits behind KataGo.",
    weights: "public",
    href: "https://github.com/leela-zero/leela-zero",
  },
  {
    id: "sc2-distar",
    game: "StarCraft II",
    bot: "DI-star",
    how: "Full ladder through the SC2 API. Needs the real client.",
    file: ".pth via the project downloader (sl_model, rl_model, named books).",
    weights: "public",
    href: "https://github.com/opendilab/DI-star",
  },
  {
    id: "mc-openha",
    game: "Minecraft",
    bot: "OpenHA",
    how: "Open world. Hierarchical VLA. Needs Minecraft and a GPU serve.",
    file: "7B Qwen2-VL checkpoints on Hugging Face.",
    weights: "public",
    href: "https://github.com/CraftJarvis/OpenHA",
  },
  {
    id: "poker-deepstack",
    game: "Poker",
    bot: "DeepStack Leduc example",
    how: "Public code is Leduc, a tiny toy. Not the casino game.",
    file: "Original NLHE weights were not released.",
    weights: "none",
    href: "https://github.com/Machine-Learning-in-Python/DeepStack-Leduc",
  },
  {
    id: "poker-pluribus",
    game: "Poker",
    bot: "Pluribus reimplementation",
    how: "Six-player no-limit Hold'em in unofficial code.",
    file: "Original Pluribus blueprint is not public.",
    weights: "none",
    href: "https://github.com/sky9841/pluribus-poker-AI",
  },
  {
    id: "dota-five",
    game: "Dota 2",
    bot: "OpenAI Five (write-up)",
    how: "5v5 MOBA. Official Five was never open.",
    file: "Official weights were never released.",
    weights: "none",
    href: "https://github.com/llSourcell/OpenAI_Five_vs_Dota2_Explained",
  },
];

export function worldBookIds() {
  return WORLD_BOOKS.map((row) => row.id);
}

export function isWorldBookId(id: string) {
  return WORLD_BOOKS.some((row) => row.id === id);
}

export function worldBookById(id: string) {
  return WORLD_BOOKS.find((row) => row.id === id) ?? null;
}
