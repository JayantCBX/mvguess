const BURSTS = [
  { x: "14%", y: "22%", delay: "0s", color: "#f6c85f" },
  { x: "82%", y: "18%", delay: "0.45s", color: "#35d0ba" },
  { x: "68%", y: "58%", delay: "0.9s", color: "#e5576f" },
  { x: "28%", y: "66%", delay: "1.25s", color: "#8b5cf6" }
] as const;

export function Fireworks() {
  return (
    <div className="fireworks" aria-label="Winner celebration" role="img">
      <span className="sr-only">Celebratory fireworks</span>
      {BURSTS.map((burst, index) => (
        <span key={index} className="firework" style={{ left: burst.x, top: burst.y, animationDelay: burst.delay, color: burst.color }}>
          {Array.from({ length: 8 }, (_, spark) => <i key={spark} style={{ transform: `rotate(${spark * 45}deg)` }} />)}
        </span>
      ))}
    </div>
  );
}
