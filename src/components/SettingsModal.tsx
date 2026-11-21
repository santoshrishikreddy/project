"use client";

import { useEffect } from "react";
import { isFemaleVoice, isMaleVoice, voicesFor } from "@/hooks/useSpeech";
import { DEFAULT_SETTINGS, type Settings } from "@/hooks/useSettings";
import { DICT, fmt } from "@/lib/i18n";
import { LANGS, type Lang } from "@/lib/types";

interface Props {
  settings: Settings;
  update: (p: Partial<Settings>) => void;
  voices: SpeechSynthesisVoice[];
  onTest: (lang: Lang) => void;
  onClose: () => void;
}

export default function SettingsModal({ settings, update, voices, onTest, onClose }: Props) {
  const d = DICT[settings.lang];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-3" role="dialog" aria-modal="true" aria-label={d.ui.settings} onClick={onClose}>
      <div className="anim-pop max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border-2 border-line bg-surface p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">⚙️ {d.ui.settings}</h2>
          <button type="button" onClick={onClose} className="rounded-xl border-2 border-line px-3 py-1 font-bold hover:bg-surface2">
            ✕ {d.ui.close}
          </button>
        </div>

        <label className="mb-1 flex items-center justify-between font-bold">
          <span>🎨 {d.ui.colour}</span>
          <span className="text-muted">{settings.saturation}%</span>
        </label>
        <input
          type="range"
          min={0}
          max={200}
          step={10}
          value={settings.saturation}
          onChange={(e) => update({ saturation: Number(e.target.value) })}
          className="mb-5 w-full accent-[var(--primary)]"
          aria-label={d.ui.colour}
        />

        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 flex justify-between font-bold">
              <span>🐢 {d.ui.speed}</span>
              <span className="text-muted">{settings.rate.toFixed(2)}×</span>
            </label>
            <input type="range" min={0.6} max={1.3} step={0.05} value={settings.rate} onChange={(e) => update({ rate: Number(e.target.value) })} className="w-full accent-[var(--primary)]" />
          </div>
          <div>
            <label className="mb-1 flex justify-between font-bold">
              <span>🎚️ {d.ui.pitch}</span>
              <span className="text-muted">{settings.pitch.toFixed(2)}</span>
            </label>
            <input type="range" min={0.8} max={1.6} step={0.05} value={settings.pitch} onChange={(e) => update({ pitch: Number(e.target.value) })} className="w-full accent-[var(--primary)]" />
          </div>
        </div>

        <label className="mb-5 flex cursor-pointer items-center gap-3 rounded-xl bg-surface2 p-3 font-semibold">
          <input type="checkbox" checked={settings.autoListen} onChange={(e) => update({ autoListen: e.target.checked })} className="h-5 w-5 accent-[var(--primary)]" />
          {d.ui.autoListen}
        </label>

        <div className="space-y-3">
          {LANGS.map((l) => {
            const list = voicesFor(voices, l.code);
            return (
              <div key={l.code} className="rounded-2xl border-2 border-line p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label htmlFor={`voice-${l.code}`} className="font-bold">
                    🗣️ {fmt(d.ui.voiceFor, { lang: l.native })}
                  </label>
                  <button type="button" onClick={() => onTest(l.code)} className="rounded-lg bg-primary px-3 py-1 text-sm font-bold text-primary-fg">
                    ▶ {d.ui.testVoice}
                  </button>
                </div>
                {list.length === 0 ? (
                  <p className="rounded-lg bg-warn-bg p-2 text-sm text-warn">{fmt(d.ui.voiceNone, { lang: l.native })}</p>
                ) : (
                  <select
                    id={`voice-${l.code}`}
                    value={settings.voiceNames[l.code] ?? ""}
                    onChange={(e) => update({ voiceNames: { ...settings.voiceNames, [l.code]: e.target.value || undefined } })}
                    className="w-full rounded-xl border-2 border-line bg-surface p-2 font-semibold"
                  >
                    <option value="">{d.ui.voiceAuto}</option>
                    {list.map((v) => (
                      <option key={v.name} value={v.name}>
                        {isFemaleVoice(v) ? "♀ " : isMaleVoice(v) ? "♂ " : ""}
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => update({ ...DEFAULT_SETTINGS, lang: settings.lang })}
          className="mt-5 w-full rounded-xl border-2 border-line py-2 font-bold hover:bg-surface2"
        >
          ↺ Reset
        </button>
      </div>
    </div>
  );
}
