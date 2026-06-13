// ============================================================================
// Gemini access layer. Two AI capabilities power YNorth:
//   • callGemini()         — Gemini 2.5 Flash for reasoning/generation: building
//                            the path, plain-language explainers, call scripts,
//                            multilingual output, post-call instruction summaries.
//   • callGeminiGrounded() — the SAME model WITH Google Search grounding so local
//                            resources are REAL and CITED, never hallucinated.
// Both degrade gracefully (return "") with no key, so the app always works.
// ============================================================================

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

/** Gemini 2.5 Flash via REST. Returns "" on no-key/error so callers fall back to a mock. */
export async function callGemini(
  prompt: string,
  maxOutputTokens: number,
  temperature: number
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return "";
  try {
    const res = await fetch(`${GEMINI_URL}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens,
          temperature,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });
    if (!res.ok) return "";
    const json = await res.json();
    return json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  } catch {
    return "";
  }
}

/**
 * Gemini WITH Google Search grounding — returns real, current, cited results.
 * This is how we get specific LOCAL resources without hallucinating them.
 */
export async function callGeminiGrounded(
  prompt: string,
  temperature: number
): Promise<{ text: string; sources: { title: string; uri: string }[] }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { text: "", sources: [] };
  try {
    const res = await fetch(`${GEMINI_URL}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature },
      }),
    });
    if (!res.ok) return { text: "", sources: [] };
    const json = await res.json();
    const cand = json.candidates?.[0];
    const text = cand?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") ?? "";
    const chunks = cand?.groundingMetadata?.groundingChunks ?? [];
    const sources = chunks
      .map((c: { web?: { uri?: string; title?: string } }) => ({
        title: c.web?.title || "",
        uri: c.web?.uri || "",
      }))
      .filter((s: { uri: string }) => s.uri)
      .slice(0, 6);
    return { text: text.trim(), sources };
  } catch {
    return { text: "", sources: [] };
  }
}

export function extractJsonArray(text: string): unknown[] {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1) return [];
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as unknown[];
  } catch {
    return [];
  }
}

export function extractJson(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export const IS_LIVE = !!process.env.GEMINI_API_KEY;
