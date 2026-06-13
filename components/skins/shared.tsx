"use client";

import type { Msg } from "@/lib/types";
import type { ModelDef } from "@/lib/models";

export interface SkinProps {
  fieldName: string;
  title: string;
  brief: string;
  requirements: string[];
  model: ModelDef;
  messages: Msg[];
  input: string;
  setInput: (s: string) => void;
  send: () => void;
  sending: boolean;
  submit: () => void;
  tokensUsed: number;
  tokenBudget: number;
  secondsLeft: number;
  timeLimit: number;
}

/** Split content into prose + fenced code parts. */
export function blocks(content: string): { code: boolean; text: string }[] {
  return content
    .split(/```(?:\w+)?\n?/)
    .map((part, i) => ({ code: i % 2 === 1, text: part }))
    .filter((b) => b.text.trim().length > 0);
}
