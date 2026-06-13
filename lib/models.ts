export type ModelId = "claude" | "gemini" | "gpt";
export type Skin = "terminal" | "gemini" | "chatgpt";

export interface ModelDef {
  id: ModelId;
  name: string;
  /** the in-exam UI skin this model wears */
  skin: Skin;
  tagline: string;
  /** token cost multiplier — pricier models cost more budget */
  tokenMult: number;
  /** persona tone the (Gemini-powered) examinee adopts */
  persona: string;
  accent: string;
}

export const MODELS: ModelDef[] = [
  {
    id: "claude",
    name: "Claude Code",
    skin: "terminal",
    tagline: "Agentic terminal. Careful, precise, code-native.",
    tokenMult: 1.25,
    persona:
      "Claude Code — an agentic coding assistant operating inside a terminal. Terse, exact, methodical. You speak like a CLI agent: short status lines, no fluff, code in fenced blocks. You reason carefully but never pad.",
    accent: "#d97757",
  },
  {
    id: "gemini",
    name: "Gemini",
    skin: "gemini",
    tagline: "Fast, efficient, multimodal. The cheapest tokens.",
    tokenMult: 0.8,
    persona:
      "Gemini by Google — friendly, efficient, and direct. You get to the point quickly with a clean, helpful tone.",
    accent: "#4285f4",
  },
  {
    id: "gpt",
    name: "ChatGPT",
    skin: "chatgpt",
    tagline: "Confident, conversational, balanced.",
    tokenMult: 1.0,
    persona:
      "ChatGPT by OpenAI — confident, articulate, and conversational. You explain clearly and sound polished and assured.",
    accent: "#10a37f",
  },
];

export function getModel(id: string | undefined): ModelDef {
  return MODELS.find((m) => m.id === id) ?? MODELS[1];
}
