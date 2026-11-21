import { SCHEMES } from "../data/schemes";
import type { Ask, Criterion, Field, Profile, Scheme } from "./types";

export type Tri = "pass" | "fail" | "unknown";
export type Status = "eligible" | "maybe" | "not";

/* ------------------------------------------------------------------ */
/* Implicit answers: things we can safely infer without asking.         */
/* ------------------------------------------------------------------ */
export function inferProfile(p: Profile): Profile {
  const q: Profile = { ...p };
  const young = p.age && p.age[1] < 15;
  const old = p.age && p.age[0] > 55;
  if (p.gender === "male" || young) {
    if (q.pregnant === undefined) q.pregnant = false;
  }
  if (old && q.pregnant === undefined) q.pregnant = false;
  if (p.gender === "male" || young) {
    if (q.widow === undefined) q.widow = false;
  }
  if (young) {
    if (q.daughter === undefined) q.daughter = false;
    if (q.schoolChild === undefined) q.schoolChild = false;
  }
  return q;
}

/* ------------------------------------------------------------------ */
/* Criterion evaluation (three-valued logic)                            */
/* ------------------------------------------------------------------ */
export function evalCriterion(c: Criterion, p: Profile): Tri {
  if (c.f === "age") {
    const r = p.age;
    if (!r) return "unknown";
    const [lo, hi] = r;
    const min = c.min ?? -Infinity;
    const max = c.max ?? Infinity;
    if (lo >= min && hi <= max) return "pass";
    if (hi < min || lo > max) return "fail";
    return "unknown";
  }
  if (c.f === "income") {
    const r = p.income;
    if (!r) return "unknown";
    const [lo, hi] = r;
    const max = c.max ?? Infinity;
    if (hi <= max) return "pass";
    if (lo >= max) return "fail";
    return "unknown";
  }
  const v = (p as unknown as Record<string, unknown>)[c.f];
  if (v === undefined) return "unknown";
  if (c.is !== undefined) return v === c.is ? "pass" : "fail";
  if (c.in) return c.in.includes(String(v)) ? "pass" : "fail";
  return "unknown";
}

export function evalAll(cs: Criterion[], p: Profile): Tri {
  let unknown = false;
  for (const c of cs) {
    const r = evalCriterion(c, p);
    if (r === "fail") return "fail";
    if (r === "unknown") unknown = true;
  }
  return unknown ? "unknown" : "pass";
}

export function evalAny(groups: Criterion[][], p: Profile): Tri {
  let unknown = false;
  for (const g of groups) {
    const r = evalAll(g, p);
    if (r === "pass") return "pass";
    if (r === "unknown") unknown = true;
  }
  return unknown ? "unknown" : "fail";
}

/* ------------------------------------------------------------------ */
/* Scheme evaluation                                                    */
/* ------------------------------------------------------------------ */
export interface Evaluation {
  scheme: Scheme;
  status: Status;
  /** Fields whose answer would still change this result. */
  unknown: Field[];
  /** For age/income: thresholds that would settle the unknown criteria. */
  thresholds: { age: number[]; income: number[] };
}

function collectThresholds(c: Criterion, p: Profile, out: { age: number[]; income: number[] }) {
  if (c.f === "age" && p.age) {
    const [lo, hi] = p.age;
    // "age >= t" splits the interval when lo < t <= hi
    if (c.min !== undefined && c.min > lo && c.min <= hi) out.age.push(c.min);
    if (c.max !== undefined && c.max + 1 > lo && c.max + 1 <= hi) out.age.push(c.max + 1);
  }
  if (c.f === "income" && p.income && c.max !== undefined) {
    const [lo, hi] = p.income;
    if (c.max > lo && c.max < hi) out.income.push(c.max);
  }
}

export function evaluate(scheme: Scheme, pRaw: Profile): Evaluation {
  const p = inferProfile(pRaw);
  const unknown = new Set<Field>();
  const thresholds = { age: [] as number[], income: [] as number[] };
  let failed = false;

  for (const c of scheme.rules) {
    const r = evalCriterion(c, p);
    if (r === "fail") failed = true;
    if (r === "unknown") {
      unknown.add(c.f);
      collectThresholds(c, p, thresholds);
    }
  }

  if (!failed && scheme.any) {
    const r = evalAny(scheme.any, p);
    if (r === "fail") failed = true;
    if (r === "unknown") {
      for (const g of scheme.any) {
        if (evalAll(g, p) === "unknown") {
          for (const c of g) {
            if (evalCriterion(c, p) === "unknown") {
              unknown.add(c.f);
              collectThresholds(c, p, thresholds);
            }
          }
        }
      }
    }
  }

  if (failed) return { scheme, status: "not", unknown: [], thresholds };
  if (unknown.size === 0) return { scheme, status: "eligible", unknown: [], thresholds };
  return { scheme, status: "maybe", unknown: [...unknown], thresholds };
}

