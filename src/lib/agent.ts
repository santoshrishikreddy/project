import { evaluateAll, pickNext } from "./engine";
import { ageText, optionLabel, summaryText, valueText } from "./explain";
import { DICT, fmt } from "./i18n";
import { parse, type Expected, type Parsed } from "./nlu";
import {
  BOOL_FIELDS,
  emptyProfile,
  type Ask,
  type EnumField,
  type Field,
  type Lang,
  type Profile,
} from "./types";

/* ------------------------------------------------------------------ */
/* Conversation state machine (pure: no speech, no React).              */
/* ------------------------------------------------------------------ */

export interface Conflict {
  type: "changed" | "ambiguous" | "implausible";
  field?: Field;
  a?: unknown;
  b?: unknown;
  code?: string;
  fields?: Field[];
}

export interface AgentState {
  profile: Profile;
  ask: Ask | null;
  /** Number of distinct questions the caller has been asked (incl. clarifications). */
  asked: number;
  followups: number;
  cap: number;
  relaxed: boolean;
  nameDone: boolean;
  conflict: Conflict | null;
  conflictsSeen: number;
  retries: number;
  dismissed: string[];
  editing: Field | null;
  done: boolean;
  why: { ids: string[] } | null;
  moreCount: number;
}

export type Input =
  | { type: "text"; text: string }
  | { type: "value"; field: Field | "name"; value: unknown }
  | { type: "resolve"; index: number }
  | { type: "edit"; field: Field | "name" }
  | { type: "skip" }
  | { type: "more" }
  | { type: "finish" }
  | { type: "restart" };

export interface Output {
  state: AgentState;
  say: string[];
  switchLang?: Lang;
}

export const MAX_FOLLOWUPS = 6;

function initial(): AgentState {
  return {
    profile: emptyProfile(),
    ask: null,
    asked: 0,
    followups: 0,
    cap: MAX_FOLLOWUPS,
    relaxed: false,
    nameDone: false,
    conflict: null,
    conflictsSeen: 0,
    retries: 0,
    dismissed: [],
    editing: null,
    done: false,
    why: null,
    moreCount: 0,
  };
}

export function start(lang: Lang): Output {
  const st = initial();
  st.ask = { kind: "name" };
  st.asked = 1;
  const d = DICT[lang].say;
  return { state: st, say: [d.greet, d.q.name] };
}

/* ------------------------------ prompts ------------------------------ */

export function conflictText(c: Conflict, p: Profile, lang: Lang): string {
  const d = DICT[lang].say.conflict;
  if (c.type === "changed" && c.field) {
    return fmt(d.changed, { a: valueText(c.field, c.a, lang), b: valueText(c.field, c.b, lang) });
  }
  if (c.type === "ambiguous" && c.field) {
    return fmt(d.ambiguous, { a: valueText(c.field, c.a, lang), b: valueText(c.field, c.b, lang) });
  }
  const age = p.age ? ageText(p.age, lang) : "";
  const occ = p.occupation ? optionLabel("occupation", p.occupation, lang) : "";
  const lvl = p.studentLevel ? optionLabel("studentLevel", p.studentLevel, lang) : "";
  switch (c.code) {
    case "ageOcc":
      return fmt(d.ageOcc, { a: age, b: occ });
    case "ageStudent":
      return fmt(d.ageStudent, { a: age });
    case "level":
      return fmt(d.level, { a: age, b: lvl });
    case "male":
      return d.male;
    case "bplIncome":
      return d.bplIncome;
    case "preg":
      return fmt(d.preg, { a: age });
    case "widow":
      return fmt(d.widow, { a: age });
    case "daughter":
      return fmt(d.daughter, { a: age });
    default:
      return "";
  }
}

