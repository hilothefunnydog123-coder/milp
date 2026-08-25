// ============================================================================
// YNorth Brain — a tiny online-learning model (single-layer) that gets smarter
// every time someone uses YNorth. Each piece of feedback ("this helped") nudges
// weights mapping a person's situation -> the kinds of help that actually work.
// Future people in similar situations get those proven resources prioritized.
// Collective intelligence for getting housed.
//
// The weight table is typed by the taxonomy itself — `Partial<Record<
// SituationTag, Partial<Record<Category, number>>>>` — so a tag or category
// that isn't in the shared vocabulary can't be trained, scored, or (crucially)
// loaded back out of the database. State restored from Supabase goes through a
// schema first: a stale row from an older deploy degrades to the seed priors
// instead of quietly poisoning everyone's recommendations.
// ============================================================================

import { forgivingList, number, object, orElse, record, text, type Infer } from "./schema";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  deriveTags,
  isCategory,
  isSituationTag,
  labelFor,
  type Category,
  type SituationTag,
} from "./taxonomy";
import type { BrainStats } from "./api";

export { CATEGORY_LABEL, deriveTags, isCategory, isSituationTag, labelFor };
export type { Category, SituationTag };

// ---- the model: weights[tag][category] ----
type Weights = Partial<Record<SituationTag, Partial<Record<Category, number>>>>;

// sensible priors so it's useful on day one, then learns from real feedback
const SEED: Weights = {
  general: { shelter: 0.6, rent: 0.5, benefits: 0.5, documents: 0.4 },
  job_loss: { benefits: 0.8, rent: 0.7, work: 0.7, food: 0.5 },
  vehicle: { shelter: 0.7, benefits: 0.5, work: 0.5 },
  unsheltered: { safety: 0.7, shelter: 0.9, health: 0.5 },
  couch: { rent: 0.6, shelter: 0.5, benefits: 0.5 },
  eviction: { legal: 0.9, rent: 0.9, benefits: 0.4 },
  documents: { documents: 0.95, benefits: 0.5 },
  veteran: { veteran: 0.95, shelter: 0.6 },
  dv: { safety: 0.98, shelter: 0.7, legal: 0.6 },
  family: { shelter: 0.7, benefits: 0.7, food: 0.6 },
  hungry: { food: 0.9, benefits: 0.6 },
  health: { health: 0.8, benefits: 0.6 },
};

const LR = 0.08;
const weights: Weights = structuredClone(SEED);
// Real counters — start at zero and only ever reflect genuine usage (persisted
// to Supabase so they accumulate honestly across real sessions). No fabrication.
let runs = 0;
let helpfulMarks = 0;

// ---- impact tallies (for the live "lives in motion" counter) ----
let callsMade = 0;
let bedsBooked = 0;
const languages = new Set<string>();

export function bumpCall() { callsMade += 1; }
export function bumpBooked() { bedsBooked += 1; }
export function addLanguage(l: string) { if (l) languages.add(l); }

function clamp(v: number) {
  return Math.max(-1, Math.min(1.5, v));
}

/** Online update — a single gradient step per feedback signal. */
export function learn(tags: readonly SituationTag[], category: Category, helped: boolean) {
  const target = helped ? 1 : 0;
  for (const tag of tags) {
    const row = (weights[tag] ??= {});
    const w = row[category] ?? 0;
    // logistic-style nudge toward the observed outcome
    row[category] = clamp(w + LR * (target - 1 / (1 + Math.exp(-w))));
  }
  if (helped) helpfulMarks += 1;
}

export function noteRun() {
  runs += 1;
}

/** Rank categories for a situation by summed learned weight. */
export function recommend(tags: readonly SituationTag[]): Category[] {
  const score = (c: Category) => tags.reduce((sum, tag) => sum + (weights[tag]?.[c] ?? 0), 0);
  return [...CATEGORIES].sort((a, b) => score(b) - score(a)).slice(0, 4);
}

export function stats(): BrainStats {
  return { runs, helpfulMarks, callsMade, bedsBooked, languages: [...languages] };
}

// ---- optional Supabase persistence: makes the model learn across ALL users + deploys ----

/** What a persisted brain row is allowed to contain. */
const brainSnapshotSchema = object({
  weights: orElse(record(record(number())), {}),
  runs: orElse(number({ int: true, min: 0 }), 0),
  helpfulMarks: orElse(number({ int: true, min: 0 }), 0),
  callsMade: orElse(number({ int: true, min: 0 }), 0),
  bedsBooked: orElse(number({ int: true, min: 0 }), 0),
  languages: forgivingList(text({ max: 30 }), { max: 500 }),
});

type BrainSnapshot = Infer<typeof brainSnapshotSchema>;

interface SupabaseConfig {
  readonly url: string;
  readonly key: string;
}

function config(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

async function connect(c: SupabaseConfig) {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(c.url, c.key);
}

let loaded = false;

/** Only weights for tags and categories we still know about are restored. */
function absorb(snapshot: BrainSnapshot): void {
  for (const [tag, row] of Object.entries(snapshot.weights)) {
    if (!isSituationTag(tag)) continue;
    const target = (weights[tag] ??= {});
    for (const [category, value] of Object.entries(row)) {
      if (isCategory(category)) target[category] = clamp(value);
    }
  }
  runs = snapshot.runs;
  helpfulMarks = snapshot.helpfulMarks;
  callsMade = snapshot.callsMade;
  bedsBooked = snapshot.bedsBooked;
  for (const language of snapshot.languages) languages.add(language);
}

/** Load the global brain state once per server instance. */
export async function loadBrain(): Promise<void> {
  if (loaded) return;
  loaded = true;
  const c = config();
  if (!c) return;
  try {
    const sb = await connect(c);
    const { data } = await sb.from("brain_state").select("data").eq("id", "global").single();
    const parsed = brainSnapshotSchema.parse((data as { data?: unknown } | null)?.data);
    if (parsed.ok) absorb(parsed.value);
  } catch {
    /* fall back to in-memory */
  }
}

/** Persist the global brain state (fire-and-forget). */
export async function saveBrain(): Promise<void> {
  const c = config();
  if (!c) return;
  try {
    const sb = await connect(c);
    const snapshot: BrainSnapshot = {
      weights: weights as Record<string, Record<string, number>>,
      runs,
      helpfulMarks,
      callsMade,
      bedsBooked,
      languages: [...languages],
    };
    await sb.from("brain_state").upsert({ id: "global", data: snapshot });
  } catch {
    /* ignore — demo must not break on DB hiccup */
  }
}
