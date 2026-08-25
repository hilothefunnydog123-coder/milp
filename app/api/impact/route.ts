// Live impact tallies for the "lives in motion" counter. Backed by the same
// Supabase-persisted brain state, so it reflects real cumulative usage.
//
// The POST body is a two-value event union rather than a free string, so a
// client typo ("book" for "booked") is a build error here, not a tally that
// silently never moves.
import { NextResponse, type NextRequest } from "next/server";
import { addLanguage, bumpBooked, bumpCall, loadBrain, saveBrain, stats } from "@/lib/brain";
import { parseBody } from "@/lib/route";
import { assertNever } from "@/lib/typed";
import type { Acknowledged, ImpactSnapshot } from "@/lib/api";

export async function GET() {
  await loadBrain();
  const s = stats();
  return NextResponse.json<ImpactSnapshot>({
    paths: s.runs,
    calls: s.callsMade,
    beds: s.bedsBooked,
    languages: s.languages.length,
    helped: s.helpfulMarks,
  });
}

export async function POST(req: NextRequest) {
  await loadBrain();
  const parsed = await parseBody("/api/impact", req);
  // A tally bump is never worth failing a user's flow over.
  if (parsed.ok) {
    const { event, language } = parsed.value;
    if (event !== undefined) {
      switch (event) {
        case "call":
          bumpCall();
          break;
        case "booked":
          bumpBooked();
          break;
        default:
          assertNever(event, "impact event");
      }
    }
    if (language) addLanguage(language);
    void saveBrain();
  }
  return NextResponse.json<Acknowledged>({ ok: true });
}
