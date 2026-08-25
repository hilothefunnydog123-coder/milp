// ============================================================================
// The wire contract — one declaration per endpoint, shared by both sides.
//
// Before this file, every request and every response crossed the boundary as
// `any`. The route re-derived its own shape by hand (`String(body.x || "")`),
// the component re-derived a *different* one (`data.script || ""`), and the
// only thing keeping them in agreement was that the same person had written
// both that afternoon. Rename a field on one side and nothing complains until
// a user watches an empty panel where their call script should be.
//
// Here each endpoint declares its request schema and, for the multi-action
// ones, a response schema per action. Everything else — the server's parameter
// types, the client's argument types, the narrowed return type of a call, and
// the runtime validation at both ends — is derived from this registry. There is
// no second place to update, so there is nothing to keep in sync.
// ============================================================================

import {
  boolean,
  clamped,
  forgivingList,
  literal,
  nullable,
  number,
  object,
  oneOf,
  optional,
  orElse,
  text,
  variant,
  type Infer,
  type Schema,
} from "./schema";
import {
  callIdSchema,
  coordsSchema,
  languageSchema,
  DEFAULT_LANGUAGE,
  type LanguageName,
} from "./brand";
import { compassPathSchema, mapPinSchema, sourceSchema } from "./types";
import { categorySchema, situationTagSchema } from "./taxonomy";

/** A language field is never worth failing a request over — it degrades to English. */
const languageField: Schema<LanguageName> = orElse(languageSchema, DEFAULT_LANGUAGE);

// ---------------------------------------------------------------------------
// Shapes shared by several endpoints
// ---------------------------------------------------------------------------

/** Who spoke: our agent, or the help line on the other end. */
export const speakerSchema = oneOf(["assistant", "caller"] as const);
export type Speaker = Infer<typeof speakerSchema>;

export const transcriptTurnSchema = object({
  speaker: speakerSchema,
  text: text({ max: 2000 }),
});
export type TranscriptTurn = Infer<typeof transcriptTurnSchema>;

export const nearbyOptionSchema = object({
  name: text({ max: 100, min: 1 }),
  city: optional(text({ max: 60 })),
  helpsWith: optional(text({ max: 160 })),
  contact: optional(text({ max: 120 })),
});
export type NearbyOption = Infer<typeof nearbyOptionSchema>;

export const brainStatsSchema = object({
  runs: number({ int: true, min: 0 }),
  helpfulMarks: number({ int: true, min: 0 }),
  callsMade: number({ int: true, min: 0 }),
  bedsBooked: number({ int: true, min: 0 }),
  languages: forgivingList(text({ max: 30 }), { max: 200 }),
});
export type BrainStats = Infer<typeof brainStatsSchema>;

export const impactSnapshotSchema = object({
  paths: number({ int: true, min: 0 }),
  calls: number({ int: true, min: 0 }),
  beds: number({ int: true, min: 0 }),
  languages: number({ int: true, min: 0 }),
  helped: number({ int: true, min: 0 }),
});
export type ImpactSnapshot = Infer<typeof impactSnapshotSchema>;

export const acknowledgedSchema = object({ ok: literal(true) });
export type Acknowledged = Infer<typeof acknowledgedSchema>;

export const apiErrorSchema = object({ error: text({ max: 300 }) });
export type ApiErrorBody = Infer<typeof apiErrorSchema>;

// ---------------------------------------------------------------------------
// /api/compass — build the path, explain a step, write a phone script
// ---------------------------------------------------------------------------

export const compassRequestSchema = variant("action", {
  generate: {
    situation: clamped(1200),
    location: clamped(80),
    household: clamped(120),
    language: languageField,
  },
  explain: {
    term: clamped(120),
    context: clamped(300),
  },
  script: {
    title: clamped(120),
    stepAction: clamped(280),
    language: languageField,
  },
});
export type CompassRequest = Infer<typeof compassRequestSchema>;

export const compassGenerateResponseSchema = object({
  path: compassPathSchema,
  /** true when a real Gemini key served this, false when it's the fallback */
  live: boolean(),
});
export const compassExplainResponseSchema = object({ explanation: text({ max: 4000 }) });
export const compassScriptResponseSchema = object({ script: text({ max: 4000 }) });

