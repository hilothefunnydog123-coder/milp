// ============================================================================
// Phone-call agent endpoint.
// AI used:
//   • Vapi (vapi.ai) — places the REAL outbound call: GPT-4o brain + OpenAI voice
//     + Deepgram transcription. It introduces the user, explains their situation,
//     and holds a real two-way conversation (or books a bed for the Guardian).
//   • Gemini 2.5 Flash (action: "instructions") — reads the finished transcript
//     and writes clear, plain-language next steps for the user.
// Falls back to a client-side demo simulation when Vapi isn't configured.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";
import { bumpCall, loadBrain, saveBrain } from "@/lib/brain";

const VAPI_API_KEY = process.env.VAPI_API_KEY || "";
const VAPI_PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID || "";
const VAPI_VOICE = process.env.VAPI_VOICE || "alloy";
const VAPI_MODEL = process.env.VAPI_MODEL || "gpt-4o";

interface Turn { speaker: string; text: string }

export async function POST(req: NextRequest) {
  const body = await req.json();

  // ---- end / hang up a live call (best-effort via Vapi live control) ----
  if (body.action === "end") {
    const controlUrl = String(body.controlUrl || "");
    if (controlUrl) {
      try {
        await fetch(controlUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "end-call" }),
        });
      } catch { /* the UI ends regardless */ }
    }
    return NextResponse.json({ ok: true });
  }

  // ---- summarize the finished call into next steps for the person ----
  if (body.action === "instructions") {
    const name = String(body.name || "you").slice(0, 40);
    const turns = (body.transcript as Turn[]) || [];
    const tx = turns.map((t) => `${t.speaker === "assistant" ? "YNorth" : "Help line"}: ${t.text}`).join("\n");
    const prompt = `From this phone call transcript, write clear, encouraging, step-by-step instructions for ${name} on what to do next — based ONLY on what the help line actually said. Plain language, numbered. Include what to bring, where to go, and any phone numbers or appointment times mentioned. End with one short reassuring sentence.

TRANSCRIPT:
${tx}

Reply with only the instructions.`;
    let instructions = await callGemini(prompt, 600, 0.4);
    if (!instructions) {
      instructions = `Here's what to do next, ${name}:\n\n1. Go to the Coordinated Entry access point they mentioned to get assessed.\n2. Bring any photo ID and proof of income if you have them.\n3. If you need a place tonight, call the line back and ask for an open shelter bed.\n\nYou took a big step today — you've got this.`;
    }
    return NextResponse.json({ instructions });
  }

  // ---- start a call ----
  const name = String(body.name || "").slice(0, 40);
  const number = String(body.number || "").trim();
  const situation = String(body.situation || "").slice(0, 800);
  const language = String(body.language || "English").slice(0, 30);
  // Optional override: the Guardian agent passes a booking objective + opening line.
  const objective = String(body.objective || "").slice(0, 400);
  if (!name || !number) {
    return NextResponse.json({ error: "Name and number are required." }, { status: 400 });
  }

  // count every call attempt toward the live impact tally
  await loadBrain();
  bumpCall();
  saveBrain();

  // No Vapi configured -> tell the client to run the safe demo simulation.
  if (!VAPI_API_KEY || !VAPI_PHONE_NUMBER_ID) {
    return NextResponse.json({ provider: "mock", callId: "mock-" + Date.now() });
  }

  const goal = objective
    ? objective
    : `Clearly explain ${name}'s situation and ask exactly what ${name} should do ` +
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
    String(body.firstMessage || "").slice(0, 300) ||
    `Hi, my name is YNorth and I'm an assistant calling on behalf of ${name}. They're facing a housing emergency and asked me to find out how they can get help. Do you have a moment?`;

  const assistant = {
    model: { provider: "openai", model: VAPI_MODEL, temperature: 0.7, messages: [{ role: "system", content: system }] },
    voice: { provider: "openai", voiceId: VAPI_VOICE },
    firstMessage,
  };

  try {
    const r = await fetch("https://api.vapi.ai/call", {
      method: "POST",
      headers: { Authorization: `Bearer ${VAPI_API_KEY}`, "Content-Type": "application/json" },
      // monitorPlan.controlEnabled returns a controlUrl we can POST to to hang up.
      body: JSON.stringify({ phoneNumberId: VAPI_PHONE_NUMBER_ID, customer: { number }, assistant, monitorPlan: { controlEnabled: true } }),
    });
    if (r.status >= 300) {
      const t = await r.text();
      return NextResponse.json({ error: `Vapi error ${r.status}: ${t.slice(0, 200)}` }, { status: 502 });
    }
    const j = await r.json();
    return NextResponse.json({ provider: "vapi", callId: j.id, controlUrl: j.monitor?.controlUrl || "" });
  } catch {
    return NextResponse.json({ provider: "mock", callId: "mock-" + Date.now() });
  }
}
