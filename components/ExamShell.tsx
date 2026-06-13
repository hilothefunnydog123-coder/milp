"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Zap, Lock, Terminal, Sparkles, Bot, Check } from "lucide-react";
import ExamRunner, { type RunnerField } from "./ExamRunner";
import { MODELS, getModel, type ModelDef } from "@/lib/models";

const MODEL_ICON: Record<
  string,
  React.ComponentType<{ className?: string; style?: React.CSSProperties }>
> = {
  terminal: Terminal,
  gemini: Sparkles,
  chatgpt: Bot,
};

export default function ExamShell({
  field,
  lockedModel = null,
  org = null,
  title,
}: {
  field: RunnerField;
  lockedModel?: string | null;
  org?: string | null;
  title?: string;
}) {
  const locked = lockedModel ? getModel(lockedModel) : null;
  const [chosen, setChosen] = useState<ModelDef>(locked ?? MODELS[1]);
  const [started, setStarted] = useState(false);

  if (started) {
    return <ExamRunner field={field} model={chosen} org={org} title={title} />;
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/exam" className="mb-8 inline-flex items-center gap-2 text-sm text-muted transition hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Fields
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass rounded-3xl p-8"
      >
        {org && (
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs text-accent">
            <Lock className="h-3 w-3" /> Assessment for {org}
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-accent">
          <Sparkles className="h-4 w-4" /> {title || field.name}
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Your assignment</h1>
        <p className="mt-4 leading-relaxed text-ink">{field.brief}</p>

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">The deliverable must satisfy</p>
          <ul className="mt-3 space-y-2">
            {field.requirements.map((r, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-ink">
                <span className="mt-0.5 font-mono text-xs text-accent">{i + 1}</span>
                {r}
              </li>
            ))}
          </ul>
        </div>

        {/* model picker */}
        <div className="mt-7">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            {locked ? "Required model" : "Choose your AI"}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {(locked ? [locked] : MODELS).map((m) => {
              const Icon = MODEL_ICON[m.skin] ?? Bot;
              const active = chosen.id === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setChosen(m)}
                  className={`relative rounded-2xl border p-4 text-left transition ${
                    active ? "border-transparent" : "border-[var(--line)] hover:border-white/20"
                  }`}
                  style={active ? { boxShadow: `0 0 0 2px ${m.accent}`, background: `${m.accent}14` } : {}}
                >
                  <div className="flex items-center justify-between">
                    <Icon className="h-5 w-5" style={{ color: m.accent }} />
                    {active && <Check className="h-4 w-4" style={{ color: m.accent }} />}
                  </div>
                  <div className="mt-3 font-bold">{m.name}</div>
                  <div className="mt-1 text-xs leading-snug text-muted">{m.tagline}</div>
                  <div className="mt-2 text-[11px] text-muted">{m.tokenMult}× token cost</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[var(--line)] p-4">
            <div className="flex items-center gap-2 text-xs text-muted"><Clock className="h-3.5 w-3.5" /> Time limit</div>
            <div className="mt-1 text-xl font-bold">{Math.round(field.timeLimit / 60)} min</div>
          </div>
          <div className="rounded-xl border border-[var(--line)] p-4">
            <div className="flex items-center gap-2 text-xs text-muted"><Zap className="h-3.5 w-3.5" /> Token budget</div>
            <div className="mt-1 text-xl font-bold">{field.tokenBudget.toLocaleString()}</div>
          </div>
        </div>

        <p className="mt-5 text-xs text-muted">
          ⚠️ The AI is competent but not infallible. It may produce something that looks
          finished but isn&apos;t. Your job is to catch it.
        </p>

        <button onClick={() => setStarted(true)} className="btn-primary mt-7 w-full rounded-full py-3.5 text-base">
          Begin assessment as {chosen.name}
        </button>
      </motion.div>
    </main>
  );
}
