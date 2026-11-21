"use client";

import type { Phase } from "./Avatar";

interface Props {
  phase: Phase;
  label: string;
  onClick: () => void;
  /** "xl" = the huge centre button; "sm" = floating shortcut. */
  size?: "xl" | "sm";
}

const BARS = [0, 0.15, 0.3, 0.45, 0.6, 0.45, 0.3, 0.15, 0];

export default function MicButton({ phase, label, onClick, size = "xl" }: Props) {
  const xl = size === "xl";
  const dim = xl ? "min(14.5rem, 64vw)" : "4.5rem";
  const active = phase === "listening" || phase === "speaking";
  const bg =
    phase === "listening"
      ? "linear-gradient(145deg, var(--accent), color-mix(in srgb, var(--accent) 65%, #000))"
      : "linear-gradient(145deg, var(--primary2), var(--primary))";

  return (
    <div className={`relative grid place-items-center ${xl ? "my-9" : ""}`} style={{ width: dim, height: dim }}>
      {active && (
        <>
          <span
            className="anim-ring pointer-events-none absolute inset-0 rounded-full"
            style={{ background: phase === "listening" ? "var(--accent)" : "var(--primary)", opacity: 0.4 }}
          />
          <span
            className="anim-ring-2 pointer-events-none absolute inset-0 rounded-full"
            style={{ background: phase === "listening" ? "var(--accent)" : "var(--primary)", opacity: 0.4 }}
          />
          {xl && (
            <span
              className="anim-ring-3 pointer-events-none absolute inset-0 rounded-full"
              style={{ background: phase === "listening" ? "var(--accent)" : "var(--primary)", opacity: 0.4 }}
            />
          )}
        </>
      )}
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-pressed={phase === "listening"}
        className={`relative z-10 grid h-full w-full place-items-center rounded-full text-primary-fg ring-4 ring-surface transition-transform active:scale-95 ${
          phase === "idle" ? "anim-pulse" : ""
        }`}
        style={{
          background: bg,
          boxShadow: "0 12px 44px var(--glow), inset 0 -8px 18px rgba(0,0,0,.18), inset 0 6px 14px rgba(255,255,255,.25)",
          color: "var(--primary-fg)",
        }}
      >
        <span className="flex flex-col items-center gap-[4%]">
          {phase === "speaking" ? (
            <svg viewBox="0 0 24 24" className={xl ? "h-[5.5rem] w-[5.5rem]" : "h-8 w-8"} fill="currentColor" aria-hidden="true">
              <path d="M3 10v4a1 1 0 0 0 1 1h3l4.3 3.6a1 1 0 0 0 1.7-.8V6.2a1 1 0 0 0-1.7-.8L7 9H4a1 1 0 0 0-1 1Z" />
              <path d="M16 8.5a5 5 0 0 1 0 7M18.6 5.8a9 9 0 0 1 0 12.4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className={xl ? "h-[5.5rem] w-[5.5rem]" : "h-8 w-8"} fill="currentColor" aria-hidden="true">
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3.5M8.5 21.5h7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
          {xl && (
            <span className="flex h-6 items-end gap-1" aria-hidden="true">
              {BARS.map((d, i) => (
                <span
                  key={i}
                  className={`block w-1.5 rounded-full bg-current ${active ? "anim-bar" : ""}`}
                  style={{ height: active ? "100%" : "25%", animationDelay: `${d}s`, opacity: active ? 0.95 : 0.55 }}
                />
              ))}
            </span>
          )}
        </span>
      </button>
    </div>
  );
}
