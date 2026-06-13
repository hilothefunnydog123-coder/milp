// ============================================================================
// YNorth Brain — a tiny online-learning model (single-layer) that gets smarter
// every time someone uses YNorth. Each piece of feedback ("this helped") nudges
// weights mapping a person's situation -> the kinds of help that actually work.
// Future people in similar situations get those proven resources prioritized.
// Collective intelligence for getting housed.
// ============================================================================

export type Category =
  | "safety"
  | "shelter"
  | "rent"
  | "documents"
  | "benefits"
  | "food"
  | "legal"
  | "veteran"
  | "health"
  | "work";

export const CATEGORY_LABEL: Record<Category, string> = {
  safety: "getting to safety",
  shelter: "emergency shelter",
  rent: "rent & deposit help",
  documents: "replacing ID & documents",
  benefits: "benefits (food, health)",
  food: "food assistance",
  legal: "free legal aid",
  veteran: "veteran housing programs",
  health: "health & mental health",
  work: "income & employment",
};

const CATS = Object.keys(CATEGORY_LABEL) as Category[];

// situation signal -> keyword triggers
const TAGS: Record<string, string[]> = {
  job_loss: ["lost my job", "unemployed", "laid off", "no income", "fired"],
  vehicle: ["car", "vehicle", "van", "truck"],
  unsheltered: ["street", "outside", "nowhere", "tent", "park"],
  couch: ["couch", "friend", "staying with"],
  eviction: ["evict", "behind on rent", "owe rent", "landlord", "notice"],
  documents: ["id", "lost my id", "no id", "birth certificate", "documents", "papers", "stolen"],
  veteran: ["veteran", "army", "navy", "marine", "air force", "served"],
  dv: ["abuse", "domestic", "violence", "unsafe", "partner", "fleeing"],
  family: ["kids", "children", "daughter", "son", "family", "baby"],
  hungry: ["food", "hungry", "eat", "starving"],
  health: ["sick", "disabled", "mental", "medication", "hospital"],
};

export function deriveTags(situation: string): string[] {
  const t = situation.toLowerCase();
  const tags = Object.entries(TAGS)
    .filter(([, kws]) => kws.some((k) => t.includes(k)))
    .map(([tag]) => tag);
  return tags.length ? tags : ["general"];
}

// ---- the model: weights[tag][category] ----
type Weights = Record<string, Partial<Record<Category, number>>>;

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
export function learn(tags: string[], category: Category, helped: boolean) {
  const target = helped ? 1 : 0;
  for (const tag of tags) {
    weights[tag] = weights[tag] || {};
    const w = weights[tag][category] ?? 0;
    // logistic-style nudge toward the observed outcome
    weights[tag][category] = clamp(w + LR * (target - 1 / (1 + Math.exp(-w))));
  }
  if (helped) helpfulMarks += 1;
}

export function noteRun() {
  runs += 1;
}

/** Rank categories for a situation by summed learned weight. */
export function recommend(tags: string[]): Category[] {
  const score = (c: Category) =>
    tags.reduce((s, tag) => s + (weights[tag]?.[c] ?? 0), 0);
  return [...CATS].sort((a, b) => score(b) - score(a)).slice(0, 4);
}

export function stats() {
  return { runs, helpfulMarks, callsMade, bedsBooked, languages: [...languages] };
}

// ---- optional Supabase persistence: makes the model learn across ALL users + deploys ----
function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

let loaded = false;

/** Load the global brain state once per server instance. */
export async function loadBrain(): Promise<void> {
  if (loaded) return;
  loaded = true;
  const c = client();
  if (!c) return;
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(c.url, c.key);
    const { data } = await sb.from("brain_state").select("data").eq("id", "global").single();
    const d = data?.data as
      | { weights?: Weights; runs?: number; helpfulMarks?: number; callsMade?: number; bedsBooked?: number; languages?: string[] }
      | undefined;
    if (d) {
      Object.assign(weights, d.weights || {});
      if (typeof d.runs === "number") runs = d.runs;
      if (typeof d.helpfulMarks === "number") helpfulMarks = d.helpfulMarks;
      if (typeof d.callsMade === "number") callsMade = d.callsMade;
      if (typeof d.bedsBooked === "number") bedsBooked = d.bedsBooked;
      (d.languages || []).forEach((l) => languages.add(l));
    }
  } catch {
    /* fall back to in-memory */
  }
}

/** Persist the global brain state (fire-and-forget). */
export async function saveBrain(): Promise<void> {
  const c = client();
  if (!c) return;
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(c.url, c.key);
    await sb.from("brain_state").upsert({ id: "global", data: { weights, runs, helpfulMarks, callsMade, bedsBooked, languages: [...languages] } });
  } catch {
    /* ignore — demo must not break on DB hiccup */
  }
}
