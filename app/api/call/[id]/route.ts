// /api/call/[id] — polls a live Vapi call for its status and transcript so the
// UI can stream the conversation as it happens.
import { NextRequest, NextResponse } from "next/server";

const VAPI_API_KEY = process.env.VAPI_API_KEY || "";

// Poll a live Vapi call for status + transcript.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!VAPI_API_KEY || id.startsWith("mock")) {
    return NextResponse.json({ status: "in-progress", transcript: [] });
  }
  try {
    const r = await fetch(`https://api.vapi.ai/call/${id}`, {
      headers: { Authorization: `Bearer ${VAPI_API_KEY}` },
    });
    if (r.status >= 300) return NextResponse.json({ status: "error", transcript: [] }, { status: 502 });
    const d = await r.json();
    const msgs = d.artifact?.messages || d.messages || [];
    const transcript = msgs
      .filter((m: { role?: string }) => (m.role || "").toLowerCase() !== "system")
      .map((m: { role?: string; message?: string; content?: string }) => ({
        speaker: ["assistant", "bot"].includes((m.role || "").toLowerCase()) ? "assistant" : "caller",
        text: m.message || m.content || "",
      }))
      .filter((t: { text: string }) => t.text);
    return NextResponse.json({ status: d.status === "ended" ? "completed" : "in-progress", transcript });
  } catch {
    return NextResponse.json({ status: "error", transcript: [] }, { status: 502 });
  }
}