export function prompt(st: AgentState, lang: Lang): string {
  if (st.conflict) return conflictText(st.conflict, st.profile, lang);
  const q = DICT[lang].say.q;
  const a = st.ask;
  if (!a) return "";
  if (a.kind === "name") return q.name;
  if (a.kind === "ageT") return fmt(q.ageT, { t: a.t ?? 0 });
  if (a.kind === "incT") return fmt(q.incT, { t: a.t ?? 0 });
  if (a.kind === "field" && a.field) return q[a.field as keyof typeof q] as string;
  return "";
}

export function expectedOf(st: AgentState): Expected {
  const a = st.ask;
  if (!a) return null;
  if (a.kind === "name") return "name";
  if (a.kind === "ageT" || a.kind === "incT") return "yn";
  return a.field ?? null;
}

/* --------------------------- contradictions --------------------------- */

interface Imp {
  code: string;
  fields: Field[];
}

export function findImplausible(p: Profile, dismissed: string[]): Imp | null {
  const age = p.age;
  const checks: (Imp | null)[] = [
    age && age[1] < 15 && p.occupation && p.occupation !== "student" ? { code: "ageOcc", fields: ["age", "occupation"] } : null,
    age && age[1] < 18 && (p.occupation === "salaried" || p.occupation === "retired") ? { code: "ageOcc", fields: ["age", "occupation"] } : null,
    age && age[1] < 40 && p.occupation === "retired" ? { code: "ageOcc", fields: ["age", "occupation"] } : null,
    age && age[0] >= 55 && p.occupation === "student" ? { code: "ageStudent", fields: ["age", "occupation"] } : null,
    age && p.studentLevel === "class1_8" && age[0] > 18 ? { code: "level", fields: ["age", "studentLevel"] } : null,
    age && p.studentLevel === "class9_10" && age[0] > 22 ? { code: "level", fields: ["age", "studentLevel"] } : null,
    age && p.studentLevel === "class11_12" && age[0] > 25 ? { code: "level", fields: ["age", "studentLevel"] } : null,
    age && p.studentLevel === "college" && age[1] < 15 ? { code: "level", fields: ["age", "studentLevel"] } : null,
    p.gender === "male" && p.pregnant === true ? { code: "male", fields: ["gender", "pregnant"] } : null,
    p.bpl === true && p.income && p.income[0] >= 8 ? { code: "bplIncome", fields: ["bpl", "income"] } : null,
    p.pregnant === true && age && (age[1] < 14 || age[0] > 55) ? { code: "preg", fields: ["age", "pregnant"] } : null,
    p.widow === true && age && age[1] < 18 ? { code: "widow", fields: ["age", "widow"] } : null,
    p.daughter === true && age && age[1] < 14 ? { code: "daughter", fields: ["age", "daughter"] } : null,
  ];
  for (const c of checks) if (c && !dismissed.includes(c.code)) return c;
  return null;
}

/* ------------------------------- helpers ------------------------------- */

const isRange = (f: Field) => f === "age" || f === "income";

function compatible(f: Field, a: unknown, b: unknown): boolean {
  if (isRange(f)) {
    const x = a as [number, number];
    const y = b as [number, number];
    return x[0] <= y[1] && y[0] <= x[1];
  }
  return a === b;
}

function setField(p: Profile, f: Field, v: unknown, replace: boolean): void {
  const rec = p as unknown as Record<string, unknown>;
  if (isRange(f) && !replace && rec[f]) {
    const x = rec[f] as [number, number];
    const y = v as [number, number];
    rec[f] = [Math.max(x[0], y[0]), Math.min(x[1], y[1])];
  } else {
    rec[f] = v;
  }
  p.skipped = p.skipped.filter((s) => s !== f);
}

/**
 * Merge parsed slots into the profile. Facts that do not clash are applied
 * immediately; the first clashing fact is returned as a conflict to clarify.
 */
