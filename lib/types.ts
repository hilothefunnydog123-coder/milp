// ============================================================================
// YNorth — find your way home.
// A plain-language compass that turns the invisible maze of getting housed
// into a clear, dignified, step-by-step path you own.
// ============================================================================

export type Stage = "now" | "soon" | "later";

export interface CompassStep {
  id: string;
  title: string;
  stage: Stage;
  /** plain-language: what this is and why it matters, in warm human terms */
  plain: string;
  /** the single concrete next action */
  action: string;
  /** documents this step needs */
  docs: string[];
  /** key into the curated RESOURCES map (real, universal systems only) */
  resourceKey?: string;
}

export interface LocalResource {
  name: string;
  helpsWith: string;
  contact?: string;
}

export interface Source {
  title: string;
  uri: string;
}

export interface CompassPath {
  /** a warm, plain one-paragraph reflection of their situation + hope */
  summary: string;
  steps: CompassStep[];
  /** vital documents to gather (deduped, plain labels) */
  documents: string[];
  /** resource keys relevant to this person (subset of RESOURCES) */
  resources: string[];
  /** REAL, location-specific orgs found via grounded search (cited) */
  localResources: LocalResource[];
  /** grounding citations for the local resources */
  sources: Source[];
  location: string;
  createdAt: string;
}

export interface Intake {
  situation: string;
  location: string;
  household: string;
}
