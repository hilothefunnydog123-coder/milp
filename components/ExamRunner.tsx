"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useExam } from "./useExam";
import ResultReveal from "./ResultReveal";
import TerminalSkin from "./skins/TerminalSkin";
import GeminiSkin from "./skins/GeminiSkin";
import ChatGPTSkin from "./skins/ChatGPTSkin";
import type { SkinProps } from "./skins/shared";
import type { ModelDef } from "@/lib/models";

export interface RunnerField {
  id: string;
  name: string;
  brief: string;
  requirements: string[];
  tokenBudget: number;
  timeLimit: number;
}

const GREETING: Record<string, string> = {
  terminal: "● Ready. Describe what to build and I'll implement it.",
  gemini: "Hi! Tell me what you need and I'll get started.",
  chatgpt: "Sure — what would you like me to help you build?",
};

export default function ExamRunner({
  field,
  model,
  org = null,
  title,
}: {
  field: RunnerField;
  model: ModelDef;
  org?: string | null;
  title?: string;
}) {
  const exam = useExam({
    fieldId: field.id,
    modelId: model.id,
    tokenBudget: field.tokenBudget,
    timeLimit: field.timeLimit,
    greeting: GREETING[model.skin],
  });

  if (exam.phase === "result" && exam.result) {
    return (
      <ResultReveal
        result={exam.result}
        fieldId={field.id}
        fieldName={field.name}
        modelId={model.id}
        org={org}
      />
    );
  }

  if (exam.phase === "grading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}>
          <Loader2 className="h-10 w-10 text-accent" />
        </motion.div>
        <p className="text-center text-lg font-semibold">The examiner is reviewing your transcript…</p>
        <p className="max-w-sm text-center text-sm text-muted">
          Judging only what you actually did — every instruction, every correction, every wasted token.
        </p>
      </div>
    );
  }

  const skinProps: SkinProps = {
    fieldName: title || field.name,
    title: title || field.name,
    brief: field.brief,
    requirements: field.requirements,
    model,
    messages: exam.messages,
    input: exam.input,
    setInput: exam.setInput,
    send: exam.send,
    sending: exam.sending,
    submit: exam.submit,
    tokensUsed: exam.tokensUsed,
    tokenBudget: exam.tokenBudget,
    secondsLeft: exam.secondsLeft,
    timeLimit: exam.timeLimit,
  };

  if (model.skin === "terminal") return <TerminalSkin {...skinProps} />;
  if (model.skin === "gemini") return <GeminiSkin {...skinProps} />;
  return <ChatGPTSkin {...skinProps} />;
}
