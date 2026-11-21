import {
  ALL_FIELDS,
  BOOL_FIELDS,
  ENUM_FIELDS,
  OPTIONS,
  emptyProfile,
  type Field,
  type Profile,
} from "./types";

const range = (v: unknown): [number, number] | undefined => {
  if (typeof v === "number" && Number.isFinite(v)) return [v, v];
  if (Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === "number" && Number.isFinite(n))) {
    const [a, b] = v as [number, number];
    return [Math.min(a, b), Math.max(a, b)];
  }
  return undefined;
};

/** Turn untrusted JSON (API input) into a valid Profile. */
export function sanitizeProfile(input: unknown): Profile {
  const p = emptyProfile();
  if (!input || typeof input !== "object") return p;
  const src = input as Record<string, unknown>;
  const rec = p as unknown as Record<string, unknown>;
  if (typeof src.name === "string") p.name = src.name.slice(0, 60);
  const age = range(src.age);
  if (age) p.age = [Math.max(0, age[0]), Math.min(120, age[1])];
  const income = range(src.income);
  if (income) p.income = [Math.max(0, income[0]), Math.min(100, income[1])];
  for (const f of ENUM_FIELDS) {
    const v = src[f];
    if (typeof v === "string" && OPTIONS[f].includes(v)) rec[f] = v;
  }
  for (const f of BOOL_FIELDS) {
    if (typeof src[f] === "boolean") rec[f] = src[f];
  }
  if (Array.isArray(src.skipped)) {
    p.skipped = (src.skipped as unknown[]).filter((f): f is Field => ALL_FIELDS.includes(f as Field));
  }
  return p;
}

export function ageBand(age?: [number, number]): string | null {
  if (!age) return null;
  const mid = (age[0] + age[1]) / 2;
  if (mid < 18) return "0-17";
  if (mid < 36) return "18-35";
  if (mid < 60) return "36-59";
  return "60+";
}
