// Live impact tallies for the "lives in motion" counter. Backed by the same
// Supabase-persisted brain state, so it reflects real cumulative usage.
import { NextRequest, NextResponse } from "next/server";
import { addLanguage, bumpBooked, bumpCall, loadBrain, saveBrain, stats } from "@/lib/brain";

export async function GET() {
  await loadBrain();
  const s = stats();
  return NextResponse.json({
    paths: s.runs,
    calls: s.callsMade,
    beds: s.bedsBooked,
    languages: s.languages.length,
    helped: s.helpfulMarks,
  });
}

export async function POST(req: NextRequest) {
  await loadBrain();
  const body = await req.json();
  if (body.event === "call") bumpCall();
  if (body.event === "booked") bumpBooked();
  if (body.language) addLanguage(String(body.language));
  saveBrain();
  return NextResponse.json({ ok: true });
}