// ---------------------------------------------------------------------------
// /api/agent — the Guardian's grounded searches
// ---------------------------------------------------------------------------

export const agentRequestSchema = variant("action", {
  nearby: {
    location: clamped(80),
    situation: clamped(400),
  },
  transport: {
    origin: clamped(80),
    destination: clamped(160),
  },
});
export type AgentRequest = Infer<typeof agentRequestSchema>;

export const agentNearbyResponseSchema = object({
  options: forgivingList(nearbyOptionSchema, { max: 4 }),
  sources: forgivingList(sourceSchema, { max: 6 }),
});
export const agentTransportResponseSchema = object({
  steps: text({ max: 4000 }),
  sources: forgivingList(sourceSchema, { max: 6 }),
});

// ---------------------------------------------------------------------------
// /api/call — place, end, and write up a real phone call
// ---------------------------------------------------------------------------

export const callProviderSchema = oneOf(["vapi", "mock"] as const);
/** "mock" means the client should run the clearly-labeled demo simulation. */
export type CallProvider = Infer<typeof callProviderSchema>;

export const callRequestSchema = variant("action", {
  start: {
    name: clamped(40),
    number: clamped(40),
    situation: clamped(800),
    language: languageField,
    /** the Guardian overrides these to book a specific bed */
    objective: orElse(clamped(400), ""),
    firstMessage: orElse(clamped(300), ""),
  },
  end: {
    controlUrl: clamped(500),
  },
  instructions: {
    name: clamped(40),
    transcript: forgivingList(transcriptTurnSchema, { max: 300 }),
  },
});
export type CallRequest = Infer<typeof callRequestSchema>;

/** Older clients posted a start with no `action` at all; keep understanding them. */
export function normalizeCallRequest(body: unknown): unknown {
  if (typeof body !== "object" || body === null) return body;
  const record = body as Record<string, unknown>;
  return typeof record.action === "string" ? record : { ...record, action: "start" };
}

export const callStartResponseSchema = object({
  provider: callProviderSchema,
  callId: callIdSchema,
  controlUrl: optional(text({ max: 500 })),
});
export const callInstructionsResponseSchema = object({ instructions: text({ max: 4000 }) });

export const callProgressSchema = oneOf(["in-progress", "completed", "error"] as const);
export type CallProgress = Infer<typeof callProgressSchema>;

export const callStatusResponseSchema = object({
  status: callProgressSchema,
  transcript: forgivingList(transcriptTurnSchema, { max: 300 }),
});
export type CallStatusResponse = Infer<typeof callStatusResponseSchema>;

// ---------------------------------------------------------------------------
// /api/learn and /api/impact — the learning model's two front doors
// ---------------------------------------------------------------------------

export const learnRequestSchema = object({
  tags: forgivingList(situationTagSchema, { max: 16 }),
  category: categorySchema,
  /** absent means "this helped" — the tap that sends it only ever means yes */
  helped: orElse(boolean(), true),
});
export type LearnRequest = Infer<typeof learnRequestSchema>;

export const impactEventSchema = oneOf(["call", "booked"] as const);
export type ImpactEvent = Infer<typeof impactEventSchema>;

export const impactRequestSchema = object({
  event: optional(impactEventSchema),
  language: optional(languageSchema),
});
export type ImpactRequest = Infer<typeof impactRequestSchema>;

// ---------------------------------------------------------------------------
// /api/geocode — put the person, and the help near them, on a map
// ---------------------------------------------------------------------------

export const geocodeRequestSchema = object({
  location: clamped(80),
  resources: forgivingList(object({ name: text({ max: 100, min: 1 }) }), { max: 6 }),
});
export type GeocodeRequest = Infer<typeof geocodeRequestSchema>;

export const geocodeResponseSchema = object({
  center: nullable(coordsSchema),
  pins: forgivingList(mapPinSchema, { max: 12 }),
});
export type GeocodeResponse = Infer<typeof geocodeResponseSchema>;

// ---------------------------------------------------------------------------
// The registry every other module reads
// ---------------------------------------------------------------------------

/**
 * Two flavours of endpoint: `actioned` ones speak a discriminated union and
 * answer differently per action; `simple` ones have one request and one reply.
 */
