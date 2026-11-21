"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ttsClean } from "@/lib/explain";
import { LANGS, type Lang } from "@/lib/types";

/** Shared with the avatar: timestamp of the latest spoken word boundary (for lip-sync). */
export const speechPulse = { t: 0 };

export interface VoicePrefs {
  rate: number;
  pitch: number;
  voiceNames: Partial<Record<Lang, string>>;
}

/* --------------------------- voice selection --------------------------- */

const FEMALE =
  /female|woman|girl|zira|heera|swara|neerja|kalpana|lekha|veena|shruti|sangeeta|aditi|raveena|priya|samantha|karen|tessa|moira|fiona|susan|hazel|libby|sonia|aria|jenny|emma|sara|ananya|pallavi|chitra|vani|anushka|tara|google (uk english female|हिन्दी|हिंदी|हिन्दी)/i;
const MALE = /\bmale\b|david|\bmark\b|guy|ravi|hemant|prabhat|mohan|madhur|rishi|james|alex|daniel|george|thomas|fred|ryan|liam|eric|brian/i;

export const isFemaleVoice = (v: SpeechSynthesisVoice) => FEMALE.test(v.name) && !MALE.test(v.name);
export const isMaleVoice = (v: SpeechSynthesisVoice) => MALE.test(v.name) && !FEMALE.test(v.name);

const norm = (l: string) => l.replace("_", "-").toLowerCase();

function matchesLang(v: SpeechSynthesisVoice, lang: Lang): boolean {
  const l = norm(v.lang);
  return l === lang || l.startsWith(`${lang}-`);
}

function score(v: SpeechSynthesisVoice, lang: Lang): number {
  const target = LANGS.find((x) => x.code === lang)!.speech.toLowerCase();
  let s = 0;
  if (norm(v.lang) === target) s += 10;
  if (isFemaleVoice(v)) s += 8;
  if (isMaleVoice(v)) s -= 8;
  if (/natural|online/i.test(v.name)) s += 3;
  if (v.localService) s += 1;
  return s;
}

export function voicesFor(all: SpeechSynthesisVoice[], lang: Lang): SpeechSynthesisVoice[] {
  return all
    .filter((v) => matchesLang(v, lang))
    .sort((a, b) => score(b, lang) - score(a, lang));
}

/* ----------------------------- recognition ----------------------------- */

interface RecResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface RecEvent {
  resultIndex: number;
  results: ArrayLike<RecResult>;
}
interface RecLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: RecEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecCtor = new () => RecLike;

function recognitionCtor(): RecCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface ListenHandlers {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (code: string) => void;
  onEnd: (gotResult: boolean) => void;
}

function splitChunks(text: string): string[] {
  const parts = text.split(/(?<=[.!?।])\s+/).filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    if (p.length <= 220) out.push(p);
    else out.push(...(p.match(/.{1,200}(\s|$)/g) ?? [p]));
  }
  return out.length ? out : [text];
}

/* -------------------------------- hook -------------------------------- */

