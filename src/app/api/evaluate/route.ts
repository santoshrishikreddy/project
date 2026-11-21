import { group, pickNext } from "@/lib/engine";
import { sanitizeProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

/**
 * Stateless eligibility check.
 * POST { profile: { age: 45 | [lo,hi], gender, category, occupation, income: [lo,hi], ... }, followups?: number }
 * Returns eligible / maybe schemes (with the fields still unknown) and the single most useful next question.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { profile?: unknown; followups?: number } | null;
  const profile = sanitizeProfile(body?.profile);
  const g = group(profile);
  const next = pickNext(profile, Number(body?.followups ?? 0));
  return Response.json({
    profile,
    eligible: g.eligible.map((e) => ({ id: e.scheme.id, name: e.scheme.name[0], benefit: e.scheme.benefit[0] })),
    maybe: g.maybe.map((e) => ({ id: e.scheme.id, name: e.scheme.name[0], stillUnknown: e.unknown })),
    notEligible: g.not.length,
    nextQuestion: next ? { ask: next.ask, helpsSettle: next.ids } : null,
  });
}
