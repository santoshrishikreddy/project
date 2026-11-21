import { DOCS, SCHEMES } from "../data/schemes";
import { evalAll, evalAny, evalCriterion, group, type Tri } from "./engine";
import { DICT, fmt } from "./i18n";
import {
  AGE_BANDS,
  INCOME_BANDS,
  tr,
  type BoolField,
  type Criterion,
  type EnumField,
  type Field,
  type Lang,
  type Profile,
  type Scheme,
} from "./types";

const num = (n: number) => (Number.isInteger(n) ? String(n) : String(n));

/** Human label for one value of an enum field. */
export function optionLabel(field: EnumField, value: string, lang: Lang): string {
  const m = DICT[lang].opt[field] as Record<string, string>;
  return m[value] ?? value;
}

export function ageText(r: [number, number], lang: Lang): string {
  const d = DICT[lang];
  if (r[0] === r[1]) return fmt(d.crit.years, { n: r[0] });
  if (r[1] >= 100) return `${r[0]}+`;
  return `${r[0]}–${r[1]}`;
}

export function incomeText(r: [number, number], lang: Lang): string {
  const d = DICT[lang];
  // Exact band?
  for (const [k, b] of Object.entries(INCOME_BANDS)) {
    if (b[0] === r[0] && b[1] === r[1]) return d.opt.income[k as keyof typeof d.opt.income];
  }
  if (r[0] === r[1]) return fmt(d.crit.incomeUnit, { x: num(r[0]) });
  if (r[1] >= 100) return `₹${num(r[0])}+ lakh`;
  return `₹${num(r[0])}–${num(r[1])} lakh`;
}

export function criterionLabel(c: Criterion, lang: Lang): string {
  const d = DICT[lang];
  if (c.f === "age") {
    if (c.min !== undefined && c.max !== undefined) return fmt(d.crit.ageRange, { a: c.min, b: c.max });
    if (c.min !== undefined) return fmt(d.crit.ageMin, { a: c.min });
    return fmt(d.crit.ageMax, { b: c.max ?? 0 });
  }
  if (c.f === "income") return fmt(d.crit.incomeMax, { x: num(c.max ?? 0) });
  if (c.in) {
    const labels = c.in.map((v) => optionLabel(c.f as EnumField, v, lang)).join(" / ");
    return `${d.fieldLabel[c.f]}: ${labels}`;
  }
  return d.boolLabel[c.f as BoolField];
}

/** What the person told us, written in their language. Null when unknown. */
export function answerText(field: Field, p: Profile, lang: Lang): string | null {
  const d = DICT[lang];
  const v = (p as unknown as Record<string, unknown>)[field];
  if (v === undefined) return null;
  if (field === "age") return ageText(v as [number, number], lang);
  if (field === "income") return incomeText(v as [number, number], lang);
  if (typeof v === "boolean") return v ? d.ui.yes : d.ui.no;
  return optionLabel(field as EnumField, String(v), lang);
}

export function valueText(field: Field, value: unknown, lang: Lang): string {
  const tmp = { skipped: [], [field]: value } as unknown as Profile;
  return answerText(field, tmp, lang) ?? String(value);
}

export interface Row {
  label: string;
  res: Tri;
  answer: string | null;
  fields: Field[];
  any?: boolean;
}

export function explainRows(s: Scheme, p: Profile, lang: Lang): Row[] {
  const d = DICT[lang];
  const rows: Row[] = [];
  for (const c of s.rules) {
    rows.push({
      label: criterionLabel(c, lang),
      res: evalCriterion(c, p),
      answer: answerText(c.f, p, lang),
      fields: [c.f],
    });
  }
  if (s.any) {
    const alts = s.any.map((g) => g.map((c) => criterionLabel(c, lang)).join(" + "));
    const fields = [...new Set(s.any.flat().map((c) => c.f))];
    const answers = fields.map((f) => answerText(f, p, lang)).filter((x): x is string => !!x);
    rows.push({
      label: `${d.ui.anyOne}: ${alts.join("  |  ")}`,
      res: evalAny(s.any, p),
      answer: answers.length ? answers.join(", ") : null,
      fields,
      any: true,
    });
  }
  return rows;
}