function applySlots(st: AgentState, parsed: Parsed): Conflict | null {
  const p = st.profile;
  const rec = p as unknown as Record<string, unknown>;
  let conflict: Conflict | null = null;
  if (parsed.ambiguous) {
    const { field, values } = parsed.ambiguous;
    conflict = { type: "ambiguous", field, a: values[0], b: values[1] };
  }
  for (const [f, v] of Object.entries(parsed.slots) as [Field, unknown][]) {
    if (conflict && conflict.field === f) continue;
    const cur = rec[f];
    const replacing = st.editing === f;
    if (cur !== undefined && !replacing && !compatible(f, cur, v)) {
      if (!conflict) conflict = { type: "changed", field: f, a: cur, b: v };
      continue;
    }
    setField(p, f, v, replacing);
  }
  return conflict;
}

function raiseConflict(st: AgentState, c: Conflict, lang: Lang, say: string[]): Output {
  st.conflict = c;
  st.conflictsSeen += 1;
  st.asked += 1; // a clarifying question is still a question
  st.retries = 0;
  say.push(conflictText(c, st.profile, lang));
  return { state: st, say };
}

function distinctUnknown(p: Profile): number {
  const set = new Set<Field>();
  for (const e of evaluateAll(p)) {
    if (e.status === "maybe") e.unknown.forEach((f) => !p.skipped.includes(f) && set.add(f));
  }
  return Math.min(set.size, 4);
}

function finish(st: AgentState, lang: Lang, say: string[]): Output {
  st.ask = null;
  st.done = true;
  st.why = null;
  st.editing = null;
  const canAsk = pickNext(st.profile, st.followups, true) ? distinctUnknown(st.profile) : 0;
  st.moreCount = canAsk;
  say.push(summaryText(st.profile, lang, canAsk));
  return { state: st, say };
}

const sameAsk = (a: Ask | null | undefined, b: Ask | null): boolean =>
  !!a && !!b && a.kind === b.kind && a.field === b.field && a.t === b.t;

function advance(st: AgentState, lang: Lang, say: string[], prev?: Ask | null): Output {
  const p = st.profile;
  st.editing = null;
  st.conflict = null;
  let next: Ask | null = null;
  let why: AgentState["why"] = null;
  let adaptive = false;

  if (!st.nameDone) next = { kind: "name" };
  else if (!p.age && !p.skipped.includes("age")) next = { kind: "field", field: "age" };
  else if (!p.gender && !p.skipped.includes("gender")) next = { kind: "field", field: "gender" };
  else if (!p.category && !p.skipped.includes("category")) next = { kind: "field", field: "category" };
  else if (st.followups < st.cap || (prev && st.why)) {
    const pick = pickNext(p, st.followups, st.relaxed);
    if (pick) {
      next = pick.ask;
      why = { ids: pick.ids };
      adaptive = true;
    }
  }

  if (next) {
    // Re-asking the very same question (caller only volunteered other facts)
    // is not a new question.
    if (!sameAsk(prev, next)) {
      st.asked += 1;
      st.retries = 0;
      if (adaptive) st.followups += 1;
    }
    st.ask = next;
    st.why = why;
    st.done = false;
    say.push(prompt(st, lang));
    return { state: st, say };
  }
  return finish(st, lang, say);
}

function afterProfileChange(st: AgentState, lang: Lang, say: string[]): Output {
  const imp = findImplausible(st.profile, st.dismissed);
  if (imp) return raiseConflict(st, { type: "implausible", code: imp.code, fields: imp.fields }, lang, say);
  return advance(st, lang, say);
}

function skipCurrent(st: AgentState, lang: Lang, say: string[]): Output {
  const a = st.ask;
  say.push(DICT[lang].say.okSkip);
  if (!a) return advance(st, lang, say);
  if (a.kind === "name") st.nameDone = true;
  else if (a.field && !st.profile.skipped.includes(a.field)) st.profile.skipped.push(a.field);
  return advance(st, lang, say);
}

function applyThreshold(st: AgentState, yn: boolean): void {
  const a = st.ask;
  const p = st.profile;
  if (!a || a.t === undefined) return;
  const t = a.t;
  if (a.kind === "ageT" && p.age) {
    const [lo, hi] = p.age;
    p.age = yn ? [Math.max(lo, t), hi] : [lo, Math.min(hi, t - 1)];
  } else if (a.kind === "incT" && p.income) {
    const [lo, hi] = p.income;
    p.income = yn ? [Math.max(lo, t), hi] : [lo, Math.min(hi, t)];
  }
}

