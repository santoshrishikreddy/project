import { SCHEMES } from "@/data/schemes";

export const dynamic = "force-static";

/** The structured, machine-readable rule base the agent reasons over. */
export function GET() {
  return Response.json({
    count: SCHEMES.length,
    languages: ["en", "hi", "te"],
    schemes: SCHEMES.map((s) => ({
      id: s.id,
      sectors: s.cats,
      name: { en: s.name[0], hi: s.name[1], te: s.name[2] },
      benefit: { en: s.benefit[0], hi: s.benefit[1], te: s.benefit[2] },
      rules: s.rules,
      anyOf: s.any ?? null,
      level: s.state ? "state" : "central",
      documents: s.docs,
      applyMode: s.mode,
      url: s.url ?? null,
    })),
  });
}
