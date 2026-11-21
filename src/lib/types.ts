// Shared types and constants for the Sakhi voice scheme agent.
// NOTE: files under src/lib and src/data use relative imports so they can be
// unit-tested outside Next.js (tsx).

export type Lang = "en" | "hi" | "te";

export const LANGS: { code: Lang; native: string; english: string; speech: string }[] = [
  { code: "en", native: "English", english: "English", speech: "en-IN" },
  { code: "hi", native: "हिन्दी", english: "Hindi", speech: "hi-IN" },
  { code: "te", native: "తెలుగు", english: "Telugu", speech: "te-IN" },
];

export const LANG_INDEX: Record<Lang, 0 | 1 | 2> = { en: 0, hi: 1, te: 2 };

/** A string in [English, Hindi, Telugu] order. */
export type L3 = readonly [string, string, string];
export const tr = (v: L3, lang: Lang): string => v[LANG_INDEX[lang]];

export type Gender = "female" | "male" | "other";
export type Category = "general" | "obc" | "sc" | "st";
export type Occupation =
  | "farmer"
  | "student"
  | "labour"
  | "artisan"
  | "business"
  | "salaried"
  | "jobseeker"
  | "homemaker"
  | "retired";
export type StateKey = "telangana" | "andhra" | "other";
export type Area = "rural" | "urban";
export type StudentLevel = "class1_8" | "class9_10" | "class11_12" | "college";

export type RangeField = "age" | "income";
export type EnumField = "gender" | "category" | "occupation" | "state" | "area" | "studentLevel";
export type BoolField =
  | "disability"
  | "bpl"
  | "minority"
  | "land"
  | "widow"
  | "pregnant"
  | "daughter"
  | "schoolChild";
export type Field = RangeField | EnumField | BoolField;

export const ENUM_FIELDS: EnumField[] = ["gender", "category", "occupation", "state", "area", "studentLevel"];
export const BOOL_FIELDS: BoolField[] = [
  "disability",
  "bpl",
  "minority",
  "land",
  "widow",
  "pregnant",
  "daughter",
  "schoolChild",
];
export const ALL_FIELDS: Field[] = ["age", "income", ...ENUM_FIELDS, ...BOOL_FIELDS];

export const OPTIONS: Record<EnumField, readonly string[]> = {
  gender: ["female", "male", "other"],
  category: ["general", "obc", "sc", "st"],
  occupation: [
    "farmer",
    "student",
    "labour",
    "artisan",
    "business",
    "salaried",
    "jobseeker",
    "homemaker",
    "retired",
  ],
  state: ["telangana", "andhra", "other"],
  area: ["rural", "urban"],
  studentLevel: ["class1_8", "class9_10", "class11_12", "college"],
};

/** Family income bands in lakh rupees per year: (lo, hi]. */
export const INCOME_BANDS: Record<string, [number, number]> = {
  b0: [0, 1],
  b1: [1, 2.5],
  b2: [2.5, 5],
  b3: [5, 8],
  b4: [8, 100],
};

export const AGE_BANDS: Record<string, [number, number]> = {
  a0: [0, 17],
  a1: [18, 25],
  a2: [26, 35],
  a3: [36, 45],
  a4: [46, 59],
  a5: [60, 100],
};

export const ICONS: Record<string, string> = {
  female: "👩",
  male: "👨",
  other: "🧑",
  general: "🙂",
  obc: "🧑‍🤝‍🧑",
  sc: "✊",
  st: "🌿",
  farmer: "🌾",
  student: "🎓",
  labour: "👷",
  artisan: "🧵",
  business: "🏪",
  salaried: "💼",
  jobseeker: "🔍",
  homemaker: "🏠",
  retired: "👴",
  telangana: "📍",
  andhra: "📍",
  rural: "🌳",
  urban: "🏙️",
  class1_8: "🎒",
  class9_10: "📘",
  class11_12: "📗",
  college: "🏫",
  yes: "✅",
  no: "❌",
  b0: "🪙",
  b1: "💵",
  b2: "💰",
  b3: "💰",
  b4: "🏦",
};

export interface Profile {
  name?: string;
  age?: [number, number];
  income?: [number, number];
  gender?: Gender;
  category?: Category;
  occupation?: Occupation;
  state?: StateKey;
  area?: Area;
  studentLevel?: StudentLevel;
  disability?: boolean;
  bpl?: boolean;
  minority?: boolean;
  land?: boolean;
  widow?: boolean;
  pregnant?: boolean;
  daughter?: boolean;
  schoolChild?: boolean;
  /** Fields the user said "I don't know" / "skip" for. Never asked again. */
  skipped: Field[];
}

export const emptyProfile = (): Profile => ({ skipped: [] });

export interface Criterion {
  f: Field;
  in?: string[];
  is?: boolean;
  min?: number;
  max?: number;
}

export type Sector =
  | "jobs"
  | "business"
  | "agri"
  | "edu"
  | "health"
  | "housing"
  | "social"
  | "women"
  | "disability"
  | "inclusion";

export const SECTORS: Sector[] = [
  "jobs",
  "business",
  "agri",
  "edu",
  "health",
  "housing",
  "social",
  "women",
  "disability",
  "inclusion",
];

export const SECTOR_ICONS: Record<Sector, string> = {
  jobs: "🛠️",
  business: "💼",
  agri: "🌾",
  edu: "🎓",
  health: "🩺",
  housing: "🏠",
  social: "🛡️",
  women: "👩‍👧",
  disability: "♿",
  inclusion: "🤝",
};

export type DocKey =
  | "aadhaar"
  | "bank"
  | "photo"
  | "income"
  | "caste"
  | "age"
  | "address"
  | "ration"
  | "land"
  | "disability"
  | "school"
  | "mobile"
  | "pregnancy"
  | "marriage"
  | "trade";

export type ApplyMode = "online" | "csc" | "panchayat" | "bank" | "school" | "hospital" | "office" | "visit";

export interface Scheme {
  id: string;
  cats: Sector[];
  name: L3;
  benefit: L3;
  /** ALL of these must hold. */
  rules: Criterion[];
  /** AND at least one of these alternative groups must hold. */
  any?: Criterion[][];
  /** Conditions we cannot ask about but the person should check. */
  note?: L3;
  docs: DocKey[];
  mode: ApplyMode;
  url?: string;
  /** Importance weight used for ranking and question selection. */
  w?: number;
  /** State-specific scheme. */
  state?: boolean;
}

export type AskKind = "name" | "field" | "ageT" | "incT" | "conflict";
export interface Ask {
  kind: AskKind;
  field?: Field;
  t?: number;
}
