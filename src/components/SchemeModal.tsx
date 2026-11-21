"use client";

import { useEffect } from "react";
import { DOCS } from "@/data/schemes";
import { explainRows, guideSpeech, guideSteps, reasonsSentence, schemeSpeech } from "@/lib/explain";
import { DICT, fmt } from "@/lib/i18n";
import { SECTOR_ICONS, tr, type Lang, type Profile, type Scheme } from "@/lib/types";

interface Props {
  scheme: Scheme;
  profile: Profile;
  lang: Lang;
  speaking: boolean;
  onSpeak: (text: string) => void;
  onStop: () => void;
  onClose: () => void;
}

const ICON = { pass: "✅", fail: "❌", unknown: "❓" } as const;

export default function SchemeModal({ scheme, profile, lang, speaking, onSpeak, onStop, onClose }: Props) {
  const d = DICT[lang];
  const rows = explainRows(scheme, profile, lang);
  const steps = guideSteps(scheme, lang);
  const url = scheme.url ?? "https://www.myscheme.gov.in";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const speechText = () => {
    const unknownRows = rows.filter((r) => r.res === "unknown").map((r) => r.label);
    const why = schemeSpeech(scheme, profile, lang);
    const note = scheme.note ? tr(scheme.note, lang) : "";
    const unk = unknownRows.length ? fmt(d.say.unknownNote, { what: unknownRows.join(", ") }) : "";
    return [why, unk, note, guideSpeech(scheme, lang)].filter(Boolean).join(" ");
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/55 p-0 sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-label={tr(scheme.name, lang)} onClick={onClose}>
      <div className="anim-slide max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border-2 border-line bg-surface p-5 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-muted">
              {scheme.cats.map((c) => `${SECTOR_ICONS[c]} ${d.sectors[c]}`).join("  ·  ")}
            </p>
            <h3 className="text-2xl font-extrabold leading-tight">{tr(scheme.name, lang)}</h3>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-xl border-2 border-line px-3 py-1 font-bold hover:bg-surface2" aria-label={d.ui.close}>
            ✕
          </button>
        </div>

        <p className="mt-2 rounded-2xl bg-surface2 p-3 text-lg font-semibold">🎁 {tr(scheme.benefit, lang)}</p>

        <button
          type="button"
          onClick={() => (speaking ? onStop() : onSpeak(speechText()))}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-lg font-extrabold text-primary-fg active:scale-[0.98]"
        >
          {speaking ? `⏹ ${d.ui.stop}` : `🔊 ${d.ui.hearThis}`}
        </button>

        {/* explainable reasoning */}
        <h4 className="mt-5 text-lg font-extrabold">🔍 {d.ui.rulesChecked}</h4>
        {rows.length === 0 ? (
          <p className="mt-1 rounded-xl bg-good-bg p-3 font-semibold text-good">✔ {d.ui.all}</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {rows.map((r, i) => (
              <li
                key={i}
                className={`flex items-start gap-3 rounded-xl border-2 p-3 ${
                  r.res === "pass" ? "border-good bg-good-bg" : r.res === "fail" ? "border-bad bg-bad-bg" : "border-warn bg-warn-bg"
                }`}
              >
                <span className="text-xl" aria-hidden="true">{ICON[r.res]}</span>
                <div className="min-w-0">
                  <p className="font-bold leading-snug">{r.label}</p>
                  <p className="text-sm font-medium opacity-90">
                    {r.res === "pass" ? d.ui.pass : r.res === "fail" ? d.ui.fail : d.ui.unknown}
                    {r.answer ? ` · ${fmt(d.ui.yourAnswer, { v: r.answer })}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {reasonsSentence(scheme, profile, lang) && rows.every((r) => r.res === "pass") && rows.length > 0 && (
          <p className="mt-2 text-sm font-semibold text-good">✔ {d.ui.whyQualify}: {reasonsSentence(scheme, profile, lang)}</p>
        )}

        {scheme.note && (
          <div className="mt-3 rounded-xl border-2 border-warn bg-warn-bg p-3">
            <p className="font-extrabold text-warn">⚠️ {d.ui.alsoCheck}</p>
            <p className="font-medium">{tr(scheme.note, lang)}</p>
          </div>
        )}

        {/* application guidance */}
        <h4 className="mt-5 text-lg font-extrabold">📄 {d.ui.documents}</h4>
        <div className="mt-2 flex flex-wrap gap-2">
          {scheme.docs.length === 0 ? (
            <span className="rounded-full bg-surface2 px-3 py-1 font-semibold">{d.doc.none}</span>
          ) : (
            scheme.docs.map((k) => (
              <span key={k} className="rounded-full bg-surface2 px-3 py-1 text-sm font-bold">
                📎 {tr(DOCS[k], lang)}
              </span>
            ))
          )}
        </div>

        <h4 className="mt-5 text-lg font-extrabold">🧭 {d.ui.howToApply}</h4>
        <ol className="mt-2 space-y-2">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3 rounded-xl bg-surface2 p-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-extrabold text-primary-fg">{i + 1}</span>
              <span className="font-medium leading-snug">{s}</span>
            </li>
          ))}
        </ol>

        <a href={url} target="_blank" rel="noopener noreferrer" className="mt-5 block rounded-2xl border-2 border-accent px-4 py-3 text-center text-lg font-extrabold text-accent hover:bg-surface2">
          🌐 {d.ui.officialSite} ↗
        </a>
        <p className="mt-3 text-xs text-muted">{d.ui.disclaimer}</p>
      </div>
    </div>
  );
}
