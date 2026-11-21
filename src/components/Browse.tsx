"use client";

import { useMemo, useState } from "react";
import { SCHEMES } from "@/data/schemes";
import { evaluate } from "@/lib/engine";
import { DICT, fmt } from "@/lib/i18n";
import { SECTORS, SECTOR_ICONS, type Category, type Gender, type Lang, type Profile, type Scheme, type Sector } from "@/lib/types";
import SchemeCard from "./SchemeCard";

type AgeGroup = "child" | "youth" | "adult" | "senior";
type Community = Category | "minority" | "disability";
type SectorFilter = Sector | "work";

const AGE_RANGES: Record<AgeGroup, [number, number]> = {
  child: [0, 17],
  youth: [18, 35],
  adult: [36, 59],
  senior: [60, 100],
};

interface Filters {
  age: AgeGroup | null;
  gender: Gender | null;
  community: Community | null;
  sector: SectorFilter | null;
  q: string;
}

const NONE: Filters = { age: null, gender: null, community: null, sector: null, q: "" };

/** Quick "jobs & livelihood for every group" shortcuts. */
const GROUPS: { id: string; icon: string; apply: Partial<Filters> }[] = [
  { id: "women", icon: "👩", apply: { gender: "female" } },
  { id: "youth", icon: "🧑‍🎓", apply: { age: "youth" } },
  { id: "sc", icon: "✊", apply: { community: "sc" } },
  { id: "st", icon: "🌿", apply: { community: "st" } },
  { id: "obc", icon: "🧑‍🤝‍🧑", apply: { community: "obc" } },
  { id: "minority", icon: "🕊️", apply: { community: "minority" } },
  { id: "disability", icon: "♿", apply: { community: "disability" } },
  { id: "trans", icon: "🏳️‍⚧️", apply: { gender: "other" } },
  { id: "farmer", icon: "🌾", apply: { sector: "agri" } },
  { id: "senior", icon: "👴", apply: { age: "senior" } },
];

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border-2 px-3.5 py-1.5 text-sm font-bold transition ${
        active ? "border-primary bg-primary text-primary-fg" : "border-line bg-surface hover:bg-surface2"
      }`}
    >
      {children}
    </button>
  );
}

export default function Browse({ profile, lang, started, onOpen }: { profile: Profile; lang: Lang; started: boolean; onOpen: (s: Scheme) => void }) {
  const d = DICT[lang];
  const [f, setF] = useState<Filters>(NONE);
  const set = (p: Partial<Filters>) => setF((prev) => ({ ...prev, ...p }));
  const toggle = <K extends keyof Filters>(k: K, v: Filters[K]) => set({ [k]: f[k] === v ? null : v } as Partial<Filters>);

  const list = useMemo(() => {
    const hypo: Profile = { skipped: [] };
    if (f.age) hypo.age = AGE_RANGES[f.age];
    if (f.gender) hypo.gender = f.gender;
    if (f.community === "minority") hypo.minority = true;
    else if (f.community === "disability") hypo.disability = true;
    else if (f.community) hypo.category = f.community;
    const q = f.q.trim().toLowerCase();
    return SCHEMES.filter((s) => {
      if (f.sector === "work") {
        if (!s.cats.includes("jobs") && !s.cats.includes("business")) return false;
      } else if (f.sector && !s.cats.includes(f.sector)) return false;
      if (q && !`${s.name.join(" ")} ${s.benefit.join(" ")}`.toLowerCase().includes(q)) return false;
      return evaluate(s, hypo).status !== "not";
    }).sort((a, b) => (b.w ?? 1) - (a.w ?? 1));
  }, [f]);

  const personal = (s: Scheme) => (started ? evaluate(s, profile) : null);
  const anyFilter = f.age || f.gender || f.community || f.sector || f.q;

  const groupLabel = (id: string): string => {
    switch (id) {
      case "women": return d.opt.gender.female;
      case "trans": return d.opt.gender.other;
      case "youth": return d.ageGroups.youth;
      case "senior": return d.ageGroups.senior;
      case "sc": return d.communities.sc;
      case "st": return d.communities.st;
      case "obc": return d.communities.obc;
      case "minority": return d.communities.minority;
      case "disability": return d.sectors.disability;
      default: return d.sectors.agri;
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border-2 border-line bg-surface p-4">
        <h3 className="text-xl font-extrabold">💼 {d.ui.workOnly}</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setF({ ...NONE, sector: g.apply.sector ?? "work", ...g.apply })}
              className="rounded-full border-2 border-primary bg-surface2 px-3.5 py-1.5 text-sm font-extrabold text-primary hover:bg-primary hover:text-primary-fg"
            >
              {g.icon} {groupLabel(g.id)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-3xl border-2 border-line bg-surface p-4">
        <input
          type="search"
          value={f.q}
          onChange={(e) => set({ q: e.target.value })}
          placeholder={`🔎 ${d.ui.search}`}
          aria-label={d.ui.search}
          className="w-full rounded-2xl border-2 border-line bg-surface px-4 py-2.5 text-lg font-medium"
        />

        <div>
          <p className="mb-1 text-sm font-extrabold text-muted">{d.ui.fAge}</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(AGE_RANGES) as AgeGroup[]).map((a) => (
              <Pill key={a} active={f.age === a} onClick={() => toggle("age", a)}>
                {d.ageGroups[a]}
              </Pill>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-sm font-extrabold text-muted">{d.ui.fGender}</p>
          <div className="flex flex-wrap gap-2">
            {(["female", "male", "other"] as Gender[]).map((g) => (
              <Pill key={g} active={f.gender === g} onClick={() => toggle("gender", g)}>
                {d.opt.gender[g]}
              </Pill>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-sm font-extrabold text-muted">{d.ui.fCommunity}</p>
          <div className="flex flex-wrap gap-2">
            {(["general", "obc", "sc", "st", "minority", "disability"] as Community[]).map((c) => (
              <Pill key={c} active={f.community === c} onClick={() => toggle("community", c)}>
                {c === "disability" ? `♿ ${d.sectors.disability}` : d.communities[c]}
              </Pill>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-sm font-extrabold text-muted">{d.ui.fSector}</p>
          <div className="flex flex-wrap gap-2">
            <Pill active={f.sector === "work"} onClick={() => toggle("sector", "work")}>
              💼 {d.ui.workOnly}
            </Pill>
            {SECTORS.map((s) => (
              <Pill key={s} active={f.sector === s} onClick={() => toggle("sector", s)}>
                {SECTOR_ICONS[s]} {d.sectors[s]}
              </Pill>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-bold text-muted" aria-live="polite">{fmt(d.ui.showing, { n: list.length })}</p>
          {anyFilter && (
            <button type="button" onClick={() => setF(NONE)} className="rounded-xl border-2 border-line px-3 py-1 text-sm font-bold hover:bg-surface2">
              ✕ {d.ui.clearFilters}
            </button>
          )}
        </div>
      </div>

      {list.length === 0 ? (
        <p className="rounded-2xl bg-surface p-6 text-center text-lg font-semibold text-muted">{d.ui.noMatch}</p>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {list.map((s) => {
            const ev = personal(s);
            return <SchemeCard key={s.id} scheme={s} profile={profile} lang={lang} status={ev && ev.status !== "not" ? ev.status : null} onOpen={onOpen} />;
          })}
        </div>
      )}
    </div>
  );
}
