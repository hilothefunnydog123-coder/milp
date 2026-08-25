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
//
// Both actions hand model output straight to the UI, so both parse it through
// the same schemas the client will validate the reply against — an option that
// reaches the Guardian is one that survived the contract on the way out.
// ============================================================================

import { NextResponse, type NextRequest } from "next/server";
import { callGeminiGrounded, parseModelList } from "@/lib/gemini";
import { badRequest, parseBody } from "@/lib/route";
import { nearbyOptionSchema, type ActionPayload, type ResponseOf } from "@/lib/api";
import { assertNever } from "@/lib/typed";

type Reply<A extends "nearby" | "transport"> = ResponseOf<"/api/agent", A>;

/** Real shelter / interim-housing options in cities around them. */
async function nearby(body: ActionPayload<"/api/agent", "nearby">): Promise<Reply<"nearby">> {
  if (!body.location) return { options: [], sources: [] };
  const prompt = `Find 3-4 REAL emergency shelters or interim-housing programs in cities NEAR "${body.location}" (not in ${body.location} itself — the surrounding region), suitable for someone who: "${body.situation}". Real, currently-operating places only.
Return ONLY a JSON array: [{ "name": "...", "city": "...", "helpsWith": "...", "contact": "..." }]. If none found, return [].`;
  const { text, sources } = await callGeminiGrounded(prompt, 0.2);
  return { options: parseModelList(text, nearbyOptionSchema).slice(0, 4), sources };
}

/** Step-by-step, low-cost transportation guidance to a destination. */
async function transport(body: ActionPayload<"/api/agent", "transport">): Promise<Reply<"transport">> {
  const prompt = `Give simple, step-by-step, LOW-COST public-transit directions for someone experiencing homelessness to get from "${body.origin}" to "${body.destination}". Include specific bus/train routes if you can find them, the approximate fare, and any free or reduced-fare transit programs for people experiencing homelessness in that area. Plain, warm language, numbered steps. Keep it short.`;
  const { text, sources } = await callGeminiGrounded(prompt, 0.3);
  const steps =
    text ||
    `1. Call 211 and ask about free or reduced-fare transit to ${body.destination}.\n` +
      `2. Ask the shelter if they offer transportation or a bus token.\n` +
      `3. If you can, share your location with a caseworker who can help arrange a ride.`;
  return { steps, sources };
}

export async function POST(req: NextRequest) {
  const parsed = await parseBody("/api/agent", req);
  if (!parsed.ok) return badRequest(parsed.error);
  const body = parsed.value;

  switch (body.action) {
    case "nearby":
      return NextResponse.json<Reply<"nearby">>(await nearby(body));
    case "transport":
      return NextResponse.json<Reply<"transport">>(await transport(body));
    default:
      return assertNever(body, "agent action");
  }
}
