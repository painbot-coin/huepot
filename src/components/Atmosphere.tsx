const MOTES = [
  { x: 6, y: 78, d: 13, delay: 0 },
  { x: 14, y: 22, d: 18, delay: 2 },
  { x: 22, y: 64, d: 11, delay: 4 },
  { x: 31, y: 12, d: 16, delay: 1 },
  { x: 38, y: 86, d: 14, delay: 6 },
  { x: 47, y: 40, d: 20, delay: 3 },
  { x: 55, y: 70, d: 12, delay: 8 },
  { x: 63, y: 18, d: 17, delay: 5 },
  { x: 71, y: 54, d: 15, delay: 1.5 },
  { x: 78, y: 8, d: 19, delay: 7 },
  { x: 84, y: 82, d: 13, delay: 2.5 },
  { x: 91, y: 36, d: 16, delay: 4.5 },
  { x: 11, y: 48, d: 21, delay: 9 },
  { x: 28, y: 90, d: 12, delay: 3.5 },
  { x: 42, y: 28, d: 14, delay: 6.5 },
  { x: 58, y: 94, d: 18, delay: 0.8 },
  { x: 69, y: 33, d: 11, delay: 10 },
  { x: 88, y: 61, d: 15, delay: 2.2 },
  { x: 4, y: 8, d: 17, delay: 5.5 },
  { x: 96, y: 14, d: 13, delay: 7.5 },
  { x: 50, y: 6, d: 22, delay: 1.2 },
  { x: 73, y: 76, d: 14, delay: 8.5 },
];

export function Atmosphere() {
  return (
    <div aria-hidden="true" className="fx-root">
      <div className="fx-aurora fx-aurora-a" />
      <div className="fx-aurora fx-aurora-b" />
      <div className="fx-aurora fx-aurora-c" />
      <div className="fx-stars" />
      <div className="fx-veil" />
      <div className="fx-motes">
        {MOTES.map((mote, index) => (
          <span
            className="fx-mote"
            key={index}
            style={{
              left: `${mote.x}%`,
              top: `${mote.y}%`,
              animationDuration: `${mote.d}s`,
              animationDelay: `${mote.delay}s`,
            }}
          />
        ))}
      </div>
      <div className="fx-vignette" />
    </div>
  );
}
