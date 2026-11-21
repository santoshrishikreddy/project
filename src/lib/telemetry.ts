"use client";

/** Anonymous session summaries. If the phone is offline they wait in localStorage and are sent later. */

const QUEUE = "sakhi-queue";

export interface SessionPayload {
  sid: string;
  lang: string;
  ageBand: string | null;
  gender: string | null;
  category: string | null;
  questions: number;
  eligible: number;
  maybe: number;
  conflicts: number;
}

function readQueue(): SessionPayload[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE) || "[]") as SessionPayload[];
  } catch {
    return [];
  }
}

function writeQueue(q: SessionPayload[]) {
  try {
    localStorage.setItem(QUEUE, JSON.stringify(q.slice(-20)));
  } catch {
    /* ignore */
  }
}

async function post(p: SessionPayload): Promise<boolean> {
  try {
    const r = await fetch("/api/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(p),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export async function sendSession(p: SessionPayload): Promise<void> {
  if (!p.sid) return;
  const ok = await post(p);
  if (!ok) writeQueue([...readQueue().filter((x) => x.sid !== p.sid), p]);
}

export async function flushQueue(): Promise<void> {
  const q = readQueue();
  if (!q.length) return;
  const rest: SessionPayload[] = [];
  for (const p of q) {
    if (!(await post(p))) rest.push(p);
  }
  writeQueue(rest);
}

export function newId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
