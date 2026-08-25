// /api/call/[id] — polls a live Vapi call for its status and transcript so the
// UI can stream the conversation as it happens.
//
// `RouteContext<'/api/call/[id]'>` is Next 16's generated helper: the params
// type is derived from the route's own path, so renaming the folder to
// `[callId]` breaks this file instead of silently yielding `undefined`.
import { NextResponse, type NextRequest } from "next/server";
import { fetchJson } from "@/lib/fetch";
import { vapiCallSchema, vapiIsFinished, vapiTranscript, vapiCallUrl } from "@/lib/external";
import { isSimulatedCall, type CallId } from "@/lib/brand";
import type { CallStatusResponse } from "@/lib/api";

const VAPI_API_KEY = process.env.VAPI_API_KEY || "";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/call/[id]">) {
  const { id } = await ctx.params;
  const callId = id as CallId;

  if (!VAPI_API_KEY || isSimulatedCall(callId)) {
    return NextResponse.json<CallStatusResponse>({ status: "in-progress", transcript: [] });
  }

  const call = await fetchJson(vapiCallUrl(callId), vapiCallSchema, {
    headers: { Authorization: `Bearer ${VAPI_API_KEY}` },
    timeoutMs: 15_000,
  });
  if (!call.ok) {
    return NextResponse.json<CallStatusResponse>({ status: "error", transcript: [] }, { status: 502 });
  }

  return NextResponse.json<CallStatusResponse>({
    status: vapiIsFinished(call.value) ? "completed" : "in-progress",
    transcript: vapiTranscript(call.value),
  });
}