function resolveConflict(st: AgentState, index: number, lang: Lang, say: string[]): Output {
  const c = st.conflict;
  if (!c) return advance(st, lang, say);
  st.conflict = null;
  if (c.type === "implausible") {
    const fields = c.fields ?? [];
    if (index >= fields.length) {
      if (c.code) st.dismissed.push(c.code);
      return advance(st, lang, say);
    }
    const f = fields[index];
    return startEdit(st, f, lang, say);
  }
  const f = c.field as Field;
  const v = index === 0 ? c.a : c.b;
  st.editing = f;
  setField(st.profile, f, v, true);
  st.editing = null;
  return afterProfileChange(st, lang, say);
}

function startEdit(st: AgentState, f: Field | "name", lang: Lang, say: string[]): Output {
  st.ask = f === "name" ? { kind: "name" } : { kind: "field", field: f };
  st.editing = f === "name" ? null : f;
  st.asked += 1;
  st.retries = 0;
  st.done = false;
  st.conflict = null;
  st.why = null;
  say.push(prompt(st, lang));
  return { state: st, say };
}

/* ------------------------------- main step ------------------------------- */

export function step(prev: AgentState, input: Input, lang: Lang): Output {
  const st: AgentState = structuredClone(prev);
  const say: string[] = [];
  const d = DICT[lang].say;

  switch (input.type) {
    case "restart":
      return start(lang);
    case "more":
      st.cap = st.followups + 3;
      st.relaxed = true;
      st.done = false;
      return advance(st, lang, say);
    case "finish":
      st.conflict = null;
      return finish(st, lang, say);
    case "edit":
      return startEdit(st, input.field, lang, say);
    case "resolve":
      return resolveConflict(st, input.index, lang, say);
    case "skip":
      return skipCurrent(st, lang, say);
    case "value":
      return applyValue(st, input.field, input.value, lang, say);
    case "text":
      break;
  }

  // ---------------------------- free text ----------------------------
  const text = input.text;

  // Answering a clarification by voice
  if (st.conflict && (st.conflict.type === "changed" || st.conflict.type === "ambiguous") && st.conflict.field) {
    const c = st.conflict;
    const f = c.field as Field;
    const pr = parse(text, lang, f);
    const v = pr.slots[f];
    if (v !== undefined) {
      if (compatible(f, c.a, v)) return resolveConflict(st, 0, lang, say);
      if (compatible(f, c.b, v)) return resolveConflict(st, 1, lang, say);
    }
    if (/first|पहला|पहले|మొదటి/u.test(text.toLowerCase())) return resolveConflict(st, 0, lang, say);
    if (/second|दूसरा|दूसरे|రెండవ|రెండో/u.test(text.toLowerCase())) return resolveConflict(st, 1, lang, say);
    say.push(d.notUnderstood, prompt(st, lang));
    return { state: st, say };
  }
  if (st.conflict) {
    const pr = parse(text, lang, "yn");
    if (pr.yn === true) return resolveConflict(st, (st.conflict.fields ?? []).length, lang, say);
    say.push(d.notUnderstood, prompt(st, lang));
    return { state: st, say };
  }

  const exp = expectedOf(st);
  const parsed = parse(text, lang, exp);

  if (parsed.intent === "switch" && parsed.switchTo) {
    const nl = parsed.switchTo;
    say.push(DICT[nl].say.langSwitched);
    const pr = prompt(st, nl);
    if (pr) say.push(pr);
    return { state: st, say, switchLang: nl };
  }
  if (parsed.intent === "restart") return start(lang);
  if (parsed.intent === "more") return step(st, { type: "more" }, lang);
  if (parsed.intent === "repeat") {
    const pr = prompt(st, lang);
    say.push(pr || d.hintDone);
    return { state: st, say };
  }
  if (parsed.intent === "results" && st.ask && st.ask.kind !== "name") {
    st.conflict = null;
    return finish(st, lang, say);
  }
  if (!st.ask) {
    // Already finished: gently point to what the caller can do next.
    say.push(d.hintDone);
    return { state: st, say };
  }

  // Merge everything we learned (the caller may have volunteered extra facts).
  const conflict = applySlots(st, parsed);
  if (conflict) return raiseConflict(st, conflict, lang, say);

  const a = st.ask;
  const p = st.profile;
  const rec = p as unknown as Record<string, unknown>;

  if (a.kind === "name") {
    if (parsed.name) {
      p.name = parsed.name;
      st.nameDone = true;
      say.push(fmt(d.niceName, { name: parsed.name }));
      return afterProfileChange(st, lang, say);
    }
    if (parsed.intent === "skip") {
      st.nameDone = true;
      say.push(d.okSkip);
      return afterProfileChange(st, lang, say);
    }
    return retry(st, lang, say, Object.keys(parsed.slots).length > 0);
  }

  if (a.kind === "ageT" || a.kind === "incT") {
    if (parsed.yn !== undefined) {
      applyThreshold(st, parsed.yn);
      return afterProfileChange(st, lang, say);
    }
    if (parsed.intent === "unknown" || parsed.intent === "skip") {
      const f = a.field as Field;
      if (!p.skipped.includes(f)) p.skipped.push(f);
      say.push(d.okSkip);
      return afterProfileChange(st, lang, say);
    }
    return retry(st, lang, say, Object.keys(parsed.slots).length > 0);
  }

  // a.kind === "field"
  const f = a.field as Field;
  if (rec[f] !== undefined && parsed.slots[f] !== undefined) {
    return afterProfileChange(st, lang, say);
  }
  if (f === "age" && (parsed.vagueAge || parsed.intent === "unknown")) {
    st.retries += 1;
    if (st.retries >= 2) {
      if (!p.skipped.includes("age")) p.skipped.push("age");
      say.push(d.okSkip);
      return afterProfileChange(st, lang, say);
    }
    say.push(d.ageVague);
    return { state: st, say };
  }
  if (parsed.intent === "unknown" || parsed.intent === "skip") {
    return skipCurrent(st, lang, say);
  }
  return retry(st, lang, say, Object.keys(parsed.slots).length > 0);
}

