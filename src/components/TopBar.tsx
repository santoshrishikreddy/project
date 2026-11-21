"use client";

import { FONT_STEPS, type Settings, type Theme } from "@/hooks/useSettings";
import { DICT } from "@/lib/i18n";
import { LANGS, type Lang } from "@/lib/types";

interface Props {
  settings: Settings;
  update: (p: Partial<Settings>) => void;
  onLang: (l: Lang) => void;
  onSettings: () => void;
  online: boolean;
}

const THEMES: { id: Theme; icon: string }[] = [
  { id: "light", icon: "☀️" },
  { id: "dark", icon: "🌙" },
  { id: "neutral", icon: "◐" },
];

export default function TopBar({ settings, update, onLang, onSettings, online }: Props) {
  const d = DICT[settings.lang];
  const idx = Math.max(0, FONT_STEPS.indexOf(settings.fontScale));
  const setFont = (i: number) => update({ fontScale: FONT_STEPS[Math.min(FONT_STEPS.length - 1, Math.max(0, i))] });

  return (
    <header className="sticky top-0 z-30 border-b-2 border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-[96rem] flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 lg:px-6">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="h-11 w-11 rounded-xl shadow" />
          <div className="leading-tight">
            <div className="text-xl font-extrabold">{d.appName}</div>
            <div className="hidden text-xs text-muted md:block">{d.tagline}</div>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {!online && (
            <span className="rounded-full bg-warn-bg px-3 py-1 text-sm font-bold text-warn" title={d.ui.offlineNote}>
              ⚡ {d.ui.offlineBadge}
            </span>
          )}

          {/* language */}
          <div role="group" aria-label="Language" className="flex overflow-hidden rounded-xl border-2 border-line">
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => onLang(l.code)}
                aria-pressed={settings.lang === l.code}
                className={`px-3.5 py-1.5 text-base font-bold transition-colors ${
                  settings.lang === l.code ? "bg-primary text-primary-fg" : "bg-surface hover:bg-surface2"
                }`}
              >
                {l.native}
              </button>
            ))}
          </div>

          {/* text size */}
          <div role="group" aria-label={d.ui.textSize} className="flex items-center overflow-hidden rounded-xl border-2 border-line">
            <button
              type="button"
              onClick={() => setFont(idx - 1)}
              disabled={idx === 0}
              aria-label={d.ui.smaller}
              title={d.ui.smaller}
              className="px-3 py-1.5 text-sm font-extrabold hover:bg-surface2 disabled:opacity-35"
            >
              A<span className="text-xs">−</span>
            </button>
            <span className="min-w-[3.2rem] border-x-2 border-line px-1 text-center text-xs font-bold text-muted" aria-live="polite">
              {settings.fontScale}%
            </span>
            <button
              type="button"
              onClick={() => setFont(idx + 1)}
              disabled={idx === FONT_STEPS.length - 1}
              aria-label={d.ui.larger}
              title={d.ui.larger}
              className="px-3 py-1.5 text-xl font-extrabold leading-none hover:bg-surface2 disabled:opacity-35"
            >
              A<span className="text-xs">+</span>
            </button>
          </div>

          {/* screen mode */}
          <div role="group" aria-label={d.ui.theme} className="flex overflow-hidden rounded-xl border-2 border-line">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => update({ theme: t.id })}
                aria-pressed={settings.theme === t.id}
                aria-label={d.ui[t.id]}
                title={d.ui[t.id]}
                className={`px-3 py-1.5 text-lg ${settings.theme === t.id ? "bg-primary text-primary-fg" : "bg-surface hover:bg-surface2"}`}
              >
                {t.icon}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onSettings}
            aria-label={d.ui.settings}
            title={d.ui.settings}
            className="rounded-xl border-2 border-line px-3 py-1.5 text-lg hover:bg-surface2"
          >
            ⚙️
          </button>
        </div>
      </div>
    </header>
  );
}
