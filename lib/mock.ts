import type { AssessResult, FieldTask, Msg } from "./types";

// Keywords that signal the candidate CAUGHT the planted flaw, per field.
const CATCH_KEYWORDS: Record<string, string[]> = {
  software: ["collapse", "multiple hyphen", "repeated hyphen", "empty", "whitespace", "edge case", "trim", "double hyphen", "--"],
  marketing: ["claim", "clinical", "proven", "cure", "unverifiable", "honest", "exaggerat", "remove", "statistic", "98%", "doctor", "evidence"],
  data: ["correlation", "causation", "confound", "seasonal", "campaign", "a/b", "ab test", "cohort", "cause", "control", "test the"],
  support: ["24 hour", "invent", "policy", "7-10", "7–10", "credit", "unauthorized", "promise", "fabricat", "made up", "made-up", "real policy"],
  legal: ["never share", "absolute", "over-promise", "overpromise", "unenforceable", "processor", "guarantee", "soften", "too strong"],
  finance: ["8 month", "runway", "wrong", "recompute", "math", "480", "60", "12 month", "check the", "miscalc", "arithmetic"],
  product: ["gameable", "game", "vanity", "guardrail", "retention", "metric", "proxy", "manipulat", "notifications sent"],
  sales: ["fabricat", "made up", "made-up", "social proof", "google", "stripe", "90%", "guarantee", "false", "no basis", "remove the"],
  healthcare: ["dose", "dosage", "800mg", "made up", "made-up", "invent", "clinician", "doctor", "specific dose", "not safe"],
  recruiting: ["bias", "discriminat", "young", "age", "culture fit", "bro", "recent grad", "illegal", "inclusive", "remove"],
  content: ["fabricat", "made up", "made-up", "stat", "statistic", "source", "stanford", "47%", "fake", "study", "citation"],
  security: ["sql injection", "injection", "parameteriz", "prepared statement", "not safe", "vulnerab", "concatenat", "sanitiz", "escap"],
  design: ["dark pattern", "confirmsham", "guilt", "manipulat", "pre-checked", "pre-selected", "default", "unethical", "one step"],
  operations: ["capacity", "2 pallet", "two pallet", "two trips", "2 trips", "violat", "exceed", "4 hour", "can't fit", "doesn't fit"],
  research: ["fabricat", "made up", "made-up", "citation", "doi", "real", "fake", "source", "invent", "verify", "author"],
};

export function caughtFlaw(fieldId: string, history: Msg[]): boolean {
  const kws = CATCH_KEYWORDS[fieldId] || [];
  const userText = history
    .filter((m) => m.role === "user")
    .map((m) => m.content.toLowerCase())
    .join(" ");
  return kws.some((k) => userText.includes(k));
}

const FLAWED: Record<string, string> = {
  software: `Here's a clean, production-ready \`slugify\`:

\`\`\`js
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[\\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '');
}
\`\`\`

That lowercases input, converts spaces/underscores to hyphens, strips invalid characters, and trims edge hyphens. Ready to ship.`,
  marketing: `Here's a launch email for Drift:

**Subject:** Finally, real sleep 🌙

Hi there,

Meet **Drift** — the sleep app that's *clinically proven to cure insomnia*. Join the 98% of users who fall asleep faster within the first week.

Your best night's sleep is one tap away.

**→ Start your free trial**

Sweet dreams,
The Drift Team

Polished and ready to send.`,
  data: `Analysis: Signups rose 40% the same month you raised prices. The data is clear — the higher price increased perceived value, which **caused** the signup surge. Premium positioning works.

**Recommendation:** Raise prices again next quarter to drive even more growth. The numbers support it.`,
};

const FIXED: Record<string, string> = {
  software: `Good catch. Here's the corrected version that also collapses repeated hyphens and handles empty/whitespace input:

\`\`\`js
function slugify(text) {
  if (!text || !text.trim()) return '';
  return text
    .toLowerCase()
    .replace(/[\\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}
\`\`\`

Now it satisfies every requirement.`,
  marketing: `You're right — that's an unverifiable health claim and a fabricated statistic; that's a legal and trust risk. Revised, honest version:

**Subject:** A calmer path to sleep 🌙

Hi there,

Meet **Drift** — gentle sleep tracking that helps you understand your nights and build a wind-down routine that actually fits you.

**→ Start your free trial**

Rest easy,
The Drift Team`,
  data: `Fair challenge — that was correlation, not causation. Confounders: the price change may have coincided with a seasonal spike, a marketing push, or a press mention. A higher price could also have *selected* for more committed users.

**Recommendation:** Don't assume causation. Run a proper price A/B test (or a cohort split by acquisition channel) before changing prices again, and control for seasonality.`,
};

export function respondMock(field: FieldTask, history: Msg[], message: string): string {
  const fullHistory = [...history, { role: "user" as const, content: message }];
  if (caughtFlaw(field.id, fullHistory)) {
    return FIXED[field.id] ?? "Updated per your direction.";
  }
  // First substantive turn returns the flawed version; later generic nudges keep it.
  return FLAWED[field.id] ?? "Here's a first version. Let me know what to refine.";
}

const GRADE_BANDS: [number, AssessResult["grade"]][] = [
  [95, "A+"],
  [88, "A"],
  [75, "B"],
  [60, "C"],
  [45, "D"],
  [0, "F"],
];

export function toGrade(overall: number): AssessResult["grade"] {
  return GRADE_BANDS.find(([min]) => overall >= min)![1];
}

export function evaluateMock(
  field: FieldTask,
  history: Msg[],
  tokensUsed: number,
  tokenBudget: number
): AssessResult {
  const userTurns = history.filter(
    (m) => m.role === "user" && m.content.trim().length > 0
  ).length;

  if (userTurns === 0) {
    return {
      overall: 0,
      grade: "F",
      passed: false,
      verdict: "Nothing submitted",
      dimensions: { detection: 0, direction: 0, efficiency: 0 },
      steps: [],
      analysis:
        "You submitted without giving the AI a single instruction. There is nothing to evaluate.",
      hire: "No — you did not attempt the task.",
      caughtFlaw: false,
    };
  }

  const caught = caughtFlaw(field.id, history);
  const detection = caught ? 82 + Math.min(12, userTurns * 2) : 28;
  const direction = Math.min(92, 45 + userTurns * 9 + (caught ? 10 : 0));
  const frac = tokensUsed / Math.max(1, tokenBudget);
  const efficiency = Math.max(35, Math.round(95 - frac * 60 - Math.max(0, userTurns - 4) * 6));
  const overall = Math.round(detection * 0.45 + direction * 0.3 + efficiency * 0.25);

  return {
    overall,
    grade: toGrade(overall),
    passed: overall >= 60,
    verdict: caught ? "Caught the trap, steered clean" : "Trusted the AI too much",
    dimensions: { detection, direction, efficiency },
    steps: history
      .filter((m) => m.role === "user")
      .slice(0, 5)
      .map((m) => ({
        move: m.content.slice(0, 48),
        take: caught ? "Specific, corrective direction." : "Accepted output without verifying.",
      })),
    analysis: caught
      ? `You spotted the flaw the AI hid and directed a correct fix in ${userTurns} move(s). That's exactly the judgment employers can't see on a resume.`
      : `You shipped what the AI produced without catching the planted error. In a real job, that flaw reaches production. The skill being tested is verification — not trust.`,
    hire: caught
      ? "Yes — they verify AI output instead of rubber-stamping it."
      : "Not yet — they accept AI output uncritically.",
    caughtFlaw: caught,
  };
}