export function useSpeech(prefs: VoicePrefs) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [ttsOk, setTtsOk] = useState(true);
  const [sttOk, setSttOk] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const token = useRef(0);
  const simTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recRef = useRef<RecLike | null>(null);
  const prefsRef = useRef(prefs);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setTtsOk(false);
    } else {
      const synth = window.speechSynthesis;
      const load = () => {
        const v = synth.getVoices();
        voicesRef.current = v;
        setVoices(v);
      };
      load();
      synth.addEventListener("voiceschanged", load);
      const t = setTimeout(load, 700);
      setSttOk(!!recognitionCtor());
      return () => {
        synth.removeEventListener("voiceschanged", load);
        clearTimeout(t);
      };
    }
    setSttOk(!!recognitionCtor());
  }, []);

  const pickVoice = useCallback((lang: Lang): SpeechSynthesisVoice | undefined => {
    const list = voicesFor(voicesRef.current, lang);
    const wanted = prefsRef.current.voiceNames[lang];
    return (wanted && list.find((v) => v.name === wanted)) || list[0];
  }, []);

  const cancel = useCallback(() => {
    token.current += 1;
    if (simTimer.current) clearTimeout(simTimer.current);
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string, lang: Lang, onDone?: () => void) => {
      const my = ++token.current;
      if (simTimer.current) clearTimeout(simTimer.current);
      const clean = ttsClean(text, lang);
      const finish = () => {
        if (token.current !== my) return;
        setSpeaking(false);
        onDone?.();
      };
      const simulate = () => {
        // No usable voice on this device: keep the avatar talking for a
        // natural duration so the on-screen words can be read.
        const ms = Math.min(14000, Math.max(1400, clean.length * 60));
        const tick = () => {
          if (token.current !== my) return;
          speechPulse.t = performance.now();
          simTimer.current = setTimeout(tick, 260);
        };
        tick();
        simTimer.current = setTimeout(() => {
          if (token.current === my) finish();
        }, ms);
      };

      setSpeaking(true);
      const synth = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
      const voice = pickVoice(lang);
      if (!synth || !voice) {
        simulate();
        return;
      }
      synth.cancel();
      const chunks = splitChunks(clean);
      let i = 0;
      let started = false;
      const next = () => {
        if (token.current !== my) return;
        if (i >= chunks.length) {
          finish();
          return;
        }
        const u = new SpeechSynthesisUtterance(chunks[i++]);
        u.voice = voice;
        u.lang = voice.lang;
        u.rate = prefsRef.current.rate;
        u.pitch = prefsRef.current.pitch;
        u.onstart = () => {
          started = true;
        };
        u.onboundary = () => {
          speechPulse.t = performance.now();
        };
        u.onend = next;
        u.onerror = (e) => {
          if (e.error === "canceled" || e.error === "interrupted") return;
          next();
        };
        synth.speak(u);
      };
      setTimeout(next, 60);
      // Watchdog: some devices accept the request but never produce audio.
      setTimeout(() => {
        if (token.current === my && !started) {
          synth.cancel();
          simulate();
        }
      }, 3500);
    },
    [pickVoice],
  );

  const stopListening = useCallback(() => {
    const r = recRef.current;
    if (r) {
      try {
        r.stop();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const listen = useCallback((lang: Lang, h: ListenHandlers): boolean => {
    const Ctor = recognitionCtor();
    if (!Ctor) {
      h.onError("unsupported");
      h.onEnd(false);
      return false;
    }
    if (recRef.current) {
      try {
        recRef.current.abort();
      } catch {
        /* ignore */
      }
    }
    const rec = new Ctor();
    rec.lang = LANGS.find((l) => l.code === lang)!.speech;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    let finalText = "";
    let lastInterim = "";
    let delivered = false;
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      lastInterim = interim;
      h.onInterim((finalText + " " + interim).trim());
      if (finalText.trim() && !delivered) {
        delivered = true;
        h.onFinal(finalText.trim());
        try {
          rec.stop();
        } catch {
          /* ignore */
        }
      }
    };
    rec.onerror = (e) => h.onError(e.error);
    rec.onend = () => {
      if (!delivered && lastInterim.trim()) {
        delivered = true;
        h.onFinal(lastInterim.trim());
      }
      if (recRef.current === rec) recRef.current = null;
      h.onEnd(delivered);
    };
    recRef.current = rec;
    try {
      rec.start();
    } catch {
      recRef.current = null;
      h.onError("start-failed");
      h.onEnd(false);
      return false;
    }
    return true;
  }, []);

  useEffect(
    () => () => {
      token.current += 1;
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    [],
  );

  const hasVoice = useCallback((lang: Lang) => voicesFor(voices, lang).length > 0, [voices]);

  return { voices, ttsOk, sttOk, speaking, speak, cancel, listen, stopListening, hasVoice };
}
