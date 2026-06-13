"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { blocks, type SkinProps } from "./shared";
import { fmtTime } from "../useExam";

const C = "#d97757"; // claude terracotta

export default function TerminalSkin(p: SkinProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [p.messages, p.sending]);

  const tokenPct = Math.min(100, (p.tokensUsed / p.tokenBudget) * 100);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0c0c0c] font-mono text-[13px] text-[#d6d3cd]">
      {/* window chrome */}
      <div className="flex items-center justify-between border-b border-white/10 bg-[#161513] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
          <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
          <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
        </div>
        <div className="text-xs text-[#8a8782]">
          claude-code — {p.fieldName.toLowerCase().replace(/[^a-z]+/g, "-")}
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span style={{ color: tokenPct > 80 ? "#ff5f56" : C }}>
            ◇ {p.tokensUsed}/{p.tokenBudget}
          </span>
          <span style={{ color: p.secondsLeft < 60 ? "#ff5f56" : "#d6d3cd" }}>
            ⧗ {fmtTime(p.secondsLeft)}
          </span>
          <button
            onClick={p.submit}
            className="rounded border border-[#27c93f]/40 px-2 py-0.5 text-[#27c93f] transition hover:bg-[#27c93f]/10"
          >
            submit ⏎
          </button>
        </div>
      </div>

      {/* persistent task */}
      <div className="border-b border-white/10 bg-[#0f0f0e] px-5 py-3 text-[12px] leading-relaxed text-[#9b9893]">
        <span style={{ color: C }}># TASK</span> · {p.fieldName}
        <div className="mt-1 text-[#cfccc6]">{p.brief}</div>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[#7d7a75]">
          {p.requirements.map((r, i) => (
            <span key={i}># {r}</span>
          ))}
        </div>
      </div>

      {/* stream */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {p.messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="whitespace-pre-wrap"
          >
            {m.role === "user" ? (
              <div>
                <span style={{ color: C }}>❯ </span>
                <span className="text-white">{m.content}</span>
              </div>
            ) : (
              <div className="space-y-2 text-[#c9c6c0]">
                <span className="text-[#6f6c67]">⏺ claude</span>
                {blocks(m.content).map((b, j) =>
                  b.code ? (
                    <pre
                      key={j}
                      className="overflow-x-auto rounded border border-white/10 bg-black/60 p-3 text-[#7ddcff]"
                    >
                      {b.text.trimEnd()}
                    </pre>
                  ) : (
                    <p key={j}>{b.text.trim()}</p>
                  )
                )}
              </div>
            )}
          </motion.div>
        ))}
        {p.sending && (
          <div className="text-[#6f6c67]">
            <span style={{ color: C }}>⏺</span> thinking
            <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }}>
              …
            </motion.span>
          </div>
        )}
      </div>

      {/* prompt */}
      <div className="flex items-center gap-2 border-t border-white/10 bg-[#0f0f0e] px-5 py-3">
        <span style={{ color: C }}>❯</span>
        <input
          autoFocus
          value={p.input}
          onChange={(e) => p.setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && p.send()}
          placeholder="direct the agent…"
          className="flex-1 bg-transparent text-white caret-[#27c93f] outline-none placeholder:text-[#5a5752]"
          disabled={p.sending}
        />
        <span className="h-4 w-2 animate-pulse bg-[#27c93f]" />
      </div>
    </div>
  );
}
