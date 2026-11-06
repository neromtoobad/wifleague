import { useState } from "react";
import { mascotSrc } from "./lib.ts";

/** A team mascot whose body language follows the data: bounces when up, shivers when down. */
export function Mascot({ name, move, size = 96, className = "" }: { name: string; move?: number | null; size?: number; className?: string }) {
  const mood = move == null ? "" : move > 0.0005 ? "happy" : move < -0.0005 ? "sad" : "";
  return <img className={`mascot ${mood} ${className}`} src={mascotSrc(name)} width={size} height={size} alt="" draggable={false} />;
}

export function Spark({ data, w = 96, h = 26 }: { data: number[]; w?: number; h?: number }) {
  if (data.length < 2) return <svg width={w} height={h} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pts = data.map((v, i) => `${((i / (data.length - 1)) * w).toFixed(1)},${(h - 2 - ((v - min) / (max - min || 1)) * (h - 4)).toFixed(1)}`);
  const up = data[data.length - 1] >= data[0];
  return (
    <svg width={w} height={h} className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline points={pts.join(" ")} fill="none" stroke={up ? "var(--up)" : "var(--down)"} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Scoreboard-style countdown: DD HH MM SS blocks. */
export function Clock({ to, now }: { to: number; now: number }) {
  let s = Math.max(0, to - now);
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  const cells: [number, string][] = d ? [[d, "d"], [h, "h"], [m, "m"], [s, "s"]] : [[h, "h"], [m, "m"], [s, "s"]];
  return (
    <span className="clock">
      {cells.map(([v, u]) => (
        <span key={u} className="clock-cell">
          <b>{String(v).padStart(2, "0")}</b>
          <i>{u}</i>
        </span>
      ))}
    </span>
  );
}

const BITS = ["#d8f04a", "#ff5a36", "#3b5bff", "#ffc83d", "#9b5cff", "#5cc8ff"];
export function Confetti() {
  return (
    <div className="confetti" aria-hidden>
      {Array.from({ length: 36 }, (_, i) => (
        <span
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            background: BITS[i % BITS.length],
            animationDelay: `${(i % 9) * 0.08}s`,
            animationDuration: `${1.6 + (i % 5) * 0.25}s`,
            transform: `rotate(${i * 29}deg)`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * The lineup share card from /og. The server only learns about a new entry on its next chain poll (≤15 s),
 * so a fresh card can 404 at first: keep a stable src and retry until it prints.
 */
export function LineupCard({ round, entry, className = "" }: { round: number; entry: number; className?: string }) {
  const [tries, setTries] = useState(0);
  const [ready, setReady] = useState(false);
  const src = `/og/${round}/${entry}.png${tries ? `?try=${tries}` : ""}`;
  return (
    <div className={`lineup-card ${ready ? "ready" : ""} ${className}`}>
      {!ready && (
        <div className="lineup-card-wait">
          <span className="spinner" />
          {tries > 20 ? "Card's taking a while. Refresh in a minute." : "Printing your card…"}
        </div>
      )}
      <img
        key={src}
        src={src}
        alt="Lineup card"
        onLoad={() => setReady(true)}
        onError={() => tries <= 20 && setTimeout(() => setTries((t) => t + 1), 3000)}
      />
    </div>
  );
}
