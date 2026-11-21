"use client";

import type { Status } from "@/lib/engine";
import { reasonsSentence } from "@/lib/explain";
import { DICT } from "@/lib/i18n";
import { SECTOR_ICONS, tr, type Field, type Lang, type Profile, type Scheme } from "@/lib/types";

interface Props {
  scheme: Scheme;
  profile: Profile;
  lang: Lang;
  status?: Status | null;
  unknown?: Field[];
  onOpen: (s: Scheme) => void;
  onAnswer?: (f: Field) => void;
}

const BORDER: Record<Status, string> = {
  eligible: "border-good",
  maybe: "border-warn",
  not: "border-line opacity-80",
};

export default function SchemeCard({ scheme, profile, lang, status = null, unknown = [], onOpen, onAnswer }: Props) {
  const d = DICT[lang];
  return (
    <article className={`anim-slide flex flex-col rounded-2xl border-2 bg-surface p-4 shadow-sm ${status ? BORDER[status] : "border-line"}`}>
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-[1.1rem] font-extrabold leading-snug">{tr(scheme.name, lang)}</h4>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {status === "eligible" && <span className="rounded-full bg-good-bg px-2.5 py-0.5 text-xs font-extrabold text-good">✔ {d.ui.eligibleTitle}</span>}
          {status === "maybe" && <span className="rounded-full bg-warn-bg px-2.5 py-0.5 text-xs font-extrabold text-warn">? {d.ui.maybeTitle}</span>}
          <span className="rounded-full bg-surface2 px-2.5 py-0.5 text-xs font-bold text-muted">{scheme.state ? d.ui.stateScheme : d.ui.central}</span>
        </div>
      </div>

      <p className="mt-1.5 text-[0.98rem] leading-snug">{tr(scheme.benefit, lang)}</p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {scheme.cats.map((c) => (
          <span key={c} className="rounded-full bg-surface2 px-2.5 py-0.5 text-xs font-bold">
            {SECTOR_ICONS[c]} {d.sectors[c]}
          </span>
        ))}
      </div>

      {status === "eligible" && (
        <p className="mt-2 rounded-xl bg-good-bg px-3 py-1.5 text-sm font-semibold text-good">✔ {reasonsSentence(scheme, profile, lang)}</p>
      )}

      {status === "maybe" && unknown.length > 0 && onAnswer && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-warn">{d.ui.needAnswer}:</span>
          {unknown.map((f) => (
            <button key={f} type="button" onClick={() => onAnswer(f)} className="rounded-full border-2 border-warn bg-warn-bg px-2.5 py-0.5 text-xs font-extrabold text-warn hover:brightness-95">
              ✏️ {d.fieldLabel[f]}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => onOpen(scheme)}
        className="mt-3 self-start rounded-xl bg-primary px-4 py-2 text-sm font-extrabold text-primary-fg hover:brightness-110 active:scale-95"
      >
        {d.ui.details} →
      </button>
    </article>
  );
}
