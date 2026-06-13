"use client";

import { motion } from "framer-motion";
import { Sparkles, BadgeCheck } from "lucide-react";
import type { Credential } from "@/lib/types";

export default function Certificate({ cred }: { cred: Credential }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, rotateX: 12 }}
      animate={{ opacity: 1, scale: 1, rotateX: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="cert relative mx-auto w-full max-w-2xl overflow-hidden rounded-3xl p-10"
      style={{ perspective: 1000 }}
    >
      <div className="pointer-events-none absolute inset-0 shimmer opacity-30" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold tracking-widest text-[var(--gold)]">
          <Sparkles className="h-4 w-4" /> JUDGEMYNT
        </div>
        <div className="text-xs font-mono text-muted">{cred.id}</div>
      </div>

      <div className="mt-10 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">
          This certifies that
        </p>
        <h2 className="mt-3 text-4xl font-extrabold text-ink">{cred.name}</h2>
        <p className="mt-3 text-sm text-muted">
          has demonstrated verified competence in directing AI for
        </p>
        <p className="mt-1 text-2xl font-bold gradient-text">{cred.field}</p>
      </div>

      <div className="mt-10 flex items-center justify-center gap-10">
        <div className="text-center">
          <div className="text-5xl font-extrabold text-[var(--gold)]">
            {cred.grade}
          </div>
          <div className="mt-1 text-xs uppercase tracking-wider text-muted">
            Grade
          </div>
        </div>
        <div className="h-14 w-px bg-[var(--line)]" />
        <div className="text-center">
          <div className="text-5xl font-extrabold text-ink">{cred.overall}</div>
          <div className="mt-1 text-xs uppercase tracking-wider text-muted">
            Judgment Score
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3 text-center text-xs">
        {(
          [
            ["Detection", cred.dimensions.detection],
            ["Direction", cred.dimensions.direction],
            ["Efficiency", cred.dimensions.efficiency],
          ] as const
        ).map(([label, v]) => (
          <div key={label} className="rounded-xl border border-[var(--line)] py-3">
            <div className="text-lg font-bold text-ink">{v}</div>
            <div className="mt-0.5 text-muted">{label}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted">
        <BadgeCheck className="h-4 w-4 text-[var(--green)]" />
        Verifiable credential · issued {new Date(cred.issuedAt).toLocaleDateString()}
      </div>
    </motion.div>
  );
}
