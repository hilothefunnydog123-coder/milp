"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, BadgeCheck, Search, Sparkles, TrendingUp } from "lucide-react";
import type { Credential } from "@/lib/types";

const GRADE_COLOR: Record<string, string> = {
  "A+": "text-[var(--gold)]",
  A: "text-[var(--green)]",
  B: "text-accent",
  C: "text-muted",
  D: "text-[var(--red)]",
  F: "text-[var(--red)]",
};

export default function Employers() {
  const [creds, setCreds] = useState<Credential[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/credential")
      .then((r) => r.json())
      .then((d) => setCreds(d.credentials || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = creds.filter(
    (c) =>
      c.name.toLowerCase().includes(q.toLowerCase()) ||
      c.field.toLowerCase().includes(q.toLowerCase()) ||
      c.id.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <nav className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-sm text-muted transition hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <div className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
          <Sparkles className="h-5 w-5 text-accent" />
          Judge<span className="gradient-text">mynt</span>
        </div>
      </nav>

      <section className="mt-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-3 py-1 text-xs text-muted glass">
            <TrendingUp className="h-3.5 w-3.5 text-accent" /> Talent ranked by judgment, not keywords
          </div>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Stop reading resumes. <span className="gradient-text">Read judgment.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-muted">
            Every candidate below was dropped into a live task with a deliberately
            flawed AI. These scores are what they actually did — verifiable, and
            impossible to fake with ChatGPT.
          </p>
        </motion.div>

        {/* search */}
        <div className="glass mt-8 flex items-center gap-3 rounded-full px-5 py-3">
          <Search className="h-4 w-4 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search candidates, fields, or credential IDs…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </div>

        {/* board */}
        <div className="mt-6 space-y-3">
          {loading && (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-20 rounded-2xl bg-white/5 shimmer" />
              ))}
            </div>
          )}
          {!loading &&
            filtered.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.4) }}
                className="glass flex items-center gap-4 rounded-2xl p-4 transition hover:glow"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent/30 to-[var(--accent2)]/30 font-bold">
                  {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{c.name}</span>
                    <BadgeCheck className="h-4 w-4 text-[var(--green)]" />
                  </div>
                  <div className="truncate text-sm text-muted">
                    {c.field} · &ldquo;{c.verdict}&rdquo;
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-muted/70">{c.id}</div>
                </div>
                <div className="hidden gap-4 text-center sm:flex">
                  {(
                    [
                      ["DET", c.dimensions.detection],
                      ["DIR", c.dimensions.direction],
                      ["EFF", c.dimensions.efficiency],
                    ] as const
                  ).map(([l, v]) => (
                    <div key={l}>
                      <div className="text-sm font-semibold">{v}</div>
                      <div className="text-[10px] uppercase text-muted">{l}</div>
                    </div>
                  ))}
                </div>
                <div className="ml-2 text-right">
                  <div className={`text-2xl font-extrabold ${GRADE_COLOR[c.grade] ?? "text-ink"}`}>
                    {c.overall}
                  </div>
                  <div className={`text-xs font-bold ${GRADE_COLOR[c.grade] ?? "text-muted"}`}>
                    {c.grade}
                  </div>
                </div>
              </motion.div>
            ))}
          {!loading && filtered.length === 0 && (
            <p className="py-10 text-center text-muted">No candidates match that search.</p>
          )}
        </div>

        <div className="mt-10 text-center">
          <Link href="/exam" className="btn-primary inline-flex items-center gap-2 rounded-full px-6 py-3">
            Get your own score on this board
          </Link>
        </div>
      </section>
    </main>
  );
}
