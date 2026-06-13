import type { CompassPath, CompassStep, Intake } from "./types";

function has(s: string, ...words: string[]) {
  const t = s.toLowerCase();
  return words.some((w) => t.includes(w));
}

let n = 0;
const id = () => `s${++n}`;

/** Deterministic, warm path used when there's no Gemini key (or it fails). */
export function mockPath(intake: Intake): CompassPath {
  n = 0;
  const s = intake.situation || "";
  const loc = intake.location || "your area";
  const steps: CompassStep[] = [];

  // safety first
  if (has(s, "abuse", "domestic", "violence", "unsafe", "hurt", "partner")) {
    steps.push({
      id: id(),
      title: "Get to safety",
      stage: "now",
      plain: "Your safety comes first. Confidential help is available 24/7, and there is safe housing for people fleeing harm.",
      action: "Call the National DV Hotline at 1-800-799-7233.",
      docs: [],
      resourceKey: "dv",
    });
  }

  steps.push({
    id: id(),
    title: "Reach your local help line",
    stage: "now",
    plain: "211 is a free, confidential line that knows what's open in your community right now — beds, food, and rent help.",
    action: "Call or text 211 today and tell them where you are.",
    docs: [],
    resourceKey: "211",
  });

  if (has(s, "street", "car", "outside", "nowhere", "tonight", "no place", "couch")) {
    steps.push({
      id: id(),
      title: "Find a safe place tonight",
      stage: "now",
      plain: "A safe place to sleep tonight gives you ground to stand on while we work on the bigger plan.",
      action: "Ask 211 for an open emergency shelter near you.",
      docs: [],
      resourceKey: "shelter",
    });
  }

  steps.push({
    id: id(),
    title: "Get on the housing list",
    stage: "now",
    plain: "Coordinated Entry is the one front door to housing help in your community. Getting on the list is the single most important step toward stable housing.",
    action: "Ask 211 or a shelter for your area's Coordinated Entry access point.",
    docs: [],
    resourceKey: "coordinated_entry",
  });

  // documents
  const docSteps: CompassStep[] = [];
  if (has(s, "no id", "lost", "stolen", "id", "document", "papers", "birth")) {
    docSteps.push({
      id: id(),
      title: "Replace your ID",
      stage: "soon",
      plain: "A photo ID unlocks almost everything — intake, benefits, jobs, housing. Many DMVs waive the fee for people experiencing homelessness.",
      action: "Visit your state DMV; ask 211 about fee waivers.",
      docs: ["proof of identity"],
      resourceKey: "dmv",
    });
    docSteps.push({
      id: id(),
      title: "Recover your vital documents",
      stage: "soon",
      plain: "Your birth certificate and Social Security card are the keys to your ID and benefits. Both can be replaced.",
      action: "Order your birth certificate from your birth state's Vital Records office; get a free SS card from ssa.gov.",
      docs: [],
      resourceKey: "vital_records",
    });
  }
  steps.push(...docSteps);

  // benefits
  steps.push({
    id: id(),
    title: "Turn on your benefits",
    stage: "soon",
    plain: "Food and health coverage are things you likely already qualify for — and they free up money and energy for housing.",
    action: "Apply for SNAP (food) and Medicaid (health) through your state.",
    docs: ["state ID", "Social Security number"],
    resourceKey: "snap",
  });

  if (has(s, "evict", "behind on rent", "owe rent", "landlord")) {
    steps.push({
      id: id(),
      title: "Get rent help & legal backup",
      stage: "soon",
      plain: "If you're behind on rent or facing eviction, emergency rental assistance and free legal aid can keep a roof over your head.",
      action: "Ask 211 about Emergency Rental Assistance, and contact local Legal Aid.",
      docs: ["lease or rent records"],
      resourceKey: "rental_assistance",
    });
  }

  if (has(s, "veteran", "army", "navy", "marine", "air force", "service")) {
    steps.push({
      id: id(),
      title: "Use your veteran housing benefits",
      stage: "soon",
      plain: "There are housing programs built specifically for veterans (HUD-VASH, SSVF).",
      action: "Call the National Call Center for Homeless Veterans: 1-877-424-3838.",
      docs: [],
      resourceKey: "va",
    });
  }

  steps.push({
    id: id(),
    title: "Move toward your own place",
    stage: "later",
    plain: "A housing voucher pays part of your rent long-term. Waitlists are real, which is why getting on them now matters so much.",
    action: "Ask your local Public Housing Authority about the Housing Choice Voucher waitlist.",
    docs: ["state ID", "income proof (if any)", "birth certificate"],
    resourceKey: "vouchers",
  });

  const documents = Array.from(
    new Set([
      "State ID",
      "Social Security card",
      "Birth certificate",
      "Proof of income (if any)",
      "Any current lease or rent records",
    ])
  );

  const resources = Array.from(
    new Set(steps.map((st) => st.resourceKey).filter(Boolean) as string[])
  );
  resources.push("crisis");

  return {
    summary: `You're carrying a lot right now, and reaching out already took courage. Here in ${loc}, there's a real path forward — and you don't have to walk it alone or figure it out all at once. Start at the top. One step at a time.`,
    steps,
    documents,
    resources: Array.from(new Set(resources)),
    localResources: [],
    sources: [],
    tags: [],
    community: { runs: 1240, top: [] },
    location: loc,
    createdAt: new Date().toISOString(),
  };
}

export function plainExplainMock(term: string): string {
  return `"${term}" is part of the housing system. In plain terms: it's a step that helps connect you to stable housing. Call 211 and they can walk you through exactly what it means for your situation — that's what they're there for.`;
}
