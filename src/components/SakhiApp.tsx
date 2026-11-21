"use client";

import { useEffect, useRef, useState } from "react";
import { useSettings } from "@/hooks/useSettings";
import { useSpeech } from "@/hooks/useSpeech";
import { prompt, start, step, type AgentState, type Input, type Output } from "@/lib/agent";
import { group } from "@/lib/engine";
import { answerText, summaryText, valueText } from "@/lib/explain";
import { DICT, fmt } from "@/lib/i18n";
import { ageBand } from "@/lib/profile";
import { flushQueue, newId, sendSession } from "@/lib/telemetry";
import { SCHEMES } from "@/data/schemes";
import { BOOL_FIELDS, type Field, type Lang, type Scheme } from "@/lib/types";
import AgentPanel, { type Message } from "./AgentPanel";
import Avatar, { type Phase } from "./Avatar";
import Browse from "./Browse";
import MicButton from "./MicButton";
import Results from "./Results";
import SchemeModal from "./SchemeModal";
import SettingsModal from "./SettingsModal";
import TopBar from "./TopBar";

const FEATURE_ICONS = ["🌐", "🧠", "🎯", "🔍", "⚖️", "⭐", "📴", "📝"];
const CHIP_FIELDS: Field[] = ["age", "gender", "category", "occupation", "income", "studentLevel", "state", "area", ...BOOL_FIELDS];

