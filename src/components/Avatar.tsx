"use client";

import { useEffect, useId, useRef } from "react";
import { speechPulse } from "@/hooks/useSpeech";

export type Phase = "idle" | "listening" | "speaking" | "thinking";

/**
 * "Sakhi": an illustrated young woman. While she speaks, her mouth opens and
 * closes in time with the voice (word boundaries when the browser reports
 * them, a natural syllable rhythm otherwise), her head sways, she blinks, and
 * sound rings pulse around her. While listening she tilts her head and raises
 * her brows.
 */
export default function Avatar({ phase, className = "" }: { phase: Phase; className?: string }) {
  // Unique SVG ids: two avatars can be in the DOM (one hidden), and duplicate ids break gradient/clip references.
  const uid = useId().replace(/\W/g, "");
  const openRef = useRef<SVGGElement>(null);
  const lipsRef = useRef<SVGPathElement>(null);
  const smileLiftRef = useRef<SVGGElement>(null);

  useEffect(() => {
    let raf = 0;
    let v = 0;
    const loop = (t: number) => {
      let target = 0;
      if (phase === "speaking") {
        const syllable = Math.abs(Math.sin(t / 92)) * Math.abs(Math.sin(t / 241 + 1.3));
        const pulse = Math.max(0, 1 - (performance.now() - speechPulse.t) / 170);
        target = Math.min(1, 0.1 + syllable * 0.72 + pulse * 0.3);
      }
      v += (target - v) * 0.4;
      const open = openRef.current;
      const lips = lipsRef.current;
      if (open) {
        open.style.transform = `scaleY(${Math.max(0.04, v)}) scaleX(${0.82 + v * 0.22})`;
        open.style.opacity = v < 0.1 ? "0" : "1";
      }
      if (lips) lips.style.opacity = v < 0.1 ? "1" : "0";
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const headClass = phase === "speaking" ? "anim-sway" : phase === "listening" ? "anim-tilt" : "anim-breathe";
  const browLift = phase === "listening" ? -3 : phase === "thinking" ? -1.5 : 0;
  const gaze = phase === "thinking" ? "translate(2.6px,-2.2px)" : "translate(0,0)";

  return (
    <div className={`relative mx-auto aspect-[4/5] w-full ${className}`} aria-hidden="true">
      {/* sound / listening rings */}
      {phase === "speaking" && (
        <>
          <span className="anim-halo absolute inset-[6%] rounded-full border-4 border-primary/50" />
          <span className="anim-halo absolute inset-[6%] rounded-full border-4 border-primary/40 [animation-delay:0.5s]" />
          <span className="anim-halo absolute inset-[6%] rounded-full border-4 border-primary/30 [animation-delay:1s]" />
        </>
      )}
      {phase === "listening" && (
        <>
          <span className="anim-halo absolute inset-[6%] rounded-full border-4 border-accent/50" />
          <span className="anim-halo absolute inset-[6%] rounded-full border-4 border-accent/30 [animation-delay:0.6s]" />
        </>
      )}

      <svg viewBox="0 0 200 250" className="relative h-full w-full drop-shadow-md">
        <defs>
          <radialGradient id={`${uid}bg`} cx="50%" cy="42%" r="62%">
            <stop offset="0" stopColor="var(--surface)" />
            <stop offset="1" stopColor="var(--surface2)" />
          </radialGradient>
          <linearGradient id={`${uid}skin`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e2aa82" />
            <stop offset="1" stopColor="#cf9468" />
          </linearGradient>
          <linearGradient id={`${uid}hair`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2a1c15" />
            <stop offset="1" stopColor="#120b08" />
          </linearGradient>
          <clipPath id={`${uid}mouthClip`}>
            <ellipse cx="100" cy="145" rx="11.5" ry="9" />
          </clipPath>
        </defs>

        <circle cx="100" cy="128" r="98" fill={`url(#${uid}bg)`} stroke="var(--line)" strokeWidth="2" />

        <g className="anim-breathe">
          {/* back hair */}
          <path
            d="M46 118 C32 36 168 36 154 118 C162 150 160 200 150 232 L50 232 C40 200 38 150 46 118Z"
            fill={`url(#${uid}hair)`}
          />
          {/* kurta */}
          <path d="M16 250 C18 214 48 197 86 191 L114 191 C152 197 182 214 184 250Z" fill="#df3f7a" />
          <path d="M16 250 C18 222 40 205 70 196 C60 215 56 232 58 250Z" fill="#c92f68" opacity="0.55" />
          {/* dupatta */}
          <path d="M44 205 C76 216 124 232 166 250 L134 250 C106 238 74 226 40 218Z" fill="#14a39a" />
          <path d="M44 205 C76 216 124 232 166 250" fill="none" stroke="#f5c542" strokeWidth="2.2" strokeDasharray="3 4" />
          {/* neck */}
          <path d="M85 148 L85 193 C92 203 108 203 115 193 L115 148Z" fill="#c78b62" />
          <path d="M85 168 C94 178 106 178 115 168 L115 150 L85 150Z" fill="#b87a52" opacity="0.5" />
          {/* necklace */}
          <path d="M80 195 C90 213 110 213 120 195" fill="none" stroke="#f5b700" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="100" cy="209" r="3.2" fill="#f5b700" />
        </g>

        {/* head */}
        <g className={headClass}>
          <ellipse cx="51" cy="113" rx="6.5" ry="10.5" fill="#cf9468" />
          <ellipse cx="149" cy="113" rx="6.5" ry="10.5" fill="#cf9468" />
          <circle cx="50" cy="128" r="3.6" fill="#f5b700" />
          <circle cx="150" cy="128" r="3.6" fill="#f5b700" />
          <circle cx="50" cy="135" r="2.2" fill="#f5b700" />
          <circle cx="150" cy="135" r="2.2" fill="#f5b700" />

          {/* face */}
          <path
            d="M52 104 C52 64 148 64 148 104 C148 146 126 166 100 166 C74 166 52 146 52 104Z"
            fill={`url(#${uid}skin)`}
          />
          <circle cx="71" cy="130" r="10" fill="#f08a8a" opacity="0.28" />
          <circle cx="129" cy="130" r="10" fill="#f08a8a" opacity="0.28" />

          {/* front hair with centre parting */}
          <path
            d="M47 112 C40 42 160 42 153 112 C150 88 140 70 118 62 L100 58 L82 62 C60 70 50 90 47 112Z"
            fill={`url(#${uid}hair)`}
          />
          <path d="M100 55 C101 63 100 69 99 74" fill="none" stroke="#5a463a" strokeWidth="1.4" opacity="0.7" />
          {/* side locks */}
          <path d="M47 112 C42 150 44 190 56 214 L68 206 C60 176 58 140 62 104Z" fill={`url(#${uid}hair)`} />
          <path d="M153 112 C158 150 156 190 144 214 L132 206 C140 176 142 140 138 104Z" fill={`url(#${uid}hair)`} />

          {/* bindi */}
          <circle cx="100" cy="88" r="3" fill="#c81d4e" />

          {/* brows */}
          <g style={{ transform: `translateY(${browLift}px)`, transition: "transform .25s ease" }}>
            <path d="M65 99 C71 93 84 93 91 97" fill="none" stroke="#1b1310" strokeWidth="3.2" strokeLinecap="round" />
            <path d="M109 97 C116 93 129 93 135 99" fill="none" stroke="#1b1310" strokeWidth="3.2" strokeLinecap="round" />
          </g>

          {/* eyes */}
          {[78, 122].map((cx) => (
            <g key={cx} className="anim-blink">
              <ellipse cx={cx} cy="111" rx="10" ry="6" fill="#fff" />
              <g style={{ transform: gaze, transition: "transform .3s ease" }}>
                <circle cx={cx} cy="111" r="4.6" fill="#3a2217" />
                <circle cx={cx} cy="111" r="2.2" fill="#0f0805" />
                <circle cx={cx + 1.6} cy="109.4" r="1.3" fill="#fff" />
              </g>
              <path
                d={`M${cx - 11} 111 C${cx - 6} 103 ${cx + 6} 103 ${cx + 11} 111`}
                fill="none"
                stroke="#150c08"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <path
                d={cx < 100 ? `M${cx - 11} 111 l-3 -2` : `M${cx + 11} 111 l3 -2`}
                stroke="#150c08"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </g>
          ))}

          {/* nose */}
          <path d="M100 113 C98 124 95 128 97.5 130 C100 132 104 131 106 129" fill="none" stroke="#a9704a" strokeWidth="1.8" strokeLinecap="round" />

          {/* mouth: closed smile + animated open mouth */}
          <g ref={smileLiftRef}>
            <path
              ref={lipsRef}
              d="M87 143 C93 150 107 150 113 143"
              fill="none"
              stroke="#a8344c"
              strokeWidth="3.4"
              strokeLinecap="round"
            />
            <g ref={openRef} style={{ transformOrigin: "100px 140px", transformBox: "view-box", opacity: 0 }}>
              <ellipse cx="100" cy="145" rx="11.5" ry="9" fill="#5e1624" stroke="#a8344c" strokeWidth="2.4" />
              <g clipPath={`url(#${uid}mouthClip)`}>
                <rect x="88" y="136" width="24" height="5.2" fill="#fff" />
                <ellipse cx="100" cy="153" rx="7" ry="4.6" fill="#e4707f" />
              </g>
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