/** One short sentence explaining why the person qualifies. */
export function reasonsSentence(s: Scheme, p: Profile, lang: Lang): string {
  const d = DICT[lang];
  const parts: string[] = [];
  for (const c of s.rules) {
    if (evalCriterion(c, p) === "pass") {
      if (c.f === "age" && p.age) parts.push(`${criterionLabel(c, lang)} (${ageText(p.age, lang)})`);
      else parts.push(criterionLabel(c, lang));
    }
  }
  if (s.any && evalAny(s.any, p) === "pass") {
    const g = s.any.find((x) => evalAll(x, p) === "pass");
    if (g) parts.push(g.map((c) => criterionLabel(c, lang)).join(" + "));
  }
  if (parts.length === 0) return DICT[lang].ui.all;
  return parts.slice(0, 4).join(d.say.reasonJoin);
}

export function docsText(s: Scheme, lang: Lang): string {
  if (s.docs.length === 0) return DICT[lang].doc.none;
  return s.docs.map((k) => tr(DOCS[k], lang)).join(", ");
}

export function guideSteps(s: Scheme, lang: Lang): string[] {
  const d = DICT[lang];
  if (s.mode === "visit") return [d.doc.visit];
  return [fmt(d.doc.step1, { docs: docsText(s, lang) }), d.doc[s.mode], d.doc.step3, d.doc.step4];
}

export function guideSpeech(s: Scheme, lang: Lang): string {
  const d = DICT[lang];
  if (s.mode === "visit") return `${tr(s.name, lang)}. ${tr(s.benefit, lang)}. ${d.doc.visit}`;
  return fmt(d.say.guide, {
    name: tr(s.name, lang),
    step1: fmt(d.doc.step1, { docs: docsText(s, lang) }),
    mode: d.doc[s.mode],
    step3: d.doc.step3,
  });
}

export function schemeSpeech(s: Scheme, p: Profile, lang: Lang): string {
  return fmt(DICT[lang].say.scheme, {
    name: tr(s.name, lang),
    benefit: tr(s.benefit, lang),
    reasons: reasonsSentence(s, p, lang),
  });
}

/** The spoken summary shown/said when the agent is done asking. */
export function summaryText(p: Profile, lang: Lang, moreQuestions = 0): string {
  const d = DICT[lang];
  const g = group(p);
  const name = p.name || "";
  const parts: string[] = [];
  if (g.eligible.length > 0) {
    const names = g.eligible
      .slice(0, 3)
      .map((e) => tr(e.scheme.name, lang))
      .join(", ");
    parts.push(fmt(d.say.res.summary, { name, n: g.eligible.length, names }).replace(/^,\s*/, ""));
  } else {
    parts.push(fmt(d.say.res.none, { name }).replace(/^,\s*/, ""));
  }
  if (g.maybe.length > 0) parts.push(fmt(d.say.res.maybe, { m: g.maybe.length }));
  if (moreQuestions > 0) parts.push(fmt(d.say.res.more, { n: moreQuestions }));
  parts.push(d.say.hintDone);
  return parts.join(" ");
}

/** Clean text for speech synthesis: say rupees properly, spell abbreviations, drop symbols. */
export function ttsClean(text: string, lang: Lang): string {
  const rupees = DICT[lang].rupees;
  let t = text
    .replace(/₹\s?([\d,.]+)/g, `$1 ${rupees}`)
    .replace(/[•→✔✘✓✗|]/g, " ")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s{2,}/g, " ");
  if (lang === "en") {
    t = t
      .replace(/\bOBC\b/g, "O B C")
      .replace(/\bSC\b/g, "S C")
      .replace(/\bST\b/g, "S T")
      .replace(/\bBPL\b/g, "B P L")
      .replace(/\bEWS\b/g, "E W S")
      .replace(/\bPM\b/g, "P M")
      .replace(/\bUDID\b/g, "U D I D")
      .replace(/\bCSC\b/g, "C S C");
  }
  return t.trim();
}

export function schemeTopNames(ids: string[], lang: Lang, n = 3): string {
  return ids
    .map((id) => SCHEMES.find((s) => s.id === id))
    .filter((s): s is Scheme => !!s)
    .sort((a, b) => (b.w ?? 1) - (a.w ?? 1))
    .slice(0, n)
    .map((s) => tr(s.name, lang))
    .join(", ");
}

export { AGE_BANDS };
