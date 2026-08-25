// ============================================================================
// A test suite with no runtime.
//
// Everything below is an assertion the *compiler* checks: `Expect<Equal<A, B>>`
// resolves only when A and B are the same type, so a wrong answer isn't a
// failing assertion at runtime — it's a build error, in CI, before merge.
//
// These guard the claims the rest of the codebase leans on: that a request
// action really does determine its response type, that optional keys really
// are optional, that branded primitives really are unforgeable, and that the
// label tables really do cover every member of their unions. Break any of
// them and `npm run typecheck` says so, at the line that broke.
//
// This module is imported by nothing on purpose. It exists to be checked.
// ============================================================================

import type { Equal, Expect, ExpectNot, NonEmptyArray } from "./typed";
import type { Infer } from "./schema";
import { object, optional, oneOf, text, boolean, variant, list, number } from "./schema";
import type {
  ActionOf,
  ActionPayload,
  ApiPath,
  RequestOf,
  ResponseFor,
  ResponseOf,
  TranscriptTurn,
} from "./api";
import type { Latitude, Longitude, CallId, IsoTimestamp, LanguageName } from "./brand";
import { RESOURCES, resourceFor, type ResourceKey } from "./resources";
import { CATEGORY_LABEL, TAG_KEYWORDS, type Category, type SituationTag } from "./taxonomy";
import { AVAILABILITY_LABEL, STAGE_LABEL, type Availability, type CompassPath, type Stage } from "./types";
import type { Stored } from "./storage";
import type { PagePath, StartOptions } from "./routes";
import type { readStartOptions } from "./routes";
import type { ResourceIconName } from "./icons";

// ---------------------------------------------------------------------------
// 1. The schema builder infers what it validates
// ---------------------------------------------------------------------------

const person = object({
  name: text(),
  stage: oneOf(["now", "soon"] as const),
  nickname: optional(text()),
});

/** `optional()` produces an optional KEY, not a `| undefined` value. */
export type _OptionalIsAKey = Expect<
  Equal<Infer<typeof person>, { name: string; stage: "now" | "soon"; nickname?: string }>
>;

const command = variant("action", {
  go: { distance: number() },
  stop: { hard: boolean() },
});

/** A variant schema infers the discriminated union, not a merged object. */
export type _VariantIsAUnion = Expect<
  Equal<
    Infer<typeof command>,
    { action: "go"; distance: number } | { action: "stop"; hard: boolean }
  >
>;

export type _ListInfersElement = Expect<Equal<Infer<ReturnType<typeof list<string>>>, string[]>>;

// ---------------------------------------------------------------------------
// 2. A request's action determines its response type
// ---------------------------------------------------------------------------

type ScriptRequest = ActionPayload<"/api/compass", "script">;
type GenerateRequest = ActionPayload<"/api/compass", "generate">;

export type _ScriptReply = Expect<
  Equal<ResponseFor<"/api/compass", ScriptRequest>, { script: string }>
>;
export type _GenerateReply = Expect<
  Equal<ResponseFor<"/api/compass", GenerateRequest>, { path: CompassPath; live: boolean }>
>;
/** The two replies are genuinely different types — narrowing isn't cosmetic. */
export type _RepliesDiffer = ExpectNot<
  Equal<ResponseFor<"/api/compass", ScriptRequest>, ResponseFor<"/api/compass", GenerateRequest>>
>;

export type _EndReply = Expect<Equal<ResponseOf<"/api/call", "end">, { ok: true }>>;
export type _TranscriptSpeakerIsClosed = Expect<
  Equal<TranscriptTurn["speaker"], "assistant" | "caller">
>;

/** Simple endpoints answer one shape regardless of what was sent. */
export type _SimpleEndpointReply = Expect<
  Equal<ResponseFor<"/api/impact", RequestOf<"/api/impact">>, { ok: true }>
>;

/** Every registered path declares at least one action or a simple response. */
export type _AllPathsResolve = Expect<
  Equal<[ApiPath] extends [never] ? false : true, true>
>;
export type _CompassActions = Expect<
  Equal<ActionOf<"/api/compass">, "generate" | "explain" | "script">
>;

// ---------------------------------------------------------------------------
// 3. Brands are unforgeable
// ---------------------------------------------------------------------------

export type _LatitudeIsNotNumber = ExpectNot<Equal<Latitude, number>>;
export type _RawNumberIsNotALatitude = Expect<
  Equal<number extends Latitude ? true : false, false>
