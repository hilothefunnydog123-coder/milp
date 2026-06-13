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
import {
  addLanguage,
  CATEGORY_LABEL,
  deriveTags,
  loadBrain,
  noteRun,
  recommend,
  saveBrain,
  stats,
  type Category,
} from "@/lib/brain";
import type { CompassPath, CompassStep, Intake, LocalResource, Source, Stage } from "@/lib/types";

const STAGES: Stage[] = ["now", "soon", "later"];

function sanitize(raw: Record<string, unknown>, intake: Intake): CompassPath {
  const rawSteps = Array.isArray(raw.steps) ? (raw.steps as Record<string, unknown>[]) : [];
  const cats = ["safety", "shelter", "rent", "documents", "benefits", "food", "legal", "veteran", "health", "work"];
  const steps: CompassStep[] = rawSteps.slice(0, 9).map((s, i) => {
    const stage = STAGES.includes(s.stage as Stage) ? (s.stage as Stage) : "soon";
    const category = typeof s.category === "string" && cats.includes(s.category) ? s.category : undefined;
    return {
      id: `s${i + 1}`,
      title: String(s.title || "Next step").slice(0, 80),
      stage,
      plain: String(s.plain || "").slice(0, 400),
      action: String(s.action || "").slice(0, 280),
      docs: Array.isArray(s.docs) ? (s.docs as unknown[]).map((d) => String(d)).slice(0, 5) : [],
      category,
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
    tags: [],
    community: { runs: 0, top: [] },
    location: intake.location || "your area",
    createdAt: new Date().toISOString(),
  };
}

/** Grounded search for REAL local orgs near the person, tailored to their situation. */
async function findLocalResources(
  intake: Intake
): Promise<{ localResources: LocalResource[]; sources: Source[] }> {
  if (!intake.location.trim()) return { localResources: [], sources: [] };
  const prompt = `Find 4 to 6 REAL, currently-operating organizations or programs in or near "${intake.location}" that can directly help a person in this situation: "${intake.situation}".

This must work for ANY location in the world — use that area's real local nonprofits, government services, and the country/region's equivalent systems (shelter intake, housing/benefits agencies, food, legal aid, crisis lines). Prioritize the most useful, currently-operating options for THIS person's specific needs.

Only include organizations you can actually find right now. For each give a short helpsWith (include eligibility or hours if known) and a real contact (phone or website) when available.

Return ONLY a JSON array, no prose:
[{ "name": "...", "helpsWith": "...", "contact": "..." }]
If you genuinely cannot find real local ones, return [].`;

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

  // ---- "What do I say?" — a calm, ready-to-read script for a call or visit ----
  if (action === "script") {
    const title = String(body.title || "").slice(0, 120);
    const act = String(body.stepAction || "").slice(0, 280);
    const language = String(body.language || "English").slice(0, 30);
    const prompt = `Someone experiencing housing insecurity needs to make this call/visit but feels anxious about what to say. Write them a short, calm script they can read aloud, first-person ("Hi, my name is..."), 4-6 simple lines. Include what to ask for and one question to confirm next steps. Warm and confident, no jargon. Write it in ${language}.

THE STEP: ${title}
WHAT THEY NEED TO DO: ${act}

Reply with ONLY the script lines, no preamble.`;
    let reply = await callGemini(prompt, 400, 0.5);
    if (!reply) {
      reply = `Hi, my name is ___. I'm experiencing a housing emergency and I was hoping you could help me.\n\nI'm trying to: ${act}\n\nCould you tell me what I need to bring, and what the next step is?\n\nThank you so much for your time.`;
    }
    return NextResponse.json({ script: reply });
  }

  if (action === "generate") {
    const intake: Intake = {
      situation: String(body.situation || "").slice(0, 1200),
      location: String(body.location || "").slice(0, 80),
      household: String(body.household || "").slice(0, 120),
    };

    // 1. read situation signals + what the learning model recommends
    await loadBrain();
    const tags = deriveTags(intake.situation);
    noteRun();
    saveBrain();
    const recommended = recommend(tags);
    const recLabels = recommended.map((c: Category) => CATEGORY_LABEL[c]);

    // 2. research REAL local resources first (grounded), so the path can name them
    const local = await findLocalResources(intake);
    const realList = local.localResources.length
      ? local.localResources
          .map((r) => `- ${r.name}${r.contact ? ` (${r.contact})` : ""}: ${r.helpsWith}`)
          .join("\n")
      : "(none found — give the next concrete action without naming an org)";

    const language = String(body.language || "English").slice(0, 30);
    addLanguage(language);
    const prompt = `You are a compassionate, expert housing navigator helping someone experiencing housing insecurity. Build a clear, dignified, step-by-step PATH to stable housing. Warm, plain language (6th-grade reading level). Treat them as a capable person, never a case file. Specific and hopeful, never preachy.

WRITE ALL TEXT (summary, every step's title/plain/action, documents) in ${language}.

THEIR SITUATION: ${intake.situation}
LOCATION: ${intake.location || "(not given)"}
HOUSEHOLD: ${intake.household || "(not given)"}

REAL LOCAL RESOURCES we found for them (use ONLY these — never invent others; weave the right one, BY NAME with its contact, into the relevant step's action):
${realList}

What has helped most people in similar situations (prioritize these kinds of help early): ${recLabels.join(", ")}.

Order steps by urgency: "now" (today/this week), "soon" (next couple weeks), "later" (the path to a stable home). Each step's action must be ONE concrete thing they can do — naming the specific real resource above when one fits.

Return ONLY raw JSON, no markdown:
{
  "summary": "<warm 2-3 sentence reflection + genuine hope, speaking TO them>",
  "steps": [
    { "title": "<short, encouraging>", "stage": "now|soon|later", "plain": "<what & why, plain + warm, 1-2 sentences>", "action": "<one concrete next action, naming a real resource + contact when one fits>", "docs": ["<doc needed>"], "category": "<one of: safety, shelter, rent, documents, benefits, food, legal, veteran, health, work>" }
  ],
  "documents": ["<vital documents to gather, plain labels>"]
}`;

    const raw = await callGemini(prompt, 2000, 0.5);
    const parsed = extractJson(raw);
    const path = parsed ? sanitize(parsed, intake) : mockPath(intake);
    path.localResources = local.localResources;
    path.sources = local.sources;
    path.tags = tags;
    path.community = { runs: stats().runs, top: recLabels };
    return NextResponse.json({ path, live: IS_LIVE });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
