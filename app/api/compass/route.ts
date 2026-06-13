import { NextRequest, NextResponse } from "next/server";
import {
  callGemini,
  callGeminiGrounded,
  extractJson,
  extractJsonArray,
  IS_LIVE,
} from "@/lib/gemini";
import { RESOURCES, RESOURCE_KEYS } from "@/lib/resources";
import { mockPath, plainExplainMock } from "@/lib/mock";
import type { CompassPath, CompassStep, Intake, LocalResource, Source, Stage } from "@/lib/types";

const STAGES: Stage[] = ["now", "soon", "later"];

function sanitize(raw: Record<string, unknown>, intake: Intake): CompassPath {
  const rawSteps = Array.isArray(raw.steps) ? (raw.steps as Record<string, unknown>[]) : [];
  const steps: CompassStep[] = rawSteps.slice(0, 9).map((s, i) => {
    const stage = STAGES.includes(s.stage as Stage) ? (s.stage as Stage) : "soon";
    const key = typeof s.resourceKey === "string" && RESOURCE_KEYS.includes(s.resourceKey)
      ? (s.resourceKey as string)
      : undefined;
    return {
      id: `s${i + 1}`,
      title: String(s.title || "Next step").slice(0, 80),
      stage,
      plain: String(s.plain || "").slice(0, 400),
      action: String(s.action || "").slice(0, 240),
      docs: Array.isArray(s.docs) ? (s.docs as unknown[]).map((d) => String(d)).slice(0, 5) : [],
      resourceKey: key,
    };
  });
  const resources = Array.isArray(raw.resources)
    ? (raw.resources as unknown[]).map(String).filter((k) => RESOURCE_KEYS.includes(k))
    : [];
  // always offer crisis support
  if (!resources.includes("crisis")) resources.push("crisis");
  const documents = Array.isArray(raw.documents)
    ? (raw.documents as unknown[]).map(String).slice(0, 8)
    : [];
  return {
    summary: String(raw.summary || "").slice(0, 600),
    steps: steps.length ? steps : mockPath(intake).steps,
    documents: documents.length ? documents : mockPath(intake).documents,
    resources: Array.from(new Set(resources)),
    localResources: [],
    sources: [],
    location: intake.location || "your area",
    createdAt: new Date().toISOString(),
  };
}

/** Grounded search for REAL local orgs near the person, tailored to their situation. */
async function findLocalResources(
  intake: Intake
): Promise<{ localResources: LocalResource[]; sources: Source[] }> {
  if (!intake.location.trim()) return { localResources: [], sources: [] };
  const prompt = `Find 3 to 5 REAL, currently-operating organizations or programs in or near "${intake.location}" that can directly help a person in this situation: "${intake.situation}".

Prioritize: emergency shelter, the local Continuum of Care / Coordinated Entry, the area's Public Housing Authority, rental assistance, food, and any service matching their specific needs.

Only include organizations you can actually find. For each, give a short helpsWith and a real contact (phone or website) when available.

Return ONLY a JSON array, no prose:
[{ "name": "...", "helpsWith": "...", "contact": "..." }]
If you cannot find real local ones, return [].`;

  const { text, sources } = await callGeminiGrounded(prompt, 0.2);
  const arr = extractJsonArray(text);
  const localResources: LocalResource[] = arr
    .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
    .slice(0, 5)
    .map((x) => ({
      name: String(x.name || "").slice(0, 100),
      helpsWith: String(x.helpsWith || "").slice(0, 160),
      contact: x.contact ? String(x.contact).slice(0, 120) : undefined,
    }))
    .filter((r) => r.name);
  return { localResources, sources };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const action = body.action as string;

  if (action === "explain") {
    const term = String(body.term || "").slice(0, 120);
    const context = String(body.context || "").slice(0, 300);
    const prompt = `You help people experiencing housing insecurity. In 2-3 short, warm, plain-language sentences (6th-grade reading level, no jargon, no condescension), explain what this means and why it matters for getting housed. Be encouraging and concrete.

TERM/STEP: ${term}
CONTEXT: ${context}

Reply with only the explanation, no preamble.`;
    let reply = await callGemini(prompt, 300, 0.4);
    if (!reply) reply = plainExplainMock(term);
    return NextResponse.json({ explanation: reply });
  }

  if (action === "generate") {
    const intake: Intake = {
      situation: String(body.situation || "").slice(0, 1200),
      location: String(body.location || "").slice(0, 80),
      household: String(body.household || "").slice(0, 120),
    };

    const resourceList = RESOURCE_KEYS.map((k) => `"${k}" = ${RESOURCES[k].name}`).join("\n");
    const prompt = `You are a compassionate, expert housing navigator helping someone experiencing housing insecurity. From their words, build a clear, dignified, step-by-step PATH to stable housing. Warm, plain language (6th-grade reading level). Treat them as a capable person, never a case file. Be specific and hopeful, never preachy.

CRITICAL SAFETY RULE: Never invent specific shelters, agencies, phone numbers, or addresses. For each step you may reference ONE resource ONLY by a key from this exact list (or none):
${resourceList}

THEIR SITUATION: ${intake.situation}
LOCATION: ${intake.location || "(not given)"}
HOUSEHOLD: ${intake.household || "(not given)"}

Order steps by urgency using stage: "now" (today/this week), "soon" (next couple weeks), "later" (the path to a stable home). Put safety and the local help line first; getting onto Coordinated Entry early matters most.

Return ONLY raw JSON, no markdown:
{
  "summary": "<warm 2-3 sentence reflection of their situation + genuine hope, speaking TO them>",
  "steps": [
    { "title": "<short, encouraging>", "stage": "now|soon|later", "plain": "<what & why, plain + warm, 1-2 sentences>", "action": "<one concrete next action>", "docs": ["<doc needed>"], "resourceKey": "<one key from the list or omit>" }
  ],
  "documents": ["<vital documents to gather, plain labels>"],
  "resources": ["<keys from the list that apply to this person>"]
}`;

    // Build the tailored path and find real local resources in parallel.
    const [raw, local] = await Promise.all([
      callGemini(prompt, 2000, 0.5),
      findLocalResources(intake),
    ]);
    const parsed = extractJson(raw);
    const path = parsed ? sanitize(parsed, intake) : mockPath(intake);
    path.localResources = local.localResources;
    path.sources = local.sources;
    return NextResponse.json({ path, live: IS_LIVE });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
