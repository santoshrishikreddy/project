"use client";

import { useState } from "react";
import type { AgentState } from "@/lib/agent";
import { schemeTopNames } from "@/lib/explain";
import { DICT, fmt } from "@/lib/i18n";
import type { Field, Lang } from "@/lib/types";
import AnswerPad from "./AnswerPad";
import Avatar, { type Phase } from "./Avatar";

export interface Message {
  from: "agent" | "user";
  text: string;
}

interface Props {
  lang: Lang;
  phase: Phase;
  st: AgentState | null;
  bubble: string;
  interim: string;
  notice: string | null;
  noVoice: boolean;
  messages: Message[];
  onValue: (field: Field | "name", value: unknown) => void;
  onText: (t: string) => void;
  onSkip: () => void;
  onResolve: (i: number) => void;
  onMore: () => void;
}

const PHASE_DOT: Record<Phase, string> = {
  idle: "bg-muted",
  listening: "bg-accent",
  speaking: "bg-primary",
  thinking: "bg-warn",
};

export default function AgentPanel(p: Props) {
  const d = DICT[p.lang];
  const [typed, setTyped] = useState("");
  const status = {
    idle: d.ui.statusIdle,
    listening: d.ui.statusListening,
    speaking: d.ui.statusSpeaking,
    thinking: d.ui.statusThinking,
  }[p.phase];

  const send = () => {
    const t = typed.trim();
    if (!t) return;
    setTyped("");
    p.onText(t);
  };

  const active = p.st && (p.st.ask || p.st.conflict);

  return (
    <section aria-label={d.agentRole} className="rounded-3xl border-2 border-line bg-surface p-4 shadow-sm">
      {/* header */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-primary">🤖 {d.agentRole}</p>
          <h2 className="text-2xl font-extrabold leading-none">{d.appName}</h2>
        </div>
        <span className="flex items-center gap-2 rounded-full bg-surface2 px-3 py-1 text-sm font-bold" aria-live="polite">
          <span className={`h-2.5 w-2.5 rounded-full ${PHASE_DOT[p.phase]} ${p.phase !== "idle" ? "animate-pulse" : ""}`} />
          {status}
        </span>
      </div>

      {/* animated human avatar (on small screens a compact one lives next to the mic) */}
      <div className="hidden lg:block">
        <Avatar phase={p.phase} className="max-w-[14.5rem]" />
      </div>

      {/* speech bubble */}
      <div key={p.bubble + p.phase} className="anim-pop relative mt-3 rounded-3xl rounded-tl-md border-2 border-line bg-surface2 p-4 text-[1.05rem] font-semibold leading-snug" aria-live="polite">
        {p.phase === "thinking" ? (
          <span className="flex items-center gap-1.5 py-1" aria-label={d.ui.statusThinking}>
            {[0, 0.18, 0.36].map((x) => (
              <span key={x} className="anim-dot h-3 w-3 rounded-full bg-primary" style={{ animationDelay: `${x}s` }} />
            ))}
          </span>
        ) : (
          p.bubble || d.say.greet
        )}
      </div>

      {p.phase === "listening" && (
        <p className="mt-2 rounded-xl bg-surface2 px-3 py-2 text-sm font-semibold text-muted">
          🎧 {d.ui.hearing} <em className="text-fg">{p.interim || "…"}</em>
        </p>
      )}

      {p.noVoice && <p className="mt-2 rounded-xl bg-warn-bg px-3 py-2 text-sm font-semibold text-warn">🔇 {fmt(d.ui.voiceNone, { lang: p.lang === "te" ? "తెలుగు" : p.lang === "hi" ? "हिन्दी" : "English" })}</p>}
      {p.notice && <p className="mt-2 rounded-xl bg-warn-bg px-3 py-2 text-sm font-semibold text-warn">⚠️ {p.notice}</p>}

      {/* question counter + why */}
      {p.st && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary px-3 py-1 text-sm font-extrabold text-primary-fg">{fmt(d.ui.questions, { n: p.st.asked })}</span>
          {p.st.why && p.st.ask && !p.st.conflict && (
            <details className="group min-w-0 flex-1 rounded-xl bg-surface2 px-3 py-1.5 text-sm">
              <summary className="cursor-pointer font-bold text-accent">💡 {d.ui.why}</summary>
              <p className="mt-1 font-medium">{fmt(d.ui.whyText, { n: p.st.why.ids.length, names: schemeTopNames(p.st.why.ids, p.lang) })}</p>
            </details>
          )}
        </div>
      )}

      {/* answer pad */}
      {p.st && (
        <div className="mt-4">
          <AnswerPad st={p.st} lang={p.lang} onValue={p.onValue} onSkip={p.onSkip} onResolve={p.onResolve} onMore={p.onMore} />
        </div>
      )}

      {/* type instead */}
      {active && (
        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={d.ui.typeHere}
            aria-label={d.ui.typeHere}
            className="min-w-0 flex-1 rounded-xl border-2 border-line bg-surface px-3 py-2 font-medium"
          />
          <button type="button" onClick={send} className="rounded-xl border-2 border-primary px-4 font-extrabold text-primary hover:bg-surface2">
            ➤
          </button>
        </div>
      )}

      {/* transcript */}
      {p.messages.length > 0 && (
        <details className="mt-4 rounded-xl bg-surface2 px-3 py-2 text-sm">
          <summary className="cursor-pointer font-bold">💬 {d.ui.conversation}</summary>
          <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto pr-1">
            {p.messages.slice(-14).map((m, i) => (
              <li key={i} className={m.from === "user" ? "text-right" : ""}>
                <span className={`inline-block max-w-[92%] rounded-2xl px-3 py-1.5 ${m.from === "user" ? "bg-primary text-primary-fg" : "bg-surface"}`}>
                  <b className="mr-1 text-xs opacity-70">{m.from === "user" ? d.ui.you : d.appName}</b>
                  {m.text}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
