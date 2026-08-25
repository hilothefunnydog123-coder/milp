// ============================================================================
// YNorth — find your way home.
// A plain-language compass that turns the invisible maze of getting housed
// into a clear, dignified, step-by-step path you own.
//
// The domain model is declared once, as schemas, and the TypeScript types are
// *derived* from them (`Infer<typeof compassPathSchema>`). One declaration
// therefore gives us three things that can never disagree: the compile-time
// shape, the runtime check, and the documentation of what a path really is.
//
// That matters here more than usual, because a CompassPath doesn't only come
// from our own code. It comes back out of localStorage on the next visit, and
// out of a base64 fragment when someone shares their path with an advocate —
// both of which are, strictly speaking, untrusted strings.
// ============================================================================

import {
  forgivingList,
  list,
  number,
  object,
  oneOf,
  optional,
  orElseWith,
  text,
  transform,
  type Infer,
  type Schema,
} from "./schema";
import {
  isIsoTimestamp,
  latitudeSchema,
  longitudeSchema,
  nowIso,
  stepId,
  toCoords,
  type Coords,
  type IsoTimestamp,
  type StepId,
} from "./brand";
import { resourceKeySchema } from "./resources";
import { categorySchema, situationTagSchema } from "./taxonomy";
import type { NonEmptyArray } from "./typed";

// ---------------------------------------------------------------------------
// Stages — how urgent a step is
// ---------------------------------------------------------------------------

export const STAGES = ["now", "soon", "later"] as const satisfies NonEmptyArray<string>;

export const stageSchema = oneOf(STAGES);
export type Stage = Infer<typeof stageSchema>;

/** Exhaustive by type: a new stage forces a label to be written for it. */
export const STAGE_LABEL: Record<Stage, string> = {
  now: "Now",
  soon: "Soon",
  later: "The path home",
};

// ---------------------------------------------------------------------------
// A single step on the path
// ---------------------------------------------------------------------------

const stepIdSchema: Schema<StepId> = transform(text({ max: 16 }), (value) => value as StepId);

export const compassStepSchema = object({
  id: stepIdSchema,
  title: text({ max: 80 }),
  stage: stageSchema,
  /** plain-language: what this is and why it matters, in warm human terms */
  plain: text({ max: 400 }),
  /** the single concrete next action */
  action: text({ max: 280 }),
  /** documents this step needs */
  docs: forgivingList(text({ max: 120 }), { max: 5 }),
  /** learning-model category for this step (safety, shelter, rent, …) */
  category: optional(categorySchema),
  /** key into the curated RESOURCES map (real, universal systems only) */
  resourceKey: optional(resourceKeySchema),
});

export type CompassStep = Infer<typeof compassStepSchema>;

// ---------------------------------------------------------------------------
// Real, cited, location-specific help
// ---------------------------------------------------------------------------

export const localResourceSchema = object({
  name: text({ max: 100, min: 1 }),
  helpsWith: text({ max: 160 }),
  contact: optional(text({ max: 120 })),
});

export type LocalResource = Infer<typeof localResourceSchema>;

export const sourceSchema = object({
  title: text({ max: 160 }),
  uri: text({ max: 500, min: 1 }),
});

export type Source = Infer<typeof sourceSchema>;

// ---------------------------------------------------------------------------
// The path itself
// ---------------------------------------------------------------------------

const timestampSchema: Schema<IsoTimestamp> = orElseWith(
  transform(text({ max: 40 }), (value) => (isIsoTimestamp(value) ? value : nowIso())),
  nowIso
);

export const communitySchema = object({
  runs: number({ int: true, min: 0 }),
  top: forgivingList(text({ max: 60 }), { max: 8 }),
});

export type Community = Infer<typeof communitySchema>;

export const compassPathSchema = object({
  /** a warm, plain one-paragraph reflection of their situation + hope */
  summary: text({ max: 600 }),
  steps: list(compassStepSchema, { max: 12 }),
  /** vital documents to gather (deduped, plain labels) */
  documents: forgivingList(text({ max: 120 }), { max: 10 }),
  /** curated resource keys relevant to this person (subset of RESOURCES) */
  resources: forgivingList(resourceKeySchema, { max: 16 }),
  /** REAL, location-specific orgs found via grounded search (cited) */
  localResources: forgivingList(localResourceSchema, { max: 8 }),
  /** grounding citations for the local resources */
  sources: forgivingList(sourceSchema, { max: 8 }),
  /** situation signals derived for the learning model */
  tags: forgivingList(situationTagSchema, { max: 16 }),
  /** what the learning model knows so far */
  community: communitySchema,
  location: text({ max: 120 }),
  createdAt: timestampSchema,
});

export type CompassPath = Infer<typeof compassPathSchema>;

// ---------------------------------------------------------------------------
// What we ask a person for
// ---------------------------------------------------------------------------

export const intakeSchema = object({
  situation: text({ max: 1200 }),
  location: text({ max: 80 }),
  household: text({ max: 120 }),
});

export type Intake = Infer<typeof intakeSchema>;

// ---------------------------------------------------------------------------
// The map of real, nearby help
// ---------------------------------------------------------------------------

export const AVAILABILITY = ["available", "unsure", "unavailable"] as const satisfies NonEmptyArray<string>;

export const availabilitySchema = oneOf(AVAILABILITY);
export type Availability = Infer<typeof availabilitySchema>;

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  available: "Available now",
  unsure: "Availability unknown — call to check",
  unavailable: "Currently full",
};

export const mapPinSchema = object({
  name: text({ max: 120, min: 1 }),
  address: text({ max: 200 }),
  lat: latitudeSchema,
  lng: longitudeSchema,
  /** filled in client-side from the availability feed, absent on the wire */
  status: optional(availabilitySchema),
});

export type MapPin = Infer<typeof mapPinSchema>;

/**
 * The only way to build a pin: coordinates are checked, so a pin that exists
 * is a pin that can actually be placed on the map.
 */
export function makePin(name: string, address: string, lat: number, lng: number): MapPin | null {
  const coords = toCoords(lat, lng);
  if (!coords || !name) return null;
  return { name, address, lat: coords.lat, lng: coords.lng };
}

export type { Coords };

export { stepId };
