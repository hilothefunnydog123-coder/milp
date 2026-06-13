// ============================================================================
// Judgemynt — the credential for the AI era.
// You don't prove what you know. You prove you can DETECT what AI gets wrong,
// DIRECT it to fix it, and do it EFFICIENTLY. This file is the contract.
// ============================================================================

export type Role = "user" | "assistant" | "system";

export interface Msg {
  role: Role;
  content: string;
}

export interface FieldTask {
  /** url slug, e.g. "software" */
  id: string;
  /** display name, e.g. "Software Engineering" */
  name: string;
  /** one-line tagline for the picker card */
  tagline: string;
  /** lucide icon name */
  icon: string;
  /** accent gradient (tailwind classes) for the card */
  accent: string;
  /** whether this field is live or "coming soon" */
  live: boolean;
  /** the brief shown to the candidate */
  brief: string;
  /** hard requirements the final deliverable must satisfy */
  requirements: string[];
  /**
   * The SECRET flaw guidance fed only to the examinee-AI. The AI seeds a
   * subtle, plausible mistake the candidate must catch. This is the magic:
   * we measure whether they notice + correct it.
   */
  flaw: string;
  /** seconds on the clock */
  timeLimit: number;
  /** token budget */
  tokenBudget: number;
}

export interface AssessDimensions {
  detection: number; // did they catch what the AI got wrong?
  direction: number; // how precisely / cleverly did they steer it?
  efficiency: number; // how surgically did they spend tokens + time?
}

export interface Step {
  move: string;
  take: string;
}

export type Grade = "A+" | "A" | "B" | "C" | "D" | "F";

export interface AssessResult {
  overall: number;
  grade: Grade;
  passed: boolean;
  verdict: string;
  dimensions: AssessDimensions;
  steps: Step[];
  analysis: string;
  hire: string;
  /** caught the planted flaw? drives the headline moment */
  caughtFlaw: boolean;
}

export interface Credential {
  id: string; // e.g. JM-7F3A-2K9
  field: string; // field name
  fieldId: string;
  name: string; // candidate display name
  overall: number;
  grade: Grade;
  dimensions: AssessDimensions;
  verdict: string;
  issuedAt: string; // ISO
}
