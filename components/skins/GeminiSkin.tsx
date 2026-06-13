"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Plus, Mic, ArrowUp, Clock, Zap, Flag } from "lucide-react";
import { blocks, type SkinProps } from "./shared";
import { fmtTime } from "../useExam";

function GeminiMark() {
  return (
    <span
      className="inline-block h-5 w-5 shrink-0 rounded-full"
      style={{ background: "conic-gradient(from 180deg, #4285f4, #9b72cb, #d96570, #4285f4)" }}
    />
  );
}

export default function GeminiSkin(p: SkinProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [p.messages, p.sending]);

  const tokenPct = Math.min(100, (p.tokensUsed / p.tokenBudget) * 100);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white text-[#1f1f1f]">
      {/* soft radial glow */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh]"
        style={{ background: "radial-gradient(60% 60% at 50% 0%, rgba(66,133,244,0.16), transparent 70%)" }}
      />

      {/* top bar */}
      <div className="relative flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2 text-lg font-medium text-[#444746]">
          <GeminiMark /> Gemini <span className="text-sm text-[#80868b]">Flash</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#5f6368]">
          <span className="flex items-center gap-1">
            <Zap className="h-3.5 w-3.5" style={{ color: tokenPct > 80 ? "#d93025" : "#4285f4" }} />
            {p.tokensUsed}/{p.tokenBudget}
          </span>
          <span className="flex items-center gap-1" style={{ color: p.secondsLeft < 60 ? "#d93025" : "#5f6368" }}>
            <Clock className="h-3.5 w-3.5" /> {fmtTime(p.secondsLeft)}
          </span>
          <button
            onClick={p.submit}
            className="flex items-center gap-1.5 rounded-full bg-[#4285f4] px-3 py-1.5 font-medium text-white transition hover:bg-[#3b78e7]"
          >
            <Flag className="h-3.5 w-3.5" /> Submit
          </button>
        </div>
      </div>

      {/* persistent task */}
      <div className="relative mx-auto mt-1 w-full max-w-2xl px-5">
        <div className="rounded-2xl border border-[#4285f4]/20 bg-[#f0f5ff] px-4 py-3 text-sm">
          <div className="font-semibold text-[#1a73e8]">Your task · {p.fieldName}</div>
          <div className="mt-1 text-[#444746]">{p.brief}</div>
        </div>
      </div>

      {/* stream */}
      <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-5 py-5">
        <div className="mx-auto max-w-2xl space-y-5">
          {p.messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={m.role === "user" ? "flex justify-end" : "flex gap-3"}
            >
              {m.role === "assistant" && <GeminiMark />}
              <div
                className={
                  m.role === "user"
                    ? "max-w-[80%] rounded-3xl bg-[#e8f0fe] px-4 py-2.5 text-[15px] text-[#1f1f1f]"
                    : "max-w-[80%] space-y-2 text-[15px] leading-relaxed text-[#1f1f1f]"
                }
              >
                {blocks(m.content).map((b, j) =>
                  b.code ? (
                    <pre key={j} className="overflow-x-auto rounded-xl bg-[#f1f3f4] p-3 font-mono text-[13px] text-[#0b57d0]">
                      {b.text.trimEnd()}
                    </pre>
                  ) : (
                    <p key={j} className="whitespace-pre-wrap">{b.text.trim()}</p>
                  )
                )}
              </div>
            </motion.div>
          ))}
          {p.sending && (
            <div className="flex items-center gap-3">
              <GeminiMark />
              <div className="flex gap-1.5">
                {[0, 1, 2].map((d) => (
                  <motion.span
                    key={d}
                    className="h-2 w-2 rounded-full bg-[#4285f4]"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1, delay: d * 0.2 }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* input pill */}
      <div className="relative px-5 pb-7">
        <div className="mx-auto flex max-w-2xl items-center gap-3 rounded-full border border-[#dadce0] bg-white px-5 py-3 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
          <Plus className="h-5 w-5 text-[#5f6368]" />
          <input
            autoFocus
            value={p.input}
            onChange={(e) => p.setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && p.send()}
            placeholder="Ask Gemini"
            disabled={p.sending}
            className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#80868b]"
          />
          <span className="rounded-full bg-[#f1f3f4] px-2.5 py-1 text-xs text-[#5f6368]">Flash</span>
          <Mic className="h-5 w-5 text-[#5f6368]" />
          <button
            onClick={p.send}
            disabled={!p.input.trim() || p.sending}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4285f4] text-white disabled:opacity-30"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
