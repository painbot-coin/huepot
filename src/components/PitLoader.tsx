export function PitLoader({ label }: { label: string }) {
  return (
    <div className="loader-stage">
      <div className="loader-ring" />
      <p>{label}</p>
    </div>
  );
}
