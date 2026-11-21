import { db } from "@/db";
import { sessions } from "@/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const clampInt = (v: unknown, max = 1000) => {
  const n = typeof v === "number" ? Math.round(v) : 0;
  return Math.max(0, Math.min(max, Number.isFinite(n) ? n : 0));
};
const oneOf = (v: unknown, list: string[]) => (typeof v === "string" && list.includes(v) ? v : null);

/** Store one anonymous session summary (upsert by client-generated id). */
export async function POST(req: Request) {
  try {
    const b = (await req.json()) as Record<string, unknown>;
    const sid = typeof b.sid === "string" && /^[\w-]{8,64}$/.test(b.sid) ? b.sid : null;
    if (!sid) return Response.json({ ok: false, error: "bad sid" }, { status: 400 });
    const row = {
      sid,
      lang: oneOf(b.lang, ["en", "hi", "te"]) ?? "en",
      ageBand: oneOf(b.ageBand, ["0-17", "18-35", "36-59", "60+"]),
      gender: oneOf(b.gender, ["female", "male", "other"]),
      category: oneOf(b.category, ["general", "obc", "sc", "st"]),
      questions: clampInt(b.questions, 100),
      eligible: clampInt(b.eligible, 200),
      maybe: clampInt(b.maybe, 200),
      conflicts: clampInt(b.conflicts, 100),
    };
    await db
      .insert(sessions)
      .values(row)
      .onConflictDoUpdate({
        target: sessions.sid,
        set: { ...row, updatedAt: new Date() },
      });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}

/** Aggregate impact numbers shown in the footer. */
export async function GET() {
  try {
    const [r] = await db
      .select({
        total: sql<number>`count(*)::int`,
        avgQuestions: sql<number>`coalesce(round(avg(${sessions.questions})::numeric, 1), 0)::float`,
        avgEligible: sql<number>`coalesce(round(avg(${sessions.eligible})::numeric, 1), 0)::float`,
      })
      .from(sessions);
    return Response.json({ ok: true, ...r });
  } catch {
    return Response.json({ ok: false, total: 0, avgQuestions: 0, avgEligible: 0 }, { status: 200 });
  }
}