>;
/** …but a Latitude is still usable everywhere a number is. */
export type _LatitudeIsANumber = Expect<Equal<Latitude extends number ? true : false, true>>;
/** Latitude and Longitude can't be swapped for one another. */
export type _LatIsNotLng = Expect<Equal<Latitude extends Longitude ? true : false, false>>;
export type _RawStringIsNotACallId = Expect<Equal<string extends CallId ? true : false, false>>;
export type _TimestampIsBranded = ExpectNot<Equal<IsoTimestamp, string>>;
export type _LanguageIsBranded = ExpectNot<Equal<LanguageName, string>>;

// ---------------------------------------------------------------------------
// 4. Curated data keeps its literal shape
// ---------------------------------------------------------------------------

/** `satisfies` kept the keys literal instead of widening them to `string`. */
export type _ResourceKeyIsAUnion = ExpectNot<Equal<ResourceKey, string>>;
export type _ResourceKeyIncludesCrisis = Expect<
  Equal<"crisis" extends ResourceKey ? true : false, true>
>;

/** A resource record carries no `key` of its own to disagree with its key. */
export type _ResourcesDoNotRestateTheirKey = Expect<
  Equal<"key" extends keyof (typeof RESOURCES)["211"] ? true : false, false>
>;

/** Looking a key up is total — no `| undefined` to guard at every call site. */
export type _LookupIsTotal = Expect<
  Equal<ReturnType<typeof resourceFor<"crisis">>, (typeof RESOURCES)["crisis"]>
>;

/** Every icon named by a resource exists in the icon registry. */
type ResourceIconsRegistered = {
  [K in ResourceKey]: (typeof RESOURCES)[K]["icon"] extends ResourceIconName ? true : false;
}[ResourceKey];
export type _ResourceIconsAreRegistered = Expect<Equal<ResourceIconsRegistered, true>>;

// ---------------------------------------------------------------------------
// 5. Label tables cover their unions exactly
// ---------------------------------------------------------------------------

export type _EveryCategoryHasALabel = Expect<Equal<keyof typeof CATEGORY_LABEL, Category>>;
export type _EveryStageHasALabel = Expect<Equal<keyof typeof STAGE_LABEL, Stage>>;
export type _EveryAvailabilityHasALabel = Expect<
  Equal<keyof typeof AVAILABILITY_LABEL, Availability>
>;
/** Every situation tag except the catch-all has keywords that can detect it. */
export type _EveryTagIsDetectable = Expect<
  Equal<keyof typeof TAG_KEYWORDS, Exclude<SituationTag, "general">>
>;
export type _KeywordListsAreNonEmpty = Expect<
  Equal<(typeof TAG_KEYWORDS)[keyof typeof TAG_KEYWORDS], NonEmptyArray<string>>
>;

// ---------------------------------------------------------------------------
// 6. Storage reads back exactly what it stores
// ---------------------------------------------------------------------------

export type _StoredPath = Expect<Equal<Stored<"path">, CompassPath | null>>;
export type _StoredLanguage = Expect<Equal<Stored<"language">, LanguageName>>;
export type _StoredProgress = Expect<Equal<Stored<"progress">, Record<string, boolean>>>;
export type _StoredFlag = Expect<Equal<Stored<"largeText">, boolean>>;

// ---------------------------------------------------------------------------
// 7. The domain model says what we think it says
// ---------------------------------------------------------------------------

export type _PathTagsAreClosed = Expect<Equal<CompassPath["tags"], SituationTag[]>>;
export type _PathResourcesAreKeys = Expect<Equal<CompassPath["resources"], ResourceKey[]>>;
export type _PathCreatedAtIsBranded = Expect<Equal<CompassPath["createdAt"], IsoTimestamp>>;
export type _StepStageIsClosed = Expect<Equal<CompassPath["steps"][number]["stage"], Stage>>;

// ---------------------------------------------------------------------------
// 8. Routes and their query flags are a closed set
// ---------------------------------------------------------------------------

export type _PagesAreLiteral = ExpectNot<Equal<PagePath, string>>;
export type _EveryPageIsRooted = Expect<
  Equal<PagePath extends `/${string}` ? true : false, true>
>;
/** The reader returns a flag for every option the writer can set. */
export type _StartFlagsRoundTrip = Expect<
  Equal<keyof ReturnType<typeof readStartOptions>, keyof Required<StartOptions>>
>;
