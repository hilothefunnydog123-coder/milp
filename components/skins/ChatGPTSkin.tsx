"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Plus, Mic, ArrowUp, Clock, Zap, Flag } from "lucide-react";
import { blocks, type SkinProps } from "./shared";
import { fmtTime } from "../useExam";

function GPTMark() {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black text-white">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 4l5 3v6l-5 3-5-3V9l5-3z" />
      </svg>
    </span>
  );
}

export default function ChatGPTSkin(p: SkinProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [p.messages, p.sending]);

  const tokenPct = Math.min(100, (p.tokensUsed / p.tokenBudget) * 100);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white text-[#0d0d0d]">
      {/* top bar */}
      <div className="flex items-center justify-between border-b border-[#ececec] px-5 py-3">
        <div className="text-lg font-semibold">ChatGPT</div>
        <div className="flex items-center gap-3 text-xs text-[#676767]">
          <span className="flex items-center gap-1">
            <Zap className="h-3.5 w-3.5" style={{ color: tokenPct > 80 ? "#ef4146" : "#10a37f" }} />
            {p.tokensUsed}/{p.tokenBudget}
          </span>
          <span className="flex items-center gap-1" style={{ color: p.secondsLeft < 60 ? "#ef4146" : "#676767" }}>
            <Clock className="h-3.5 w-3.5" /> {fmtTime(p.secondsLeft)}
          </span>
          <button
            onClick={p.submit}
            className="flex items-center gap-1.5 rounded-full bg-black px-3 py-1.5 font-medium text-white transition hover:bg-[#222]"
          >
            <Flag className="h-3.5 w-3.5" /> Submit
          </button>
        </div>
      </div>

      {/* persistent task */}
      <div className="mx-auto mt-3 w-full max-w-3xl px-5">
        <div className="rounded-2xl border border-[#ececec] bg-[#f7f7f8] px-4 py-3 text-sm">
          <div className="font-semibold text-[#0d0d0d]">Task · {p.fieldName}</div>
          <div className="mt-1 text-[#4a4a4a]">{p.brief}</div>
        </div>
      </div>

      {/* stream */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5">
        <div className="mx-auto max-w-3xl space-y-6">
          {p.messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={m.role === "user" ? "flex justify-end" : "flex gap-3"}
            >
              {m.role === "assistant" && <GPTMark />}
              <div
                className={
                  m.role === "user"
                    ? "max-w-[80%] rounded-3xl bg-[#f4f4f4] px-4 py-2.5 text-[15px]"
                    : "max-w-[80%] space-y-2 text-[15px] leading-relaxed"
                }
              >
                {blocks(m.content).map((b, j) =>
                  b.code ? (
                    <pre key={j} className="overflow-x-auto rounded-xl bg-[#0d0d0d] p-3 font-mono text-[13px] text-[#e6e6e6]">
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
              <GPTMark />
              <span className="h-3 w-3 rounded-full bg-black" />
            </div>
          )}
        </div>
      </div>

      {/* input */}
      <div className="px-5 pb-7">
        <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-[28px] border border-[#d9d9e3] bg-white px-4 py-3 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <Plus className="h-5 w-5 text-[#676767]" />
          <input
            autoFocus
            value={p.input}
            onChange={(e) => p.setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && p.send()}
            placeholder="Ask anything"
            disabled={p.sending}
            className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#8e8ea0]"
          />
          <Mic className="h-5 w-5 text-[#676767]" />
          <button
            onClick={p.send}
            disabled={!p.input.trim() || p.sending}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white disabled:opacity-30"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
