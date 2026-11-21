"use client";

import { useState } from "react";
import type { AgentState } from "@/lib/agent";
import { ageText, optionLabel, valueText } from "@/lib/explain";
import { DICT } from "@/lib/i18n";
import {
  AGE_BANDS,
  ICONS,
  INCOME_BANDS,
  OPTIONS,
  BOOL_FIELDS,
  type EnumField,
  type Field,
  type Lang,
} from "@/lib/types";

interface Props {
  st: AgentState;
  lang: Lang;
  onValue: (field: Field | "name", value: unknown) => void;
  onSkip: () => void;
  onResolve: (index: number) => void;
  onMore: () => void;
}

function Choice({ icon, label, onClick, tone = "" }: { icon?: string; label: string; onClick: () => void; tone?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-line bg-surface px-2 py-2 text-center font-bold leading-tight transition hover:border-primary hover:bg-surface2 active:scale-[0.97] ${tone}`}
    >
      {icon && <span className="text-3xl leading-none" aria-hidden="true">{icon}</span>}
      <span className="text-[0.95rem]">{label}</span>
    </button>
  );
}

function YesNo({ lang, onPick }: { lang: Lang; onPick: (v: boolean) => void }) {
  const d = DICT[lang];
  return (
    <div className="grid grid-cols-2 gap-3">
      <button type="button" onClick={() => onPick(true)} className="flex min-h-[5.5rem] flex-col items-center justify-center gap-1 rounded-2xl border-4 border-good bg-good-bg text-xl font-extrabold text-good active:scale-95">
        <span className="text-4xl" aria-hidden="true">👍</span>
        {d.ui.yes}
      </button>
      <button type="button" onClick={() => onPick(false)} className="flex min-h-[5.5rem] flex-col items-center justify-center gap-1 rounded-2xl border-4 border-bad bg-bad-bg text-xl font-extrabold text-bad active:scale-95">
        <span className="text-4xl" aria-hidden="true">👎</span>
        {d.ui.no}
      </button>
    </div>
  );
}

function AgeInput({ lang, onValue }: { lang: Lang; onValue: Props["onValue"] }) {
  const d = DICT[lang];
  const [v, setV] = useState("");
  const submit = () => {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0 && n <= 120) onValue("age", [Math.round(n), Math.round(n)]);
  };
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={120}
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={d.ui.ageLabel}
          aria-label={d.ui.ageLabel}
          className="min-w-0 flex-1 rounded-2xl border-2 border-line bg-surface px-4 py-3 text-2xl font-extrabold"
        />
        <button type="button" onClick={submit} className="rounded-2xl bg-primary px-6 text-xl font-extrabold text-primary-fg active:scale-95">
          {d.ui.ok}
        </button>
      </div>
      <p className="text-sm font-semibold text-muted">{d.ui.ageHint}</p>
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(AGE_BANDS).map(([k, r]) => (
          <Choice key={k} label={d.opt.age[k as keyof typeof d.opt.age]} onClick={() => onValue("age", r)} />
        ))}
      </div>
    </div>
  );
}

function NameInput({ lang, onValue }: { lang: Lang; onValue: Props["onValue"] }) {
  const d = DICT[lang];
  const [v, setV] = useState("");
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && v.trim() && onValue("name", v.trim())}
        placeholder={d.ui.nameLabel}
        aria-label={d.ui.nameLabel}
        className="min-w-0 flex-1 rounded-2xl border-2 border-line bg-surface px-4 py-3 text-xl font-bold"
      />
      <button type="button" onClick={() => v.trim() && onValue("name", v.trim())} className="rounded-2xl bg-primary px-6 text-xl font-extrabold text-primary-fg active:scale-95">
        {d.ui.ok}
      </button>
    </div>
  );
}

export default function AnswerPad({ st, lang, onValue, onSkip, onResolve, onMore }: Props) {
  const d = DICT[lang];

  /* ---------------- clarification (contradiction) ---------------- */
  if (st.conflict) {
    const c = st.conflict;
    return (
      <div className="anim-pop space-y-3 rounded-2xl border-2 border-warn bg-warn-bg p-3">
        <p className="text-base font-extrabold text-warn">⚠️ {d.ui.conflictTitle}</p>
        {c.type === "implausible" ? (
          <div className="grid gap-2">
            {(c.fields ?? []).map((f, i) => (
              <Choice
                key={f}
                icon="✏️"
                label={`${d.ui.changeField.replace("{f}", d.fieldLabel[f])} (${valueText(f, (st.profile as unknown as Record<string, unknown>)[f], lang)})`}
                onClick={() => onResolve(i)}
              />
            ))}
            <Choice icon="✅" label={d.ui.keepAsIs} onClick={() => onResolve((c.fields ?? []).length)} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Choice icon="1️⃣" label={valueText(c.field as Field, c.a, lang)} onClick={() => onResolve(0)} />
            <Choice icon="2️⃣" label={valueText(c.field as Field, c.b, lang)} onClick={() => onResolve(1)} />
          </div>
        )}
      </div>
    );
  }

  /* ---------------- finished: offer more questions ---------------- */
  if (!st.ask) {
    return st.moreCount > 0 ? (
      <button type="button" onClick={onMore} className="w-full rounded-2xl border-2 border-primary bg-surface2 px-4 py-3 text-lg font-extrabold text-primary hover:bg-surface">
        ➕ {d.ui.moreQuestions}
      </button>
    ) : null;
  }

  const a = st.ask;
  let body: React.ReactNode = null;

  if (a.kind === "name") {
    body = <NameInput lang={lang} onValue={onValue} />;
  } else if (a.kind === "ageT" || a.kind === "incT") {
    body = <YesNo lang={lang} onPick={(v) => onValue(a.field as Field, v)} />;
  } else if (a.field === "age") {
    body = <AgeInput lang={lang} onValue={onValue} />;
  } else if (a.field === "income") {
    body = (
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(INCOME_BANDS).map(([k, r]) => (
          <Choice key={k} icon={ICONS[k]} label={d.opt.income[k as keyof typeof d.opt.income]} onClick={() => onValue("income", r)} />
        ))}
      </div>
    );
  } else if (a.field && BOOL_FIELDS.includes(a.field as never)) {
    body = <YesNo lang={lang} onPick={(v) => onValue(a.field as Field, v)} />;
  } else if (a.field) {
    const f = a.field as EnumField;
    const cols = f === "occupation" || f === "studentLevel" ? "grid-cols-3" : f === "gender" ? "grid-cols-3" : "grid-cols-2";
    body = (
      <div className={`grid gap-2 ${cols}`}>
        {OPTIONS[f].map((o) => (
          <Choice key={o} icon={ICONS[o]} label={optionLabel(f, o, lang)} onClick={() => onValue(f, o)} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold uppercase tracking-wide text-muted">👆 {d.ui.tapPictures}</p>
      {body}
      <button type="button" onClick={onSkip} className="w-full rounded-xl border-2 border-dashed border-line py-2 text-base font-bold text-muted hover:bg-surface2">
        🤷 {d.ui.skip}
      </button>
    </div>
  );
}

export { ageText };
