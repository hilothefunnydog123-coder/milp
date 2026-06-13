import type { Credential, CustomTest } from "./types";

// ---- credential id ----
export function newCredentialId(): string {
  const block = () =>
    Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-Z0-9]/g, "0");
  return `JM-${block()}-${block().slice(0, 3)}`;
}

export function newTestId(): string {
  return "t_" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

// ---- custom employer tests (in-memory; swap for Supabase later) ----
const tests = new Map<string, CustomTest>();

export function createTest(t: CustomTest): void {
  tests.set(t.id, t);
}
export function getTest(id: string): CustomTest | undefined {
  return tests.get(id);
}
export function listTestsByOrg(org: string): CustomTest[] {
  return [...tests.values()]
    .filter((t) => t.org === org)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

// ---- seeded demo board (always full, even before anyone takes the test) ----
const SEED: Credential[] = [
  { id: "JM-9F2A-7K1", field: "Software Engineering", fieldId: "software", name: "Ava Chen", overall: 94, grade: "A", dimensions: { detection: 96, direction: 92, efficiency: 93 }, verdict: "Surgical, caught the bug instantly", issuedAt: "2026-06-12T18:04:00Z" },
  { id: "JM-3B8C-2M4", field: "Marketing", fieldId: "marketing", name: "Marcus Reid", overall: 89, grade: "A", dimensions: { detection: 91, direction: 88, efficiency: 86 }, verdict: "Killed the fake claim cold", issuedAt: "2026-06-12T19:22:00Z" },
  { id: "JM-7D1E-9Q2", field: "Data Analysis", fieldId: "data", name: "Priya Nair", overall: 86, grade: "A", dimensions: { detection: 90, direction: 84, efficiency: 82 }, verdict: "Refused the causation trap", issuedAt: "2026-06-12T20:10:00Z" },
  { id: "JM-5A4F-1Z8", field: "Software Engineering", fieldId: "software", name: "Diego Santos", overall: 78, grade: "B", dimensions: { detection: 74, direction: 80, efficiency: 81 }, verdict: "Caught it late but recovered", issuedAt: "2026-06-12T21:33:00Z" },
  { id: "JM-2C7B-4X6", field: "Marketing", fieldId: "marketing", name: "Lena Volkov", overall: 71, grade: "B", dimensions: { detection: 68, direction: 74, efficiency: 72 }, verdict: "Solid direction, slow to verify", issuedAt: "2026-06-12T22:01:00Z" },
];

// Module-level store (persists per server process — fine for demo/dev).
const live: Credential[] = [];

export function addCredential(c: Credential): void {
  live.unshift(c);
}

export function listCredentials(): Credential[] {
  return [...live, ...SEED].sort((a, b) => b.overall - a.overall);
}

// ---- optional Supabase persistence (no-op if env not set) ----
export async function persistToSupabase(c: Credential): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return;
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(url, key);
    await supabase.from("credentials").insert({
      credential_id: c.id,
      field: c.field,
      field_id: c.fieldId,
      name: c.name,
      overall: c.overall,
      grade: c.grade,
      dimensions: c.dimensions,
      verdict: c.verdict,
      issued_at: c.issuedAt,
    });
  } catch {
    /* swallow — demo must not break on a DB hiccup */
  }
}
