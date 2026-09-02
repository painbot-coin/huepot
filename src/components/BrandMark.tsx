export function BrandMark({ className = "brand-mark" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 48 48">
      <ellipse cx="24" cy="40" rx="16" ry="3.2" fill="#0b0908" opacity="0.45" />
      <path
        d="M10 22 C10 16 16 12 24 12 C32 12 38 16 38 22 L36 36 C35 40 30 42 24 42 C18 42 13 40 12 36 Z"
        fill="#3a2412"
        stroke="#d4af6a"
        strokeWidth="1.4"
      />
      <path
        d="M13 24 C14 20 18 18 24 18 C30 18 34 20 35 24 L34 34 C33 37 29 38.5 24 38.5 C19 38.5 15 37 14 34 Z"
        fill="#1b3a28"
      />
      <circle cx="17.5" cy="24" r="5.2" fill="#ff355e" />
      <circle cx="24" cy="21.5" r="5.6" fill="#ffb020" />
      <circle cx="30.5" cy="24.2" r="5.2" fill="#2ea8ff" />
      <circle cx="24" cy="27.2" r="5" fill="#8b5cff" />
      <path
        d="M16 20.5 C18 18.8 21 18.2 24 18.2 C27 18.2 30 18.8 32 20.5"
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.1"
      />
    </svg>
  );
}
