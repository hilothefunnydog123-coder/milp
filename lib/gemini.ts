// ============================================================================
// Gemini access layer. Two AI capabilities power YNorth:
//   • callGemini()         — Gemini 2.5 Flash for reasoning/generation: building
//                            the path, plain-language explainers, call scripts,
//                            multilingual output, post-call instruction summaries.
//   • callGeminiGrounded() — the SAME model WITH Google Search grounding so local
//                            resources are REAL and CITED, never hallucinated.
// Both degrade gracefully (return "") with no key, so the app always works.
//
// The model's JSON gets the same treatment as any other untrusted input: it is
// parsed through a schema (`parseModelList`, `parseModelObject`), so a reply
// that drifts from the format we asked for degrades to a fallback instead of
// arriving as `any` and being read as though it had obeyed.
// ============================================================================

import { fetchJson } from "./fetch";
import { geminiResponseSchema, geminiSources, geminiText } from "./external";
import type { Schema } from "./schema";
import type { Source } from "./types";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface GroundedReply {
  readonly text: string;
  readonly sources: Source[];
}

const EMPTY_GROUNDED: GroundedReply = { text: "", sources: [] };

function endpoint(key: string): string {
  return `${GEMINI_URL}?${new URLSearchParams({ key }).toString()}`;
}

/** Gemini 2.5 Flash via REST. Returns "" on no-key/error so callers fall back to a mock. */
export async function callGemini(
  prompt: string,
  maxOutputTokens: number,
  temperature: number
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return "";
  const result = await fetchJson(endpoint(key), geminiResponseSchema, {
    method: "POST",
    json: {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens,
        temperature,
        thinkingConfig: { thinkingBudget: 0 },
      },
    },
  });
  return result.ok ? geminiText(result.value) : "";
}

/**
 * Gemini WITH Google Search grounding — returns real, current, cited results.
 * This is how we get specific LOCAL resources without hallucinating them.
 */
export async function callGeminiGrounded(
  prompt: string,
  temperature: number
): Promise<GroundedReply> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return EMPTY_GROUNDED;
  const result = await fetchJson(endpoint(key), geminiResponseSchema, {
    method: "POST",
    json: {
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature },
    },
    timeoutMs: 30_000,
  });
  if (!result.ok) return EMPTY_GROUNDED;
  return { text: geminiText(result.value), sources: geminiSources(result.value) };
}

// ---------------------------------------------------------------------------
// Reading JSON back out of a language model
// ---------------------------------------------------------------------------

function stripFences(text: string): string {
  return text.replace(/```json/gi, "").replace(/```/g, "").trim();
}

function sliceBetween(text: string, open: string, close: string): string | null {
  const start = text.indexOf(open);
  const end = text.lastIndexOf(close);
  return start === -1 || end === -1 || end < start ? null : text.slice(start, end + 1);
}

function decode(raw: string | null): unknown {
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/**
 * Pulls the JSON array out of a reply (fences, preamble and all) and validates
 * every element. Malformed entries are dropped, not trusted — the model is
 * asked for a shape, it isn't held to it.
 */
export function parseModelList<T>(text: string, schema: Schema<T>): T[] {
  const decoded = decode(sliceBetween(stripFences(text), "[", "]"));
  if (!Array.isArray(decoded)) return [];
  const items: T[] = [];
  for (const raw of decoded) {
    const parsed = schema.parse(raw);
    if (parsed.ok) items.push(parsed.value);
  }
  return items;
}

/** Same, for a single JSON object. Returns null when the reply can't be trusted. */
export function parseModelObject<T>(text: string, schema: Schema<T>): T | null {
  const decoded = decode(sliceBetween(stripFences(text), "{", "}"));
  if (decoded === undefined) return null;
  const parsed = schema.parse(decoded);
  return parsed.ok ? parsed.value : null;
}

export const IS_LIVE = !!process.env.GEMINI_API_KEY;
