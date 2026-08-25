// /api/learn — the feedback endpoint. A "this helped" tap trains the YNorth
// Brain (an online-learning recommender) on what works for a given situation,
// so future people in similar situations get better-prioritised guidance.
//
// The old hand-written allowlist of valid categories lived here, duplicated
// from the model's own list. Now `learnRequestSchema` validates against the
// shared taxonomy, so the two can't drift apart — and `learn()` only ever
// receives tags and a category the model actually has weights for.
import { NextResponse, type NextRequest } from "next/server";
import { learn, loadBrain, saveBrain, stats } from "@/lib/brain";
import { parseBody } from "@/lib/route";
import type { BrainStats } from "@/lib/api";

export async function GET() {
  await loadBrain();
  return NextResponse.json<BrainStats>(stats());
}

export async function POST(req: NextRequest) {
  await loadBrain();
  const parsed = await parseBody("/api/learn", req);
  // Unrecognised feedback teaches nothing, but still gets the current stats
  // back so the UI's community counter stays live.
  if (parsed.ok && parsed.value.tags.length > 0) {
    const { tags, category, helped } = parsed.value;
    learn(tags, category, helped);
    void saveBrain();
  }
  return NextResponse.json<BrainStats>(stats());
}
