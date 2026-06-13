// ============================================================================
// YNorth Guardian Agent — backend.
//
// AI used here:
//   • Gemini 2.5 Flash WITH Google Search grounding (callGeminiGrounded) — to find
//     REAL shelter options in NEARBY cities and to produce live, location-aware
//     public-transit directions. Grounding = real + cited, never hallucinated.
//
// In production the "vacancy watch" would subscribe to HMIS / 211 bed-availability
// feeds; for the demo the watch is simulated client-side and clearly labeled.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { callGeminiGrounded, extractJsonArray } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const action = body.action as string;

  // ---- find shelter / housing options in NEARBY cities ----
  if (action === "nearby") {
    const location = String(body.location || "").slice(0, 80);
    const situation = String(body.situation || "").slice(0, 400);
    if (!location) return NextResponse.json({ options: [], sources: [] });
    const prompt = `Find 3-4 REAL emergency shelters or interim-housing programs in cities NEAR "${location}" (not in ${location} itself — the surrounding region), suitable for someone who: "${situation}". Real, currently-operating places only.
Return ONLY a JSON array: [{ "name": "...", "city": "...", "helpsWith": "...", "contact": "..." }]. If none found, return [].`;
    const { text, sources } = await callGeminiGrounded(prompt, 0.2);
    const arr = extractJsonArray(text)
      .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
      .slice(0, 4)
      .map((x) => ({
        name: String(x.name || "").slice(0, 100),
        city: String(x.city || "").slice(0, 60),
        helpsWith: String(x.helpsWith || "").slice(0, 160),
        contact: x.contact ? String(x.contact).slice(0, 120) : undefined,
      }))
      .filter((o) => o.name);
    return NextResponse.json({ options: arr, sources });
  }

  // ---- step-by-step, low-cost transportation guidance to a destination ----
  if (action === "transport") {
    const origin = String(body.origin || "").slice(0, 80);
    const destination = String(body.destination || "").slice(0, 160);
    const prompt = `Give simple, step-by-step, LOW-COST public-transit directions for someone experiencing homelessness to get from "${origin}" to "${destination}". Include specific bus/train routes if you can find them, the approximate fare, and any free or reduced-fare transit programs for people experiencing homelessness in that area. Plain, warm language, numbered steps. Keep it short.`;
    const { text, sources } = await callGeminiGrounded(prompt, 0.3);
    const steps = text || `1. Call 211 and ask about free or reduced-fare transit to ${destination}.\n2. Ask the shelter if they offer transportation or a bus token.\n3. If you can, share your location with a caseworker who can help arrange a ride.`;
    return NextResponse.json({ steps, sources });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
