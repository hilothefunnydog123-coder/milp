// ============================================================================
// The shared vocabulary: the kinds of help YNorth knows about (Category) and
// the signals it reads out of what someone tells us (SituationTag).
//
// Both used to be loose strings compared with `includes()` in three different
// files. They're closed unions now, with a keyword table that the compiler
// forces to cover every tag — so adding a signal without teaching the app to
// detect it, or detecting one the model can't score, stops the build.
// ============================================================================

import { oneOf, type Schema } from "./schema";
import { asNonEmpty, isNonEmpty, type NonEmptyArray } from "./typed";

// ---------------------------------------------------------------------------
// Categories — the kinds of help the learning model ranks
// ---------------------------------------------------------------------------

export const CATEGORY_LABEL = {
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
} as const;

export type Category = keyof typeof CATEGORY_LABEL;

export const CATEGORIES = asNonEmpty(Object.keys(CATEGORY_LABEL) as Category[], "categories");

export const categorySchema: Schema<Category> = oneOf(CATEGORIES);

export function isCategory(value: string): value is Category {
  return Object.prototype.hasOwnProperty.call(CATEGORY_LABEL, value);
}

export function labelFor(category: Category): string {
  return CATEGORY_LABEL[category];
}

// ---------------------------------------------------------------------------
// Situation tags — signals derived from a person's own words
// ---------------------------------------------------------------------------

export type SituationTag =
  | "general"
  | "job_loss"
  | "vehicle"
  | "unsheltered"
  | "couch"
  | "eviction"
  | "documents"
  | "veteran"
  | "dv"
  | "family"
  | "hungry"
  | "health";

/**
 * `Record<SituationTag, …>` rather than `Record<string, …>`: adding a tag to the
 * union without adding its triggers here is a compile error, and a typo in a
 * tag name can't quietly create a signal nothing else ever reads.
 */
export const TAG_KEYWORDS: Record<Exclude<SituationTag, "general">, NonEmptyArray<string>> = {
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

export const SITUATION_TAGS: NonEmptyArray<SituationTag> = [
  "general",
  ...(Object.keys(TAG_KEYWORDS) as Exclude<SituationTag, "general">[]),
];

export const situationTagSchema: Schema<SituationTag> = oneOf(SITUATION_TAGS);

export function isSituationTag(value: string): value is SituationTag {
  return (SITUATION_TAGS as readonly string[]).includes(value);
}

/**
 * Reads signals out of a person's own description. Returns a non-empty list by
 * construction — callers never have to handle "no tags at all", because
 * "general" always applies.
 */
export function deriveTags(situation: string): NonEmptyArray<SituationTag> {
  const haystack = situation.toLowerCase();
  const matched = (Object.keys(TAG_KEYWORDS) as Exclude<SituationTag, "general">[]).filter((tag) =>
    TAG_KEYWORDS[tag].some((keyword) => haystack.includes(keyword))
  );
  return isNonEmpty(matched) ? matched : ["general"];
}
