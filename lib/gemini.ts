const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

/**
 * Call Gemini 2.5 Flash via REST. Returns "" if no key or on error so the
 * caller can gracefully fall back to a mock — the demo NEVER hangs.
 */
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

export function estTokens(s: string): number {
  return Math.ceil((s || "").length / 4);
}

export function clamp100(v: unknown): number {
  return Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
}

export function extractJson(text: string): Record<string, unknown> | null {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
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