export type EndpointSpec =
  | {
      readonly kind: "actioned";
      readonly request: Schema<{ action: string }>;
      readonly responses: Readonly<Record<string, Schema<unknown>>>;
    }
  | {
      readonly kind: "simple";
      readonly request: Schema<unknown>;
      readonly response: Schema<unknown>;
    };

export const API = {
  "/api/compass": {
    kind: "actioned",
    request: compassRequestSchema,
    responses: {
      generate: compassGenerateResponseSchema,
      explain: compassExplainResponseSchema,
      script: compassScriptResponseSchema,
    },
  },
  "/api/agent": {
    kind: "actioned",
    request: agentRequestSchema,
    responses: {
      nearby: agentNearbyResponseSchema,
      transport: agentTransportResponseSchema,
    },
  },
  "/api/call": {
    kind: "actioned",
    request: callRequestSchema,
    responses: {
      start: callStartResponseSchema,
      end: acknowledgedSchema,
      instructions: callInstructionsResponseSchema,
    },
  },
  "/api/learn": {
    kind: "simple",
    request: learnRequestSchema,
    response: brainStatsSchema,
  },
  "/api/impact": {
    kind: "simple",
    request: impactRequestSchema,
    response: acknowledgedSchema,
  },
  "/api/geocode": {
    kind: "simple",
    request: geocodeRequestSchema,
    response: geocodeResponseSchema,
  },
} as const satisfies Record<string, EndpointSpec>;

export type ApiSpec = typeof API;

/** Every POST endpoint this app has. Nothing else can be called. */
export type ApiPath = keyof ApiSpec;

/** The body a given endpoint accepts. */
export type RequestOf<P extends ApiPath> = Infer<ApiSpec[P]["request"]>;

/** The action names a given endpoint understands ("" for simple endpoints). */
export type ActionOf<P extends ApiPath> = ApiSpec[P] extends { responses: infer M }
  ? keyof M & string
  : never;

/**
 * The reply *for one specific request value* — the conditional type that makes
 * `post("/api/compass", { action: "script", … })` resolve to `{ script: string }`
 * and nothing else. Send `action: "generate"` instead and the same call site
 * types as `{ path: CompassPath; live: boolean }`.
 */
export type ResponseFor<P extends ApiPath, R extends RequestOf<P>> = ApiSpec[P] extends {
  kind: "actioned";
  responses: infer M;
}
  ? R extends { action: infer A extends keyof M }
    ? Infer<M[A]>
    : never
  : ApiSpec[P] extends { kind: "simple"; response: infer S }
    ? Infer<S>
    : never;

/** The reply for one named action — what a route handler must return. */
export type ResponseOf<P extends ApiPath, A extends ActionOf<P>> = ApiSpec[P] extends {
  responses: infer M;
}
  ? A extends keyof M
    ? Infer<M[A]>
    : never
  : never;

/** Narrows a parsed request union down to one action's payload. */
export type ActionPayload<P extends ApiPath, A extends ActionOf<P>> = Extract<
  RequestOf<P>,
  { action: A }
>;

/** Looks up the response schema to validate against, given a request body. */
export function responseSchemaFor(path: ApiPath, body: unknown): Schema<unknown> {
  const spec: EndpointSpec = API[path];
  if (spec.kind === "simple") return spec.response;
  const action =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).action
      : undefined;
  const found = typeof action === "string" ? spec.responses[action] : undefined;
  if (!found) throw new Error(`${path} has no response schema for action ${String(action)}`);
  return found;
}

// ---------------------------------------------------------------------------
// GET endpoints — described as typed URLs, so the reply type travels with the URL
// ---------------------------------------------------------------------------

export interface GetEndpoint<T> {
  readonly url: string;
  readonly schema: Schema<T>;
}

export const GET_ENDPOINTS = {
  impact: (): GetEndpoint<ImpactSnapshot> => ({ url: "/api/impact", schema: impactSnapshotSchema }),
  brain: (): GetEndpoint<BrainStats> => ({ url: "/api/learn", schema: brainStatsSchema }),
  /** the id is encoded here, once, instead of at each of the two poll sites */
  callStatus: (id: string): GetEndpoint<CallStatusResponse> => ({
    url: `/api/call/${encodeURIComponent(id)}`,
    schema: callStatusResponseSchema,
  }),
} as const;