export default function SakhiApp() {
  const [settings, update] = useSettings();
  const lang = settings.lang;
  const d = DICT[lang];

  const speech = useSpeech({ rate: settings.rate, pitch: settings.pitch, voiceNames: settings.voiceNames });

  const [agent, setAgent] = useState<AgentState | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [bubble, setBubble] = useState("");
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [interim, setInterim] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<"results" | "browse">("results");
  const [openScheme, setOpenScheme] = useState<Scheme | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [online, setOnline] = useState(true);
  const [stats, setStats] = useState<{ total: number; avgQuestions: number } | null>(null);
  const [stageVisible, setStageVisible] = useState(true);

  // Refs always hold the latest values for use inside async speech callbacks.
  const agentRef = useRef<AgentState | null>(null);
  const langRef = useRef<Lang>(lang);
  const settingsRef = useRef(settings);
  const voiceOn = useRef(false);
  const noSpeech = useRef(0);
  const sid = useRef("");
  const thinkToken = useRef(0);
  const stageRef = useRef<HTMLElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const startListeningRef = useRef<() => void>(() => {});
  const handleTextRef = useRef<(t: string) => void>(() => {});
  langRef.current = lang;
  settingsRef.current = settings;

  const phase: Phase = thinking ? "thinking" : speech.speaking ? "speaking" : listening ? "listening" : "idle";

  /* ------------------------------ speaking ------------------------------ */

  const deliver = (out: Output) => {
    agentRef.current = out.state;
    setAgent(out.state);
    let l = langRef.current;
    if (out.switchLang) {
      l = out.switchLang;
      langRef.current = l;
      update({ lang: l });
    }
    const text = out.say.join(" ");
    setMessages((m) => [...m, ...out.say.map((t) => ({ from: "agent" as const, text: t }))]);
    setBubble(text);
    setNotice(null);
    speech.speak(text, l, () => {
      const st = agentRef.current;
      if (voiceOn.current && settingsRef.current.autoListen && st && (st.ask || st.conflict)) startListeningRef.current();
    });
  };

  /* ------------------------------ listening ----------------------------- */

  const startListening = () => {
    if (!speech.sttOk) {
      setNotice(DICT[langRef.current].ui.micUnsupported);
      voiceOn.current = false;
      return;
    }
    setNotice(null);
    setListening(true);
    setInterim("");
    let err = "";
    speech.listen(langRef.current, {
      onInterim: setInterim,
      onFinal: (t) => {
        noSpeech.current = 0;
        setListening(false);
        setInterim("");
        handleTextRef.current(t);
      },
      onError: (c) => {
        err = c;
      },
      onEnd: (got) => {
        setListening(false);
        if (got || err === "aborted") return;
        const ui = DICT[langRef.current].ui;
        if (err === "" || err === "no-speech") {
          noSpeech.current += 1;
          if (voiceOn.current && noSpeech.current < 2) {
            setTimeout(() => startListeningRef.current(), 250);
            return;
          }
          voiceOn.current = false;
          noSpeech.current = 0;
          setNotice(ui.micNoSpeech);
          return;
        }
        voiceOn.current = false;
        if (err === "not-allowed" || err === "service-not-allowed" || err === "audio-capture") setNotice(ui.micBlocked);
        else if (err === "network") setNotice(ui.micNetwork);
        else setNotice(ui.micUnsupported);
      },
    });
  };
  startListeningRef.current = startListening;

  /* ------------------------------ agent I/O ----------------------------- */

  const newSession = () => {
    sid.current = newId();
    setMessages([]);
    deliver(start(langRef.current));
  };

  const handleText = (text: string) => {
    const st = agentRef.current;
    if (!st) return;
    speech.cancel();
    setMessages((m) => [...m, { from: "user", text }]);
    const my = ++thinkToken.current;
    setThinking(true);
    const out = step(st, { type: "text", text }, langRef.current);
    setTimeout(() => {
      if (my !== thinkToken.current) return;
      setThinking(false);
      deliver(out);
    }, 450);
  };
  handleTextRef.current = handleText;

  const handleInput = (input: Input, label?: string) => {
    const st = agentRef.current;
    if (!st) return;
    speech.cancel();
    speech.stopListening();
    setListening(false);
    setThinking(false);
    thinkToken.current += 1;
    if (label) setMessages((m) => [...m, { from: "user", text: label }]);
    deliver(step(st, input, langRef.current));
  };

  const onValue = (field: Field | "name", value: unknown) => {
    const label = field === "name" ? String(value) : typeof value === "boolean" ? (value ? d.ui.yes : d.ui.no) : valueText(field, value, lang);
    handleInput({ type: "value", field, value }, label);
  };

  const onEditField = (f: Field | "name") => {
    if (!agentRef.current) return;
    handleInput({ type: "edit", field: f });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onMic = () => {
    setNotice(null);
    if (listening) {
      voiceOn.current = false;
      speech.stopListening();
      return;
    }
    if (speech.speaking) {
      speech.cancel();
      voiceOn.current = true;
      if (agentRef.current) startListening();
      return;
    }
    voiceOn.current = true;
    noSpeech.current = 0;
    if (!agentRef.current) newSession();
    else startListening();
  };

  const onStartOver = () => {
    speech.cancel();
    speech.stopListening();
    voiceOn.current = false;
    thinkToken.current += 1;
    agentRef.current = null;
    setAgent(null);
    setMessages([]);
    setBubble("");
    setListening(false);
    setThinking(false);
    setNotice(null);
    setInterim("");
  };

  const onLang = (l: Lang) => {
    if (l === langRef.current) return;
    langRef.current = l;
    update({ lang: l });
    speech.cancel();
    speech.stopListening();
    setListening(false);
    const st = agentRef.current;
    if (!st) {
      setBubble("");
      return;
    }
    const text = prompt(st, l) || summaryText(st.profile, l, st.moreCount);
    setMessages((m) => [...m, { from: "agent", text }]);
    setBubble(text);
    speech.speak(text, l, () => {
      const cur = agentRef.current;
      if (voiceOn.current && settingsRef.current.autoListen && cur && (cur.ask || cur.conflict)) startListeningRef.current();
    });
  };

  /* ------------------------------ side effects --------------------------- */

  // Save one anonymous summary when a session reaches results.
  useEffect(() => {
    if (!agent?.done || !sid.current) return;
    const g = group(agent.profile);
    void sendSession({
      sid: sid.current,
      lang: langRef.current,
      ageBand: ageBand(agent.profile.age),
      gender: agent.profile.gender ?? null,
      category: agent.profile.category ?? null,
      questions: agent.asked,
      eligible: g.eligible.length,
      maybe: g.maybe.length,
      conflicts: agent.conflictsSeen,
    });
    setTab("results");
    const t = setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 500);
    return () => clearTimeout(t);
  }, [agent?.done, agent?.asked]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => {
      setOnline(true);
      void flushQueue();
    };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    void flushQueue();
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((j: { total?: number; avgQuestions?: number }) => {
        if (j && typeof j.total === "number") setStats({ total: j.total, avgQuestions: j.avgQuestions ?? 0 });
      })
      .catch(() => {});
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setStageVisible(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* --------------------------------- view -------------------------------- */

  const profile = agent?.profile ?? { skipped: [] };
  const started = !!agent;
  const eligibleCount = started ? group(profile).eligible.length : 0;
  const micLabel =
    phase === "listening" ? d.ui.micListening : phase === "speaking" ? d.ui.micSpeaking : phase === "thinking" ? d.ui.statusThinking : d.ui.micIdle;
  const noVoice = speech.ttsOk && speech.voices.length > 0 && !speech.hasVoice(lang);

  const closeScheme = () => {
    speech.cancel();
    setOpenScheme(null);
  };

  return (
    <div className="min-h-screen">
      <TopBar settings={settings} update={update} onLang={onLang} onSettings={() => setShowSettings(true)} online={online} />

      <main className="mx-auto grid max-w-[96rem] grid-cols-[minmax(0,1fr)] gap-5 px-3 py-4 lg:grid-cols-[minmax(22rem,26.5rem)_minmax(0,1fr)] lg:px-6">
        {/* ============ LEFT: AI voice agent ============ */}
        <aside className="order-2 lg:order-1 lg:sticky lg:top-[5.2rem] lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
          <AgentPanel
            lang={lang}
            phase={phase}
            st={agent}
            bubble={bubble}
            interim={interim}
            notice={notice}
            noVoice={noVoice}
            messages={messages}
            onValue={onValue}
            onText={handleText}
            onSkip={() => handleInput({ type: "skip" }, d.ui.skip)}
            onResolve={(i) => handleInput({ type: "resolve", index: i })}
            onMore={() => handleInput({ type: "more" }, d.ui.moreQuestions)}
          />
        </aside>

        {/* ============ CENTRE / RIGHT: big voice button + schemes ============ */}
        <div className="order-1 min-w-0 space-y-6 lg:order-2">
          <section
            ref={stageRef}
            aria-label="Voice"
            className={`relative flex flex-col items-center overflow-hidden rounded-3xl border-2 border-line bg-surface px-4 py-6 text-center shadow-sm ${
              started ? "" : "lg:min-h-[30rem] lg:justify-center"
            }`}
            style={{ backgroundImage: "radial-gradient(circle at 50% 40%, var(--surface2), var(--surface) 70%)" }}
          >
            <h1 className="relative z-10 mb-3 max-w-xl text-2xl font-extrabold leading-tight sm:text-3xl">{d.tagline}</h1>

            <div className="relative z-10 mb-1 w-24 lg:hidden">
              <Avatar phase={phase} />
            </div>

            <MicButton phase={phase} label={micLabel} onClick={onMic} />

            <p className="relative z-10 mt-5 text-2xl font-extrabold" aria-live="polite">{micLabel}</p>
            <p className="relative z-10 mt-1 max-w-md text-base font-medium text-muted">{d.ui.micHint}</p>

            {notice && <p className="mt-3 max-w-md rounded-xl bg-warn-bg px-4 py-2 font-semibold text-warn">⚠️ {notice}</p>}
            {!online && <p className="mt-3 max-w-md rounded-xl bg-warn-bg px-4 py-2 text-sm font-semibold text-warn">⚡ {d.ui.offlineNote}</p>}

            {started && (
              <div className="mt-5 w-full max-w-2xl">
                <p className="mb-2 text-sm font-extrabold uppercase tracking-wide text-muted">
                  {d.ui.aboutYou} · <span className="font-semibold normal-case">{d.ui.tapToChange}</span>
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {profile.name !== undefined && profile.name !== "" && (
                    <button type="button" onClick={() => onEditField("name")} className="rounded-full border-2 border-line bg-surface px-3 py-1 text-sm font-bold hover:border-primary">
                      👤 {profile.name} ✏️
                    </button>
                  )}
                  {CHIP_FIELDS.filter((f) => (profile as unknown as Record<string, unknown>)[f] !== undefined).map((f) => (
                    <button key={f} type="button" onClick={() => onEditField(f)} className="rounded-full border-2 border-line bg-surface px-3 py-1 text-sm font-bold hover:border-primary">
                      {d.fieldLabel[f]}: <span className="text-primary">{answerText(f, profile, lang)}</span> ✏️
                    </button>
                  ))}
                  <button type="button" onClick={onStartOver} className="rounded-full border-2 border-bad px-3 py-1 text-sm font-bold text-bad hover:bg-bad-bg">
                    ↺ {d.ui.startOver}
                  </button>
                </div>
              </div>
            )}
          </section>

          {!started && (
            <section aria-label={d.ui.featuresTitle}>
              <h2 className="mb-2 text-lg font-extrabold">✨ {d.ui.featuresTitle}</h2>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {d.features.map((f, i) => (
                  <li key={f} className="flex items-center gap-2 rounded-2xl border-2 border-line bg-surface px-3 py-2.5 text-sm font-bold">
                    <span className="text-xl" aria-hidden="true">{FEATURE_ICONS[i]}</span>
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div ref={resultsRef} className="scroll-mt-24">
            <div role="tablist" className="mb-4 grid grid-cols-2 gap-2">
              {(["results", "browse"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`rounded-2xl border-2 px-3 py-3 text-lg font-extrabold transition ${
                    tab === t ? "border-primary bg-primary text-primary-fg" : "border-line bg-surface hover:bg-surface2"
                  }`}
                >
                  {t === "results" ? `🎯 ${d.ui.tabResults}${started ? ` (${eligibleCount})` : ""}` : `📚 ${d.ui.tabBrowse} (${SCHEMES.length})`}
                </button>
              ))}
            </div>

            {tab === "results" ? (
              <Results profile={profile} lang={lang} started={started} onOpen={setOpenScheme} onAnswer={onEditField} />
            ) : (
              <Browse profile={profile} lang={lang} started={started} onOpen={setOpenScheme} />
            )}
          </div>

          <footer className="space-y-2 pb-24 text-center text-sm text-muted">
            {stats && stats.total > 0 && <p className="font-bold">{fmt(d.ui.stats, { n: stats.total, q: stats.avgQuestions })}</p>}
            <p>📴 {d.ui.install}</p>
            <p className="mx-auto max-w-2xl">{d.ui.disclaimer}</p>
          </footer>
        </div>
      </main>

      {!stageVisible && (
        <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2">
          <MicButton size="sm" phase={phase} label={micLabel} onClick={onMic} />
        </div>
      )}

      {openScheme && (
        <SchemeModal
          scheme={openScheme}
          profile={profile}
          lang={lang}
          speaking={speech.speaking}
          onSpeak={(t) => {
            voiceOn.current = false;
            speech.stopListening();
            setListening(false);
            speech.speak(t, lang);
          }}
          onStop={() => speech.cancel()}
          onClose={closeScheme}
        />
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          update={update}
          voices={speech.voices}
          onTest={(l) => speech.speak(fmt(DICT[l].say.niceName, { name: DICT[l].appName }), l)}
          onClose={() => {
            speech.cancel();
            setShowSettings(false);
          }}
        />
      )}
    </div>
  );
}
