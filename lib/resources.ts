// ============================================================================
// Curated, REAL, universal U.S. systems. We never let the AI invent specific
// shelters or phone numbers — it may only reference keys from this set, so every
// resource a person sees is real and verifiable.
//
// The table is declared with `satisfies` rather than annotated with
// `Record<string, Resource>`: that keeps the literal key union ("211" |
// "coordinated_entry" | …) instead of widening it to `string`. Downstream, a
// `ResourceKey` is a closed set the compiler can check and complete, an unknown
// key can't be written, and `RESOURCES[key]` needs no undefined check.
// ============================================================================

import { refine, text, type Schema } from "./schema";
import type { ResourceIconName } from "./icons";

/**
 * A curated resource. Deliberately has no `key` field: the key is the key it is
 * filed under, and storing it twice is a chance for the two to disagree.
 */
export interface Resource {
  name: string;
  what: string;
  how: string;
  phone?: string;
  /** checked against the icon registry in lib/icons.ts, not just a string */
  icon: ResourceIconName;
}

export const RESOURCES = {
  "211": {
    name: "211 — local help line",
    what: "A free, confidential line that connects you to local shelters, food, rent help, and services in your area.",
    how: "Call or text 211, any time, anywhere in the U.S.",
    phone: "211",
    icon: "PhoneCall",
  },
  coordinated_entry: {
    name: "Coordinated Entry",
    what: "The single front door to housing help in your community. It puts you on the local list for housing and shelter.",
    how: "Ask 211 or any local shelter for your area's Coordinated Entry access point.",
    icon: "DoorOpen",
  },
  shelter: {
    name: "Emergency shelter",
    what: "A safe place to sleep tonight while you work toward stable housing.",
    how: "Find an open shelter by calling 211.",
    icon: "BedDouble",
  },
  rental_assistance: {
    name: "Emergency rental assistance",
    what: "Programs that can help pay overdue rent or a deposit so you can stay or get housed.",
    how: "Ask 211 about Emergency Rental Assistance in your county.",
    icon: "HandCoins",
  },
  vouchers: {
    name: "Housing vouchers (Section 8)",
    what: "A voucher pays part of your rent long-term. Run by your local Public Housing Authority (PHA).",
    how: "Find your local PHA and ask about the Housing Choice Voucher waitlist.",
    icon: "Home",
  },
  snap: {
    name: "SNAP (food benefits)",
    what: "Monthly money for groceries so food is one less thing to worry about.",
    how: "Apply through your state's benefits website or in person.",
    icon: "Apple",
  },
  medicaid: {
    name: "Medicaid (health coverage)",
    what: "Free or low-cost health coverage you likely qualify for.",
    how: "Apply through your state's Medicaid office or HealthCare.gov.",
    icon: "HeartPulse",
  },
  vital_records: {
    name: "Birth certificate",
    what: "Your birth certificate is the key document for getting an ID, benefits, and housing.",
    how: "Order a replacement from the Vital Records office in your birth state.",
    icon: "ScrollText",
  },
  ssa: {
    name: "Social Security card",
    what: "Needed for work and many benefits. The SSA replaces lost cards for free.",
    how: "Apply for a free replacement at the Social Security Administration (ssa.gov).",
    icon: "IdCard",
  },
  dmv: {
    name: "State ID",
    what: "A photo ID unlocks almost everything else — shelter intake, benefits, jobs, housing.",
    how: "Visit your state DMV; ask 211 about fee waivers for people experiencing homelessness.",
    icon: "CreditCard",
  },
  legal_aid: {
    name: "Free legal aid",
    what: "Free lawyers who can help fight an eviction or fix a record blocking your housing.",
    how: "Find your local Legal Aid through 211 or LawHelp.org.",
    icon: "Scale",
  },
  va: {
    name: "Veteran housing help (VA)",
    what: "Dedicated housing programs for veterans (HUD-VASH, SSVF).",
    how: "Call the National Call Center for Homeless Veterans: 1-877-424-3838.",
    phone: "1-877-424-3838",
    icon: "Shield",
  },
  dv: {
    name: "Domestic violence support",
    what: "Confidential, 24/7 help and safe housing if you're fleeing harm.",
    how: "Call the National DV Hotline: 1-800-799-7233.",
    phone: "1-800-799-7233",
    icon: "ShieldCheck",
  },
  crisis: {
    name: "988 — crisis support",
    what: "Free, confidential support any time you're in emotional crisis. You are not alone.",
    how: "Call or text 988, 24/7.",
    phone: "988",
    icon: "LifeBuoy",
  },
} satisfies Record<string, Resource>;

/** The closed set of curated resources the AI is allowed to reference. */
export type ResourceKey = keyof typeof RESOURCES;

export const RESOURCE_KEYS = Object.keys(RESOURCES) as ResourceKey[];

export function isResourceKey(value: string): value is ResourceKey {
  return Object.prototype.hasOwnProperty.call(RESOURCES, value);
}

/** Total lookup: a `ResourceKey` always resolves, so there's nothing to guard. */
export function resourceFor<K extends ResourceKey>(key: K): (typeof RESOURCES)[K] {
  return RESOURCES[key];
}

/** Parses a model-supplied string, admitting only keys that really exist. */
export const resourceKeySchema: Schema<ResourceKey> = refine(
  text({ max: 40 }),
  isResourceKey,
  "not a curated resource key"
);

/** Crisis support is offered on every path, no matter what was asked for. */
export const ALWAYS_OFFERED = "crisis" satisfies ResourceKey;
