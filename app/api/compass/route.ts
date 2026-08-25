// ============================================================================
// /api/compass — the planning brain. Actions:
//   "generate": builds a tailored, plain-language path home. It first runs a
//      grounded web search for REAL local resources, then asks Gemini to weave
//      them into ordered Now/Soon/Later steps; it also records the chosen
//      language and asks the learning model which kinds of help to prioritise.
//   "explain":  a plain-language explainer for a step or term (Gemini).
//   "script":   a calm, ready-to-read phone script for a step (Gemini).
// Every action degrades to deterministic fallbacks when no Gemini key is set.
//
// The action union comes from the contract, so the switch below is checked for
// exhaustiveness: add an action to lib/api.ts and this file stops compiling
// until it is handled. Gemini's JSON is parsed through `modelPathSchema`
// rather than cast, which is what lets `sanitize` be an assembly step instead
// of thirty lines of defensive `String(x || "").slice(...)`.
// ============================================================================
import { NextResponse, type NextRequest } from "next/server";
import { callGemini, callGeminiGrounded, parseModelList, parseModelObject, IS_LIVE } from "@/lib/gemini";
import { mockPath, plainExplainMock } from "@/lib/mock";
import { badRequest, parseBody } from "@/lib/route";
import { clamped, forgivingList, object, orElse, optional, type Infer } from "@/lib/schema";
import { nowIso, stepId, type LanguageName } from "@/lib/brand";
import { ALWAYS_OFFERED, resourceKeySchema, type ResourceKey } from "@/lib/resources";
import {
  addLanguage,
  deriveTags,
  labelFor,
  loadBrain,
  noteRun,
  recommend,
  saveBrain,
  stats,
} from "@/lib/brain";
import { categorySchema } from "@/lib/taxonomy";
import {
  compassPathSchema,
  localResourceSchema,
  stageSchema,
  type CompassPath,
  type CompassStep,
  type Intake,
  type LocalResource,
  type Source,
} from "@/lib/types";
import { assertNever } from "@/lib/typed";
import type { ActionPayload, ResponseOf } from "@/lib/api";

type Reply<A extends "generate" | "explain" | "script"> = ResponseOf<"/api/compass", A>;

// ---------------------------------------------------------------------------
// What we accept back from the model — declared, not assumed
// ---------------------------------------------------------------------------

const modelStepSchema = object({
  title: orElse(clamped(80), "Next step"),
  stage: orElse(stageSchema, "soon"),
  plain: orElse(clamped(400), ""),
  action: orElse(clamped(280), ""),
  docs: forgivingList(clamped(120), { max: 5 }),
  category: optional(categorySchema),
});

const modelPathSchema = object({
  summary: orElse(clamped(600), ""),
  steps: forgivingList(modelStepSchema, { max: 9 }),
  documents: forgivingList(clamped(120), { max: 8 }),
  /** the model may only ever name keys from our curated table */
  resources: forgivingList(resourceKeySchema, { max: 16 }),
});

type ModelPath = Infer<typeof modelPathSchema>;

/** Turns a validated model reply into a real CompassPath, filling any gaps. */
function assemble(raw: ModelPath, intake: Intake): CompassPath {
  const steps: CompassStep[] = raw.steps.map((step, i) => ({
    id: stepId(i + 1),
    title: step.title,
    stage: step.stage,
    plain: step.plain,
    action: step.action,
    docs: step.docs,
    ...(step.category ? { category: step.category } : {}),
  }));
  const resources: ResourceKey[] = raw.resources.includes(ALWAYS_OFFERED)
    ? raw.resources
    : [...raw.resources, ALWAYS_OFFERED];
  const fallback = mockPath(intake);
  return {
    summary: raw.summary,
    steps: steps.length ? steps : fallback.steps,
    documents: raw.documents.length ? raw.documents : fallback.documents,
    resources: Array.from(new Set(resources)),
    localResources: [],
    sources: [],
    tags: [],
    community: { runs: 0, top: [] },
    location: intake.location || "your area",
    createdAt: nowIso(),
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
  return { localResources: parseModelList(text, localResourceSchema).slice(0, 5), sources };
}

// ---------------------------------------------------------------------------
// Handlers, one per action
// ---------------------------------------------------------------------------

async function explain(body: ActionPayload<"/api/compass", "explain">): Promise<Reply<"explain">> {
  const prompt = `You help people experiencing housing insecurity. In 2-3 short, warm, plain-language sentences (6th-grade reading level, no jargon, no condescension), explain what this means and why it matters for getting housed. Be encouraging and concrete.

TERM/STEP: ${body.term}
CONTEXT: ${body.context}

Reply with only the explanation, no preamble.`;
  const reply = await callGemini(prompt, 300, 0.4);
  return { explanation: reply || plainExplainMock(body.term) };
}

/** "What do I say?" — a calm, ready-to-read script for a call or visit. */
async function script(body: ActionPayload<"/api/compass", "script">): Promise<Reply<"script">> {
  const prompt = `Someone experiencing housing insecurity needs to make this call/visit but feels anxious about what to say. Write them a short, calm script they can read aloud, first-person ("Hi, my name is..."), 4-6 simple lines. Include what to ask for and one question to confirm next steps. Warm and confident, no jargon. Write it in ${body.language}.

THE STEP: ${body.title}
WHAT THEY NEED TO DO: ${body.stepAction}

Reply with ONLY the script lines, no preamble.`;
  const reply = await callGemini(prompt, 400, 0.5);
  if (reply) return { script: reply };
  return {
    script:
      `Hi, my name is ___. I'm experiencing a housing emergency and I was hoping you could help me.\n\n` +
      `I'm trying to: ${body.stepAction}\n\n` +
      `Could you tell me what I need to bring, and what the next step is?\n\n` +
      `Thank you so much for your time.`,
  };
}

async function generate(body: ActionPayload<"/api/compass", "generate">): Promise<Reply<"generate">> {
  const intake: Intake = {
    situation: body.situation,
    location: body.location,
    household: body.household,
  };

  // 1. read situation signals + what the learning model recommends
  await loadBrain();
  const tags = deriveTags(intake.situation);
  noteRun();
  void saveBrain();
  const recLabels = recommend(tags).map(labelFor);

  // 2. research REAL local resources first (grounded), so the path can name them
  const local = await findLocalResources(intake);
  const realList = local.localResources.length
    ? local.localResources
        .map((r) => `- ${r.name}${r.contact ? ` (${r.contact})` : ""}: ${r.helpsWith}`)
        .join("\n")
    : "(none found — give the next concrete action without naming an org)";

  const language: LanguageName = body.language;
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
  const parsed = parseModelObject(raw, modelPathSchema);
  const path: CompassPath = {
    ...(parsed ? assemble(parsed, intake) : mockPath(intake)),
    localResources: local.localResources,
    sources: local.sources,
    tags: [...tags],
    community: { runs: stats().runs, top: recLabels },
  };
  // the path also has to satisfy its own schema before it leaves the building
  const checked = compassPathSchema.parse(path);
  return { path: checked.ok ? checked.value : mockPath(intake), live: IS_LIVE };
}

export async function POST(req: NextRequest) {
  const parsed = await parseBody("/api/compass", req);
  if (!parsed.ok) return badRequest(parsed.error);
  const body = parsed.value;

  switch (body.action) {
    case "explain":
      return NextResponse.json<Reply<"explain">>(await explain(body));
    case "script":
      return NextResponse.json<Reply<"script">>(await script(body));
    case "generate":
      return NextResponse.json<Reply<"generate">>(await generate(body));
    default:
      return assertNever(body, "compass action");
  }
}
