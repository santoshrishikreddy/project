"use client";

import { useMemo } from "react";
import { group } from "@/lib/engine";
import { DICT, fmt } from "@/lib/i18n";
import { tr, type Field, type Lang, type Profile, type Scheme } from "@/lib/types";
import SchemeCard from "./SchemeCard";

interface Props {
  profile: Profile;
  lang: Lang;
  started: boolean;
  onOpen: (s: Scheme) => void;
  onAnswer: (f: Field) => void;
}

export default function Results({ profile, lang, started, onOpen, onAnswer }: Props) {
  const d = DICT[lang];
  const g = useMemo(() => group(profile), [profile]);
  const answered = started && (profile.age || profile.gender || profile.category || profile.occupation);

  if (!answered) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-line bg-surface p-8 text-center">
        <p className="text-5xl" aria-hidden="true">🗂️</p>
        <p className="mt-2 text-lg font-semibold text-muted">{d.ui.emptyResults}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section aria-label={d.ui.eligibleTitle}>
        <h3 className="mb-3 flex items-center gap-2 text-xl font-extrabold text-good">
          <span className="grid h-8 min-w-8 place-items-center rounded-full bg-good px-2 text-sm text-bg">{g.eligible.length}</span>
          ✔ {d.ui.eligibleTitle}
        </h3>
        {g.eligible.length === 0 ? (
          <p className="rounded-2xl bg-surface p-4 font-medium text-muted">{d.ui.emptyResults}</p>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {g.eligible.map((e) => (
              <SchemeCard key={e.scheme.id} scheme={e.scheme} profile={profile} lang={lang} status="eligible" onOpen={onOpen} />
            ))}
          </div>
        )}
      </section>

      {g.maybe.length > 0 && (
        <section aria-label={d.ui.maybeTitle}>
          <h3 className="mb-3 flex items-center gap-2 text-xl font-extrabold text-warn">
            <span className="grid h-8 min-w-8 place-items-center rounded-full bg-warn px-2 text-sm text-bg">{g.maybe.length}</span>
            ? {d.ui.maybeTitle}
          </h3>
          <div className="grid gap-3 xl:grid-cols-2">
            {g.maybe.map((e) => (
              <SchemeCard key={e.scheme.id} scheme={e.scheme} profile={profile} lang={lang} status="maybe" unknown={e.unknown} onOpen={onOpen} onAnswer={onAnswer} />
            ))}
          </div>
        </section>
      )}

      <details className="rounded-2xl border-2 border-line bg-surface p-4">
        <summary className="cursor-pointer text-lg font-extrabold text-muted">
          ✘ {fmt(d.ui.notTitle)} ({g.not.length})
        </summary>
        <div className="mt-3 flex flex-wrap gap-2">
          {g.not.map((e) => (
            <button key={e.scheme.id} type="button" onClick={() => onOpen(e.scheme)} className="rounded-full bg-surface2 px-3 py-1 text-sm font-semibold hover:bg-line">
              {tr(e.scheme.name, lang)}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
