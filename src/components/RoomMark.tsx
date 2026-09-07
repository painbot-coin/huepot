type RoomMarkProps = {
  slug: string;
  fog?: boolean;
  className?: string;
};

function plate(slug: string, fog?: boolean) {
  if (slug === "classic") return "#1b3a28";
  if (slug === "lightning") return "#2a1a06";
  if (slug === "duo") return "#140c14";
  if (slug === "high") return "#2a2110";
  if (slug === "fog" || fog) return "#16141c";
  return "#14110e";
}

function FeltTable() {
  return (
    <>
      <ellipse cx="40" cy="44" rx="30" ry="16" fill="#0e1c16" />
      <ellipse cx="40" cy="42" rx="27" ry="14" fill="#1b3a28" stroke="#d4af6a" strokeWidth="1.6" />
      <ellipse cx="40" cy="42" rx="21" ry="10" fill="none" stroke="rgba(212,175,106,0.35)" strokeWidth="1" />
    </>
  );
}

export function RoomMark({ slug, fog, className = "room-mark" }: RoomMarkProps) {
  const mark =
    slug === "classic" ? (
      <>
        <FeltTable />
        <circle cx="28" cy="40" r="5" fill="#ff355e" />
        <circle cx="40" cy="36" r="5" fill="#2ea8ff" />
        <circle cx="52" cy="40" r="5" fill="#d4ff2e" />
        <circle cx="40" cy="46" r="5" fill="#ffb020" />
      </>
    ) : slug === "lightning" ? (
      <>
        <circle cx="40" cy="40" r="22" fill="#ffb020" />
        <circle cx="40" cy="40" r="16" fill="#ffe08a" />
        <path d="M43 18 L28 42 H40 L36 62 L54 36 H41 Z" fill="#1a1408" />
      </>
    ) : slug === "duo" ? (
      <>
        <circle cx="31" cy="40" r="16" fill="#ff355e" stroke="#ffd0d8" strokeWidth="1.4" />
        <circle cx="49" cy="40" r="16" fill="#2ea8ff" stroke="#d6eeff" strokeWidth="1.4" />
        <path d="M40 28 V52" stroke="rgba(255,210,122,0.7)" strokeWidth="1.4" />
      </>
    ) : slug === "high" ? (
      <>
        <ellipse cx="40" cy="52" rx="20" ry="7" fill="#8a5a18" />
        <ellipse cx="40" cy="46" rx="20" ry="7" fill="#ffb020" />
        <ellipse cx="40" cy="40" rx="20" ry="7" fill="#ffe08a" />
        <ellipse cx="40" cy="34" rx="20" ry="7" fill="#d4af6a" stroke="#fff6d8" strokeWidth="1" />
        <text
          x="40"
          y="37"
          textAnchor="middle"
          fill="#3a2412"
          fontSize="8"
          fontWeight="700"
        >
          5
        </text>
      </>
    ) : slug === "fog" || fog ? (
      <>
        <FeltTable />
        <circle cx="32" cy="40" r="4.5" fill="#8b5cff" opacity="0.55" />
        <circle cx="48" cy="41" r="4.5" fill="#7af0ff" opacity="0.5" />
        <path
          d="M16 36 C24 28 34 30 40 34 C48 28 60 30 66 38 C58 34 50 40 40 38 C30 42 22 36 16 36 Z"
          fill="rgba(201,196,216,0.72)"
        />
        <path
          d="M18 44 C26 38 38 42 44 40 C54 36 64 42 66 48 C56 44 48 50 38 48 C28 52 22 46 18 44 Z"
          fill="rgba(170,180,200,0.5)"
        />
      </>
    ) : (
      <>
        <FeltTable />
        <circle cx="30" cy="41" r="4.2" fill="#ff6a2a" />
        <circle cx="40" cy="37" r="4.2" fill="#3dffb0" />
        <circle cx="50" cy="41" r="4.2" fill="#7af0ff" />
      </>
    );

  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 80 80">
      <rect width="80" height="80" fill={plate(slug, fog)} />
      {mark}
    </svg>
  );
}