function retry(st: AgentState, lang: Lang, say: string[], volunteered = false): Output {
  const d = DICT[lang].say;
  if (volunteered) {
    // The caller gave useful facts, just not the one we asked for. Check them,
    // then carry on without scolding.
    const imp = findImplausible(st.profile, st.dismissed);
    if (imp) return raiseConflict(st, { type: "implausible", code: imp.code, fields: imp.fields }, lang, say);
    return advance(st, lang, say, st.ask);
  }
  st.retries += 1;
  if (st.retries >= 3) {
    say.push(d.giveUp);
    const a = st.ask;
    if (a?.kind === "name") st.nameDone = true;
    else if (a?.field && !st.profile.skipped.includes(a.field)) st.profile.skipped.push(a.field);
    return advance(st, lang, say);
  }
  say.push(d.notUnderstood, prompt(st, lang));
  return { state: st, say };
}

function applyValue(st: AgentState, field: Field | "name", value: unknown, lang: Lang, say: string[]): Output {
  const a = st.ask;
  const p = st.profile;
  if (field === "name") {
    const n = String(value).trim();
    if (n) {
      p.name = n;
      say.push(fmt(DICT[lang].say.niceName, { name: n }));
    }
    st.nameDone = true;
    return afterProfileChange(st, lang, say);
  }
  if ((a?.kind === "ageT" || a?.kind === "incT") && typeof value === "boolean") {
    applyThreshold(st, value);
    return afterProfileChange(st, lang, say);
  }
  setField(p, field, value, true);
  if (BOOL_FIELDS.includes(field as never) || (field as EnumField)) st.editing = null;
  return afterProfileChange(st, lang, say);
}
