"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AssessResult, Msg } from "@/lib/types";

export type ExamPhase = "live" | "grading" | "result";

export interface UseExamOpts {
  fieldId: string;
  modelId: string;
  tokenBudget: number;
  timeLimit: number;
  greeting: string;
}

export function useExam({
  fieldId,
  modelId,
  tokenBudget,
  timeLimit,
  greeting,
}: UseExamOpts) {
  const [phase, setPhase] = useState<ExamPhase>("live");
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: greeting },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [tokensUsed, setTokensUsed] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(timeLimit);
  const [result, setResult] = useState<AssessResult | null>(null);

  const messagesRef = useRef<Msg[]>(messages);
  const tokensRef = useRef(0);
  const startedAt = useRef(Date.now());
  const endedRef = useRef(false);

  const endExam = useCallback(
    async (reason: "submit" | "time" | "tokens") => {
      if (endedRef.current) return;
      endedRef.current = true;
      setPhase("grading");
      const secondsUsed = Math.round((Date.now() - startedAt.current) / 1000);
      try {
        const res = await fetch("/api/assess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "evaluate",
            fieldId,
            history: messagesRef.current,
            tokensUsed: tokensRef.current,
            tokenBudget,
            secondsUsed,
            reason,
          }),
        });
        setResult(await res.json());
      } finally {
        setPhase("result");
      }
    },
    [fieldId, tokenBudget]
  );

  // countdown
  useEffect(() => {
    if (phase !== "live") return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          endExam("time");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, endExam]);

  const send = useCallback(async () => {
    const msg = input.trim();
    if (!msg || sending || phase !== "live") return;
    setInput("");
    const next = [...messagesRef.current, { role: "user" as const, content: msg }];
    messagesRef.current = next;
    setMessages(next);
    setSending(true);
    try {
      const res = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "respond",
          fieldId,
          model: modelId,
          message: msg,
          history: next.slice(0, -1),
        }),
      });
      const data = await res.json();
      if (data.reply) {
        const withReply = [
          ...messagesRef.current,
          { role: "assistant" as const, content: data.reply },
        ];
        messagesRef.current = withReply;
        setMessages(withReply);
        const total = tokensRef.current + (data.tokensUsed || 0);
        tokensRef.current = total;
        setTokensUsed(total);
        if (total >= tokenBudget) endExam("tokens");
      }
    } finally {
      setSending(false);
    }
  }, [input, sending, phase, fieldId, modelId, tokenBudget, endExam]);

  const submit = useCallback(() => endExam("submit"), [endExam]);

  return {
    phase,
    messages,
    input,
    setInput,
    sending,
    tokensUsed,
    tokenBudget,
    secondsLeft,
    timeLimit,
    result,
    send,
    submit,
  };
}

export function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
