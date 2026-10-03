import type { MarkKind } from "@/lib/house-mark-list";

export function WaitGameArt({ kind }: { kind: MarkKind }) {
  if (kind === "wait") {
    return (
      <svg className="wait-art" viewBox="0 0 80 96" aria-hidden="true">
        <rect className="wait-art-well" x="18" y="8" width="44" height="80" />
        <rect className="wait-art-fill is-i" x="22" y="12" width="8" height="8" />
        <rect className="wait-art-fill is-i" x="30" y="12" width="8" height="8" />
        <rect className="wait-art-fill is-i" x="38" y="12" width="8" height="8" />
        <rect className="wait-art-fill is-i" x="46" y="12" width="8" height="8" />
        <rect className="wait-art-fill is-t" x="30" y="68" width="8" height="8" />
        <rect className="wait-art-fill is-t" x="22" y="76" width="8" height="8" />
        <rect className="wait-art-fill is-t" x="30" y="76" width="8" height="8" />
        <rect className="wait-art-fill is-t" x="38" y="76" width="8" height="8" />
        <rect className="wait-art-fill is-o" x="46" y="68" width="8" height="8" />
        <rect className="wait-art-fill is-o" x="54" y="68" width="8" height="8" />
        <rect className="wait-art-fill is-o" x="46" y="76" width="8" height="8" />
        <rect className="wait-art-fill is-o" x="54" y="76" width="8" height="8" />
      </svg>
    );
  }
  if (kind === "catch") {
    return (
      <svg className="wait-art" viewBox="0 0 80 96" aria-hidden="true">
        <rect className="wait-art-well" x="14" y="8" width="52" height="80" />
        <rect className="wait-art-fill is-live" x="36" y="22" width="8" height="8" />
        <rect className="wait-art-fill is-pad" x="28" y="76" width="24" height="8" />
      </svg>
    );
  }
  if (kind === "snake") {
    return (
      <svg className="wait-art" viewBox="0 0 80 96" aria-hidden="true">
        <rect className="wait-art-well" x="16" y="16" width="48" height="64" />
        <rect className="wait-art-fill is-junk" x="48" y="24" width="8" height="8" />
        <rect className="wait-art-fill is-pad" x="24" y="48" width="8" height="8" />
        <rect className="wait-art-fill is-pad" x="32" y="48" width="8" height="8" />
        <rect className="wait-art-fill is-live" x="40" y="48" width="8" height="8" />
      </svg>
    );
  }
  if (kind === "aim") {
    return (
      <svg className="wait-art" viewBox="0 0 80 96" aria-hidden="true">
        <rect className="wait-art-well" x="16" y="16" width="48" height="64" />
        <circle className="wait-art-ring" cx="40" cy="48" r="14" />
        <circle className="wait-art-fill is-live" cx="40" cy="48" r="3" />
        <path className="wait-art-ring" d="M40 28v8M40 60v8M26 48h8M46 48h8" />
      </svg>
    );
  }
  if (kind === "lane") {
    return (
      <svg className="wait-art" viewBox="0 0 80 96" aria-hidden="true">
        <rect className="wait-art-well" x="28" y="8" width="24" height="80" />
        <rect className="wait-art-fill is-pad" x="32" y="20" width="16" height="8" />
        <rect className="wait-art-fill is-pad" x="32" y="36" width="16" height="8" />
        <rect className="wait-art-fill is-live" x="32" y="68" width="16" height="12" />
      </svg>
    );
  }
  return (
    <svg className="wait-art" viewBox="0 0 80 96" aria-hidden="true">
      <rect className="wait-art-well" x="12" y="16" width="56" height="64" />
      <rect className="wait-art-fill is-t" x="16" y="20" width="16" height="8" />
      <rect className="wait-art-fill is-o" x="32" y="20" width="16" height="8" />
      <rect className="wait-art-fill is-i" x="48" y="20" width="16" height="8" />
      <rect className="wait-art-fill is-live" x="36" y="48" width="8" height="8" />
      <rect className="wait-art-fill is-pad" x="28" y="68" width="24" height="6" />
    </svg>
  );
}
