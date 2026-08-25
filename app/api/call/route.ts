// ============================================================================
// Phone-call agent endpoint.
// AI used:
//   • Vapi (vapi.ai) — places the REAL outbound call: GPT-4o brain + OpenAI voice
//     + Deepgram transcription. It introduces the user, explains their situation,
//     and holds a real two-way conversation (or books a bed for the Guardian).
//   • Gemini 2.5 Flash (action: "instructions") — reads the finished transcript
//     and writes clear, plain-language next steps for the user.
// Falls back to a client-side demo simulation when Vapi isn't configured.
//
// The transcript that comes back in "instructions" is a `TranscriptTurn[]` with
// a two-value `speaker` union, not `{ speaker: string }` — so the line that
// renders it can't be handed a role nobody ever writes a label for.
// ============================================================================

import { NextResponse, type NextRequest } from "next/server";
import { callGemini } from "@/lib/gemini";
import { bumpCall, loadBrain, saveBrain } from "@/lib/brain";
import { badRequest, parseBody } from "@/lib/route";
import { fetchJson } from "@/lib/fetch";
import { vapiCreatedCallSchema, VAPI_BASE } from "@/lib/external";
import { simulatedCallId, type CallId } from "@/lib/brand";
import { normalizeCallRequest, type ActionPayload, type ResponseOf, type TranscriptTurn } from "@/lib/api";
import { assertNever } from "@/lib/typed";

type Reply<A extends "start" | "end" | "instructions"> = ResponseOf<"/api/call", A>;

const VAPI_API_KEY = process.env.VAPI_API_KEY || "";
const VAPI_PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID || "";
const VAPI_VOICE = process.env.VAPI_VOICE || "alloy";
const VAPI_MODEL = process.env.VAPI_MODEL || "gpt-4o";

/** Tell the client to run the safe, clearly-labeled demo simulation instead. */
function simulate(): Reply<"start"> {
  return { provider: "mock", callId: simulatedCallId(Date.now()) };
}

// ---- end / hang up a live call (best-effort via Vapi live control) ----
async function end(body: ActionPayload<"/api/call", "end">): Promise<Reply<"end">> {
  if (body.controlUrl) {
    try {
      await fetch(body.controlUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "end-call" }),
      });
    } catch {
      /* the UI ends regardless */
    }
  }
  return { ok: true };
}

// ---- summarize the finished call into next steps for the person ----
async function instructions(
  body: ActionPayload<"/api/call", "instructions">
): Promise<Reply<"instructions">> {
  const name = body.name || "you";
  const transcript: TranscriptTurn[] = body.transcript;
  const tx = transcript
    .map((turn) => `${turn.speaker === "assistant" ? "YNorth" : "Help line"}: ${turn.text}`)
    .join("\n");
  const prompt = `From this phone call transcript, write clear, encouraging, step-by-step instructions for ${name} on what to do next — based ONLY on what the help line actually said. Plain language, numbered. Include what to bring, where to go, and any phone numbers or appointment times mentioned. End with one short reassuring sentence.

TRANSCRIPT:
${tx}

Reply with only the instructions.`;
  const written = await callGemini(prompt, 600, 0.4);
  if (written) return { instructions: written };
  return {
    instructions:
      `Here's what to do next, ${name}:\n\n` +
      `1. Go to the Coordinated Entry access point they mentioned to get assessed.\n` +
      `2. Bring any photo ID and proof of income if you have them.\n` +
      `3. If you need a place tonight, call the line back and ask for an open shelter bed.\n\n` +
      `You took a big step today — you've got this.`,
  };
}

// ---- start a call ----
async function start(body: ActionPayload<"/api/call", "start">): Promise<Reply<"start"> | null> {
  const { name, situation, language, objective } = body;
  const number = body.number.trim();
  if (!name || !number) return null;

  // count every call attempt toward the live impact tally
  await loadBrain();
  bumpCall();
  void saveBrain();

  // No Vapi configured -> tell the client to run the safe demo simulation.
  if (!VAPI_API_KEY || !VAPI_PHONE_NUMBER_ID) return simulate();

  const goal =
    objective ||
    `Clearly explain ${name}'s situation and ask exactly what ${name} should do ` +
      `next — the immediate steps, what to bring, where to go, and any phone numbers or ` +
      `appointment times. ${name}'s situation in their words: "${situation}".`;

  const system =
    `You are a warm, natural-sounding person making a phone call on behalf of ${name}, ` +
    `who is experiencing a housing emergency and asked you to get help. You are having a ` +
    `real two-way conversation — listen and react.\n\n` +
    `YOUR GOAL: ${goal}\n\n` +
    `HOW TO TALK:\n- Open by introducing yourself as an assistant calling on behalf of ${name}, ` +
    `in one sentence, then let them respond.\n- Listen and respond to what they say.\n` +
    `- Ask one thing at a time, short conversational turns.\n` +
    `- At the end, summarize the guidance back, thank them warmly, and say goodbye.` +
    (language.toLowerCase() !== "english" ? `\n\nConduct the ENTIRE call in ${language}.` : "");

  const firstMessage =
    body.firstMessage ||
    `Hi, my name is YNorth and I'm an assistant calling on behalf of ${name}. They're facing a housing emergency and asked me to find out how they can get help. Do you have a moment?`;

  const assistant = {
    model: {
      provider: "openai",
      model: VAPI_MODEL,
      temperature: 0.7,
      messages: [{ role: "system", content: system }],
    },
    voice: { provider: "openai", voiceId: VAPI_VOICE },
    firstMessage,
  };

  const created = await fetchJson(`${VAPI_BASE}/call`, vapiCreatedCallSchema, {
    method: "POST",
    headers: { Authorization: `Bearer ${VAPI_API_KEY}` },
    json: { phoneNumberId: VAPI_PHONE_NUMBER_ID, customer: { number }, assistant },
    timeoutMs: 25_000,
  });

  // Vapi failed (e.g., daily limit, bad number) — fall back to the safe demo
  // simulation so the call feature never shows an error on stage.
  if (!created.ok) return simulate();

  const controlUrl = created.value.monitor?.controlUrl;
  return {
    provider: "vapi",
    callId: created.value.id as CallId,
    ...(controlUrl ? { controlUrl } : {}),
  };
}

export async function POST(req: NextRequest) {
  const parsed = await parseBody("/api/call", req, normalizeCallRequest);
  if (!parsed.ok) return badRequest(parsed.error);
  const body = parsed.value;

  switch (body.action) {
    case "end":
      return NextResponse.json<Reply<"end">>(await end(body));
    case "instructions":
      return NextResponse.json<Reply<"instructions">>(await instructions(body));
    case "start": {
      const started = await start(body);
      return started
        ? NextResponse.json<Reply<"start">>(started)
        : badRequest("Name and number are required.");
    }
    default:
      return assertNever(body, "call action");
  }
}
