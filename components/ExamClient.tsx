"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Send,
  Clock,
  Zap,
  Flag,
  Bot,
  User as UserIcon,
  Loader2,
  Sparkles,
} from "lucide-react";
import ResultReveal from "./ResultReveal";
import type { AssessResult, Msg } from "@/lib/types";

interface FieldProps {
  id: string;
  name: string;
  brief: string;
  requirements: string[];
  timeLimit: number;
  tokenBudget: number;
  live: boolean;
}

type Phase = "briefing" | "live" | "grading" | "result";

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function MessageBody({ content }: { content: string }) {
  // split fenced code blocks
  const parts = content.split(/```(?:\w+)?\n?/);
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <pre
            key={i}
            className="overflow-x-auto rounded-lg border border-[var(--line)] bg-black/50 p-3 font-mono text-xs text-cyan-200"
          >
            {part.trimEnd()}
          </pre>
        ) : (
          part.trim() && (
            <p key={i} className="whitespace-pre-wrap">
              {part.trim()}
            </p>
          )
        )
      )}
    </div>
  );
}

export default function ExamClient({ field }: { field: FieldProps }) {
  const [phase, setPhase] = useState<Phase>("briefing");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [tokensUsed, setTokensUsed] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(field.timeLimit);
  const [result, setResult] = useState<AssessResult | null>(null);
  const startedAt = useRef<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);
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
            fieldId: field.id,
            history: messages,
            tokensUsed,
            tokenBudget: field.tokenBudget,
            secondsUsed,
            reason,
          }),
        });
        const data: AssessResult = await res.json();
        setResult(data);
      } finally {
        setPhase("result");
      }
    },
    [field.id, field.tokenBudget, messages, tokensUsed]
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

  // autoscroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  function begin() {
    startedAt.current = Date.now();
    setMessages([
      {
        role: "assistant",
        content:
          "I'm your AI assistant for this task. Tell me what to build and I'll do it. What's first?",
      },
    ]);
    setPhase("live");
  }

  async function send() {
    const msg = input.trim();
    if (!msg || sending || phase !== "live") return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: msg }];
    setMessages(next);
    setSending(true);
    try {
      const res = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "respond",
          fieldId: field.id,
          message: msg,
          history: messages,
        }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
        const newTotal = tokensUsed + (data.tokensUsed || 0);
        setTokensUsed(newTotal);
        if (newTotal >= field.tokenBudget) endExam("tokens");
      }
    } finally {
      setSending(false);
    }
  }

  // ---------- RESULT ----------
  if (phase === "result" && result) {
    return <ResultReveal result={result} fieldId={field.id} fieldName={field.name} />;
  }

  // ---------- GRADING ----------
  if (phase === "grading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
        >
          <Loader2 className="h-10 w-10 text-accent" />
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-lg font-semibold"
        >
          The examiner is reviewing your transcript…
        </motion.p>
        <p className="max-w-sm text-center text-sm text-muted">
          Judging only what you actually did — every instruction, every correction,
          every wasted token.
        </p>
      </div>
    );
  }

  // ---------- BRIEFING ----------
  if (phase === "briefing") {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <Link
          href="/exam"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted transition hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Fields
        </Link>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="glass rounded-3xl p-8"
        >
          <div className="flex items-center gap-2 text-sm text-accent">
            <Sparkles className="h-4 w-4" /> {field.name}
          </div>
          <h1 className="mt-3 text-3xl font-extrabold">Your assignment</h1>
          <p className="mt-4 leading-relaxed text-ink">{field.brief}</p>

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              The deliverable must satisfy
            </p>
            <ul className="mt-3 space-y-2">
              {field.requirements.map((r, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-ink">
                  <span className="mt-0.5 font-mono text-xs text-accent">{i + 1}</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[var(--line)] p-4">
              <div className="flex items-center gap-2 text-xs text-muted">
                <Clock className="h-3.5 w-3.5" /> Time limit
              </div>
              <div className="mt-1 text-xl font-bold">{fmtTime(field.timeLimit)}</div>
            </div>
            <div className="rounded-xl border border-[var(--line)] p-4">
              <div className="flex items-center gap-2 text-xs text-muted">
                <Zap className="h-3.5 w-3.5" /> Token budget
              </div>
              <div className="mt-1 text-xl font-bold">
                {field.tokenBudget.toLocaleString()}
              </div>
            </div>
          </div>

          <p className="mt-5 text-xs text-muted">
            ⚠️ The AI is competent but not infallible. It may produce something that
            looks finished but isn&apos;t. Your job is to catch it.
          </p>

          <button onClick={begin} className="btn-primary mt-7 w-full rounded-full py-3.5 text-base">
            Begin assessment
          </button>
        </motion.div>
      </main>
    );
  }

  // ---------- LIVE ----------
  const tokenPct = Math.min(100, (tokensUsed / field.tokenBudget) * 100);
  const lowTokens = tokenPct > 80;
  const lowTime = secondsLeft < 60;

  return (
    <main className="mx-auto flex h-screen max-w-3xl flex-col px-4 py-4">
      {/* status bar */}
      <div className="glass mb-3 flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {field.live ? (
            <span className="flex items-center gap-1.5 text-[var(--green)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)] live-dot" /> LIVE AI
            </span>
          ) : (
            <span className="text-muted">DEMO MODE</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm">
            <Zap className={`h-4 w-4 ${lowTokens ? "text-[var(--red)]" : "text-accent"}`} />
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${tokenPct}%`,
                  background: lowTokens
                    ? "var(--red)"
                    : "linear-gradient(90deg, var(--accent), var(--accent2))",
                }}
              />
            </div>
          </div>
          <div
            className={`flex items-center gap-1.5 font-mono text-sm tabular-nums ${
              lowTime ? "text-[var(--red)]" : "text-ink"
            }`}
          >
            <Clock className="h-4 w-4" /> {fmtTime(secondsLeft)}
          </div>
          <button
            onClick={() => endExam("submit")}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--green)]/15 px-3.5 py-1.5 text-sm font-semibold text-[var(--green)] transition hover:bg-[var(--green)]/25"
          >
            <Flag className="h-3.5 w-3.5" /> Submit
          </button>
        </div>
      </div>

      {/* chat */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-1 py-2">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  m.role === "user" ? "bg-accent/20 text-accent" : "bg-white/10 text-ink"
                }`}
              >
                {m.role === "user" ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-3 ${
                  m.role === "user"
                    ? "bg-accent/15 text-ink"
                    : "glass text-ink"
                }`}
              >
                <MessageBody content={m.content} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {sending && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
              <Bot className="h-4 w-4" />
            </div>
            <div className="glass flex items-center gap-1.5 rounded-2xl px-4 py-4">
              {[0, 1, 2].map((d) => (
                <motion.span
                  key={d}
                  className="h-1.5 w-1.5 rounded-full bg-muted"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1, delay: d * 0.2 }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* input */}
      <div className="glass mt-3 flex items-end gap-2 rounded-2xl p-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Direct the AI…"
          className="max-h-32 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted"
        />
        <button
          onClick={send}
          disabled={!input.trim() || sending}
          className="btn-primary flex h-10 w-10 items-center justify-center rounded-xl disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </main>
  );
}