export function evaluateAll(p: Profile, schemes: Scheme[] = SCHEMES): Evaluation[] {
  return schemes.map((s) => evaluate(s, p));
}

export function byImportance(a: Evaluation, b: Evaluation): number {
  return (b.scheme.w ?? 1) - (a.scheme.w ?? 1);
}

export interface Grouped {
  eligible: Evaluation[];
  maybe: Evaluation[];
  not: Evaluation[];
}

export function group(p: Profile): Grouped {
  const all = evaluateAll(p);
  const sorted = (st: Status) => all.filter((e) => e.status === st).sort(byImportance);
  return { eligible: sorted("eligible"), maybe: sorted("maybe"), not: sorted("not") };
}

/* ------------------------------------------------------------------ */
/* Adaptive questioning                                                 */
/* ------------------------------------------------------------------ */
const PRIORITY: Field[] = [
  "occupation",
  "income",
  "state",
  "area",
  "studentLevel",
  "land",
  "bpl",
  "disability",
  "minority",
  "widow",
  "pregnant",
  "daughter",
  "schoolChild",
  "age",
  "gender",
  "category",
];

function askable(f: Field, p: Profile): boolean {
  switch (f) {
    case "studentLevel":
      return p.occupation === "student";
    case "land":
      return p.occupation === "farmer";
    case "widow":
      return p.gender !== "male" && (p.age ? p.age[1] >= 18 : true);
    case "pregnant":
      return p.gender !== "male" && (p.age ? p.age[1] >= 15 && p.age[0] <= 50 : true);
    case "daughter":
      return p.age ? p.age[1] >= 20 : true;
    case "schoolChild":
      return p.age ? p.age[1] >= 22 : true;
    default:
      return true;
  }
}

export interface NextPick {
  ask: Ask;
  score: number;
  /** Schemes whose result this question would help settle. */
  ids: string[];
}

/**
 * Pick the single most useful next question: the one that settles the most
 * (importance-weighted) undecided schemes. Returns null when no remaining
 * question is worth the caller's time.
 */
export function pickNext(pRaw: Profile, followups: number, relaxed = false): NextPick | null {
  const p = inferProfile(pRaw);
  const maybe = evaluateAll(p).filter((e) => e.status === "maybe");
  const scores = new Map<string, { score: number; ids: Set<string>; ask: Ask }>();

  const bump = (key: string, ask: Ask, e: Evaluation, share: number) => {
    const cur = scores.get(key) ?? { score: 0, ids: new Set<string>(), ask };
    cur.score += share;
    cur.ids.add(e.scheme.id);
    scores.set(key, cur);
  };

  for (const e of maybe) {
    const share = (e.scheme.w ?? 1) / e.unknown.length;
    for (const f of e.unknown) {
      if (p.skipped.includes(f)) continue;
      if (f === "age" || f === "income") {
        if (p[f]) {
          for (const t of e.thresholds[f]) {
            bump(`${f}:${t}`, { kind: f === "age" ? "ageT" : "incT", field: f, t }, e, share);
          }
        } else {
          bump(f, { kind: "field", field: f }, e, share);
        }
      } else if (p[f] === undefined && askable(f, p)) {
        bump(f, { kind: "field", field: f }, e, share);
      }
    }
  }

  // Questions that directly follow from the person's occupation (study level,
  // land) settle the most important schemes, so ask them first.
  for (const [key, v] of scores) if (key === "studentLevel" || key === "land") v.score *= 1.6;

  // Each extra question must pay off more than the last one.
  const min = relaxed ? 0.05 : followups >= 4 ? 3 : followups >= 2 ? 1.8 : 0.99;
  let best: { score: number; ids: Set<string>; ask: Ask } | null = null;
  const rank = (a: Ask) => {
    const i = PRIORITY.indexOf(a.field as Field);
    return i === -1 ? 99 : i;
  };
  for (const v of scores.values()) {
    if (v.score < min) continue;
    if (!best || v.score > best.score + 1e-9 || (Math.abs(v.score - best.score) < 1e-9 && rank(v.ask) < rank(best.ask))) {
      best = v;
    }
  }
  if (!best) return null;
  return { ask: best.ask, score: best.score, ids: [...best.ids] };
}
